// What a landed transaction itself says (C, D90): the trader's own token movements and the program's OrderCancelled
// events, instead of the difference between two balance reads (which any other transfer can disturb).
import { CancelReason, getOrderCancelledEventEncoder, Side } from '@meridian/client';
import { address, getBase58Decoder } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import { EVENT_IX_TAG, parseLanded, type LandedTx } from '../src/landed.ts';
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
