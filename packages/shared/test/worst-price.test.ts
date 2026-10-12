import { describe, expect, it } from 'vitest';
import { defaultWorst, worstPrice } from '../src/index.ts';
import { golden } from './golden.ts';

const g = golden('worst-prices');

describe('default worst price (D15)', () => {
  for (const c of g.cases) {
    it(`${c.id}: ${c.about}`, () => {
      const book = g.books[c.book];
      const r = defaultWorst(c.action, book, c.quantity);
      if (c.worstYesCents === null) {
        expect(r).toEqual({ ok: false, reason: 'not-enough-on-the-book' });
      } else {
        expect(r).toEqual({ ok: true, worstYesCents: c.worstYesCents, traderCents: c.traderCents, totalCents: c.totalCents });
      }
    });
  }

  for (const c of g.clampCases) {
    it(`${c.id}: ${c.about}`, () => {
      const side = c.action === 'buyYes' ? 'buy' : 'sell';
      expect(worstPrice(side, c.levels, c.quantity)).toEqual({ ok: true, cents: c.worstYesCents });
    });
  }

  it('moves a buy up and a sell down, against the trader', () => {
    expect(worstPrice('buy', [[50, 4]], 4)).toEqual({ ok: true, cents: 51 });
    expect(worstPrice('sell', [[50, 4]], 4)).toEqual({ ok: true, cents: 49 });
  });

  it('uses the last level needed, not the last on the book', () => {
    expect(worstPrice('buy', [[50, 4], [52, 4], [60, 100]], 6)).toEqual({ ok: true, cents: 53 });
  });

  it('says so when the quantity is above what the book holds, by one', () => {
    expect(worstPrice('buy', [[50, 4]], 5)).toEqual({ ok: false, reason: 'not-enough-on-the-book' });
  });

  it('refuses a quantity of zero', () => {
    expect(() => worstPrice('buy', [[50, 4]], 0)).toThrow();
  });
});
