// What happened to an order, said from the wallet's balances before and after it (D13: after a send, the site re-reads
// what actually happened; USERS.md F4 to F7 give the words). The balances are USDC base units and whole Yes or No tokens.
import { formatCents, formatUsdcUnits, USDC_UNITS_PER_CENT, type TradeAction } from '@meridian/shared';

/** The average price in whole cents, to the nearest cent, so the words multiply out. */
export function averageCents(moneyUnits: bigint, filled: number): number {
  const per = BigInt(filled) * USDC_UNITS_PER_CENT;
  return Number((moneyUnits * 2n + per) / (2n * per));
}

export type Balances = { usdc: bigint; yes: bigint; no: bigint };

export type OutcomeInput = {
  action: TradeAction;
  quantity: number;
  /** The worst price the ticket showed: the Yes price, or on the two No buttons the No price. */
  worstCents: number;
  before: Balances | null;
  after: Balances | null;
};

export function describeOutcome({ action, quantity, worstCents, before, after }: OutcomeInput): string {
  if (!before || !after) return 'Your order landed. Your balances will show what filled.';
  const buying = action === 'buyYes' || action === 'buyNo';
  const token = action === 'buyYes' || action === 'sellYes' ? 'yes' : 'no';
  const tokens = token === 'yes' ? 'Yes' : 'No';
  const filled = Number(buying ? after[token] - before[token] : before[token] - after[token]);
  const money = buying ? before.usdc - after.usdc : after.usdc - before.usdc;
  const worst = formatCents(worstCents);
  // The Yes side of the book that a No order trades against.
  const yesCents = formatCents(100 - worstCents);
  const reason: Record<TradeAction, string> = {
    buyYes: `nobody was selling at ${worst} or less`,
    sellYes: `nobody was buying at ${worst} or more`,
    buyNo: `not enough buyers of Yes at ${yesCents} or more`,
    sellNo: `not enough sellers of Yes at ${yesCents} or less`,
  };
  const verb = buying ? 'Bought' : 'Sold';
  if (filled <= 0) {
    if (action === 'buyYes') return `No Yes was bought: nobody is selling at ${worst} or less. Raise your limit, or place a limit order.`;
    if (action === 'sellYes') return `No Yes was sold: nobody is buying at ${worst} or more. Lower your limit, or place a limit order.`;
    return `Nothing was ${buying ? 'bought' : 'sold'}: ${reason[action]}.`;
  }
  const average = formatCents(averageCents(money, filled));
  const amount = buying ? formatUsdcUnits(money) : `received ${formatUsdcUnits(money)}`;
  if (filled >= quantity) return `${verb} ${filled} ${tokens} at ${average} · ${amount}`;
  const left = quantity - filled;
  return `${verb} ${filled} of ${quantity} ${tokens} at ${average} · ${amount}. The other ${left} weren't ${buying ? 'bought' : 'sold'}: ${reason[action]}.`;
}

export type LimitOutcomeInput = {
  action: 'buyYes' | 'sellYes';
  quantity: number;
  priceCents: number;
  /** How much of this order rests in the book now (read from the book), or null when that could not be read. */
  resting: number | null;
  before: Balances | null;
  after: Balances | null;
};

/**
 * A limit order's words (USERS.md F6). What rests is locked in the book, not in the wallet, so the fills are the balance
 * change less what is locked.
 */
export function describeLimitOutcome({ action, quantity, priceCents, resting, before, after }: LimitOutcomeInput): string {
  if (resting === null || !before || !after) return 'Your order landed. Your balances and Open orders show what filled and what rests.';
  const buying = action === 'buyYes';
  const price = formatCents(priceCents);
  const lockedUnits = BigInt(resting * priceCents) * USDC_UNITS_PER_CENT;
  const filled = Number(buying ? after.yes - before.yes : before.yes - after.yes - BigInt(resting));
  const money = buying ? before.usdc - after.usdc - lockedUnits : after.usdc - before.usdc;
  const locked = buying ? `${formatUsdcUnits(lockedUnits)} locked` : `${resting} Yes locked`;
  if (filled <= 0) {
    if (resting === 0) return 'Your order was not placed: it would have traded with your own resting order, which was cancelled.';
    return `Order placed · ${buying ? 'Buy' : 'Sell'} ${quantity} Yes at ${price} · ${locked}`;
  }
  const average = formatCents(averageCents(money, filled));
  const amount = buying ? formatUsdcUnits(money) : `received ${formatUsdcUnits(money)}`;
  const verb = buying ? 'Bought' : 'Sold';
  if (resting === 0) return filled >= quantity ? `${verb} ${filled} Yes at ${average} · ${amount}` : `${verb} ${filled} of ${quantity} Yes at ${average} · ${amount}`;
  return `${verb} ${filled} of ${quantity} Yes at ${average} · ${amount}. ${resting} are resting on the book · ${locked}.`;
}

import type { SelfTrade, TakerFill } from './landed.ts';

export type LandedInput = {
  action: TradeAction;
  kind: 'Market' | 'Limit';
  quantity: number;
  /** The worst price the ticket showed (Market). */
  worstCents?: number;
  /** The limit price (Limit). */
  priceCents?: number;
  resting: number | null;
  /** The trader's own token movements in the landed transaction, or null when it could not be read. */
  delta: Balances | null;
  selfTrades: SelfTrade[];
  /** The trader's own fills, pairs minted and pairs closed, from the program's events (D143). Buy No and Sell No need them. */
  fills?: TakerFill[];
  pairsMinted?: bigint;
  pairsClosed?: bigint;
};

const ZERO: Balances = { usdc: 0n, yes: 0n, no: 0n };
const COULD_NOT_TELL = 'Your order landed. Your balances and Open orders show what filled and what rests.';

/**
 * Buy No and Sell No (D143): what was bought or sold, and for how much, from the program's own Fill events. Each Yes that
 * changed hands at p cents is a No at 100 - p. The wallet's balances must agree with the events, or null: the USDC the
 * wallet gained includes the refund of its own cancelled bids (Buy No), which would make the No look cheaper than it was.
 */
function noMovements(i: LandedInput, delta: Balances): Balances | null {
  if (!i.fills || i.pairsMinted === undefined || i.pairsClosed === undefined) return null;
  const buying = i.action === 'buyNo';
  const filled = i.fills.reduce((n, f) => n + f.quantity, 0);
  const cents = i.fills.reduce((n, f) => n + f.quantity * (100 - f.priceCents), 0);
  const money = BigInt(cents) * USDC_UNITS_PER_CENT;
  const refunded = i.selfTrades.filter((s) => s.side === 'Buy').reduce((n, s) => n + BigInt(s.quantity * s.priceCents), 0n) * USDC_UNITS_PER_CENT;
  // A market order mints (or closes) exactly the pairs it fills; the No tokens and the USDC must say the same.
  const pairs = buying ? i.pairsMinted : i.pairsClosed;
  const other = buying ? i.pairsClosed : i.pairsMinted;
  if (pairs !== BigInt(filled) || other !== 0n) return null;
  if (buying ? delta.no !== BigInt(filled) || delta.usdc !== refunded - money : delta.no !== -BigInt(filled) || delta.usdc !== money) return null;
  return buying ? { usdc: -money, yes: 0n, no: BigInt(filled) } : { usdc: money, yes: 0n, no: -BigInt(filled) };
}

/** The done words, from the landed transaction's own movements and events (C, D90). */
export function describeLanded(i: LandedInput): string {
  if (!i.delta) return COULD_NOT_TELL;
  const noToken = i.action === 'buyNo' || i.action === 'sellNo';
  // The No buttons are market orders. Their money comes from the events, never from a balance that includes refunds.
  const counted = noToken ? noMovements(i, i.delta) : i.delta;
  if (!counted) return COULD_NOT_TELL;
  const base =
    i.kind === 'Limit'
      ? describeLimitOutcome({ action: i.action as 'buyYes' | 'sellYes', quantity: i.quantity, priceCents: i.priceCents ?? 0, resting: i.resting, before: ZERO, after: i.delta })
      : describeOutcome({ action: i.action, quantity: i.quantity, worstCents: i.worstCents ?? 0, before: ZERO, after: counted });
  if (i.selfTrades.length === 0) return base;
  const own = i.selfTrades
    .map((s) => `Your ${s.side === 'Sell' ? 'offer' : 'bid'} of ${s.quantity} Yes at ${s.priceCents}¢ was cancelled: your own order would have traded with it.`)
    .join(' ');
  const token = i.action === 'buyYes' || i.action === 'sellYes' ? i.delta.yes : counted.no;
  const filledNothing = i.kind === 'Limit' ? base.startsWith('Your order was not placed') : token === 0n;
  return filledNothing ? own : `${own} ${base}`;
}
