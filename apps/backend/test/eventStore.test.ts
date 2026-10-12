// The event store (ARCHITECTURE.md section 5, D62): one row per program event, keyed by signature, instruction index and event
// index; the rules the store refuses bad data with; and the markets the events name.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROGRAM_ADDRESS } from '@meridian/shared';
import { describe, expect, it } from 'vitest';
import { extractEvents } from '../src/chainEvents.ts';
import { migrate, openDatabase } from '../src/db.ts';
import { createEventStore, marketKeyOf } from '../src/eventStore.ts';
import { A, SAMPLES, cpiTx, eventBytes, tx } from './helpers/chainFixtures.ts';

// A fresh folder per database (P16).
function fresh(networkEpoch = 0) {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-events-')), 'meridian.db'));
  migrate(db);
  const store = createEventStore(db, { networkEpoch });
  const add = (t: ReturnType<typeof tx>) => store.addTransaction(t, extractEvents(t, PROGRAM_ADDRESS));
  return { db, store, add };
}
const rows = (db: ReturnType<typeof fresh>['db'], sql = 'SELECT * FROM events ORDER BY slot, ix_index, event_index') => db.prepare(sql).all() as Record<string, unknown>[];

describe('the events table', () => {
  it('stores a fill with its columns: kind, market, the taker as wallet, price, quantity and USDC in base units', () => {
    const { db, add } = fresh();
    add(cpiTx('Fill', SAMPLES.Fill, { signature: 's1', slot: 500, blockTime: 1_791_811_900 }));
    expect(rows(db)).toEqual([
      expect.objectContaining({
        signature: 's1', ix_index: 0, event_index: 0, slot: 500, block_time: '2026-10-12T13:31:40.000Z', kind: 'Fill',
        market: A.market, wallet: A.alice, price_cents: 65, qty: 10, usdc_units: 6_500_000, network_epoch: 0,
      }),
    ]);
  });

  it('keeps the whole event in data, with big numbers as text so nothing is rounded', () => {
    const { db, add } = fresh();
    add(cpiTx('Fill', { ...SAMPLES.Fill, makerOrderId: 18_446_744_073_709_551_615n }));
    const data = JSON.parse(rows(db)[0]!.data as string);
    expect(data).toMatchObject({ kind: 'Fill', makerOrderId: '18446744073709551615', side: 'Buy', price: 65 });
  });

  it('takes the actor from the event: owner, creator, admin and recorder', () => {
    const { db, add } = fresh();
    add(cpiTx('PairsMinted', SAMPLES.PairsMinted, { signature: 'a' }));
    add(cpiTx('MarketCreated', SAMPLES.MarketCreated, { signature: 'b' }));
    add(cpiTx('Paused', SAMPLES.Paused, { signature: 'c' }));
    add(cpiTx('CloseRecorded', SAMPLES.CloseRecorded, { signature: 'd' }));
    expect(rows(db, 'SELECT kind, wallet FROM events ORDER BY signature').map((r) => [r.kind, r.wallet])).toEqual([
      ['PairsMinted', A.alice], ['MarketCreated', A.alice], ['Paused', A.alice], ['CloseRecorded', A.alice],
    ]);
  });

  it('keeps a null block time as null', () => {
    const { db, add } = fresh();
    add(cpiTx('Paused', SAMPLES.Paused, { blockTime: null }));
    expect(rows(db)[0]!.block_time).toBeNull();
  });

  it('records the network epoch (§5: a devnet reset starts a new one)', () => {
    const { db, store } = fresh(3);
    const t = cpiTx('Paused', SAMPLES.Paused);
    store.addTransaction(t, extractEvents(t, PROGRAM_ADDRESS));
    expect(rows(db)[0]!.network_epoch).toBe(3);
  });
});

describe('storing each event once', () => {
  it('ignores a transaction it has already stored, and says how many rows were new', () => {
    const { db, store } = fresh();
    const t = tx({ calls: [{ index: 0, events: [eventBytes('Fill', SAMPLES.Fill), eventBytes('OrderPlaced', SAMPLES.OrderPlaced)] }] });
    const events = extractEvents(t, PROGRAM_ADDRESS);
    expect(store.addTransaction(t, events)).toBe(2);
    expect(store.addTransaction(t, events)).toBe(0);
    expect(rows(db)).toHaveLength(2);
  });

  it('keeps two identical events in one transaction as two rows, since their event index differs', () => {
    const { db, add } = fresh();
    const fill = eventBytes('Fill', SAMPLES.Fill);
    add(tx({ calls: [{ index: 0, events: [fill, fill] }] }));
    expect(rows(db)).toHaveLength(2);
  });

  it('never overwrites the stored row with a later copy', () => {
    const { db, add } = fresh();
    add(cpiTx('Fill', SAMPLES.Fill, { signature: 'same', slot: 10 }));
    add(cpiTx('Fill', { ...SAMPLES.Fill, price: 70 }, { signature: 'same', slot: 11 }));
    expect(rows(db).map((r) => [r.slot, r.price_cents])).toEqual([[10, 65]]);
  });

  it('adds a transaction’s rows together or not at all', () => {
    const { db, add } = fresh();
    // The second event's price is 100 cents, which the table refuses; the first must not stay behind.
    const t = tx({ calls: [{ index: 0, events: [eventBytes('Paused', SAMPLES.Paused), eventBytes('Fill', { ...SAMPLES.Fill, price: 100 })] }] });
    expect(() => add(t)).toThrow(/CHECK/);
    expect(rows(db)).toEqual([]);
  });
});

describe('the rules the table refuses bad data with (§5)', () => {
  const insert = (db: ReturnType<typeof fresh>['db'], extra: Record<string, unknown>) => {
    const base = { signature: 'x', ix_index: 0, event_index: 0, slot: 1, kind: 'Fill', data: '{}', network_epoch: 0, ...extra };
    const names = Object.keys(base);
    db.prepare(`INSERT INTO events (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`).run(...Object.values(base));
  };
  it.each([0, 100, -1])('refuses a price of %i cents', (price) => {
    const { db } = fresh();
    expect(() => insert(db, { price_cents: price })).toThrow(/CHECK/);
  });
  it.each([1, 99])('accepts a price of %i cents', (price) => {
    const { db } = fresh();
    expect(() => insert(db, { price_cents: price })).not.toThrow();
  });
  it('refuses a quantity of zero and a negative USDC amount, and accepts a USDC amount of zero', () => {
    const { db } = fresh();
    expect(() => insert(db, { qty: 0 })).toThrow(/CHECK/);
    expect(() => insert(db, { usdc_units: -1 })).toThrow(/CHECK/);
    expect(() => insert(db, { usdc_units: 0 })).not.toThrow();
  });
  it('refuses data that is not JSON', () => {
    expect(() => insert(fresh().db, { data: 'not json' })).toThrow(/CHECK/);
  });
});

describe('markets', () => {
  it('names a market like META-680-2026-10-12 (D72), with cents only when the strike has them', () => {
    expect(marketKeyOf('META', 20261012, 68000n)).toBe('META-680-2026-10-12');
    expect(marketKeyOf('AAPL', 20261012, 23050n)).toBe('AAPL-230.50-2026-10-12');
  });

  it('records a created market with its times, and keys every later event of that market', () => {
    const { db, add } = fresh();
    add(cpiTx('MarketCreated', SAMPLES.MarketCreated, { signature: 'm', slot: 1 }));
    add(cpiTx('Fill', SAMPLES.Fill, { signature: 'f', slot: 2 }));
    expect(rows(db, 'SELECT * FROM markets')).toEqual([
      expect.objectContaining({ market: A.market, market_key: 'META-680-2026-10-12', stock: 'META', trading_day: 20261012, strike_cents: 68000, close_at: '2026-10-12T20:00:00.000Z' }),
    ]);
    expect(rows(db, "SELECT market_key, trading_day FROM events WHERE kind = 'Fill'")).toEqual([{ market_key: 'META-680-2026-10-12', trading_day: 20261012 }]);
  });

  it('fills in the key of events stored before their market’s creation, as happens when catching up newest first', () => {
    const { db, add } = fresh();
    add(cpiTx('Fill', SAMPLES.Fill, { signature: 'f', slot: 2 }));
    expect(rows(db, "SELECT market_key FROM events WHERE kind = 'Fill'")).toEqual([{ market_key: null }]);
    add(cpiTx('MarketCreated', SAMPLES.MarketCreated, { signature: 'm', slot: 1 }));
    expect(rows(db, "SELECT market_key, trading_day FROM events WHERE kind = 'Fill'")).toEqual([{ market_key: 'META-680-2026-10-12', trading_day: 20261012 }]);
  });

  it('gives a MarketCreated event its own market and trading day', () => {
    const { db, add } = fresh();
    add(cpiTx('MarketCreated', SAMPLES.MarketCreated));
    expect(rows(db, "SELECT market_key, trading_day FROM events WHERE kind = 'MarketCreated'")).toEqual([{ market_key: 'META-680-2026-10-12', trading_day: 20261012 }]);
  });

  it('gives a CloseRecorded event its trading day, since it names a stock and a day and no market', () => {
    const { db, add } = fresh();
    add(cpiTx('CloseRecorded', SAMPLES.CloseRecorded));
    expect(rows(db, 'SELECT market, trading_day FROM events')).toEqual([{ market: null, trading_day: 20261012 }]);
  });
});

describe('both sides of a fill', () => {
  it('stores the maker as the counterparty, with an index, so the maker’s history finds the fill too', () => {
    const { db, add } = fresh();
    add(cpiTx('Fill', SAMPLES.Fill));
    add(cpiTx('Paused', SAMPLES.Paused));
    expect(rows(db, "SELECT wallet, counterparty FROM events WHERE kind = 'Fill'")).toEqual([{ wallet: A.alice, counterparty: A.bob }]);
    expect(rows(db, "SELECT kind FROM events WHERE wallet = '" + A.bob + "' OR counterparty = '" + A.bob + "'")).toEqual([{ kind: 'Fill' }]);
    const plan = db.prepare("EXPLAIN QUERY PLAN SELECT * FROM events WHERE counterparty = ?").all(A.bob).map((r) => JSON.stringify(r)).join(' ');
    expect(plan).toMatch(/events_by_counterparty_time/);
  });
});

describe('a market recreated at a new program address (a devnet reset, D19)', () => {
  it('is stored beside the old one with the same key, in its own network epoch, without stopping the reader', () => {
    const { db, add } = fresh(0);
    add(cpiTx('MarketCreated', SAMPLES.MarketCreated, { signature: 'old' }));
    const second = createEventStore(db, { networkEpoch: 1 });
    const t = cpiTx('MarketCreated', { ...SAMPLES.MarketCreated, market: A.carol }, { signature: 'new' });
    expect(() => second.addTransaction(t, extractEvents(t, PROGRAM_ADDRESS))).not.toThrow();
    expect(rows(db, 'SELECT market, market_key, network_epoch FROM markets ORDER BY network_epoch')).toEqual([
      { market: A.market, market_key: 'META-680-2026-10-12', network_epoch: 0 },
      { market: A.carol, market_key: 'META-680-2026-10-12', network_epoch: 1 },
    ]);
  });
});
