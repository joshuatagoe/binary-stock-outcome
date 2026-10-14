// The trader's own open orders and positions, read from a book and the wallet's tokens, and the words for them (USERS.md F6,
// F13; D39, D99, D142). Pure functions of the accounts, so the tests can check every word and number.
import type { Book } from '@meridian/client';
import { centsToUsdcUnits, formatCents, formatUsdc, formatUsdcUnits, type Level } from '@meridian/shared';
import type { Address } from '@solana/kit';
import { walkBook } from './ticket.ts';

/** The order flag the program sets on a Buy No offer's unsold Yes (programs/meridian/src/book.rs, D142). */
const PAIRED = 1;

export type OpenOrder = {
  orderId: bigint;
  /** A bid buys Yes; an offer sells it. */
  side: 'Buy' | 'Sell';
  priceCents: number;
  /** How many are still resting. */
  open: number;
  /** A Buy No limit order's unsold pairs: the Yes rests as an offer and the No wait in the book (D39, D142). */
  paired: boolean;
};

type BookView = Pick<Book, 'bids' | 'asks' | 'bidCount' | 'askCount' | 'traders'>;

/** What the book holds for an owner until Return to owner pays it out (D99, D142), in USDC base units and whole tokens. */
export type BookBalance = { usdc: bigint; yes: bigint; no: bigint };

/** The orders in a book whose trader entry belongs to the wallet. */
export function ownOrders(book: BookView, owner: Address): OpenOrder[] {
  const mine = (trader: number) => book.traders[trader]?.owner === owner;
  const out: OpenOrder[] = [];
  for (const o of book.bids.slice(0, book.bidCount)) {
    if (mine(o.trader)) out.push({ orderId: o.orderId, side: 'Buy', priceCents: o.price, open: o.quantity, paired: false });
  }
  for (const o of book.asks.slice(0, book.askCount)) {
    if (mine(o.trader)) out.push({ orderId: o.orderId, side: 'Sell', priceCents: o.price, open: o.quantity, paired: (o.flags & PAIRED) !== 0 });
  }
  return out;
}

export function ownBalance(book: BookView, owner: Address): BookBalance {
  const total: BookBalance = { usdc: 0n, yes: 0n, no: 0n };
  for (const t of book.traders) {
    if (t.owner !== owner) continue;
    total.usdc += t.freeUsdc;
    total.yes += t.freeYes;
    total.no += t.freeNo;
  }
  return total;
}

/** USDC the orders lock: a bid its price times its open count, a paired offer 1.00 a pair (D142). A plain offer locks Yes instead. */
export function lockedUsdc(orders: readonly OpenOrder[]): bigint {
  let cents = 0;
  for (const o of orders) {
    if (o.side === 'Buy') cents += o.priceCents * o.open;
    else if (o.paired) cents += 100 * o.open;
  }
  return centsToUsdcUnits(cents);
}

/** Yes the trader's plain offers hold. A paired offer's Yes were minted for it, so they are not Yes the trader could sell. */
export function lockedYes(orders: readonly OpenOrder[]): bigint {
  return BigInt(orders.filter((o) => o.side === 'Sell' && !o.paired).reduce((n, o) => n + o.open, 0));
}

/** "USDC 14.00 available · 6.00 in orders", and what is on its way from the book to the wallet when something is (D99). */
export function headerLine(available: bigint, inOrders: bigint, onItsWay: bigint): string {
  const base = `USDC ${formatUsdc(available)} available · ${formatUsdc(inOrders)} in orders`;
  return onItsWay > 0n ? `${base} · ${formatUsdc(onItsWay)} on its way to your wallet` : base;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export type OrderWords = { headline: string; detail: string; cancelName: string };

/**
 * One open order, in F6's words. The chain keeps what is left, not the size it was placed at, so the size comes from what this
 * browser remembered when it placed the order. Without it (or with one that cannot be right) the row claims no size and no filled count.
 */
export function describeOrder(order: OpenOrder, original: number | null): OrderWords {
  const known = original !== null && Number.isInteger(original) && original >= order.open ? original : null;
  const filled = known === null ? null : known - order.open;
  const filledPart = filled === null ? [] : [`${filled} filled`];
  const price = formatCents(order.priceCents);
  const asked = known ?? order.open;
  const suffix = known !== null && known !== order.open ? `, ${order.open} ${order.paired ? 'left' : 'open'}` : '';
  if (order.paired) {
    const noCents = 100 - order.priceCents;
    return {
      headline:
        known === null
          ? `Buying No: ${order.open} left, selling their Yes at ${price}. If all fill, you hold ${order.open} more No at ${formatCents(noCents)}.`
          : `Buying ${known} No: selling ${known} Yes at ${price}. If all fill, you hold ${known} No at ${formatCents(noCents)}.`,
      detail: [...filledPart, `${order.open} left`, `${formatUsdc(centsToUsdcUnits(100 * order.open))} USDC locked as ${plural(order.open, 'pair', 'pairs')}`].join(' · '),
      cancelName: `Cancel order: buy ${asked} No at ${noCents} cents${suffix}`,
    };
  }
  const buying = order.side === 'Buy';
  const locked = buying ? `${formatUsdc(centsToUsdcUnits(order.priceCents * order.open))} USDC locked` : `${order.open} Yes locked`;
  return {
    headline: known === null ? `${buying ? 'Buy' : 'Sell'} Yes at ${price}` : `${buying ? 'Buy' : 'Sell'} ${known} Yes at ${price}`,
    detail: [...filledPart, `${order.open} open`, locked].join(' · '),
    cancelName: `Cancel order: ${buying ? 'buy' : 'sell'} ${asked} Yes at ${order.priceCents} cents${suffix}`,
  };
}

/**
 * What a position would fetch if sold into the book now: not the midpoint (F13, F1.23). A Yes sells into the bids. A No sells by
 * buying Yes from the asks and closing the pairs (D38), so it gets 100 minus each ask. `sellable` is how many the book can take.
 */
export function worthIfSold(side: 'Yes' | 'No', quantity: number, book: { asks: readonly Level[]; bids: readonly Level[] }): { units: bigint; sellable: number } {
  if (side === 'Yes') {
    const walked = walkBook(book.bids, quantity);
    return { units: centsToUsdcUnits(walked.cents), sellable: walked.filled };
  }
  const walked = walkBook(book.asks, quantity);
  return { units: centsToUsdcUnits(100 * walked.filled - walked.cents), sellable: walked.filled };
}

export type PositionInput = {
  side: 'Yes' | 'No';
  /** Everything the trader holds: the wallet's tokens and what waits in the book for Return to owner. */
  quantity: number;
  /** Of those, how many still wait in the book (D99). */
  pending: number;
  /** More of the same token locked in the trader's open orders on this market. */
  inOrders: number;
  book: { asks: readonly Level[]; bids: readonly Level[] };
};

/** "10 Yes", with how many still wait in the book for Return to owner and how many more sit in an open order. */
export function heldWords({ side, quantity, pending, inOrders }: Omit<PositionInput, 'book'>): string {
  const notes = [pending > 0 ? `${pending} on their way to your wallet` : null, inOrders > 0 ? `${inOrders} more in an open order` : null].filter(Boolean);
  return notes.length > 0 ? `${quantity} ${side} (${notes.join('; ')})` : `${quantity} ${side}`;
}

/** F13's position row without the entry price and the profit or loss, which need History: "10 Yes · worth 7.00 if sold now · pays 10.00 if Yes wins". */
export function positionWords({ side, quantity, pending, inOrders, book }: PositionInput): string {
  const held = heldWords({ side, quantity, pending, inOrders });
  const { units, sellable } = worthIfSold(side, quantity, book);
  const worth =
    sellable === 0
      ? `can’t be sold now: nobody is ${side === 'Yes' ? 'buying' : 'selling Yes'}`
      : sellable === quantity
        ? `worth ${formatUsdc(units)} if sold now`
        : `worth ${formatUsdc(units)} if sold now (only ${sellable} of ${quantity} have buyers)`;
  return `${held} · ${worth} · pays ${formatUsdc(centsToUsdcUnits(100 * quantity))} if ${side} wins`;
}

/** A cancel as the landed transaction recorded it (an OrderCancelled event with the owner as the reason, then Redeemed (pairs) for a paired offer). */
export type CancelledOrders = {
  cancels: { side: 'Buy' | 'Sell'; priceCents: number; quantity: number }[];
  pairsClosed: bigint;
  pairsUsdc: bigint;
};

const CANCELLED_WITHOUT_EVENTS = 'Order cancelled. What it held is back in your balance on this market and will go to your wallet.';

/** F6's done words: "Order cancelled · 3.60 USDC returned", and for a paired offer "Order cancelled · 6 pairs closed · 6.00 USDC returned". */
export function describeCancelled(c: CancelledOrders | null): string {
  if (!c || c.cancels.length === 0) return CANCELLED_WITHOUT_EVENTS;
  const parts = c.cancels.map((o) => {
    if (o.side === 'Buy') return `${formatUsdcUnits(centsToUsdcUnits(o.priceCents * o.quantity))} returned`;
    if (c.pairsClosed > 0n) return `${plural(Number(c.pairsClosed), 'pair', 'pairs')} closed · ${formatUsdcUnits(c.pairsUsdc)} returned`;
    return `${o.quantity} Yes returned`;
  });
  return `Order cancelled · ${parts.join(' · ')}`;
}

/**
 * A cancel credits the owner's balance in the book; Return to owner pays it to the wallet about 30 seconds later (D99). Each read of the
 * book either finds the balance empty, which counts one more, or finds something there (or can't tell), which starts the count again.
 */
export function nextEmptyReads(previous: number, balance: BookBalance | null): number {
  if (!balance || balance.usdc !== 0n || balance.yes !== 0n || balance.no !== 0n) return 0;
  return previous + 1;
}

/**
 * A cancel stays "on its way to your wallet" until the book has been read empty twice in a row since it landed, since one read can
 * come from a node that has not seen the cancel yet.
 */
export function returnStatus(emptyReads: number): 'on-its-way' | 'returned' {
  return emptyReads >= 2 ? 'returned' : 'on-its-way';
}
