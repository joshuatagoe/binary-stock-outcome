// Today's strikes from the previous close (D52), with the two-source check (D55, D82, D106) behind an interface.
import type { PythPrice } from '@meridian/shared';
import { describe, expect, it } from 'vitest';
import { loadCalendar } from '../src/calendar.ts';
import { pricesAgree, planStrikes, type PriceModule } from '../src/strikes.ts';

const calendar = loadCalendar();
const usd = (dollars: number): PythPrice => ({ price: BigInt(Math.round(dollars * 100_000)), exponent: -5 });
const tickers = [
  { symbol: 'META', strikeStepCents: 1000, enabled: true },
  { symbol: 'AAPL', strikeStepCents: 1000, enabled: true },
];

// A price module that answers from tables and records what it was asked.
function prices(recorded: Record<string, PythPrice | null>, reference: Record<string, PythPrice | null>): PriceModule & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    recordedClose: async (ticker, day) => (asked.push(`recorded ${ticker} ${day}`), recorded[ticker] ?? null),
    referenceClose: async (ticker, day) => (asked.push(`reference ${ticker} ${day}`), reference[ticker] ?? null),
  };
}

describe('pricesAgree (D55: at most 2% apart)', () => {
  it('agrees at exactly 2% and refuses just above it', () => {
    expect(pricesAgree(usd(500), usd(510), 200)).toBe(true);
    expect(pricesAgree(usd(500), usd(490), 200)).toBe(true);
    expect(pricesAgree(usd(500), { price: 51_000_001n, exponent: -5 }, 200)).toBe(false);
  });
  it('compares prices with different exponents', () => {
    expect(pricesAgree({ price: 50_000n, exponent: -2 }, { price: 50_000_000n, exponent: -5 }, 200)).toBe(true);
    expect(pricesAgree({ price: 50_000n, exponent: -2 }, { price: 25_000_000n, exponent: -5 }, 200)).toBe(false);
  });
  it('catches a 2-for-1 split', () => {
    expect(pricesAgree(usd(500), usd(250), 200)).toBe(false);
  });
});

describe("planStrikes: today's strikes from the previous close", () => {
  it("builds D52's ladder from the recorded close when the two sources agree", async () => {
    const plan = await planStrikes({ day: 20261012, tickers, calendar, prices: prices({ META: usd(500), AAPL: usd(230) }, { META: usd(500.4), AAPL: usd(230.1) }) });
    const meta = plan.find((p) => p.ticker === 'META')!;
    expect(meta).toMatchObject({ status: 'two_sources', source: 'recorded', strikes: [450, 470, 480, 500, 520, 530, 550].map((d) => d * 100) });
  });

  it('asks for the previous trading day: Friday for a Monday, Wednesday for the day after Thanksgiving', async () => {
    const p = prices({ META: usd(500) }, { META: usd(500) });
    await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: p });
    expect(p.asked).toEqual(['recorded META 20261009', 'reference META 20261009']);
    const q = prices({ META: usd(500) }, { META: usd(500) });
    await planStrikes({ day: 20261127, tickers: [tickers[0]!], calendar, prices: q });
    expect(q.asked).toEqual(['recorded META 20261125', 'reference META 20261125']);
  });

  it('skips a stock whose sources disagree by more than 2%, and says why', async () => {
    const plan = await planStrikes({ day: 20261012, tickers, calendar, prices: prices({ META: usd(500), AAPL: usd(230) }, { META: usd(250), AAPL: usd(230) }) });
    expect(plan.find((p) => p.ticker === 'META')).toMatchObject({ status: 'skipped', reason: 'sources_disagree', strikes: [] });
    expect(plan.find((p) => p.ticker === 'AAPL')!.status).toBe('two_sources');
  });

  it('uses the reference close alone and marks "one source" when no recorded close exists (D82)', async () => {
    const plan = await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: prices({}, { META: usd(500) }) });
    expect(plan[0]).toMatchObject({ status: 'one_source', source: 'reference', strikes: [450, 470, 480, 500, 520, 530, 550].map((d) => d * 100) });
  });

  // D82: a lone source is allowed only when no recorded close exists. A recorded close with no reference answer is a missing check, not a license.
  it('does not use a recorded close alone when the reference returns nothing: it waits, then skips with a reason', async () => {
    const early = await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: prices({ META: usd(500) }, {}), retryUntil: 2_000, now: () => 1_000 });
    expect(early[0]).toMatchObject({ status: 'skipped', reason: 'reference_unavailable', strikes: [], retry: true });
    const late = await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: prices({ META: usd(500) }, {}), retryUntil: 2_000, now: () => 2_000 });
    expect(late[0]).toMatchObject({ status: 'skipped', reason: 'reference_unavailable', retry: false });
  });

  it('treats a reference that throws like one that returns nothing', async () => {
    const throwing: PriceModule = { recordedClose: async () => usd(500), referenceClose: async () => { throw new Error('tiingo down'); } };
    const plan = await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: throwing, retryUntil: 2_000, now: () => 1_000 });
    expect(plan[0]).toMatchObject({ status: 'skipped', reason: 'reference_unavailable', retry: true });
    expect(plan[0]!.detail?.error).toMatch(/tiingo down/);
  });

  it('skips a stock whose price is not usable instead of throwing for all: zero, negative, or a positive exponent', async () => {
    const bad: Record<string, PythPrice> = { META: { price: 0n, exponent: -5 }, AAPL: { price: 23_000_000n, exponent: 2 } };
    const plan = await planStrikes({ day: 20261012, tickers, calendar, prices: prices(bad, bad) });
    expect(plan.map((p) => [p.ticker, p.status, p.reason])).toEqual([['META', 'skipped', 'price_error'], ['AAPL', 'skipped', 'price_error']]);
  });

  it('does not let two zero prices agree', () => {
    expect(pricesAgree({ price: 0n, exponent: -5 }, { price: 0n, exponent: -5 }, 200)).toBe(false);
  });

  it('skips a stock with no close from either source', async () => {
    const plan = await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: prices({}, {}) });
    expect(plan[0]).toMatchObject({ status: 'skipped', reason: 'no_close', strikes: [] });
  });

  it('skips a disabled stock and one the admin skipped by hand, without reading prices for them', async () => {
    const p = prices({ META: usd(500), AAPL: usd(230) }, { META: usd(500), AAPL: usd(230) });
    const plan = await planStrikes({
      day: 20261012,
      tickers: [{ ...tickers[0]!, enabled: false }, tickers[1]!],
      calendar,
      prices: p,
      adminSkips: new Set(['AAPL']),
    });
    expect(plan.map((x) => [x.ticker, x.status, x.reason])).toEqual([['META', 'skipped', 'disabled'], ['AAPL', 'skipped', 'admin_skip']]);
    expect(p.asked).toEqual([]);
  });

  it('uses the per-stock step (D49)', async () => {
    const plan = await planStrikes({ day: 20261012, tickers: [{ symbol: 'META', strikeStepCents: 500, enabled: true }], calendar, prices: prices({ META: usd(500) }, { META: usd(500) }) });
    expect(plan[0]!.strikes).toEqual([455, 470, 485, 500, 515, 530, 545].map((d) => d * 100));
  });

  it('rounds from the exact Pyth integer, never from cents first (D52: $499.995)', async () => {
    const close: PythPrice = { price: 49_999_500n, exponent: -5 };
    const plan = await planStrikes({ day: 20261012, tickers: [tickers[0]!], calendar, prices: prices({ META: close }, { META: close }) });
    expect(plan[0]!.strikes).toEqual([450, 470, 480, 500, 510, 530, 540].map((d) => d * 100));
  });

  it('refuses a day the market is shut', async () => {
    await expect(planStrikes({ day: 20261010, tickers, calendar, prices: prices({}, {}) })).rejects.toThrow(/not a trading day/);
    await expect(planStrikes({ day: 20261126, tickers, calendar, prices: prices({}, {}) })).rejects.toThrow(/not a trading day/);
  });

  it('turns a price module that throws into a skipped stock, so one bad read does not stop the other six', async () => {
    const flaky: PriceModule = {
      recordedClose: async (t) => {
        if (t === 'META') throw new Error('rpc down');
        return usd(230);
      },
      referenceClose: async () => usd(230),
    };
    const plan = await planStrikes({ day: 20261012, tickers, calendar, prices: flaky });
    expect(plan.find((p) => p.ticker === 'META')).toMatchObject({ status: 'skipped', reason: 'price_error' });
    expect(plan.find((p) => p.ticker === 'AAPL')!.status).toBe('two_sources');
  });
});
