// What a market and its book look like on screen: USERS.md's market states, the four prices (F4), the chance on a card
// (D45). Pure functions of the accounts and the clock, so the tests can check every word.
import { MarketStatus, Outcome, type Book, type Market } from '@meridian/client';

export type StatusName = 'Trading' | 'UnderReview' | 'Proposed' | 'Settled';
export type OutcomeName = 'None' | 'Yes' | 'No';
import { formatCents, newYorkTime, type Level } from '@meridian/shared';
import type { Address } from '@solana/kit';

export type MarketView = {
  address: Address;
  ticker: string;
  strikeCents: number;
  day: number;
  slug: string;
  mintOpen: number;
  open: number;
  close: number;
  status: StatusName;
  outcome: OutcomeName;
  proposal: { outcome: OutcomeName; finalAt: number };
};

export function tickerText(bytes: ArrayLike<number>): string {
  return String.fromCharCode(...Array.from(bytes).filter((b) => b !== 0));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The address of a market's page (D72): META-680-2026-10-08, or AAPL-275.50-2026-10-08 off a whole dollar. */
export function marketSlug(ticker: string, strikeCents: number, day: number): string {
  const dollars = strikeCents % 100 === 0 ? String(strikeCents / 100) : (strikeCents / 100).toFixed(2);
  const y = Math.floor(day / 10000);
  return `${ticker}-${dollars}-${y}-${pad(Math.floor(day / 100) % 100)}-${pad(day % 100)}`;
}

export function parseMarketSlug(slug: string): { ticker: string; strikeCents: number; day: number } | null {
  const m = /^([A-Z]{1,8})-(\d+(?:\.\d{2})?)-(\d{4})-(\d{2})-(\d{2})$/.exec(slug);
  if (!m) return null;
  const strikeCents = Math.round(Number(m[2]) * 100);
  const day = Number(m[3]) * 10000 + Number(m[4]) * 100 + Number(m[5]);
  const check = new Date(Date.UTC(Number(m[3]), Number(m[4]) - 1, Number(m[5])));
  // A strike must fit the 8 bytes the market's address is made from, and a number the page can hold exactly.
  if (strikeCents <= 0 || strikeCents > 100_000_000_00 || check.getUTCMonth() !== Number(m[4]) - 1 || check.getUTCDate() !== Number(m[5])) return null;
  return { ticker: m[1]!, strikeCents, day };
}

export function toMarketView(address: Address, market: Market): MarketView {
  const ticker = tickerText(market.ticker);
  const strikeCents = Number(market.strikeCents);
  return {
    address,
    ticker,
    strikeCents,
    day: market.day,
    slug: marketSlug(ticker, strikeCents, market.day),
    mintOpen: Number(market.mintOpen),
    open: Number(market.open),
    close: Number(market.close),
    status: MarketStatus[market.status],
    outcome: Outcome[market.outcome],
    proposal: { outcome: Outcome[market.proposal.outcome], finalAt: Number(market.proposal.finalAt) },
  };
}

const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });

/** "4:00 PM ET" (every time on screen carries ET, D84). */
export function formatEt(unixSeconds: number): string {
  return `${ET.format(new Date(unixSeconds * 1000)).replace(/\s/g, ' ')} ET`;
}

/** The orders-closed margin the program uses: from 5 seconds before the stored close (D102). */
export const CLOSE_MARGIN_SECONDS = 5;

export type MarketState = {
  kind: 'upcoming' | 'open' | 'closed' | 'settled' | 'underReview' | 'proposed';
  label: string;
  tradable: boolean;
};

function countdown(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `Closes in ${h} h ${m} min`.replace(' 0 min', '') : `Closes in ${m} min`;
}

export function marketState(m: MarketView, nowSeconds: number): MarketState {
  const winner = (o: OutcomeName) => (o === 'Yes' ? 'Yes wins' : 'No wins');
  if (m.status === 'Settled') return { kind: 'settled', label: winner(m.outcome), tradable: false };
  if (m.status === 'UnderReview') return { kind: 'underReview', label: 'Under review', tradable: false };
  if (m.status === 'Proposed') {
    return { kind: 'proposed', label: `Proposed: ${m.proposal.outcome} wins, final at ${formatEt(m.proposal.finalAt)}`, tradable: false };
  }
  if (nowSeconds < m.open) return { kind: 'upcoming', label: `Opens ${formatEt(m.open)}`, tradable: false };
  if (nowSeconds >= m.close - CLOSE_MARGIN_SECONDS) {
    return { kind: 'closed', label: `Trading ended · result expected by about ${formatEt(m.close + 5 * 60)}`, tradable: false };
  }
  return { kind: 'open', label: countdown(m.close - CLOSE_MARGIN_SECONDS - nowSeconds), tradable: true };
}

export type Levels = { asks: Level[]; bids: Level[] };

function aggregate(orders: readonly { price: number; quantity: number }[]): Level[] {
  const out: Level[] = [];
  for (const o of orders) {
    const last = out.at(-1);
    if (last && last[0] === o.price) out[out.length - 1] = [o.price, last[1] + o.quantity];
    else out.push([o.price, o.quantity]);
  }
  return out;
}

/** The book's two sides as [price, quantity] levels, best first: asks lowest first, bids highest first. */
export function bookLevels(book: Book): Levels {
  return { asks: aggregate(book.asks.slice(0, book.askCount)), bids: aggregate(book.bids.slice(0, book.bidCount)) };
}

export type Quotes = { buyYes: number | null; sellYes: number | null; buyNo: number | null; sellNo: number | null };

/** The panel's four prices: Buy No is 100 minus the best Yes bid and Sell No 100 minus the best Yes ask (D45). */
export function quotes(levels: Levels): Quotes {
  const ask = levels.asks[0]?.[0] ?? null;
  const bid = levels.bids[0]?.[0] ?? null;
  return { buyYes: ask, sellYes: bid, buyNo: bid === null ? null : 100 - bid, sellNo: ask === null ? null : 100 - ask };
}

export type Chance = { yes: number | null; no: number | null; text: string };

/** A card's one price per side from the midpoint, when the spread is 10 cents or less (D45). There is no last trade to fall back on here. */
export function chanceText(levels: Levels): Chance {
  const ask = levels.asks[0]?.[0];
  const bid = levels.bids[0]?.[0];
  if (ask === undefined && bid === undefined) return { yes: null, no: null, text: 'No quotes yet' };
  if (ask === undefined || bid === undefined || ask - bid > 10) return { yes: null, no: null, text: '—' };
  const yes = Math.round((ask + bid) / 2);
  return { yes, no: 100 - yes, text: `${yes}% chance` };
}

/** "Yes 65¢ · No 35¢" for a card. */
export function pricePair(chance: Chance): string | null {
  return chance.yes === null || chance.no === null ? null : `Yes ${formatCents(chance.yes)} · No ${formatCents(chance.no)}`;
}

/** The Markets page shows today's markets, or else the latest day that has any, and says which (F3). */
export function pickDay<T extends { day: number }>(rows: readonly T[], today: number): { day: number | null; isToday: boolean; rows: T[] } {
  const days = rows.map((r) => r.day);
  if (days.length === 0) return { day: null, isToday: false, rows: [] };
  const day = days.includes(today) ? today : Math.max(...days);
  return { day, isToday: day === today, rows: rows.filter((r) => r.day === day) };
}

/** A day as words: "Thursday, October 8, 2026". */
export function dayWords(day: number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(Date.UTC(Math.floor(day / 10000), (Math.floor(day / 100) % 100) - 1, day % 100)),
  );
}

/** Before 9:00 AM ET on the day, when the morning's contracts appear (F3). */
export function contractsNotYet(today: number, nowSeconds: number): boolean {
  return nowSeconds < newYorkTime(today, 9, 0);
}
