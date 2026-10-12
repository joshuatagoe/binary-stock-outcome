// Today's strikes from the previous close (D6, D52), after the two-source check (D55, D82, D106). The price module
// (the only place prices are read, ARCHITECTURE.md section 2) plugs in behind `PriceModule`; M4-a has none yet, so the
// tests supply fakes. The ladder itself is packages/shared's `strikeLadder`: one function for the bot, the site and the tests.
import { strikeLadder, type PythPrice } from '@meridian/shared';
import type { Calendar } from './calendar.ts';

/** The two sources of a previous close. Each returns null when it has none for that stock and day, and may throw. */
export interface PriceModule {
  /** The close our program recorded on that trading day (D83). */
  recordedClose(ticker: string, day: number): Promise<PythPrice | null>;
  /** The off-chain reference close (D93, Tiingo; a fixture file locally). */
  referenceClose(ticker: string, day: number): Promise<PythPrice | null>;
}

/** D106: the two sources may differ by at most 2%. */
export const DEFAULT_MAX_DIFF_BPS = 200;

/** Both prices as whole numbers over one power of ten, so no float decides. */
function common(a: PythPrice, b: PythPrice): [bigint, bigint] {
  const exponent = Math.min(a.exponent, b.exponent);
  return [BigInt(a.price) * 10n ** BigInt(a.exponent - exponent), BigInt(b.price) * 10n ** BigInt(b.exponent - exponent)];
}

/** True when the two prices differ by at most `maxDiffBps` of the first. */
export function pricesAgree(a: PythPrice, b: PythPrice, maxDiffBps = DEFAULT_MAX_DIFF_BPS): boolean {
  const [x, y] = common(a, b);
  if (x <= 0n || y <= 0n) return false; // two zeros are not two agreeing prices
  const diff = x > y ? x - y : y - x;
  return diff * 10_000n <= BigInt(maxDiffBps) * x;
}

export type SkipReason = 'disabled' | 'admin_skip' | 'sources_disagree' | 'no_close' | 'price_error' | 'reference_unavailable';

export interface StrikePlan {
  ticker: string;
  /** The trading day the strikes are for. */
  day: number;
  /** The trading day whose close they come from. */
  previousDay: number;
  /** `two_sources`: both agreed. `one_source`: only one existed, so D55's check did not run (D82). */
  status: 'two_sources' | 'one_source' | 'skipped';
  /** The close the ladder was built from. */
  source?: 'recorded' | 'reference';
  reason?: SkipReason;
  /** True for a skip that asking again may fix (a source that did not answer) and whose retry time has not passed. */
  retry?: boolean;
  /** Strikes in cents, ascending; empty when skipped. */
  strikes: number[];
  /** What the check saw, for the Timeline and the alert. */
  detail?: { recorded?: PythPrice | null; reference?: PythPrice | null; error?: string };
}

export interface PlanOptions {
  /** The trading day to plan. */
  day: number;
  tickers: ReadonlyArray<{ symbol: string; strikeStepCents: number; enabled: boolean }>;
  calendar: Calendar;
  prices: PriceModule;
  /** Config's ladder in basis points; the default is D6's. */
  ladderBps?: readonly number[];
  maxDiffBps?: number;
  /** Stocks the admin skipped by hand (D55). */
  adminSkips?: ReadonlySet<string>;
  /** Until when a missing source is worth asking again (the morning job's 9:00, D56), in `now()`'s units. Without it nothing retries. */
  retryUntil?: number;
  now?: () => number;
}

export async function planStrikes(options: PlanOptions): Promise<StrikePlan[]> {
  const { day, tickers, calendar, prices, ladderBps, maxDiffBps = DEFAULT_MAX_DIFF_BPS, adminSkips = new Set<string>(), retryUntil, now = Date.now } = options;
  if (!calendar.isTradingDay(day)) throw new RangeError(`${day} is not a trading day`);
  const previousDay = calendar.previousTradingDay(day);
  const canRetry = () => retryUntil !== undefined && now() < retryUntil;
  const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

  return Promise.all(
    tickers.map(async ({ symbol: ticker, strikeStepCents, enabled }): Promise<StrikePlan> => {
      const skipped = (reason: SkipReason, detail?: StrikePlan['detail'], retry = false): StrikePlan => ({ ticker, day, previousDay, status: 'skipped', reason, strikes: [], detail, retry });
      if (!enabled) return skipped('disabled');
      if (adminSkips.has(ticker)) return skipped('admin_skip');

      // Each source is read alone, so a failure of one is known as that source's.
      const read = async (get: () => Promise<PythPrice | null>): Promise<{ price: PythPrice | null; error?: string }> => {
        try {
          return { price: await get() };
        } catch (error) {
          return { price: null, error: message(error) };
        }
      };
      const [rec, ref] = await Promise.all([read(() => prices.recordedClose(ticker, previousDay)), read(() => prices.referenceClose(ticker, previousDay))]);
      const [recorded, reference] = [rec.price, ref.price];
      const detail = { recorded, reference, error: rec.error ?? ref.error };

      let source: 'recorded' | 'reference';
      let close: PythPrice;
      let status: 'two_sources' | 'one_source';
      if (recorded && reference) {
        // A price at or below zero is a bad read, not a close: skip this stock only.
        if (BigInt(recorded.price) <= 0n || BigInt(reference.price) <= 0n) return skipped('price_error', { ...detail, error: 'a close at or below zero' });
        if (!pricesAgree(recorded, reference, maxDiffBps)) return skipped('sources_disagree', detail);
        [source, close, status] = ['recorded', recorded, 'two_sources'];
      } else if (recorded) {
        // D82: a lone source is for the days with no recorded close. A recorded close whose check did not answer waits for the check.
        return skipped('reference_unavailable', detail, canRetry());
      } else if (reference) {
        if (rec.error) return skipped('price_error', detail, canRetry());
        [source, close, status] = ['reference', reference, 'one_source'];
      } else {
        return skipped(rec.error || ref.error ? 'price_error' : 'no_close', detail, Boolean(rec.error || ref.error) && canRetry());
      }
      try {
        return { ticker, day, previousDay, status, source, strikes: strikeLadder(close, { ladderBps, stepCents: strikeStepCents }), detail };
      } catch (error) {
        return skipped('price_error', { ...detail, error: message(error) });
      }
    }),
  );
}
