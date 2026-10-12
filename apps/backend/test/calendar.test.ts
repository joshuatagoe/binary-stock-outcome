// The trading calendar (D12): NYSE holidays and early closes for 2026 to 2028, and each day's times from packages/shared.
import { newYorkTime } from '@meridian/shared';
import { describe, expect, it } from 'vitest';
import { createCalendar, loadCalendar, type CalendarData } from '../src/calendar.ts';

const calendar = loadCalendar();

// The expected table is worked out again here from NYSE's rules, so a typo in config/calendar.json shows.
const nthWeekday = (year: number, month: number, weekday: number, n: number) => {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - first + 7) % 7) + 7 * (n - 1);
};
const lastMonday = (year: number, month: number) => {
  const last = new Date(Date.UTC(year, month, 0));
  return last.getUTCDate() - ((last.getUTCDay() + 6) % 7);
};
// The anonymous Gregorian computus.
function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
const key = (d: Date) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
// A fixed-date holiday: a Saturday is observed on the Friday (not for New Year's, when NYSE stays open), a Sunday on the Monday.
function observed(year: number, month: number, day: number, newYear = false): number | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCDay() === 6) return newYear ? null : key(new Date(Date.UTC(year, month - 1, day - 1)));
  if (d.getUTCDay() === 0) return key(new Date(Date.UTC(year, month - 1, day + 1)));
  return key(d);
}
function expectedHolidays(year: number): number[] {
  const md = (m: number, d: number) => year * 10000 + m * 100 + d;
  const goodFriday = easter(year);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  return [
    observed(year, 1, 1, true), md(1, nthWeekday(year, 1, 1, 3)), md(2, nthWeekday(year, 2, 1, 3)), key(goodFriday),
    md(5, lastMonday(year, 5)), observed(year, 6, 19), observed(year, 7, 4), md(9, nthWeekday(year, 9, 1, 1)),
    md(11, nthWeekday(year, 11, 4, 4)), observed(year, 12, 25),
  ].filter((x): x is number => x !== null).sort((a, b) => a - b);
}

describe('the table', () => {
  it.each([2026, 2027, 2028])('lists exactly the holidays NYSE rules give for %i', (year) => {
    const listed = Object.keys(calendar.data.holidays).map(Number).filter((d) => Math.floor(d / 10000) === year).sort((a, b) => a - b);
    expect(listed).toEqual(expectedHolidays(year));
  });

  it('has the early closes: the day after Thanksgiving, Christmas Eve 2026 (a Thursday) and Monday 3 July 2028', () => {
    expect(Object.keys(calendar.data.earlyCloses).map(Number).sort()).toEqual([20261127, 20261224, 20271126, 20280703, 20281124]);
  });

  it('never calls a weekend or a holiday an early close', () => {
    for (const d of Object.keys(calendar.data.earlyCloses).map(Number)) {
      expect(calendar.isTradingDay(d)).toBe(true);
    }
  });

  it('does not run out within 60 days of today (D12: a test fails when the table runs out)', () => {
    expect(calendar.covers(key(new Date(Date.now() + 60 * 86_400_000)))).toBe(true);
  });
});

describe('trading days', () => {
  it('treats weekends as closed', () => {
    expect(calendar.isTradingDay(20261010)).toBe(false); // a Saturday
    expect(calendar.isTradingDay(20261011)).toBe(false); // a Sunday
    expect(calendar.times(20261010)).toBeNull();
  });

  it('treats a holiday as closed (Thanksgiving, 2026-11-26)', () => {
    expect(calendar.isTradingDay(20261126)).toBe(false);
    expect(calendar.times(20261126)).toBeNull();
  });

  it('treats the observed Independence Day as closed when July 4 is a Saturday (2026-07-03)', () => {
    expect(calendar.isTradingDay(20260703)).toBe(false);
    expect(calendar.isTradingDay(20260702)).toBe(true);
  });

  it('keeps Friday 2027-12-31 open, because New Year 2028 falls on a Saturday', () => {
    expect(calendar.isTradingDay(20271231)).toBe(true);
  });

  it('gives a normal day 9:00, 9:30 and 4:00 PM New York time', () => {
    expect(calendar.times(20261008)).toEqual({
      mintOpen: Date.UTC(2026, 9, 8, 13, 0) / 1000,
      open: Date.UTC(2026, 9, 8, 13, 30) / 1000,
      close: Date.UTC(2026, 9, 8, 20, 0) / 1000,
    });
  });

  it('closes at 1:00 PM on an early-close day (2026-11-27, standard time)', () => {
    expect(calendar.isEarlyClose(20261127)).toBe(true);
    const t = calendar.times(20261127)!;
    expect(t.close).toBe(Date.UTC(2026, 10, 27, 18, 0) / 1000);
    expect(t.open).toBe(Date.UTC(2026, 10, 27, 14, 30) / 1000);
  });

  it('is open 3.5 hours on Christmas Eve 2026 and 6.5 hours on a normal Thursday', () => {
    const early = calendar.times(20261224)!;
    const normal = calendar.times(20261217)!;
    expect(early.close - early.open).toBe(3.5 * 3600);
    expect(normal.close - normal.open).toBe(6.5 * 3600);
  });

  it.each([
    ['spring forward 2026 (Sunday March 8)', 20260306, 20260309],
    ['fall back 2026 (Sunday November 1)', 20261030, 20261102],
    ['spring forward 2027 (Sunday March 14)', 20270312, 20270315],
    ['fall back 2027 (Sunday November 7)', 20271105, 20271108],
  ])('moves the UTC hour of the open by one across %s, and keeps New York 9:30 and 4:00', (_name, before, after) => {
    const hourOf = (s: number) => new Date(s * 1000).getUTCHours();
    expect(Math.abs(hourOf(calendar.times(before)!.open) - hourOf(calendar.times(after)!.open))).toBe(1);
    expect(calendar.times(after)!.open).toBe(newYorkTime(after, 9, 30));
    expect(calendar.times(after)!.close).toBe(newYorkTime(after, 16, 0));
  });

  it('opens at the right UTC time on the Monday after each clock change', () => {
    expect(calendar.times(20260309)!.open).toBe(Date.UTC(2026, 2, 9, 13, 30) / 1000); // EDT, -4
    expect(calendar.times(20261102)!.open).toBe(Date.UTC(2026, 10, 2, 14, 30) / 1000); // EST, -5
    expect(calendar.times(20270315)!.open).toBe(Date.UTC(2027, 2, 15, 13, 30) / 1000);
    expect(calendar.times(20271108)!.open).toBe(Date.UTC(2027, 10, 8, 14, 30) / 1000);
  });

  it('finds the previous trading day across a weekend and a holiday', () => {
    expect(calendar.previousTradingDay(20261012)).toBe(20261009); // Monday -> Friday
    expect(calendar.previousTradingDay(20261127)).toBe(20261125); // Thanksgiving between
    expect(calendar.previousTradingDay(20260105)).toBe(20260102); // New Year's Day before
  });

  it('finds the next trading day', () => {
    expect(calendar.nextTradingDay(20261125)).toBe(20261127);
    expect(calendar.nextTradingDay(20261224)).toBe(20261228); // Friday the 25th is a holiday
  });

  it('refuses a day outside the table instead of guessing', () => {
    expect(() => calendar.isTradingDay(20290102)).toThrow(/not covered/);
    expect(() => calendar.isTradingDay(20251231)).toThrow(/not covered/);
    expect(() => calendar.previousTradingDay(20260101)).toThrow(/not covered/);
  });

  it('refuses a day that is not a real date', () => {
    expect(() => calendar.isTradingDay(20260230)).toThrow(RangeError);
  });
});

describe('a table that disagrees with itself', () => {
  const base: CalendarData = { years: [2026], holidays: {}, earlyCloses: {} };
  it('refuses an early close on a weekend', () => {
    expect(() => createCalendar({ ...base, earlyCloses: { '20261128': 'Saturday' } })).toThrow(/weekend/);
  });
  it('refuses a day listed as both a holiday and an early close', () => {
    expect(() => createCalendar({ ...base, holidays: { '20261127': 'x' }, earlyCloses: { '20261127': 'y' } })).toThrow(/both/);
  });
  it('refuses a date outside the years it covers', () => {
    expect(() => createCalendar({ ...base, holidays: { '20270101': 'x' } })).toThrow(/outside/);
  });
});
