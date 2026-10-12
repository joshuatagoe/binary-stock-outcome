import { describe, expect, it } from 'vitest';
import { centsToUsdcUnits, formatCents, formatDollars, formatUsdc, formatUsdcUnits, parseUsdc, USDC_UNITS_PER_DOLLAR } from '../src/index.ts';

describe('units (D84)', () => {
  it('USDC has 6 decimals', () => {
    expect(USDC_UNITS_PER_DOLLAR).toBe(1_000_000n);
  });

  it('a cent of price is 10,000 base units', () => {
    expect(centsToUsdcUnits(65)).toBe(650_000n);
    expect(centsToUsdcUnits(65 * 10)).toBe(6_500_000n);
  });

  it('shows USDC with two decimals', () => {
    expect(formatUsdc(6_500_000n)).toBe('6.50');
    expect(formatUsdc(0n)).toBe('0.00');
    expect(formatUsdc(20_000_000n)).toBe('20.00');
    expect(formatUsdc(1_000n)).toBe('0.00');
  });

  it('rounds a part-cent half up, the way a total is shown', () => {
    expect(formatUsdc(5_000n)).toBe('0.01');
    expect(formatUsdc(4_999n)).toBe('0.00');
  });

  it('shows a negative amount with a true minus sign', () => {
    expect(formatUsdc(-1_500_000n)).toBe('−1.50');
  });

  it('adds the unit on request', () => {
    expect(formatUsdcUnits(6_500_000n)).toBe('6.50 USDC');
  });

  it('shows a contract price in cents', () => {
    expect(formatCents(65)).toBe('65¢');
  });

  it('shows a stock price or strike in dollars, never mixed with cents or USDC', () => {
    expect(formatDollars(68420)).toBe('$684.20');
    expect(formatDollars(68000)).toBe('$680.00');
    expect(formatDollars(68000, { dropZeroCents: true })).toBe('$680');
    expect(formatDollars(68420, { dropZeroCents: true })).toBe('$684.20');
  });

  it('reads a typed USDC amount into base units without floats', () => {
    expect(parseUsdc('6.50')).toBe(6_500_000n);
    expect(parseUsdc('20')).toBe(20_000_000n);
    expect(parseUsdc('0.000001')).toBe(1n);
    expect(parseUsdc('0.1')).toBe(100_000n);
  });

  it('refuses a typed amount with too many decimals or junk', () => {
    expect(() => parseUsdc('0.0000001')).toThrow();
    expect(() => parseUsdc('abc')).toThrow();
    expect(() => parseUsdc('')).toThrow();
  });
});
