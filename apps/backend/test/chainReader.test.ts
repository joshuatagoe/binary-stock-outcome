// The chain reader (D62): reads the program's transactions newest first, stores every event once, and after a restart goes on
// where it stopped, with no gap, even if it stopped halfway through catching up.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROGRAM_ADDRESS } from '@meridian/shared';
import { describe, expect, it } from 'vitest';
import { createChainReader } from '../src/chainReader.ts';
import { migrate, openDatabase } from '../src/db.ts';
import { SAMPLES, cpiTx, eventBytes, fakeSource, signatureOf, tx } from './helpers/chainFixtures.ts';
import { createFakeClock } from './helpers/fakeClock.ts';

// A fresh folder per database (P16).
const freshDb = () => {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-reader-')), 'meridian.db'));
  migrate(db);
  return db;
};
const count = (db: ReturnType<typeof freshDb>, sql = 'SELECT COUNT(*) FROM events') => db.prepare(sql).pluck().get() as number;
const rateLimit = () => Object.assign(new Error('429 Too Many Requests'), { statusCode: 429 });

// n transactions, newest first, each with one Fill whose order id is its number.
const history = (n: number) =>
  Array.from({ length: n }, (_, i) => n - i).map((k) =>
    cpiTx('Fill', { ...SAMPLES.Fill, takerOrderId: BigInt(k) }, { signature: signatureOf(k), slot: 1000 + k }),
  );

function reader(db: ReturnType<typeof freshDb>, source: Parameters<typeof createChainReader>[0]['source'], extra: Partial<Parameters<typeof createChainReader>[0]> = {}) {
  const clock = createFakeClock();
  return { clock, reader: createChainReader({ db, source, program: PROGRAM_ADDRESS, pageSize: 100, clock, random: () => 0.5, ...extra }) };
}

describe('catching up', () => {
  it('stores every event of every page, across several pages', async () => {
    const db = freshDb();
    const { source, calls } = fakeSource(history(250));
    const { reader: r, clock } = reader(db, source);
    const result = await clock.drive(r.catchUp());
    expect(result).toMatchObject({ transactions: 250, events: 250 });
    expect(count(db)).toBe(250);
    expect(calls.signatures[0]).toMatchObject({ before: undefined, until: undefined, limit: 100 });
  });

  it('does nothing when there is nothing new, and asks only for what is newer than where it got to', async () => {
    const db = freshDb();
    const fake = fakeSource(history(30));
    const { reader: r, clock } = reader(db, fake.source);
    await clock.drive(r.catchUp());
    fake.calls.transactions.length = 0;
    fake.calls.signatures.length = 0;
    const again = await clock.drive(r.catchUp());
    expect(again).toMatchObject({ transactions: 0, events: 0 });
    expect(fake.calls.transactions).toEqual([]);
    expect(fake.calls.signatures).toEqual([{ before: undefined, until: signatureOf(30), limit: 100 }]);
  });

  it('fetches only the new transactions when some arrive', async () => {
    const db = freshDb();
    const fake = fakeSource(history(30));
    const { reader: r, clock } = reader(db, fake.source);
    await clock.drive(r.catchUp());
    fake.calls.transactions.length = 0;
    for (const k of [31, 32, 33]) fake.add(cpiTx('Fill', { ...SAMPLES.Fill, takerOrderId: BigInt(k) }, { signature: signatureOf(k) }));
    await clock.drive(r.catchUp());
    expect(fake.calls.transactions.sort()).toEqual([31, 32, 33].map(signatureOf));
    expect(count(db)).toBe(33);
  });

  it('skips a failed transaction and still moves past it', async () => {
    const db = freshDb();
    const txs = history(5);
    txs[2] = tx({ signature: txs[2]!.signature, failed: true, calls: [{ index: 0, events: [eventBytes('Fill', SAMPLES.Fill)] }] });
    const fake = fakeSource(txs);
    const { reader: r, clock } = reader(db, fake.source);
    await clock.drive(r.catchUp());
    expect(count(db)).toBe(4);
    expect(fake.calls.transactions).not.toContain(txs[2]!.signature); // a failed one is not even fetched
  });

  it('reads several events from one transaction and none from a transaction without any', async () => {
    const db = freshDb();
    const fake = fakeSource([
      tx({ signature: 'b', calls: [{ index: 0, events: [eventBytes('Fill', SAMPLES.Fill), eventBytes('OrderPlaced', SAMPLES.OrderPlaced)] }] }),
      tx({ signature: 'a' }),
    ]);
    const { reader: r, clock } = reader(db, fake.source);
    expect(await clock.drive(r.catchUp())).toMatchObject({ transactions: 2, events: 2 });
  });

  it('stores a market’s creation found after its fills, and keys the fills (catching up goes newest first)', async () => {
    const db = freshDb();
    const fake = fakeSource([
      cpiTx('Fill', SAMPLES.Fill, { signature: 'new' }),
      cpiTx('MarketCreated', SAMPLES.MarketCreated, { signature: 'old' }),
    ]);
    const { reader: r, clock } = reader(db, fake.source, { pageSize: 1 });
    await clock.drive(r.catchUp());
    expect(db.prepare("SELECT market_key FROM events WHERE kind = 'Fill'").pluck().get()).toBe('META-680-2026-10-12');
  });

  it('records the network epoch on every row', async () => {
    const db = freshDb();
    const { reader: r, clock } = reader(db, fakeSource(history(3)).source, { networkEpoch: 2 });
    await clock.drive(r.catchUp());
    expect(db.prepare('SELECT DISTINCT network_epoch FROM events').pluck().all()).toEqual([2]);
  });
});

describe('reading the same transaction again', () => {
  it('stores each event once when a later pass reads transactions it already stored', async () => {
    const db = freshDb();
    const fake = fakeSource(history(30));
    const { reader: r, clock } = reader(db, fake.source, { pageSize: 10 });
    await clock.drive(r.catchUp());
    db.exec("DELETE FROM reader_state"); // as if the marks were lost: everything is read again
    await clock.drive(r.catchUp());
    expect(count(db)).toBe(30);
  });
});

describe('a walk that ends early (Agave returns [] for a signature it does not know, and limit is only a maximum)', () => {
  it('keeps paging past a short page until an empty one', async () => {
    const db = freshDb();
    const { source } = fakeSource(history(250), { pageCap: 40 });
    const { reader: r, clock } = reader(db, source);
    await clock.drive(r.catchUp());
    expect(count(db)).toBe(250);
  });

  it('does not move its frontier when the node answers [] for where it was, and says so', async () => {
    const db = freshDb();
    const fake = fakeSource(history(30));
    const a = reader(db, fake.source);
    await a.clock.drive(a.reader.catchUp());
    for (const k of [31, 32, 33]) fake.add(cpiTx('Fill', { ...SAMPLES.Fill, takerOrderId: BigInt(k) }, { signature: signatureOf(k) }));
    const forgetful = { ...fake.source, async getSignatures(q: { before?: string; until?: string; limit: number }) { return q.before ? [] : fake.source.getSignatures(q); } };
    const b = reader(db, forgetful);
    await expect(b.clock.drive(b.reader.catchUp())).rejects.toThrow(/frontier/);
    expect(db.prepare("SELECT value FROM reader_state WHERE key = 'frontier'").pluck().get()).toBe(signatureOf(30));
    expect(db.prepare("SELECT value FROM reader_state WHERE key = 'pending_head'").pluck().get()).toBe(signatureOf(33));
    // The next pass, with a node that answers properly, finishes the job.
    const c = reader(db, fake.source);
    await c.clock.drive(c.reader.catchUp());
    expect(count(db)).toBe(33);
  });

  it('reports a frontier the node does not know (a reset) instead of silently walking all history', async () => {
    const db = freshDb();
    db.prepare("INSERT INTO reader_state (key, value) VALUES ('frontier', 'gone'), ('frontier_slot', '5')").run();
    const { reader: r, clock } = reader(db, fakeSource(history(5)).source);
    await expect(clock.drive(r.catchUp())).rejects.toThrow(/gone/);
    expect(db.prepare("SELECT value FROM reader_state WHERE key = 'frontier'").pluck().get()).toBe('gone');
  });
});

describe('a busy chain', () => {
  it('returns once it has reached the head it saw when it began, even if more keeps arriving', async () => {
    const db = freshDb();
    const fake = fakeSource(history(10));
    let n = 100;
    const busy = { ...fake.source, async getTransaction(s: string) { fake.add(cpiTx('Fill', SAMPLES.Fill, { signature: signatureOf(++n) })); return fake.source.getTransaction(s); } };
    const { reader: r, clock } = reader(db, busy);
    const result = await clock.drive(r.catchUp());
    expect(result.transactions).toBe(10);
    // The next call picks up what arrived meanwhile.
    const next = await clock.drive(r.catchUp());
    expect(next.transactions).toBeGreaterThan(0);
  });
});

describe('a restart in the middle of catching up', () => {
  it('goes on from the page it had reached, with no gap and no repeated rows', async () => {
    const db = freshDb();
    const fake = fakeSource(history(250), { failTxAt: 150 });
    const first = reader(db, fake.source, { concurrency: 1 });
    await expect(first.clock.drive(first.reader.catchUp())).rejects.toThrow(/rpc went away/);
    expect(count(db)).toBe(100); // page one is in; page two was not half-written

    // The process restarts: a new reader on the same database.
    const again = fakeSource(history(250));
    const resumed = reader(db, again.source);
    await resumed.clock.drive(resumed.reader.catchUp());

    expect(count(db)).toBe(250);
    expect(db.prepare("SELECT COUNT(DISTINCT signature) FROM events").pluck().get()).toBe(250);
    // It did not start over at the newest signature: its first ask was for what came before page one's last transaction.
    expect(again.calls.signatures[0]).toMatchObject({ before: signatureOf(151), until: undefined });
    expect(again.calls.transactions).toHaveLength(150);
    expect(again.calls.transactions).not.toContain(signatureOf(250));
  });

  it('also reads what arrived while it was down, once the old gap is filled', async () => {
    const db = freshDb();
    const crashing = fakeSource(history(250), { failTxAt: 120 });
    const first = reader(db, crashing.source, { concurrency: 1 });
    await expect(first.clock.drive(first.reader.catchUp())).rejects.toThrow();

    const txs = history(250);
    const after = fakeSource(txs);
    for (const k of [251, 252, 253, 254, 255]) after.add(cpiTx('Fill', { ...SAMPLES.Fill, takerOrderId: BigInt(k) }, { signature: signatureOf(k) }));
    const resumed = reader(db, after.source);
    await resumed.clock.drive(resumed.reader.catchUp());

    expect(count(db)).toBe(255);
    expect(after.calls.transactions).toHaveLength(155); // the 150 it never stored and the 5 new ones; none of page one again
    // A reader that only remembered "the newest signature I saw" would have skipped 51 to 150. These are all there:
    const orderIds = db.prepare("SELECT json_extract(data, '$.takerOrderId') FROM events").pluck().all().map(Number).sort((a, b) => a - b);
    expect(orderIds).toEqual(Array.from({ length: 255 }, (_, i) => i + 1));
  });

  it('survives a restart after it had fully caught up: the next pass asks only for newer transactions', async () => {
    const db = freshDb();
    const one = fakeSource(history(40));
    const a = reader(db, one.source);
    await a.clock.drive(a.reader.catchUp());
    const two = fakeSource(history(40));
    const b = reader(db, two.source);
    await b.clock.drive(b.reader.catchUp());
    expect(two.calls.transactions).toEqual([]);
    expect(two.calls.signatures[0]).toMatchObject({ until: signatureOf(40) });
  });
});

describe('when the node misbehaves', () => {
  it('waits and tries again after a rate-limit reply, then finishes', async () => {
    const db = freshDb();
    const fake = fakeSource(history(10));
    let n = 0;
    const limited = { ...fake.source, async getTransaction(s: string) { if (++n <= 3) throw rateLimit(); return fake.source.getTransaction(s); } };
    const { reader: r, clock } = reader(db, limited, { concurrency: 1 });
    await clock.drive(r.catchUp());
    expect(count(db)).toBe(10);
    expect(clock.now()).toBeGreaterThan(0); // it slept
  });

  it('gives up after repeated rate limits and leaves its place where it was, so the next pass resumes', async () => {
    const db = freshDb();
    const fake = fakeSource(history(10));
    let blocked = true;
    const limited = { ...fake.source, async getTransaction(s: string) { if (blocked) throw rateLimit(); return fake.source.getTransaction(s); } };
    const { reader: r, clock } = reader(db, limited, { concurrency: 1 });
    await expect(clock.drive(r.catchUp())).rejects.toThrow(/429/);
    expect(count(db)).toBe(0);
    blocked = false;
    await clock.drive(r.catchUp());
    expect(count(db)).toBe(10);
  });

  it('stops, without moving its place, when a listed transaction cannot be found', async () => {
    const db = freshDb();
    const fake = fakeSource(history(5));
    const missing = { ...fake.source, async getTransaction(s: string) { return s === signatureOf(3) ? null : fake.source.getTransaction(s); } };
    const { reader: r, clock } = reader(db, missing, { concurrency: 1 });
    await expect(clock.drive(r.catchUp())).rejects.toThrow(new RegExp(signatureOf(3)));
    expect(count(db)).toBe(0);
  });

  it('stops loudly on an event the store refuses, rather than skipping it', async () => {
    const db = freshDb();
    const bad = cpiTx('Fill', { ...SAMPLES.Fill, price: 100 }, { signature: 'bad' });
    const { reader: r, clock } = reader(db, fakeSource([bad, ...history(2).map((t, i) => ({ ...t, signature: `ok${i}` }))]).source);
    await expect(clock.drive(r.catchUp())).rejects.toThrow(/CHECK/);
    expect(count(db)).toBe(0);
  });

  it('never has more transactions in flight than its concurrency', async () => {
    const db = freshDb();
    const fake = fakeSource(history(30));
    let inFlight = 0;
    let most = 0;
    const slow = {
      ...fake.source,
      async getTransaction(s: string) {
        most = Math.max(most, ++inFlight);
        await new Promise((r) => setImmediate(r));
        inFlight--;
        return fake.source.getTransaction(s);
      },
    };
    const { reader: r, clock } = reader(db, slow, { concurrency: 3 });
    await clock.drive(r.catchUp());
    expect(most).toBe(3);
  });
});

describe('events stored before their position in the block was kept (migration 0003)', () => {
  it('reads them again and fills the position in, without adding or changing anything else', async () => {
    const db = freshDb();
    const txs = history(5);
    // The old rows: stored with no position, as the reader did before 0003.
    const { source } = fakeSource(txs);
    await reader(db, source).reader.catchUp();
    db.prepare('UPDATE events SET tx_index = NULL').run();
    const before = db.prepare('SELECT signature, ix_index, event_index, slot, data FROM events ORDER BY signature').all();

    const { source: later, calls } = fakeSource(txs);
    await reader(db, later).reader.catchUp();
    const rows = db.prepare('SELECT signature, tx_index FROM events ORDER BY signature').all() as { signature: string; tx_index: number }[];
    expect(rows).toEqual(txs.map((t) => ({ signature: t.signature, tx_index: t.index! })).sort((a, b) => (a.signature < b.signature ? -1 : 1)));
    expect(db.prepare('SELECT signature, ix_index, event_index, slot, data FROM events ORDER BY signature').all()).toEqual(before);
    expect(calls.transactions.sort()).toEqual(txs.map((t) => t.signature).sort());

    // Once filled, a later pass does not fetch them again.
    const { source: again, calls: calls2 } = fakeSource(txs);
    await reader(db, again).reader.catchUp();
    expect(calls2.transactions).toEqual([]);
  });

  it('stops with an error, storing nothing wrong, when the node gives no position for a transaction', async () => {
    const db = freshDb();
    const { source } = fakeSource([cpiTx('Fill', SAMPLES.Fill, { index: null })]);
    await expect(reader(db, source).reader.catchUp()).rejects.toThrow(/position in its block/);
    expect(count(db)).toBe(0);
  });
});
