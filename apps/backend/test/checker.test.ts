// The repeatable check's skeleton (D97): each pass reads the chain's slot, and once a minute it logs a
// heartbeat with the genesis hash (D75), which is how a devnet reset shows (D19, §5).
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createChecker } from '../src/checker.ts';
import { migrate, openDatabase } from '../src/db.ts';

const GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
type Answer<T> = T | Error | 'hang';

function setup(slots: Answer<number>[], hashes: Answer<string>[] = [GENESIS, GENESIS, GENESIS], readChain?: () => Promise<void>) {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-checker-')), 'meridian.db'));
  migrate(db);
  let t = Date.parse('2026-10-12T13:00:00Z');
  const clock = { now: () => new Date(t), advance: (secs: number) => (t += secs * 1000) };
  // 'hang' never answers, like a server that accepts the connection and then goes quiet.
  const answer = <T>(queue: Answer<T>[]) => async () => {
    const next = queue.shift();
    if (next === 'hang') return new Promise<T>(() => {});
    if (next instanceof Error) throw next;
    return next as T;
  };
  const errors: unknown[] = [];
  const checker = createChecker({
    db,
    getSlot: async () => BigInt(await answer(slots)()),
    getGenesisHash: answer(hashes),
    provider: 'public',
    heartbeatEverySecs: 60,
    readTimeoutMs: 50,
    readChain,
    now: clock.now,
    onError: (e) => errors.push(e),
  });
  const heartbeats = () =>
    db.prepare('SELECT at, provider, slot, genesis_hash FROM heartbeats ORDER BY at').all() as { slot: number; genesis_hash: string }[];
  return { checker, clock, heartbeats, errors };
}

describe('the checker', () => {
  it('records the pass, the slot and a heartbeat', async () => {
    const { checker, heartbeats } = setup([100]);
    await checker.pass();
    expect(checker.progress()).toEqual({
      lastPassAt: new Date('2026-10-12T13:00:00Z'),
      chain: { slot: 100, seenAt: new Date('2026-10-12T13:00:00Z') },
    });
    expect(heartbeats()).toEqual([{ at: '2026-10-12T13:00:00.000Z', provider: 'public', slot: 100, genesis_hash: GENESIS }]);
  });

  it('logs a heartbeat at most once a minute', async () => {
    const { checker, clock, heartbeats } = setup([100, 175, 250]);
    await checker.pass();
    clock.advance(30);
    await checker.pass();
    clock.advance(30);
    await checker.pass();
    expect(heartbeats().map((h) => h.slot)).toEqual([100, 250]);
  });

  it('reads the genesis hash with every heartbeat, so a devnet reset shows in the next one', async () => {
    const { checker, clock, heartbeats } = setup([100, 40], [GENESIS, 'NewGenesisAfterReset11111111111111111111111']);
    await checker.pass();
    clock.advance(60);
    await checker.pass();
    expect(heartbeats().map((h) => h.genesis_hash)).toEqual([GENESIS, 'NewGenesisAfterReset11111111111111111111111']);
  });

  it('keeps the last chain progress when the RPC fails, and still records the pass', async () => {
    const { checker, clock, errors, heartbeats } = setup([100, new Error('429 Too Many Requests')]);
    await checker.pass();
    clock.advance(30);
    await checker.pass();
    expect(checker.progress()).toEqual({
      lastPassAt: new Date('2026-10-12T13:00:30Z'),
      chain: { slot: 100, seenAt: new Date('2026-10-12T13:00:00Z') },
    });
    expect(errors).toHaveLength(1);
    expect(heartbeats()).toHaveLength(1);
  });

  it('gives up on a read that never answers, so a pass always ends', async () => {
    const { checker, errors } = setup(['hang']);
    await checker.pass();
    expect(checker.progress().lastPassAt).toEqual(new Date('2026-10-12T13:00:00Z'));
    expect(checker.progress().chain).toBeNull();
    expect(String(errors[0])).toMatch(/no answer within 50 ms/);
  });

  it('logs no heartbeat when the genesis hash cannot be read, but keeps the slot', async () => {
    const { checker, errors, heartbeats } = setup([100], [new Error('503')]);
    await checker.pass();
    expect(checker.progress().chain?.slot).toBe(100);
    expect(heartbeats()).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  // M4-b: the chain reader is one job of the pass (D97), so its work and its failures are the pass's.
  describe('with the chain reader', () => {
    it('runs the reader on every pass', async () => {
      let runs = 0;
      const { checker, clock } = setup([100, 130], undefined, async () => void runs++);
      await checker.pass();
      clock.advance(30);
      await checker.pass();
      expect(runs).toBe(2);
    });

    it('reports a reader that fails, and still records the pass and the slot', async () => {
      const { checker, errors } = setup([100], undefined, async () => {
        throw new Error('unknown event in transaction abc');
      });
      await checker.pass();
      expect(errors.map(String)).toEqual(['Error: unknown event in transaction abc']);
      expect(checker.progress().lastPassAt).toEqual(new Date('2026-10-12T13:00:00Z'));
      expect(checker.progress().chain?.slot).toBe(100);
    });

    it('still reads when the slot cannot be read, since the reader asks the node itself', async () => {
      let runs = 0;
      const { checker } = setup([new Error('503')], undefined, async () => void runs++);
      await checker.pass();
      expect(runs).toBe(1);
    });

    it('shows the pass as done before a long catch-up ends, so health does not look stalled', async () => {
      let release!: () => void;
      const { checker } = setup([100], undefined, () => new Promise<void>((resolve) => (release = resolve)));
      const pass = checker.pass();
      await new Promise((r) => setTimeout(r, 10));
      expect(checker.progress().lastPassAt).toEqual(new Date('2026-10-12T13:00:00Z'));
      release();
      await pass;
    });
  });
});
