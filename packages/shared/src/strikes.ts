// D52: the strike ladder, rounded once from Pyth's exact integer price and exponent, never from a price first rounded to cents.
// Nearest step (the $10 step, D49); an exact tie rounds away from the previous close (below: down, above: up); the 7th strike,
// the close itself, ties up. All arithmetic is BigInt, so no float ever decides a tie.

/** Pyth's price: the price is `price` x 10^`exponent` dollars (an equity feed's exponent is negative, for example -5). */
export interface PythPrice {
  price: bigint | number;
  exponent: number;
}

export interface LadderOptions {
  /** The distances from the close, in basis points. Default: D6's 3, 6 and 9 percent. */
  ladderBps?: readonly number[];
  /** The step in cents. Default: D49's $10. */
  stepCents?: number;
  /** Add the rounded close as a 7th strike. Default: true. */
  includeClose?: boolean;
}

export const DEFAULT_LADDER_BPS: readonly number[] = [300, 600, 900];
export const DEFAULT_STEP_CENTS = 1000;

/** The strikes in cents, ascending, without duplicates (the spec's AAPL example has 5). */
export function strikeLadder(close: PythPrice, options: LadderOptions = {}): number[] {
  const { ladderBps = DEFAULT_LADDER_BPS, stepCents = DEFAULT_STEP_CENTS, includeClose = true } = options;
  const price = BigInt(close.price);
  if (price <= 0n) throw new RangeError('The close must be above zero');
  if (!Number.isInteger(close.exponent) || close.exponent > 0) throw new RangeError('The exponent must be zero or negative');
  if (!Number.isInteger(stepCents) || stepCents <= 0) throw new RangeError('The step must be a whole number of cents');

  // A value is x / denominator dollars, with x = price x (10000 +/- bps) and denominator = 10000 x 10^-exponent.
  const denominator = 10_000n * 10n ** BigInt(-close.exponent);
  const step = (BigInt(stepCents) * denominator) / 100n; // the step in the same units as x
  const nearest = (x: bigint, tie: 'down' | 'up'): bigint => {
    const q = x / step;
    const twice = 2n * (x - q * step);
    if (twice > step) return q + 1n;
    if (twice < step) return q;
    return tie === 'up' ? q + 1n : q;
  };

  const strikes = new Set<number>();
  const add = (multiples: bigint) => {
    if (multiples > 0n) strikes.add(Number(multiples) * stepCents);
  };
  for (const bps of ladderBps) {
    add(nearest(price * BigInt(10_000 - bps), 'down'));
    add(nearest(price * BigInt(10_000 + bps), 'up'));
  }
  if (includeClose) add(nearest(price * 10_000n, 'up'));
  return [...strikes].sort((a, b) => a - b);
}
