// D15: the default worst price on a Market order. The price of the last book level needed to fill the whole quantity,
// moved 1 cent against the trader, within 1 to 99 cents (scripts/arch/cap.mjs).

/** A book level: [price in cents, quantity]. Levels are listed best first. */
export type Level = readonly [priceCents: number, quantity: number];

export type WorstPrice = { ok: true; cents: number } | { ok: false; reason: 'not-enough-on-the-book' };

/**
 * `side` is what the trader does with Yes. A buy walks the asks and caps the price above; a sell walks the bids and floors it below.
 * Not enough on the book means the ticket offers a limit order instead.
 */
export function worstPrice(side: 'buy' | 'sell', levels: readonly Level[], quantity: number): WorstPrice {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError('The quantity must be a whole number above zero');
  let left = quantity;
  for (const [price, size] of levels) {
    left -= size;
    if (left <= 0) return { ok: true, cents: side === 'buy' ? Math.min(price + 1, 99) : Math.max(price - 1, 1) };
  }
  return { ok: false, reason: 'not-enough-on-the-book' };
}

export type TradeAction = 'buyYes' | 'sellYes' | 'buyNo' | 'sellNo';

export interface Book {
  asks: readonly Level[];
  bids: readonly Level[];
}

export type DefaultWorst =
  | { ok: true; worstYesCents: number; traderCents: number; totalCents: number }
  | { ok: false; reason: 'not-enough-on-the-book' };

/**
 * The four buttons. Buy Yes and Sell No go to the asks (Sell No buys Yes first, D38); Sell Yes and Buy No go to the bids (Buy No sells
 * the Yes it mints, D5). `worstYesCents` is the Yes price the program receives; `traderCents` is the price the ticket shows
 * (the No price, 100 minus the Yes price, on the two No buttons); `totalCents` is that price times the quantity.
 */
export function defaultWorst(action: TradeAction, book: Book, quantity: number): DefaultWorst {
  const walksAsks = action === 'buyYes' || action === 'sellNo';
  const r = worstPrice(walksAsks ? 'buy' : 'sell', walksAsks ? book.asks : book.bids, quantity);
  if (!r.ok) return r;
  const traderCents = action === 'buyNo' || action === 'sellNo' ? 100 - r.cents : r.cents;
  return { ok: true, worstYesCents: r.cents, traderCents, totalCents: traderCents * quantity };
}
