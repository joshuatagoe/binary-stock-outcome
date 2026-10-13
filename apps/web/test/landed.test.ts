// What a landed transaction itself says (C, D90): the trader's own token movements and the program's OrderCancelled
// events, instead of the difference between two balance reads (which any other transfer can disturb).
import {
  CancelReason,
  getOrderCancelledEventEncoder,
  RedeemMode,
  Side,
} from '@meridian/client';
import { address, getBase58Decoder } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import { EVENT_IX_TAG, parseLanded, type LandedTx } from '../src/landed.ts';
import { fillEvent, pairsMintedEvent, redeemedEvent, type EventInstruction } from './fixtures/events.ts';
import { averageCents, describeLanded } from '../src/outcome.ts';

const owner = 'OWNER' as never;
const other = 'OTHER' as never;
const ids = { owner, usdcMint: 'USDC' as never, yesMint: 'YES' as never, noMint: 'NO' as never };
const bal = (accountIndex: number, mint: string, who: string, amount: bigint) => ({ accountIndex, mint, owner: who, uiTokenAmount: { amount: String(amount) } });

const MARKET = address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q');
function eventInstruction(who: string, over: Record<string, unknown> = {}) {
  const payload = getOrderCancelledEventEncoder().encode({
    market: MARKET,
    owner: address(who),
    orderId: 7,
    side: Side.Sell,
    price: 65,
    quantity: 10,
    reason: CancelReason.SelfTrade,
    ...over,
  } as never);
  const data = new Uint8Array(EVENT_IX_TAG.length + payload.length);
  data.set(EVENT_IX_TAG);
  data.set(payload, EVENT_IX_TAG.length);
  return { programIdIndex: 1, accounts: [0], data: getBase58Decoder().decode(data) };
}

const tx = (over: Partial<NonNullable<LandedTx>['meta']> = {}): LandedTx => ({
  meta: {
    preTokenBalances: [bal(2, 'USDC', 'OWNER', 20_000_000n), bal(5, 'USDC', 'OTHER', 99n)],
    postTokenBalances: [bal(2, 'USDC', 'OWNER', 13_500_000n), bal(3, 'YES', 'OWNER', 10n), bal(5, 'USDC', 'OTHER', 6_500_099n)],
    innerInstructions: [],
    ...over,
  },
});

describe("the trader's own movements in a landed transaction", () => {
  it('are the post balances less the pre balances of the trader’s accounts only, a missing pre entry counting as zero', () => {
    expect(parseLanded(tx(), ids)?.delta).toEqual({ usdc: -6_500_000n, yes: 10n, no: 0n });
  });

  it('are null when the transaction is not available', () => {
    expect(parseLanded(null, ids)).toBeNull();
    expect(parseLanded({ meta: null }, ids)).toBeNull();
  });

  it('reads the trader’s own self-trade cancellations from the program’s events (D90), and nobody else’s', () => {
    const landed = parseLanded(
      tx({
        innerInstructions: [
          {
            index: 2,
            instructions: [
              eventInstruction('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q'),
              eventInstruction('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q', { reason: CancelReason.Owner }),
              eventInstruction('AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY'),
              { programIdIndex: 1, accounts: [], data: '3Bxs4h24hBtQy9rw' },
            ],
          },
        ],
      }),
      { ...ids, owner: '5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q' as never },
    );
    expect(landed?.selfTrades).toEqual([{ side: 'Sell', quantity: 10, priceCents: 65 }]);
  });
});

const zero = { usdc: 0n, yes: 0n, no: 0n };
const words = (over: Record<string, unknown>) => describeLanded({ action: 'buyYes', kind: 'Market', quantity: 10, worstCents: 66, resting: 0, delta: zero, selfTrades: [], ...over } as never);

describe('the done words, from the landed transaction', () => {
  it('a plain fill reads as before', () => {
    expect(words({ delta: { usdc: -6_500_000n, yes: 10n, no: 0n } })).toBe('Bought 10 Yes at 65¢ · 6.50 USDC');
  });

  it('D90: a resting offer cancelled because it would have traded with the trader’s own order is said so, in USERS.md’s words', () => {
    expect(words({ selfTrades: [{ side: 'Sell', quantity: 10, priceCents: 65 }] })).toBe(
      'Your offer of 10 Yes at 65¢ was cancelled: your own order would have traded with it.',
    );
  });

  it('D90 with a partial fill against others: the cancellation, then what filled', () => {
    expect(words({ selfTrades: [{ side: 'Sell', quantity: 10, priceCents: 65 }], delta: { usdc: -3_300_000n, yes: 5n, no: 0n } })).toBe(
      "Your offer of 10 Yes at 65¢ was cancelled: your own order would have traded with it. Bought 5 of 10 Yes at 66¢ · 3.30 USDC. The other 5 weren't bought: nobody was selling at 66¢ or less.",
    );
  });

  it('a limit order that rests is worded from what the transaction locked and what the book holds', () => {
    expect(words({ action: 'buyYes', kind: 'Limit', priceCents: 60, resting: 10, delta: { usdc: -6_000_000n, yes: 0n, no: 0n } })).toBe(
      'Order placed · Buy 10 Yes at 60¢ · 6.00 USDC locked',
    );
  });

  it('a limit order that met only the trader’s own offer says that, once', () => {
    expect(
      words({ kind: 'Limit', priceCents: 65, resting: 0, selfTrades: [{ side: 'Sell', quantity: 10, priceCents: 65 }] }),
    ).toBe('Your offer of 10 Yes at 65¢ was cancelled: your own order would have traded with it.');
  });

  it('cannot tell without the transaction', () => {
    expect(words({ delta: null })).toBe('Your order landed. Your balances and Open orders show what filled and what rests.');
  });
});

describe('average prices (G)', () => {
  it('round to the nearest cent, so 3 Yes for 2.00 USDC is 67¢, not 66¢', () => {
    expect(averageCents(2_000_000n, 3)).toBe(67);
    expect(averageCents(6_500_000n, 10)).toBe(65);
    expect(averageCents(6_540_000n, 10)).toBe(65);
    expect(averageCents(6_550_000n, 10)).toBe(66);
  });
});

// Buy No and Sell No (D143): their words come from the program's own Fill, PairsMinted and Redeemed events, checked against
// the wallet's balances. Where the two disagree the site says so rather than guess money.
const ME = '5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q';
const BOB = 'AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY';
const fill = fillEvent;
const minted = pairsMintedEvent;
const redeemed = redeemedEvent;
const withEvents = (...instructions: EventInstruction[]) => tx({ innerInstructions: [{ index: 2, instructions }] });
const me = { ...ids, owner: ME as never };

describe('Buy No and Sell No events', () => {
  it("reads the trader's own fills, pairs minted and pairs closed, and nobody else's", () => {
    const landed = parseLanded(
      withEvents(minted(ME, 10), fill(ME, 65, 4), fill(ME, 64, 6), fill(BOB, 60, 9), minted(BOB, 9), redeemed(ME, 3), redeemed(ME, 8, RedeemMode.Winning)),
      me,
    );
    expect(landed?.fills).toEqual([
      { quantity: 4, priceCents: 65 },
      { quantity: 6, priceCents: 64 },
    ]);
    expect(landed?.pairsMinted).toBe(10n);
    expect(landed?.pairsClosed).toBe(3n);
  });

  it('reports none of them for a transaction without events', () => {
    expect(parseLanded(tx(), me)).toMatchObject({ fills: [], pairsMinted: 0n, pairsClosed: 0n });
  });
});

const GENERIC = 'Your order landed. Your balances and Open orders show what filled and what rests.';
const noWords = (over: Record<string, unknown>) =>
  describeLanded({ kind: 'Market', quantity: 10, resting: 0, delta: zero, selfTrades: [], fills: [], pairsMinted: 0n, pairsClosed: 0n, ...over } as never);
const buyNo = (over: Record<string, unknown>) => noWords({ action: 'buyNo', worstCents: 36, ...over });
const sellNo = (over: Record<string, unknown>) => noWords({ action: 'sellNo', worstCents: 19, ...over });

describe('F5: the Buy No done words, from the events', () => {
  it('Bought 10 No at 35¢ · 3.50 USDC, from two fills at 65¢', () => {
    expect(
      buyNo({ fills: [{ quantity: 5, priceCents: 65 }, { quantity: 5, priceCents: 65 }], pairsMinted: 10n, delta: { usdc: -3_500_000n, yes: 0n, no: 10n } }),
    ).toBe('Bought 10 No at 35¢ · 3.50 USDC');
  });

  it("partly filled: Bought 6 of 10 No at 35¢ · 2.10 USDC. The other 4 weren't bought: not enough buyers of Yes at 64¢ or more.", () => {
    expect(buyNo({ fills: [{ quantity: 6, priceCents: 65 }], pairsMinted: 6n, delta: { usdc: -2_100_000n, yes: 0n, no: 6n } })).toBe(
      "Bought 6 of 10 No at 35¢ · 2.10 USDC. The other 4 weren't bought: not enough buyers of Yes at 64¢ or more.",
    );
  });

  it('prices each fill separately: 4 at 65¢ and 6 at 64¢ cost 1.40 + 2.16', () => {
    expect(
      buyNo({ fills: [{ quantity: 4, priceCents: 65 }, { quantity: 6, priceCents: 64 }], pairsMinted: 10n, delta: { usdc: -3_560_000n, yes: 0n, no: 10n } }),
    ).toBe('Bought 10 No at 36¢ · 3.56 USDC');
  });

  it("a self-trade: the refund of the trader's own cancelled bid is not counted as a lower price (D90, D143)", () => {
    // 5 Yes sold to others at 65¢, and the trader's own bid for 5 at 65¢ cancelled and refunded: the wallet gains 3.25 + 3.25 and pays 5.00 for 5 pairs.
    expect(
      buyNo({
        fills: [{ quantity: 5, priceCents: 65 }],
        pairsMinted: 5n,
        selfTrades: [{ side: 'Buy', quantity: 5, priceCents: 65 }],
        delta: { usdc: 1_500_000n, yes: 0n, no: 5n },
      }),
    ).toBe(
      "Your bid of 5 Yes at 65¢ was cancelled: your own order would have traded with it. Bought 5 of 10 No at 35¢ · 1.75 USDC. The other 5 weren't bought: not enough buyers of Yes at 64¢ or more.",
    );
  });

  it('a self-trade and nothing else: only the cancellation is said, and nothing is claimed bought', () => {
    // The wallet is refunded the 6.50 its own bid had locked.
    expect(buyNo({ selfTrades: [{ side: 'Buy', quantity: 10, priceCents: 65 }], delta: { usdc: 6_500_000n, yes: 0n, no: 0n } })).toBe(
      'Your bid of 10 Yes at 65¢ was cancelled: your own order would have traded with it.',
    );
  });

  it('events that disagree with the wallet are never turned into money', () => {
    expect(buyNo({ fills: [{ quantity: 10, priceCents: 65 }], pairsMinted: 10n, delta: { usdc: -3_500_000n, yes: 0n, no: 6n } })).toBe(GENERIC);
    expect(buyNo({ fills: [{ quantity: 10, priceCents: 65 }], pairsMinted: 10n, delta: { usdc: -9_000_000n, yes: 0n, no: 10n } })).toBe(GENERIC);
    expect(buyNo({ fills: [{ quantity: 10, priceCents: 65 }], pairsMinted: 7n, delta: { usdc: -3_500_000n, yes: 0n, no: 10n } })).toBe(GENERIC);
  });

  it('without the events at all it does not guess', () => {
    expect(
      noWords({ action: 'buyNo', worstCents: 36, fills: undefined, pairsMinted: undefined, pairsClosed: undefined, delta: { usdc: -3_500_000n, yes: 0n, no: 10n } }),
    ).toBe(GENERIC);
  });
});

describe('F7: the Sell No done words, from the events', () => {
  it('Sold 10 No at 20¢ · received 2.00 USDC', () => {
    expect(sellNo({ fills: [{ quantity: 10, priceCents: 80 }], pairsClosed: 10n, delta: { usdc: 2_000_000n, yes: 0n, no: -10n } })).toBe(
      'Sold 10 No at 20¢ · received 2.00 USDC',
    );
  });

  it('partly filled reads like F4: how many were not sold, and why', () => {
    expect(sellNo({ fills: [{ quantity: 4, priceCents: 80 }], pairsClosed: 4n, delta: { usdc: 800_000n, yes: 0n, no: -4n } })).toBe(
      "Sold 4 of 10 No at 20¢ · received 0.80 USDC. The other 6 weren't sold: not enough sellers of Yes at 81¢ or less.",
    );
  });

  it("a self-trade: the trader's own offer was cancelled and its Yes came back, not counted as a sale", () => {
    expect(
      sellNo({
        fills: [{ quantity: 5, priceCents: 80 }],
        pairsClosed: 5n,
        selfTrades: [{ side: 'Sell', quantity: 5, priceCents: 80 }],
        delta: { usdc: 1_000_000n, yes: 5n, no: -5n },
      }),
    ).toBe(
      "Your offer of 5 Yes at 80¢ was cancelled: your own order would have traded with it. Sold 5 of 10 No at 20¢ · received 1.00 USDC. The other 5 weren't sold: not enough sellers of Yes at 81¢ or less.",
    );
  });

  it('pairs closed that differ from the fills are never turned into money', () => {
    expect(sellNo({ fills: [{ quantity: 10, priceCents: 80 }], pairsClosed: 9n, delta: { usdc: 2_000_000n, yes: 0n, no: -10n } })).toBe(GENERIC);
  });
});
