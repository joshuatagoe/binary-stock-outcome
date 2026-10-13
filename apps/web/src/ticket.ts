// The ticket's numbers and words (D15, D84; USERS.md F4, F5, F7). Pure, so the tests can check them against
// packages/golden. The default worst price is packages/shared's, not computed here.
import { centsToUsdcUnits, defaultWorst, formatDollars, formatUsdc, type Level, type TradeAction } from '@meridian/shared';

export const TRADE_ACTIONS: readonly TradeAction[] = ['buyYes', 'sellYes', 'buyNo', 'sellNo'];

const NAMES: Record<TradeAction, string> = { buyYes: 'Buy Yes', sellYes: 'Sell Yes', buyNo: 'Buy No', sellNo: 'Sell No' };

/** The button's word, which the confirmation and the history reuse (USERS.md "One verb per action"). */
export const actionName = (action: TradeAction) => NAMES[action];

/** Which token the action trades. */
export const sideOf = (action: TradeAction): 'Yes' | 'No' => (action === 'buyYes' || action === 'sellYes' ? 'Yes' : 'No');
export const isBuy = (action: TradeAction) => action === 'buyYes' || action === 'buyNo';

/** What the trader really pays or receives at the book's prices: the best levels first, up to the quantity. */
export function walkBook(levels: readonly Level[], quantity: number): { filled: number; cents: number } {
  let left = quantity;
  let cents = 0;
  for (const [price, size] of levels) {
    if (left <= 0) break;
    const take = Math.min(left, size);
    cents += take * price;
    left -= take;
  }
  return { filled: quantity - left, cents };
}

export type TicketInput = {
  action: TradeAction;
  book: { asks: readonly Level[]; bids: readonly Level[] };
  quantity: number;
  /** The wallet's USDC in base units, or null when not known (the devnet simulation decides then). */
  usdc: bigint | null;
  /** The Yes (Sell Yes) or No (Sell No) tokens in the wallet, or null when not known (the devnet simulation decides then). */
  held?: bigint | null;
  ticker: string;
  strikeCents: number;
};

export type Ticket =
  | { ok: false; reason: 'bad-quantity' | 'empty-book' | 'not-enough-on-the-book'; message: string }
  | {
      ok: true;
      worstYesCents: number;
      /** The price the ticket shows: the Yes price, or on the two No buttons 100 minus it. */
      traderCents: number;
      /** The most a buyer pays or the least a seller receives, in cents. */
      totalCents: number;
      /** What the instruction takes as its price: Place order and Sell No the worst Yes price, Buy No the most it pays per No. */
      sendPriceCents: number;
      payoff: string;
      limitLine: string;
      /** Why the button is disabled, or null. */
      blocked: string | null;
    };

export function planTicket(i: TicketInput): Ticket {
  const { action, book, quantity } = i;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, reason: 'bad-quantity', message: 'Enter a whole number of contracts, 1 or more.' };
  }
  const walksAsks = action === 'buyYes' || action === 'sellNo';
  const levels = walksAsks ? book.asks : book.bids;
  if (levels.length === 0) {
    return {
      ok: false,
      reason: 'empty-book',
      message: walksAsks
        ? 'No quotes yet: nobody is selling Yes right now. Place a limit order to start the book.'
        : 'No quotes yet: nobody is buying Yes right now. Place a limit order to start the book.',
    };
  }
  const worst = defaultWorst(action, book, quantity);
  if (!worst.ok) {
    const held = levels.reduce((n, [, size]) => n + size, 0);
    return {
      ok: false,
      reason: 'not-enough-on-the-book',
      message: `Only ${held} Yes are ${action === 'buyYes' || action === 'sellNo' ? 'offered' : 'wanted'} right now, so this order can’t fill in full. Lower the quantity, or place a limit order.`,
    };
  }
  const strike = formatDollars(i.strikeCents, { dropZeroCents: true });
  const walked = walkBook(levels, quantity).cents;
  const q = quantity;
  const usdc = (cents: number) => formatUsdc(centsToUsdcUnits(cents));
  let payoff: string;
  let limitLine: string;
  switch (action) {
    case 'buyYes': {
      const pay = walked;
      payoff = `You pay ${usdc(pay)} USDC for ${q} Yes. If ${i.ticker} closes at or above ${strike} at 4:00 PM ET (Pyth price), you get ${usdc(100 * q)}, a profit of ${usdc(100 * q - pay)}. Otherwise you lose ${usdc(pay)}.`;
      limitLine = `You pay at most ${usdc(worst.totalCents)} USDC.`;
      break;
    }
    case 'buyNo': {
      const pay = 100 * q - walked;
      payoff = `You pay ${usdc(pay)} USDC for ${q} No. If ${i.ticker} closes below ${strike}, you get ${usdc(100 * q)}, a profit of ${usdc(100 * q - pay)}. Otherwise you lose ${usdc(pay)}.`;
      limitLine = `You pay at most ${usdc(worst.totalCents)} USDC.`;
      break;
    }
    case 'sellYes': {
      payoff = `You sell ${q} Yes for ${usdc(walked)} USDC.`;
      limitLine = `You receive at least ${usdc(worst.totalCents)} USDC.`;
      break;
    }
    case 'sellNo': {
      payoff = `You sell ${q} No for ${usdc(100 * q - walked)} USDC.`;
      limitLine = `You receive at least ${usdc(worst.totalCents)} USDC.`;
      break;
    }
  }
  let blocked: string | null = null;
  if (isBuy(action) && i.usdc !== null) {
    const need = centsToUsdcUnits(worst.totalCents);
    if (i.usdc < need) blocked = `You need up to ${formatUsdc(need)} USDC; you have ${formatUsdc(i.usdc)}.`;
  }
  if (!isBuy(action) && i.held != null && i.held < BigInt(quantity)) {
    const token = sideOf(action);
    blocked = i.held === 0n ? `You hold no ${token} to sell.` : `You hold ${i.held} ${token}; you can sell at most ${i.held}.`;
  }
  return {
    ok: true,
    worstYesCents: worst.worstYesCents,
    traderCents: worst.traderCents,
    totalCents: worst.totalCents,
    sendPriceCents: action === 'buyNo' ? worst.traderCents : worst.worstYesCents,
    payoff,
    limitLine,
    blocked,
  };
}

export type LimitInput = { action: TradeAction; quantity: number; priceCents: number; usdc: bigint | null };

export type LimitTicket =
  | { ok: false; message: string }
  | { ok: true; sendPriceCents: number; payoff: string; limitLine: string; blocked: string | null };

/**
 * A limit order on the Yes buttons (F6): the trader names the Yes price, and what cannot trade at once rests on the book. The
 * No buttons are market orders only here.
 */
export function planLimit({ action, quantity, priceCents, usdc }: LimitInput): LimitTicket {
  if (action !== 'buyYes' && action !== 'sellYes') return { ok: false, message: 'Limit orders are for Buy Yes and Sell Yes.' };
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, message: 'Enter a whole number of contracts, 1 or more.' };
  if (!Number.isInteger(priceCents) || priceCents < 1 || priceCents > 99) return { ok: false, message: 'Enter a price from 1¢ to 99¢.' };
  const total = centsToUsdcUnits(priceCents * quantity);
  const price = `${priceCents}¢`;
  if (action === 'buyYes') {
    const need = total;
    return {
      ok: true,
      sendPriceCents: priceCents,
      payoff: `You offer to buy ${quantity} Yes at ${price} each. Whatever is not bought at once rests on the book, and ${formatUsdc(total)} USDC is locked until it fills or you cancel.`,
      limitLine: `You pay at most ${formatUsdc(total)} USDC.`,
      blocked: usdc !== null && usdc < need ? `You need up to ${formatUsdc(need)} USDC; you have ${formatUsdc(usdc)}.` : null,
    };
  }
  return {
    ok: true,
    sendPriceCents: priceCents,
    payoff: `You offer to sell ${quantity} Yes at ${price} each. Whatever is not sold at once rests on the book until it fills or you cancel.`,
    limitLine: `You receive at least ${formatUsdc(total)} USDC.`,
    blocked: null,
  };
}

/**
 * D88: an order that could cost more than 100.00 USDC at its worst price asks first. `offered` is how much of the book is at
 * the trader's price or better (undefined where that isn't the number to show, as for Buy No).
 */
export function largeOrderConfirm(i: { action: TradeAction; quantity: number; totalCents: number; offered: number | undefined; priceCents: number }): string | null {
  if (!isBuy(i.action) || i.totalCents <= LARGE_ORDER_CENTS) return null;
  const head = `${isBuy(i.action) ? 'Buy' : 'Sell'} ${i.quantity} ${sideOf(i.action)} for up to ${formatUsdc(centsToUsdcUnits(i.totalCents))} USDC?`;
  if (i.offered === undefined || i.offered >= i.quantity) return head;
  if (i.offered === 0) return `${head} Nothing is offered at ${i.priceCents}¢ or less right now, so most of this order may not fill.`;
  return `${head} Only ${i.offered} are offered at ${i.priceCents}¢ or less right now, so most of this order may not fill.`;
}

/** D88's line, a setting: 100.00 USDC. */
export const LARGE_ORDER_CENTS = 10_000;

/** The order an attempt was for, as saved with it. */
export type SavedOrder = { action: TradeAction; quantity: number; kind: 'Market' | 'Limit'; sendPriceCents: number };

/**
 * Whether the ticket still says the order that expired. Try again re-sends that order only; a ticket that has changed is a new
 * order and goes through the confirm and the checks again (B).
 */
export function sameOrder(saved: SavedOrder | null, ticket: { action: TradeAction; quantity: number; mode: 'Market' | 'Limit'; limitCents: number }): boolean {
  if (!saved) return false;
  if (saved.action !== ticket.action || saved.quantity !== ticket.quantity || saved.kind !== ticket.mode) return false;
  return saved.kind === 'Market' || saved.sendPriceCents === ticket.limitCents;
}
