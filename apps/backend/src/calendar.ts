// The trading calendar (D12): which days NYSE trades, which close early, and each day's stored times. The times and the
// clock changes are packages/shared's (D84); this file only adds the table of holidays and early closes from
// config/calendar.json. A day outside the table's years throws rather than guessing, so a table that runs out stops the
// jobs loudly instead of creating markets on a holiday.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDay, tradingTimes, type TradingTimes } from '@meridian/shared';

export type CalendarData = {
  years: number[];
  holidays: Record<string, string>;
  earlyCloses: Record<string, string>;
};

const ROOT = join(import.meta.dirname, '..', '..', '..');

const weekday = (day: number): number => {
  const { year, month, day: d } = parseDay(day);
  return new Date(Date.UTC(year, month - 1, d)).getUTCDay(); // 0 is Sunday
};
const isWeekend = (day: number) => weekday(day) === 0 || weekday(day) === 6;

/** The day before (-1) or after (+1) as a yyyymmdd number. */
function step(day: number, by: 1 | -1): number {
  const { year, month, day: d } = parseDay(day);
  const next = new Date(Date.UTC(year, month - 1, d + by));
  return next.getUTCFullYear() * 10000 + (next.getUTCMonth() + 1) * 100 + next.getUTCDate();
}

export function createCalendar(data: CalendarData) {
  const holidays = new Set(Object.keys(data.holidays).map(Number));
  const earlyCloses = new Set(Object.keys(data.earlyCloses).map(Number));
  const years = new Set(data.years);

  for (const day of [...holidays, ...earlyCloses]) {
    if (!years.has(Math.floor(parseDay(day).year))) throw new Error(`The calendar lists ${day}, outside its years ${data.years.join(', ')}`);
  }
  for (const day of earlyCloses) {
    if (holidays.has(day)) throw new Error(`The calendar lists ${day} as both a holiday and an early close`);
    if (isWeekend(day)) throw new Error(`The calendar lists the early close ${day} on a weekend`);
  }

  const covers = (day: number) => years.has(parseDay(day).year);
  const assertCovered = (day: number) => {
    if (!covers(day)) throw new RangeError(`${day} is not covered by the calendar (years ${data.years.join(', ')}); extend config/calendar.json`);
  };

  const isTradingDay = (day: number): boolean => {
    assertCovered(day);
    return !isWeekend(day) && !holidays.has(day);
  };
  const isEarlyClose = (day: number): boolean => isTradingDay(day) && earlyCloses.has(day);

  // The nearest trading day in a direction; stepping off the table's end throws.
  const walk = (day: number, by: 1 | -1): number => {
    let d = step(day, by);
    while (!isTradingDay(d)) d = step(d, by);
    return d;
  };

  return {
    data,
    covers,
    isTradingDay,
    isEarlyClose,
    /** Mint open 9:00, open 9:30 and close (4:00 PM, or 1:00 PM early) in Unix seconds; null when the market is shut. */
    times(day: number): TradingTimes | null {
      return isTradingDay(day) ? tradingTimes(day, earlyCloses.has(day)) : null;
    },
    previousTradingDay: (day: number) => walk(day, -1),
    nextTradingDay: (day: number) => walk(day, 1),
  };
}

export type Calendar = ReturnType<typeof createCalendar>;

export function loadCalendar(root = ROOT): Calendar {
  return createCalendar(JSON.parse(readFileSync(join(root, 'config', 'calendar.json'), 'utf8')) as CalendarData);
}
