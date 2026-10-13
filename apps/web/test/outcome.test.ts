// What happened, said from the balances before and after (D13: after a send, the site re-reads the chain; F4 to F7's done messages).
import { describe, expect, it } from 'vitest';
import { describeLimitOutcome, describeOutcome } from '../src/outcome.ts';

const usdc = (dollars: number) => BigInt(Math.round(dollars * 1_000_000));
const bal = (u: number, yes: bigint, no: bigint) => ({ usdc: usdc(u), yes, no });

describe('the done message', () => {
  it('F4: Bought 10 Yes at 65¢ · 6.50 USDC', () => {
    expect(describeOutcome({ action: 'buyYes', quantity: 10, worstCents: 66, before: bal(20, 0n, 0n), after: bal(13.5, 10n, 0n) })).toBe(
      'Bought 10 Yes at 65¢ · 6.50 USDC',
    );
  });

  it('F4: partly filled says how many were not bought and why', () => {
    expect(describeOutcome({ action: 'buyYes', quantity: 10, worstCents: 66, before: bal(20, 0n, 0n), after: bal(16.7, 5n, 0n) })).toBe(
      "Bought 5 of 10 Yes at 66¢ · 3.30 USDC. The other 5 weren't bought: nobody was selling at 66¢ or less.",
    );
  });

  it('F4: nothing filled', () => {
    expect(describeOutcome({ action: 'buyYes', quantity: 10, worstCents: 66, before: bal(20, 0n, 0n), after: bal(20, 0n, 0n) })).toBe(
      'No Yes was bought: nobody is selling at 66¢ or less. Raise your limit, or place a limit order.',
    );
  });

  it('F7: Sold 10 Yes at 80¢ · received 8.00 USDC', () => {
    expect(describeOutcome({ action: 'sellYes', quantity: 10, worstCents: 79, before: bal(10, 10n, 0n), after: bal(18, 0n, 0n) })).toBe(
      'Sold 10 Yes at 80¢ · received 8.00 USDC',
    );
  });

  it('F5: Bought 10 No at 35¢ · 3.50 USDC, counted in No tokens', () => {
    expect(describeOutcome({ action: 'buyNo', quantity: 10, worstCents: 36, before: bal(20, 0n, 0n), after: bal(16.5, 0n, 10n) })).toBe(
      'Bought 10 No at 35¢ · 3.50 USDC',
    );
  });

  it('F7: Sold 10 No at 20¢ · received 2.00 USDC', () => {
    expect(describeOutcome({ action: 'sellNo', quantity: 10, worstCents: 19, before: bal(10, 0n, 10n), after: bal(12, 0n, 0n) })).toBe(
      'Sold 10 No at 20¢ · received 2.00 USDC',
    );
  });

  it('says it could not tell when the balances were not readable', () => {
    expect(describeOutcome({ action: 'buyYes', quantity: 10, worstCents: 66, before: null, after: null })).toBe(
      'Your order landed. Your balances will show what filled.',
    );
  });
});

describe('a limit order’s words (F6): what rests is locked in the book, so the balances alone would mislead', () => {
  const limit = (over: Record<string, unknown>) => describeLimitOutcome({ action: 'buyYes', quantity: 10, priceCents: 60, resting: 10, before: bal(20, 0n, 0n), after: bal(14, 0n, 0n), ...over } as never);

  it('Buy Yes resting whole: Order placed · Buy 10 Yes at 60¢ · 6.00 USDC locked', () => {
    expect(limit({})).toBe('Order placed · Buy 10 Yes at 60¢ · 6.00 USDC locked');
  });

  it('Buy Yes partly filled: the filled part at its price, and what rests', () => {
    expect(limit({ resting: 6, after: bal(14, 4n, 0n) })).toBe('Bought 4 of 10 Yes at 60¢ · 2.40 USDC. 6 are resting on the book · 3.60 USDC locked.');
  });

  it('Sell Yes resting whole: the Yes locked', () => {
    expect(limit({ action: 'sellYes', priceCents: 70, before: bal(20, 10n, 0n), after: bal(20, 0n, 0n) })).toBe('Order placed · Sell 10 Yes at 70¢ · 10 Yes locked');
  });

  it('Sell Yes partly filled', () => {
    expect(limit({ action: 'sellYes', priceCents: 70, resting: 6, before: bal(20, 10n, 0n), after: bal(22.8, 0n, 0n) })).toBe(
      'Sold 4 of 10 Yes at 70¢ · received 2.80 USDC. 6 are resting on the book · 6 Yes locked.',
    );
  });

  it('filled whole: the same words as a market order', () => {
    expect(limit({ resting: 0, after: bal(14, 10n, 0n), before: bal(20.0, 0n, 0n) })).toMatch(/^Bought 10 Yes at /);
  });

  it('nothing filled and nothing resting: the order met the trader’s own (D90)', () => {
    expect(limit({ resting: 0, after: bal(20, 0n, 0n) })).toBe(
      'Your order was not placed: it would have traded with your own resting order, which was cancelled.',
    );
  });

  it('cannot tell without the book or balances', () => {
    expect(limit({ resting: null })).toBe('Your order landed. Your balances and Open orders show what filled and what rests.');
    expect(limit({ before: null })).toBe('Your order landed. Your balances and Open orders show what filled and what rests.');
  });
});
