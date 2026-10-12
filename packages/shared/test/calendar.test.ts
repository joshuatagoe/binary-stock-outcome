import { describe, expect, it } from 'vitest';
import { newYorkOffsetHours, tradingTimes } from '../src/index.ts';

const utc = (y: number, m: number, d: number, h: number, mi = 0) => Date.UTC(y, m - 1, d, h, mi) / 1000;

/** What a New York clock reads at a Unix time, from the platform's own time zone data: an oracle independent of our rule. */
function newYorkWall(unix: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(unix * 1000));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { day: Number(`${p.year}${p.month}${p.day}`), hm: `${p.hour}:${p.minute}:${p.second}` };
}

describe('New York trading times', () => {
  it('an ordinary autumn day (EDT, UTC-4)', () => {
    expect(tradingTimes(20261009, false)).toEqual({ mintOpen: utc(2026, 10, 9, 13), open: utc(2026, 10, 9, 13, 30), close: utc(2026, 10, 9, 20) });
  });

  it('an early-close day ends at 1:00 PM (EST, UTC-5)', () => {
    const t = tradingTimes(20261127, true);
    expect(t.close).toBe(utc(2026, 11, 27, 18));
    expect(t.mintOpen).toBe(utc(2026, 11, 27, 14));
    expect(t.open).toBe(utc(2026, 11, 27, 14, 30));
  });

  describe('1 November 2026: clocks go back at 2:00 AM', () => {
    it('Friday 30 October is still EDT', () => {
      expect(tradingTimes(20261030, false).mintOpen).toBe(utc(2026, 10, 30, 13));
      expect(tradingTimes(20261030, false).close).toBe(utc(2026, 10, 30, 20));
    });
    it('the Sunday itself is already EST by 9:00', () => {
      expect(tradingTimes(20261101, false).mintOpen).toBe(utc(2026, 11, 1, 14));
    });
    it('Monday 2 November is EST: the same wall time is an hour later in UTC', () => {
      const t = tradingTimes(20261102, false);
      expect(t).toEqual({ mintOpen: utc(2026, 11, 2, 14), open: utc(2026, 11, 2, 14, 30), close: utc(2026, 11, 2, 21) });
    });
  });

  describe('March 2027: clocks go forward on the second Sunday, 14 March', () => {
    it('Friday 12 March is EST', () => {
      expect(tradingTimes(20270312, false).mintOpen).toBe(utc(2027, 3, 12, 14));
      expect(tradingTimes(20270312, false).close).toBe(utc(2027, 3, 12, 21));
    });
    it('the Sunday itself is already EDT by 9:00', () => {
      expect(tradingTimes(20270314, false).mintOpen).toBe(utc(2027, 3, 14, 13));
    });
    it('Monday 15 March is EDT', () => {
      const t = tradingTimes(20270315, false);
      expect(t).toEqual({ mintOpen: utc(2027, 3, 15, 13), open: utc(2027, 3, 15, 13, 30), close: utc(2027, 3, 15, 20) });
    });
    it('8 March 2027 is not the change: it is a Monday in EST', () => {
      expect(tradingTimes(20270308, false).mintOpen).toBe(utc(2027, 3, 8, 14));
    });
  });

  it('the 2026 spring change was 8 March', () => {
    expect(newYorkOffsetHours(20260306)).toBe(-5);
    expect(newYorkOffsetHours(20260308)).toBe(-4);
  });

  it('agrees with the platform time zone data on every day of 2026 and 2027', () => {
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 86_400_000) {
      const d = new Date(t);
      const day = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
      for (const early of [false, true]) {
        const r = tradingTimes(day, early);
        expect(newYorkWall(r.mintOpen), `${day} mint open`).toEqual({ day, hm: '09:00:00' });
        expect(newYorkWall(r.open), `${day} open`).toEqual({ day, hm: '09:30:00' });
        expect(newYorkWall(r.close), `${day} close`).toEqual({ day, hm: early ? '13:00:00' : '16:00:00' });
      }
    }
  });

  it('refuses a day that is not a real date', () => {
    expect(() => tradingTimes(20261340, false)).toThrow();
    expect(() => tradingTimes(20260230, false)).toThrow();
    expect(() => tradingTimes(1234, false)).toThrow();
  });
});
