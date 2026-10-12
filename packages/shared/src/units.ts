// D84: three units on screen, never mixed. `$` for a stock price or a strike, cents for a contract's price, and USDC with two
// decimals for play money moving. USDC is held in base units (6 decimals) everywhere else; money is BigInt, never a float.

export const USDC_DECIMALS = 6;
export const USDC_UNITS_PER_DOLLAR = 1_000_000n;
export const USDC_UNITS_PER_CENT = 10_000n;

const MINUS = '−';
const CENT_SIGN = '¢';

/** A price or amount in whole cents, as USDC base units: 65 cents is 650,000. */
export function centsToUsdcUnits(cents: number | bigint): bigint {
  return BigInt(cents) * USDC_UNITS_PER_CENT;
}

/** USDC base units as a number with two decimals ("6.50"); a part-cent rounds half up (away from zero). A loss gets a true minus sign. */
export function formatUsdc(units: bigint): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const cents = (abs + USDC_UNITS_PER_CENT / 2n) / USDC_UNITS_PER_CENT;
  const text = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  return negative && cents !== 0n ? MINUS + text : text;
}

/** "6.50 USDC". */
export function formatUsdcUnits(units: bigint): string {
  return `${formatUsdc(units)} USDC`;
}

/** A contract's price: "65¢". */
export function formatCents(cents: number): string {
  return `${cents}${CENT_SIGN}`;
}

/** A stock price or strike held in cents: "$684.20". `dropZeroCents` gives "$680" for a strike on a whole dollar. */
export function formatDollars(cents: number | bigint, options: { dropZeroCents?: boolean } = {}): string {
  const c = BigInt(cents);
  const negative = c < 0n;
  const abs = negative ? -c : c;
  const rem = abs % 100n;
  const whole = (abs / 100n).toString();
  const text = options.dropZeroCents && rem === 0n ? whole : `${whole}.${rem.toString().padStart(2, '0')}`;
  return `${negative ? MINUS : ''}$${text}`;
}

/** A typed USDC amount ("6.50", "20") as base units. At most 6 decimals; refuses anything else. */
export function parseUsdc(text: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(text.trim());
  if (!m) throw new RangeError(`Not a USDC amount: "${text}"`);
  return BigInt(m[1]!) * USDC_UNITS_PER_DOLLAR + BigInt((m[2] ?? '').padEnd(USDC_DECIMALS, '0') || '0');
}
