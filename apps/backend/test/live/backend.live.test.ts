// M4-b's live run: the chain reader and the running backend against a local chain that runs the current program (M2-a and D144).
// Skipped unless MERIDIAN_TEST_RPC names the chain (P16: no test talks to devnet). Start the chain, run this, stop the chain:
//   node apps/backend/test/live/local-chain.ts start
//   MERIDIAN_TEST_RPC=http://127.0.0.1:8909 npm run test -w apps/backend -- backend.live
//   node apps/backend/test/live/local-chain.ts stop
// The chain needs the program written in and Config initialized, as local-chain.ts does. MERIDIAN_TEST_KEYS names the folder of the
// local key files (default .local/keys). Each run makes new markets and traders, so the same chain can be used again.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PROGRAM_ADDRESS } from '@meridian/shared';
import { createSolanaRpc, getBase58Decoder, getBase58Encoder } from '@solana/kit';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createChainReader, type ChainSource } from '../../src/chainReader.ts';
import { rpcChainSource, type RpcLike } from '../../src/chainSource.ts';
import { migrate, openDatabase, type Db } from '../../src/db.ts';
import { rpcCall, runLifecycle, type Expected, type Lifecycle } from './lifecycle.ts';

const url = process.env.MERIDIAN_TEST_RPC;
const keys = process.env.MERIDIAN_TEST_KEYS ?? resolve(import.meta.dirname, '..', '..', '..', '..', '.local', 'keys');
const fresh = () => {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-live-')), 'meridian.db'));
  migrate(db);
  return db;
};
const source = () => rpcChainSource(createSolanaRpc(url!) as unknown as RpcLike, PROGRAM_ADDRESS);

type Row = { signature: string; ix_index: number; event_index: number; slot: number; block_time: string | null; kind: string; market: string | null; market_key: string | null; trading_day: number | null; wallet: string | null; counterparty: string | null; price_cents: number | null; qty: number | null; usdc_units: number | null; data: string };
const rowsOf = (db: Db) => db.prepare('SELECT * FROM events ORDER BY slot, ix_index, event_index').all() as Row[];

/** What the program wrote, counted without the reader's code: every event call (an inner instruction of the program that starts with
 *  Anchor's event tag) and every "Program data" log line, in every transaction that touched the program, failed or not. */
async function writtenByTheProgram() {
  const tag = Buffer.from([228, 69, 165, 46, 81, 203, 154, 29]);
  const b58 = getBase58Encoder();
  let before: string | undefined;
  let events = 0;
  let failed = 0;
  let transactions = 0;
  const signatures: string[] = [];
  for (;;) {
    const page = (await rpcCall(url!, 'getSignaturesForAddress', [PROGRAM_ADDRESS, { limit: 1000, commitment: 'confirmed', ...(before ? { before } : {}) }])) as { signature: string; err: unknown }[];
    if (page.length === 0) break;
    for (const s of page) {
      transactions++;
      signatures.push(s.signature);
      if (s.err) { failed++; continue; }
      const tx = await rpcCall(url!, 'getTransaction', [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
      const keysOf: string[] = [...tx.transaction.message.accountKeys, ...(tx.meta.loadedAddresses?.writable ?? []), ...(tx.meta.loadedAddresses?.readonly ?? [])];
      for (const group of tx.meta.innerInstructions ?? []) {
        for (const ix of group.instructions) {
          if (keysOf[ix.programIdIndex] === PROGRAM_ADDRESS && Buffer.from(b58.encode(ix.data)).subarray(0, 8).equals(tag)) events++;
        }
      }
      events += (tx.meta.logMessages as string[]).filter((l) => l.startsWith('Program data: ')).length;
    }
    before = page.at(-1)!.signature;
  }
  return { events, failed, transactions, signatures };
}

/** The wallet an event is about, worked out here from the expected fields (not by the store's code). */
const walletOf = (e: Expected) => (e.kind === 'Fill' ? e.taker : (e.owner ?? e.admin ?? e.creator)) as string | undefined;

describe.skipIf(!url)('the chain reader against a local chain running the current program', () => {
  let life: Lifecycle;
  let written: Awaited<ReturnType<typeof writtenByTheProgram>>;

  beforeAll(async () => {
    life = await runLifecycle(url!, keys);
    written = await writtenByTheProgram();
  }, 240_000);

  it('stores every event those transactions wrote, once, in order, with the right fields', async () => {
    const db = fresh();
    const result = await createChainReader({ db, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    const rows = rowsOf(db);

    // Everything the program wrote is stored: the same number as an independent count of the chain's event calls and data lines.
    console.info(`live run: ${written.transactions} program transactions (${written.failed} failed) wrote ${written.events} events; ${rows.length} stored; this run's ${life.steps.filter((s) => s.expected.length).reduce((n, s) => n + s.expected.length, 0)} expected events matched`);
    expect(rows).toHaveLength(written.events);
    expect(result.events).toBe(written.events);

    // This run's own transactions: exactly the events the steps expect, in the steps' order, and nothing else from those signatures.
    const mine = life.steps.filter((s) => !s.failed && s.expected.length > 0);
    const stored = rows.filter((r) => mine.some((s) => s.signature === r.signature));
    expect(stored.map((r) => r.signature)).toEqual(mine.flatMap((s) => s.expected.map(() => s.signature)));
    const expected = mine.flatMap((s) => s.expected.map((e, i) => ({ step: s, e, i })));
    expect(stored).toHaveLength(expected.length);
    stored.forEach((row, n) => {
      const { step, e, i } = expected[n]!;
      const where = `${step.name}, event ${i}`;
      expect(row.kind, where).toBe(e.kind);
      expect(row.slot, where).toBe(step.slot);
      expect(row.event_index, where).toBe(i);
      expect(JSON.parse(row.data), where).toMatchObject(e);
      expect(row.wallet, where).toBe(walletOf(e));
      if (e.market) {
        expect(row.market, where).toBe(e.market);
        expect(row.market_key, where).toMatch(/^AAPL-\d+-2026-10-13$/);
        expect(row.trading_day, where).toBe(20261013);
      }
      expect(row.counterparty, where).toBe(e.kind === 'Fill' ? e.maker : null);
      expect(row.price_cents, where).toBe(typeof e.price === 'number' ? e.price : null);
      expect(row.qty, where).toBe(typeof e.quantity === 'number' ? e.quantity : typeof e.quantity === 'string' ? Number(e.quantity) : null);
      expect(row.usdc_units, where).toBe(e.kind === 'Fill' ? Number(e.price) * Number(e.quantity) * 10_000 : typeof e.usdc === 'string' ? Number(e.usdc) : null);
      expect(Date.parse(row.block_time!), where).toBeGreaterThan(0);
    });

    // The market itself is recorded once, with its creation facts.
    const markets = db.prepare('SELECT market, stock, trading_day, strike_cents FROM markets WHERE market = ?').all(life.market);
    expect(markets).toEqual([{ market: life.market, stock: 'AAPL', trading_day: 20261013, strike_cents: expect.any(Number) }]);

    // Reading again finds nothing new and changes nothing.
    const again = await createChainReader({ db, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    expect(again.events).toBe(0);
    expect(rowsOf(db)).toEqual(rows);
  }, 120_000);

  it('stores nothing for a transaction that failed on the chain', async () => {
    const failedStep = life.steps.find((s) => s.failed)!;
    expect(written.failed).toBeGreaterThan(0);
    const listed = await source().getSignatures({ limit: 1000 });
    expect(listed.find((s) => s.signature === failedStep.signature)?.failed).toBe(true);
    const db = fresh();
    await createChainReader({ db, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    expect(db.prepare('SELECT COUNT(*) FROM events WHERE signature = ?').pluck().get(failedStep.signature)).toBe(0);
    // Its slot holds no events either, and the reader moved past it: the transaction after it is stored.
    expect(rowsOf(db).some((r) => r.slot === failedStep.slot)).toBe(false);
    expect(rowsOf(db).some((r) => r.signature === life.steps.at(-2)!.signature)).toBe(true);
  }, 60_000);

  describe.each([
    ['the process stops between two pages', 'between'],
    ['the process stops while a page is being fetched', 'during'],
  ] as const)('when %s', (_name, when) => {
    it('goes on from where it stopped: the rows are exactly those of an uninterrupted read, no duplicate and no gap', async () => {
      const whole = fresh();
      await createChainReader({ db: whole, source: source(), program: PROGRAM_ADDRESS, pageSize: 4 }).catchUp();
      const all = rowsOf(whole);
      expect(all.length).toBe(written.events);

      const path = join(mkdtempSync(join(tmpdir(), 'meridian-live-kill-')), 'meridian.db');
      const first = openDatabase(path);
      migrate(first);
      let fetches = 0;
      const real = source();
      const dying: ChainSource = {
        getSignatures: (q) => real.getSignatures(q),
        async getTransaction(signature) {
          if (when === 'during' && ++fetches === 7) throw new Error('killed');
          return real.getTransaction(signature);
        },
      };
      const killed = createChainReader({
        db: first, source: dying, program: PROGRAM_ADDRESS, pageSize: 4,
        onProgress: ({ page }) => { if (when === 'between' && page === 2) throw new Error('killed'); },
      });
      await expect(killed.catchUp()).rejects.toThrow('killed');
      const partial = rowsOf(first).length;
      expect(partial).toBeGreaterThan(0);
      expect(partial).toBeLessThan(all.length);
      first.close();

      // A new process, the same file.
      const second = openDatabase(path);
      await createChainReader({ db: second, source: source(), program: PROGRAM_ADDRESS, pageSize: 4 }).catchUp();
      const rows = rowsOf(second);
      expect(rows.length).toBe(all.length);
      expect(rows).toEqual(all);
      expect(new Set(rows.map((r) => `${r.signature}/${r.ix_index}/${r.event_index}`)).size).toBe(rows.length);
      second.close();
    }, 120_000);
  });

  it('stops with an error on an event it does not know, keeps its place, and finishes once it can read it', async () => {
    const target = life.steps.find((s) => s.name === 'bob Buys No 3 at 45')!;
    const real = source();
    const b58 = getBase58Decoder();
    const strange: ChainSource = {
      getSignatures: (q) => real.getSignatures(q),
      async getTransaction(signature) {
        const tx = await real.getTransaction(signature);
        if (!tx || signature !== target.signature) return tx;
        // The program's own event call with an event this build has never heard of: Anchor's tag, then eight unknown bytes.
        const tag = [228, 69, 165, 46, 81, 203, 154, 29];
        const unknown = b58.decode(new Uint8Array([...tag, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9]));
        return { ...tx, inner: tx.inner.map((g) => ({ ...g, instructions: g.instructions.map((ix, i) => (i === 0 && ix.programId === PROGRAM_ADDRESS ? { ...ix, data: unknown } : ix)) })) };
      },
    };
    const db = fresh();
    const stuck = createChainReader({ db, source: strange, program: PROGRAM_ADDRESS, pageSize: 3 });
    await expect(stuck.catchUp()).rejects.toThrow(/unknown event in transaction/);
    const state = Object.fromEntries((db.prepare('SELECT key, value FROM reader_state').all() as { key: string; value: string }[]).map((r) => [r.key, r.value]));
    expect(state.frontier).toBeUndefined(); // it never claimed to be caught up
    expect(state.pending_head).toBeDefined(); // it kept the walk it began
    expect(db.prepare('SELECT COUNT(*) FROM events WHERE signature = ?').pluck().get(target.signature)).toBe(0); // and stored nothing of the bad page's transaction
    const after = rowsOf(db);

    // Still stuck, still in the same place: asking again changes nothing.
    await expect(stuck.catchUp()).rejects.toThrow(/unknown event in transaction/);
    expect(rowsOf(db)).toEqual(after);

    // With a reader that knows the events (the real source), it picks up where it was and ends with every event once.
    await createChainReader({ db, source: real, program: PROGRAM_ADDRESS, pageSize: 3 }).catchUp();
    expect(rowsOf(db)).toHaveLength(written.events);
    // Rows stored before their market's creation had no key yet; now they have, and the table equals an uninterrupted read's.
    const whole = fresh();
    await createChainReader({ db: whole, source: real, program: PROGRAM_ADDRESS }).catchUp();
    expect(rowsOf(db)).toEqual(rowsOf(whole));
    expect(after.length).toBeGreaterThan(0);
    expect(after.length).toBeLessThan(written.events);
  }, 120_000);
});

describe.skipIf(!url)('the running backend', () => {
  const children: ReturnType<typeof spawn>[] = [];
  afterAll(() => void children.forEach((c) => c.kill('SIGKILL')));

  // Starts apps/backend/src/main.ts as its own process, on a free port, reading the local chain.
  function startBackend(databasePath: string) {
    const child = spawn(process.execPath, ['apps/backend/src/main.ts'], {
      cwd: resolve(import.meta.dirname, '..', '..', '..', '..'),
      env: { ...process.env, MERIDIAN_NETWORK: 'local', SOLANA_RPC_URL: url, DATABASE_PATH: databasePath, PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    let output = '';
    child.stdout!.on('data', (d) => (output += d));
    child.stderr!.on('data', (d) => (output += d));
    return { child, output: () => output };
  }

  async function until<T>(what: string, check: () => T | Promise<T>, secs: number): Promise<NonNullable<T>> {
    const deadline = Date.now() + secs * 1000;
    while (Date.now() < deadline) {
      const value = await check();
      if (value) return value as NonNullable<T>;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`${what} didn't happen within ${secs} s`);
  }

  it('reads the chain on its own, keeps its place when it is killed, and picks up what happened while it was down', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'meridian-live-backend-')), 'meridian.db');
    const count = () => {
      const db = new Database(path, { readonly: true, fileMustExist: true });
      try { return db.prepare('SELECT COUNT(*) FROM events').pluck().get() as number; } finally { db.close(); }
    };
    const safeCount = () => { try { return count(); } catch { return 0; } };

    const before = await writtenByTheProgram();
    const one = startBackend(path);
    await until('the backend storing every event so far', () => safeCount() === before.events, 90);
    one.child.kill('SIGKILL'); // no chance to say goodbye
    await new Promise((r) => one.child.once('exit', r));
    expect(count()).toBe(before.events);

    // While it is down, a whole new market's worth of transactions happens.
    await runLifecycle(url!, keys);
    const later = await writtenByTheProgram();
    expect(later.events).toBeGreaterThan(before.events);

    const two = startBackend(path);
    await until('the restarted backend catching up', () => safeCount() === later.events, 90);
    two.child.kill('SIGKILL');
    await new Promise((r) => two.child.once('exit', r));

    // Same rows as one uninterrupted read of the whole chain: nothing twice, nothing missing.
    const whole = fresh();
    await createChainReader({ db: whole, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    const db = new Database(path, { readonly: true });
    const theirs = db.prepare('SELECT * FROM events ORDER BY slot, ix_index, event_index').all();
    db.close();
    expect(theirs).toEqual(rowsOf(whole));
    expect(one.output() + two.output()).not.toMatch(/"level":50/); // no error-level log line in either run
  }, 360_000);
});
