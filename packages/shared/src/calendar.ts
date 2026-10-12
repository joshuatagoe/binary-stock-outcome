// New York trading-day times, as the program stores them (Unix seconds, UTC; ARCHITECTURE.md section 4, D84). The trading day is the ET date.
// US daylight time runs from the second Sunday of March to the first Sunday of November, changing at 2:00 AM local. Every trading
// time is after 2:00 AM, so the offset on a day is fixed by the date alone. Holidays and early-close days are not decided here:
// the caller says whether a day is an early close.

export interface TradingTimes {
  /** 9:00 AM ET: minting opens. */
  mintOpen: number;
  /** 9:30 AM ET: orders open. */
  open: number;
  /** 4:00 PM ET, or 1:00 PM ET on an early-close day: trading ends. */
  close: number;
}

export interface CivilDay {
  year: number;
  month: number;
  day: number;
}

/** Reads a yyyymmdd number, refusing anything that is not a real date. */
export function parseDay(yyyymmdd: number): CivilDay {
  if (!Number.isInteger(yyyymmdd) || yyyymmdd < 10_000_101 || yyyymmdd > 99_991_231) throw new RangeError(`Not a yyyymmdd day: ${yyyymmdd}`);
  const year = Math.floor(yyyymmdd / 10000);
  const month = Math.floor(yyyymmdd / 100) % 100;
  const day = yyyymmdd % 100;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`Not a real date: ${yyyymmdd}`);
  }
  return { year, month, day };
}

/** The day of the month of the n-th Sunday (1-based) of a month. */
function nthSunday(year: number, month: number, n: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 is Sunday
  return 1 + ((7 - firstWeekday) % 7) + 7 * (n - 1);
}

/** -4 (EDT) from the second Sunday of March up to the first Sunday of November, -5 (EST) otherwise, for times after 2:00 AM. */
export function newYorkOffsetHours(yyyymmdd: number): -4 | -5 {
  const { year, month, day } = parseDay(yyyymmdd);
  const starts = year * 10000 + 300 + nthSunday(year, 3, 2);
  const ends = year * 10000 + 1100 + nthSunday(year, 11, 1);
  const date = year * 10000 + month * 100 + day;
  return date >= starts && date < ends ? -4 : -5;
}

/** Unix seconds for a New York wall-clock time on a day. */
export function newYorkTime(yyyymmdd: number, hour: number, minute = 0): number {
  const { year, month, day } = parseDay(yyyymmdd);
  return Date.UTC(year, month - 1, day, hour - newYorkOffsetHours(yyyymmdd), minute) / 1000;
}

/** The three stored times of a trading day: mint open 9:00, open 9:30, close 4:00 PM (1:00 PM on an early-close day). */
export function tradingTimes(yyyymmdd: number, earlyClose: boolean): TradingTimes {
  return {
    mintOpen: newYorkTime(yyyymmdd, 9, 0),
    open: newYorkTime(yyyymmdd, 9, 30),
    close: newYorkTime(yyyymmdd, earlyClose ? 13 : 16, 0),
  };
}
