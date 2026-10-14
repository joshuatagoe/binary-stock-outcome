// Writes the chain reader's events into the store (ARCHITECTURE.md section 5, D62). The reader is the only writer of these rows.
// Each event is stored once, keyed by signature, instruction index and event index; the table itself refuses a price outside
// 1 to 99 cents, a quantity of zero and a negative USDC amount, so a program bug stops the reader loudly instead of landing in the Timeline.
import { centsToUsdcUnits, type MeridianEvent } from '@meridian/shared';
import type { ExtractedEvent } from './chainEvents.ts';
import type { RawTx } from './chainReader.ts';
import type { Db } from './db.ts';

/** `META-680-2026-10-12` (D72): the strike in dollars, with cents only when it has them. */
export function marketKeyOf(ticker: string, day: number, strikeCents: bigint | number): string {
  const cents = BigInt(strikeCents);
  const dollars = `${cents / 100n}${cents % 100n === 0n ? '' : `.${(cents % 100n).toString().padStart(2, '0')}`}`;
  const d = String(day);
  return `${ticker}-${dollars}-${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// Big numbers go in as text, and bytes as hex, so the stored JSON loses nothing.
const toJson = (event: MeridianEvent) =>
  JSON.stringify(event, (_key, value) => (typeof value === 'bigint' ? value.toString() : value instanceof Uint8Array ? Buffer.from(value).toString('hex') : value));

/** Who did it, from the event's own fields. */
function walletOf(e: MeridianEvent): string | null {
  switch (e.kind) {
    case 'Fill': return e.taker;
    case 'OrderPlaced': case 'OrderCancelled': case 'PairsMinted': case 'Redeemed': case 'BalanceReturned': return e.owner;
    case 'ConfigInitialized': case 'ConfigUpdated': case 'AdminProposed': case 'AdminAccepted': case 'Paused': case 'Unpaused': return e.admin;
    case 'OperatorChanged': return e.operator;
    case 'MarketCreated': return e.creator;
    case 'CloseRecorded': return e.recorder;
    default: return null;
  }
}

function numbersOf(e: MeridianEvent): { price: number | null; qty: number | bigint | null; usdc: bigint | null } {
  switch (e.kind) {
    case 'Fill': return { price: e.price, qty: e.quantity, usdc: centsToUsdcUnits(e.price * e.quantity) };
    case 'OrderPlaced': case 'OrderCancelled': return { price: e.price, qty: e.quantity, usdc: null };
    case 'PairsMinted': return { price: null, qty: e.quantity, usdc: null };
    case 'Redeemed': return { price: null, qty: e.quantity, usdc: e.usdc };
    case 'BalanceReturned': return { price: null, qty: null, usdc: e.usdc };
    default: return { price: null, qty: null, usdc: null };
  }
}

const iso = (seconds: number | bigint) => new Date(Number(seconds) * 1000).toISOString();

/** The order things happened in: the slot, the transaction's place in its block, then the instruction and the event. */
export const EVENTS_IN_ORDER = 'slot, tx_index, ix_index, event_index';

export function createEventStore(db: Db, options: { networkEpoch?: number } = {}) {
  const { networkEpoch = 0 } = options;
  // ON CONFLICT, never INSERT OR IGNORE: that would also swallow a row the CHECK rules refuse, and drop a bad event without a word.
  const insertEvent = db.prepare(`
    INSERT INTO events (signature, ix_index, event_index, slot, tx_index, block_time, kind, market, market_key, trading_day, wallet, counterparty, price_cents, qty, usdc_units, data, network_epoch)
    VALUES (@signature, @ix, @index, @slot, @txIndex, @blockTime, @kind, @market, (SELECT market_key FROM markets WHERE market = @market), COALESCE(@day, (SELECT trading_day FROM markets WHERE market = @market)), @wallet, @counterparty, @price, @qty, @usdc, @data, @epoch)
    ON CONFLICT (signature, ix_index, event_index) DO NOTHING`);
  const insertMarket = db.prepare(`
    INSERT INTO markets (market, market_key, network_epoch, stock, trading_day, strike_cents, mint_open_at, open_at, close_at)
    VALUES (@market, @key, @epoch, @stock, @day, @strike, @mintOpen, @open, @close)
    ON CONFLICT (market) DO NOTHING`);
  // Events stored before their market's creation (catching up goes newest first) get the market's key now.
  const keyOlderEvents = db.prepare('UPDATE events SET market_key = @key, trading_day = @day WHERE market = @market AND market_key IS NULL');

  /** Stores a transaction's events together or not at all. Returns how many rows were new. */
  function addTransaction(tx: RawTx, events: ExtractedEvent[]): number {
    return db.transaction(() => {
      let added = 0;
      for (const { ixIndex, eventIndex, event } of events) {
        const { price, qty, usdc } = numbersOf(event);
        const market = 'market' in event ? event.market : null;
        const day = event.kind === 'MarketCreated' || event.kind === 'CloseRecorded' ? event.day : null;
        added += insertEvent.run({
          signature: tx.signature, ix: ixIndex, index: eventIndex, slot: tx.slot, txIndex: tx.index, blockTime: tx.blockTime === null ? null : iso(tx.blockTime),
          kind: event.kind, market, day, wallet: walletOf(event), counterparty: event.kind === 'Fill' ? event.maker : null, price, qty, usdc, data: toJson(event), epoch: networkEpoch,
        }).changes;
        if (event.kind === 'MarketCreated') {
          const key = marketKeyOf(event.ticker, event.day, event.strikeCents);
          insertMarket.run({
            market: event.market, key, epoch: networkEpoch, stock: event.ticker, day: event.day, strike: event.strikeCents,
            mintOpen: iso(event.mintOpen), open: iso(event.open), close: iso(event.close),
          });
          keyOlderEvents.run({ key, day: event.day, market: event.market });
        }
      }
      return added;
    })();
  }

  const setPosition = db.prepare('UPDATE events SET tx_index = ? WHERE signature = ? AND tx_index IS NULL');
  /** Fills in the position of a transaction whose events were stored before it was kept. Returns the rows changed. */
  const addPosition = (signature: string, index: number) => setPosition.run(index, signature).changes;

  return { addTransaction, addPosition };
}

export type EventStore = ReturnType<typeof createEventStore>;
