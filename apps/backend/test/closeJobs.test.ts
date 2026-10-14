// The close-time jobs (D37, D97, D99, D146): once a market's orders close, sweep its book until it is empty, then return every
// balance left in it. Each pass looks at the chain and sends only what is missing, so a repeat or a restart sends nothing twice.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCloseJobs, type Balance, type BookState, type CloseChain } from '../src/closeJobs.ts';
import { migrate, openDatabase } from '../src/db.ts';

const CLOSE = Date.parse('2026-10-13T20:00:00.000Z');
const at = (secsFromClose: number) => new Date(CLOSE + secsFromClose * 1000);

function freshDb(markets: { market: string; closeAt?: number; epoch?: number }[]) {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-close-')), 'meridian.db'));
  migrate(db);
  const insert = db.prepare(
    `INSERT INTO markets (market, market_key, network_epoch, stock, trading_day, strike_cents, mint_open_at, open_at, close_at) VALUES (?, ?, ?, 'AAPL', 20261013, 10000, ?, ?, ?)`,
  );
  for (const m of markets) {
    const closeAt = new Date(m.closeAt ?? CLOSE).toISOString();
    insert.run(m.market, `AAPL-${m.market}-2026-10-13`, m.epoch ?? 0, closeAt, closeAt, closeAt);
  }
  return db;
}

/** A book the test controls: `orders` rest in it, each credited to its owner's balance when swept. Every send is logged. */
function fakeChain(options: { orders?: Record<string, string[]>; chainTime?: number; closed?: string[]; killAfterSweeps?: number; killAfterReturns?: number } = {}) {
  const books = new Map<string, { orders: string[]; balances: Map<string, bigint> }>();
  for (const [market, owners] of Object.entries(options.orders ?? {})) books.set(market, { orders: [...owners], balances: new Map() });
  const log: string[] = [];
  let chainTime = options.chainTime ?? CLOSE / 1000 + 10;
  let sweeps = 0;
  let returns = 0;
  const chain: CloseChain = {
    async chainTime() {
      log.push('time');
      return chainTime;
    },
    async readBook(market): Promise<BookState | null> {
      log.push(`read ${market}`);
      const book = books.get(market);
      if (!book || options.closed?.includes(market)) return null;
      const balances: Balance[] = [...book.balances].filter(([, usdc]) => usdc > 0n).map(([owner, usdc]) => ({ owner, usdc, yes: 0n, no: 0n }));
      return { orders: book.orders.length, balances };
    },
    async sweep(market) {
      if (options.killAfterSweeps !== undefined && sweeps >= options.killAfterSweeps) throw new Error('killed');
      sweeps++;
      log.push(`sweep ${market}`);
      const book = books.get(market)!;
      for (const owner of book.orders.splice(0, 28)) book.balances.set(owner, (book.balances.get(owner) ?? 0n) + 1_000_000n);
    },
    async returnToOwner(market, balance) {
      if (options.killAfterReturns !== undefined && returns >= options.killAfterReturns) throw new Error('killed');
      returns++;
      log.push(`return ${market} ${balance.owner}`);
      books.get(market)!.balances.set(balance.owner, 0n);
    },
  };
  return { chain, log, sends: () => log.filter((l) => l.startsWith('sweep') || l.startsWith('return')), setChainTime: (t: number) => (chainTime = t), books };
}

const owners = (n: number) => Array.from({ length: n }, (_, i) => `owner${String(i % 10)}`);
const jobs = (db: ReturnType<typeof freshDb>, chain: CloseChain, now: () => Date) => createCloseJobs({ db, chain, now, returnConcurrency: 1 });

describe('before the close', () => {
  it('sends nothing, and does not even read the chain, until 5 seconds before the stored close (D102)', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, log } = fakeChain({ orders: { M1: owners(3) } });
    await jobs(db, chain, () => at(-6)).run();
    expect(log).toEqual([]);
    await jobs(db, chain, () => at(-5)).run();
    expect(log.filter((l) => l.startsWith('sweep'))).toHaveLength(1);
  });

  it('waits for the chain’s own clock too: the program judges the close by it, and a sweep that is too early only costs a fee', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, sends, setChainTime } = fakeChain({ orders: { M1: owners(3) }, chainTime: CLOSE / 1000 - 6 });
    await jobs(db, chain, () => at(1)).run();
    expect(sends()).toEqual([]);
    setChainTime(CLOSE / 1000 - 5);
    await jobs(db, chain, () => at(1)).run();
    expect(sends().length).toBeGreaterThan(0);
  });
});

describe('after the close', () => {
  it('sweeps until the book is empty (28 orders a call), then returns every balance once', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, sends } = fakeChain({ orders: { M1: owners(60) } });
    const summary = await jobs(db, chain, () => at(30)).run();
    const all = sends();
    expect(all.filter((s) => s.startsWith('sweep'))).toHaveLength(3); // 28 + 28 + 4
    const returned = all.filter((s) => s.startsWith('return'));
    expect(returned.map((r) => r.split(' ')[2]!).sort()).toEqual(owners(10).sort().filter((v, i, a) => a.indexOf(v) === i));
    expect(all.slice(0, 3).every((s) => s.startsWith('sweep'))).toBe(true); // every sweep before the first return
    expect(summary).toMatchObject({ sweeps: 3, returns: 10 });
  });

  it('is safe to run twice: a second pass finds an empty book with nothing owed and sends nothing', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, sends, log } = fakeChain({ orders: { M1: owners(30) } });
    await jobs(db, chain, () => at(30)).run();
    const first = sends().length;
    await jobs(db, chain, () => at(60)).run();
    expect(sends()).toHaveLength(first);
    // And the finished market is not read again at all.
    log.length = 0;
    await jobs(db, chain, () => at(90)).run();
    expect(log).toEqual([]);
  });

  it('still sends nothing twice when the done mark is lost: it reads the book and finds it empty', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, sends } = fakeChain({ orders: { M1: owners(30) } });
    await jobs(db, chain, () => at(30)).run();
    const first = sends().length;
    db.prepare("DELETE FROM reader_state WHERE key LIKE 'close_done:%'").run();
    await jobs(db, chain, () => at(60)).run();
    expect(sends()).toHaveLength(first);
  });

  it('after a kill in the middle of the sweep, a restart sends only the calls that are left', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, sends, books } = fakeChain({ orders: { M1: owners(100) }, killAfterSweeps: 2 });
    await expect(jobs(db, chain, () => at(30)).run()).rejects.toThrow('killed');
    expect(sends()).toHaveLength(2);
    expect(books.get('M1')!.orders).toHaveLength(44);

    // A new process: the same database and the same chain, with the sweep working again.
    const restarted = fakeChain({ orders: { M1: owners(44) } });
    await jobs(db, restarted.chain, () => at(40)).run();
    const sweeps = restarted.sends().filter((s) => s.startsWith('sweep'));
    expect(sweeps).toHaveLength(2); // 28 + 16: the first two calls of the 4 are not sent again
  });

  it('after a kill in the middle of the returns, a restart returns only the owners still owed', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const first = fakeChain({ orders: { M1: owners(10) }, killAfterReturns: 4 });
    await expect(jobs(db, first.chain, () => at(30)).run()).rejects.toThrow('killed');
    const done = first.sends().filter((s) => s.startsWith('return')).map((s) => s.split(' ')[2]);
    expect(done).toHaveLength(4);
    // Carry the same book over to the restarted process.
    const second = fakeChain({});
    second.books.set('M1', first.books.get('M1')!);
    await jobs(db, second.chain, () => at(40)).run();
    const again = second.sends().map((s) => s.split(' ')[2]);
    expect(again).toHaveLength(6);
    expect([...done, ...again].sort()).toEqual(owners(10).sort());
  });

  it('stops, rather than loop, when a sweep that succeeded leaves the book as full as it was', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain } = fakeChain({ orders: { M1: owners(5) } });
    const stuck: CloseChain = { ...chain, sweep: async () => {} };
    await expect(jobs(db, stuck, () => at(30)).run()).rejects.toThrow(/did not take any order off/);
  });

  it('treats a book that is gone (closed after settlement) as finished, with nothing sent', async () => {
    const db = freshDb([{ market: 'M1' }]);
    const { chain, sends } = fakeChain({ orders: { M1: owners(3) }, closed: ['M1'] });
    await jobs(db, chain, () => at(30)).run();
    expect(sends()).toEqual([]);
    expect(db.prepare("SELECT COUNT(*) FROM reader_state WHERE key = 'close_done:M1'").pluck().get()).toBe(1);
  });

  it('keeps going with the other markets when one fails, and reports the failure', async () => {
    const db = freshDb([{ market: 'M1' }, { market: 'M2' }]);
    const { chain, sends } = fakeChain({ orders: { M1: owners(3), M2: owners(3) } });
    const failing: CloseChain = { ...chain, sweep: async (m) => (m === 'M1' ? Promise.reject(new Error('rpc went away')) : chain.sweep(m)) };
    await expect(jobs(db, failing, () => at(30)).run()).rejects.toThrow(/M1/);
    expect(sends().some((s) => s.startsWith('sweep M2'))).toBe(true);
    expect(sends().some((s) => s.startsWith('return M2'))).toBe(true);
  });

  it('looks only at markets of the current network epoch (§5)', async () => {
    const db = freshDb([{ market: 'OLD', epoch: 0 }, { market: 'NEW', epoch: 1 }]);
    const { chain, sends } = fakeChain({ orders: { OLD: owners(2), NEW: owners(2) } });
    await createCloseJobs({ db, chain, now: () => at(30), networkEpoch: 1, returnConcurrency: 1 }).run();
    expect(sends().every((s) => s.includes('NEW'))).toBe(true);
    expect(sends().length).toBeGreaterThan(0);
  });
});
