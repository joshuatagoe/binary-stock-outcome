// A Buy No limit order's done words (F6, D39, D143): worked out from the program's own Fill and PairsMinted events, the wallet's
// No and USDC, and what the book still holds of the order. A Buy No limit mints a pair for every No it asks for: the sold ones keep
// their No, the rest rest as a paired offer (D142). The words are said only when the events and the balances agree.
import { describe, expect, it } from 'vitest';
import { describeLanded } from '../src/outcome.ts';

const usdc = (n: number) => BigInt(Math.round(n * 1_000_000));
const base = { action: 'buyNo', kind: 'Limit', quantity: 10, priceCents: 33, selfTrades: [], pairsClosed: 0n } as const;
const words = (over: Record<string, unknown>) => describeLanded({ ...base, ...over } as never);

describe('Buy No · Limit: what the done message says', () => {
  it('nothing sold yet: the order is placed and 10.00 USDC is locked as 10 pairs', () => {
    expect(words({ resting: 10, fills: [], pairsMinted: 10n, delta: { usdc: -usdc(10), yes: 0n, no: 0n } })).toBe(
      'Order placed · Buy 10 No at 33¢ · selling 10 Yes at 67¢ · 10.00 USDC locked',
    );
  });

  it('F6: 4 sold at 67¢ and 6 rest: the 4 No cost 33¢ each, and 6.00 USDC stays locked', () => {
    // The wallet paid 10.00 for the pairs and was paid 4 × 67¢ = 2.68 by the bids: 7.32 out.
    expect(words({ resting: 6, fills: [{ quantity: 4, priceCents: 67 }], pairsMinted: 10n, delta: { usdc: -usdc(7.32), yes: 0n, no: 4n } })).toBe(
      'Bought 4 of 10 No at 33¢ · 1.32 USDC. 6 are resting on the book · 6.00 USDC locked.',
    );
  });

  it('everything sold at once: "Bought 10 No at 33¢ · 3.30 USDC"', () => {
    expect(words({ resting: 0, fills: [{ quantity: 10, priceCents: 67 }], pairsMinted: 10n, delta: { usdc: -usdc(3.3), yes: 0n, no: 10n } })).toBe(
      'Bought 10 No at 33¢ · 3.30 USDC',
    );
  });

  it('sold to better bids: the average is the net price, 30¢ when the bids paid 70¢', () => {
    expect(words({ resting: 0, fills: [{ quantity: 10, priceCents: 70 }], pairsMinted: 10n, delta: { usdc: -usdc(3), yes: 0n, no: 10n } })).toBe(
      'Bought 10 No at 30¢ · 3.00 USDC',
    );
  });

  it('D90: the wallet’s own bid that the order would have hit is cancelled and refunded, and the refund is not taken for a cheaper No', () => {
    // 4 sold at 67¢ to others (2.68), the wallet's own bid of 5 at 70¢ cancelled and refunded (3.50): 10.00 out, 6.18 back.
    const text = words({
      resting: 6,
      fills: [{ quantity: 4, priceCents: 67 }],
      pairsMinted: 10n,
      selfTrades: [{ side: 'Buy', quantity: 5, priceCents: 70 }],
      delta: { usdc: -usdc(10) + usdc(2.68) + usdc(3.5), yes: 0n, no: 4n },
    });
    expect(text).toBe(
      'Your bid of 5 Yes at 70¢ was cancelled: your own order would have traded with it. Bought 4 of 10 No at 33¢ · 1.32 USDC. 6 are resting on the book · 6.00 USDC locked.',
    );
  });

  it('says nothing about money when the events and the wallet disagree', () => {
    // The wallet's No change is not the Yes the events sold.
    expect(words({ resting: 6, fills: [{ quantity: 4, priceCents: 67 }], pairsMinted: 10n, delta: { usdc: -usdc(7.32), yes: 0n, no: 3n } })).toBe(
      'Your order landed. Your balances and Open orders show what filled and what rests.',
    );
    // The pairs minted are not the sold ones plus the resting ones.
    expect(words({ resting: 5, fills: [{ quantity: 4, priceCents: 67 }], pairsMinted: 10n, delta: { usdc: -usdc(7.32), yes: 0n, no: 4n } })).toBe(
      'Your order landed. Your balances and Open orders show what filled and what rests.',
    );
    // The USDC does not fit the events.
    expect(words({ resting: 6, fills: [{ quantity: 4, priceCents: 67 }], pairsMinted: 10n, delta: { usdc: -usdc(7), yes: 0n, no: 4n } })).toBe(
      'Your order landed. Your balances and Open orders show what filled and what rests.',
    );
  });

  it('cannot tell without the events, the book’s count or the transaction', () => {
    const said = 'Your order landed. Your balances and Open orders show what filled and what rests.';
    expect(words({ resting: 10, pairsMinted: 10n, delta: { usdc: -usdc(10), yes: 0n, no: 0n } })).toBe(said);
    expect(words({ resting: null, fills: [], pairsMinted: 10n, delta: { usdc: -usdc(10), yes: 0n, no: 0n } })).toBe(said);
    expect(words({ resting: 10, fills: [], pairsMinted: 10n, delta: null })).toBe(said);
  });

  it('a Buy No limit that met only the wallet’s own bid, and placed nothing', () => {
    expect(
      words({ resting: 0, fills: [], pairsMinted: 0n, selfTrades: [{ side: 'Buy', quantity: 10, priceCents: 70 }], delta: { usdc: usdc(7), yes: 0n, no: 0n } }),
    ).toBe('Your bid of 10 Yes at 70¢ was cancelled: your own order would have traded with it.');
  });
});
