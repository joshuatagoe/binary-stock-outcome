// What a market and its book look like on screen (USERS.md "Market states", F3, F4; D45, D84).
import { getBookDecoder, getMarketDecoder } from '@meridian/client';
import { newYorkTime } from '@meridian/shared';
import { describe, expect, it } from 'vitest';
import {
  bookLevels,
  chanceText,
  contractsNotYet,
  dayWords,
  formatEt,
  marketSlug,
  marketState,
  parseMarketSlug,
  pickDay,
  quotes,
  tickerText,
  toMarketView,
} from '../src/markets.ts';
import { newYorkDay } from '../src/now.ts';
import { bookBytes, chainMarket, DAY, F4_ASKS, F4_BIDS, marketBytes, ticker } from './fixtures/chain.ts';

const at = (hour: number, minute = 0) => newYorkTime(DAY, hour, minute);

async function view(options: Parameters<typeof marketBytes>[0]) {
  const { address, market } = await chainMarket(options, [], []);
  return toMarketView(address, getMarketDecoder().decode(market));
}

describe('a market from its account', () => {
  it('reads the ticker without its zero padding', () => {
    expect(tickerText(ticker('META'))).toBe('META');
    expect(tickerText(ticker('GOOGL'))).toBe('GOOGL');
  });

  it('names a market in its address as the ticker, the strike in dollars and the day (D72)', async () => {
    const m = await view({ strikeDollars: 680 });
    expect(m.slug).toBe('META-680-2026-10-08');
    expect(marketSlug('META', 68000, DAY)).toBe('META-680-2026-10-08');
    expect(marketSlug('AAPL', 27550, DAY)).toBe('AAPL-275.50-2026-10-08');
  });

  it('reads a market address back, and refuses anything that is not one', () => {
    expect(parseMarketSlug('META-680-2026-10-08')).toEqual({ ticker: 'META', strikeCents: 68000, day: DAY });
    expect(parseMarketSlug('AAPL-275.50-2026-10-08')).toEqual({ ticker: 'AAPL', strikeCents: 27550, day: DAY });
    for (const bad of ['META-99999999999999999999-2026-10-08', 'META-100000000000-2026-10-08', '', 'META', 'meta-680-2026-10-08', 'META-680-2026-13-08', 'META-0-2026-10-08', 'META-6x0-2026-10-08']) {
      expect(parseMarketSlug(bad), bad).toBeNull();
    }
  });
});

describe('the market states in USERS.md', () => {
  it('before the open: "Opens 9:30 AM ET", and no trading yet', async () => {
    const m = await view({ strikeDollars: 680 });
    expect(marketState(m, at(9, 10))).toMatchObject({ kind: 'upcoming', label: 'Opens 9:30 AM ET', tradable: false });
  });

  it('between the open and the close: a countdown, and trading', async () => {
    const m = await view({ strikeDollars: 680 });
    expect(marketState(m, at(10, 16))).toMatchObject({ kind: 'open', label: 'Closes in 5 h 44 min', tradable: true });
    expect(marketState(m, at(15, 30))).toMatchObject({ kind: 'open', label: 'Closes in 30 min' });
  });

  it('counts down to 3:59:55 PM, when the program stops taking orders (D102), not to 4:00', async () => {
    const m = await view({ strikeDollars: 680 });
    expect(marketState(m, at(16) - 65).label).toBe('Closes in 1 min');
    expect(marketState(m, at(16) - 66).label).toBe('Closes in 2 min');
  });

  it('stops trading 5 seconds before the stored close, as the program does (D102)', async () => {
    const m = await view({ strikeDollars: 680 });
    expect(marketState(m, at(16) - 6).tradable).toBe(true);
    expect(marketState(m, at(16) - 5)).toMatchObject({ kind: 'closed', tradable: false });
  });

  it('after the close: when the result is expected', async () => {
    const m = await view({ strikeDollars: 680 });
    expect(marketState(m, at(16, 1))).toMatchObject({
      kind: 'closed',
      label: 'Trading ended · result expected by about 4:05 PM ET',
    });
  });

  it('on an early-close day the close is 1:00 PM', async () => {
    const m = await view({ strikeDollars: 680, earlyClose: true });
    expect(marketState(m, at(13, 1)).label).toBe('Trading ended · result expected by about 1:05 PM ET');
  });

  it('settled: who wins', async () => {
    const yes = await view({ strikeDollars: 680, status: 'Settled', outcome: 'Yes' });
    const no = await view({ strikeDollars: 680, status: 'Settled', outcome: 'No' });
    expect(marketState(yes, at(17)).label).toBe('Yes wins');
    expect(marketState(no, at(17)).label).toBe('No wins');
    expect(marketState(no, at(17)).tradable).toBe(false);
  });

  it('under review, and a proposal waiting out its delay', async () => {
    const held = await view({ strikeDollars: 680, status: 'UnderReview' });
    expect(marketState(held, at(17))).toMatchObject({ kind: 'underReview', label: 'Under review' });
    const proposed = await view({ strikeDollars: 680, status: 'Proposed', proposal: { outcome: 'No', finalAt: at(17, 20) } });
    expect(marketState(proposed, at(17))).toMatchObject({ kind: 'proposed', label: 'Proposed: No wins, final at 5:20 PM ET' });
  });

  it('writes a time in New York, with ET, through the change to standard time', () => {
    expect(formatEt(newYorkTime(DAY, 16))).toBe('4:00 PM ET');
    expect(formatEt(newYorkTime(20261109, 9, 30))).toBe('9:30 AM ET');
  });
});

describe('a book from its account (F4: the 10:16 AM book)', () => {
  const decode = async () => {
    const { address } = await chainMarket({ strikeDollars: 680 }, [], []);
    return getBookDecoder().decode(bookBytes(address, F4_BIDS, F4_ASKS));
  };

  it('lists asks lowest first and bids highest first, as price and quantity, ignoring the empty slots', async () => {
    expect(bookLevels(await decode())).toEqual({ asks: [[65, 10], [66, 5]], bids: [[64, 5]] });
  });

  it('adds up orders at the same price', async () => {
    const { address } = await chainMarket({ strikeDollars: 680 }, [], []);
    const b = getBookDecoder().decode(bookBytes(address, [[64, 5], [64, 3], [60, 10]], []));
    expect(bookLevels(b).bids).toEqual([[64, 8], [60, 10]]);
  });

  it('reads an empty book as no levels', async () => {
    const { address } = await chainMarket({ strikeDollars: 680 }, [], []);
    expect(bookLevels(getBookDecoder().decode(bookBytes(address, [], [])))).toEqual({ asks: [], bids: [] });
  });
});

describe('the four prices (F4, D45)', () => {
  it('reads Buy Yes 65¢ · Sell Yes 64¢ · Buy No 36¢ · Sell No 35¢ on the F4 book', () => {
    expect(quotes({ asks: [[65, 10], [66, 5]], bids: [[64, 5]] })).toEqual({ buyYes: 65, sellYes: 64, buyNo: 36, sellNo: 35 });
  });

  it('leaves a price out when its side of the book is empty, never showing 0¢', () => {
    expect(quotes({ asks: [], bids: [] })).toEqual({ buyYes: null, sellYes: null, buyNo: null, sellNo: null });
    expect(quotes({ asks: [[65, 1]], bids: [] })).toEqual({ buyYes: 65, sellYes: null, buyNo: null, sellNo: 35 });
  });
});

describe('the chance on a market card (D45)', () => {
  it('uses the midpoint when the spread is 10¢ or less', () => {
    expect(chanceText({ asks: [[65, 10]], bids: [[64, 5]] })).toEqual({ yes: 65, no: 35, text: '65% chance' });
    expect(chanceText({ asks: [[70, 1]], bids: [[60, 1]] })).toMatchObject({ yes: 65, text: '65% chance' });
  });

  it('says "No quotes yet" on an empty book', () => {
    expect(chanceText({ asks: [], bids: [] })).toEqual({ yes: null, no: null, text: 'No quotes yet' });
  });

  it('shows a dash when the spread is wider than 10¢ and no last trade is known', () => {
    expect(chanceText({ asks: [[80, 1]], bids: [[60, 1]] })).toEqual({ yes: null, no: null, text: '—' });
  });

  it('shows a dash when only one side is quoted', () => {
    expect(chanceText({ asks: [[65, 1]], bids: [] })).toMatchObject({ text: '—' });
  });
});

describe('which day the Markets page shows', () => {
  const rows = [20261007, 20261008, 20261008].map((day, i) => ({ day, i }));
  it("shows today's markets when there are any", () => {
    expect(pickDay(rows, 20261008)).toEqual({ day: 20261008, isToday: true, rows: [rows[1], rows[2]] });
  });
  it('else the latest day that has markets, and says it is not today', () => {
    expect(pickDay(rows, 20261012)).toEqual({ day: 20261008, isToday: false, rows: [rows[1], rows[2]] });
  });
  it('else nothing', () => {
    expect(pickDay([], 20261012)).toEqual({ day: null, isToday: false, rows: [] });
  });
  it('knows the New York date even when UTC is already tomorrow', () => {
    expect(newYorkDay(newYorkTime(DAY, 21, 30))).toBe(DAY);
    expect(newYorkDay(newYorkTime(DAY, 0, 30))).toBe(DAY);
  });
});

describe('dates and the hours before the contracts exist', () => {
  it('writes a day as words, not yyyymmdd', () => {
    expect(dayWords(20261008)).toBe('Thursday, October 8, 2026');
  });
  it('before 9:00 AM ET on the day, contracts are not there yet (F3)', () => {
    expect(contractsNotYet(20261008, newYorkTime(20261008, 8, 59))).toBe(true);
    expect(contractsNotYet(20261008, newYorkTime(20261008, 9, 0))).toBe(false);
  });
});
