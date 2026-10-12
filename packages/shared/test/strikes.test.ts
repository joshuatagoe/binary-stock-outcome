import { describe, expect, it } from 'vitest';
import { strikeLadder } from '../src/index.ts';
import { golden } from './golden.ts';

const g = golden('strikes');

describe('strike ladder (D52)', () => {
  it('reads the same ladder as config/program-devnet.json', () => {
    expect(g.ladderBps).toEqual([300, 600, 900]);
    expect(g.stepCents).toBe(1000);
  });

  for (const c of g.cases) {
    it(`${c.id}: ${c.strikesCents.join(', ')}`, () => {
      expect(strikeLadder(c.close)).toEqual(c.strikesCents);
    });
  }

  it('accepts a bigint price, as Pyth\'s i64 decodes', () => {
    expect(strikeLadder({ price: 50000000n, exponent: -5 })).toEqual([45000, 47000, 48000, 50000, 52000, 53000, 55000]);
  });

  it('never rounds the close to cents first: $499.995 differs from $500.00', () => {
    const exact = strikeLadder({ price: 49999500, exponent: -5 });
    const c = g.cases.find((x: any) => x.id === 'd52-499-995');
    expect(exact).not.toEqual(c.ifRoundedToCentsFirstStrikesCents);
    expect(exact).toEqual(c.strikesCents);
  });

  it('leaves out the 7th strike when asked', () => {
    expect(strikeLadder({ price: 68000000, exponent: -5 }, { includeClose: false })).toEqual([62000, 64000, 66000, 70000, 72000, 74000]);
  });

  it('refuses a price of zero or below', () => {
    expect(() => strikeLadder({ price: 0, exponent: -5 })).toThrow();
    expect(() => strikeLadder({ price: -1, exponent: -5 })).toThrow();
  });

  it('refuses a positive exponent: Pyth\'s equity feeds use negative ones', () => {
    expect(() => strikeLadder({ price: 5, exponent: 2 })).toThrow();
  });
});
