// The clock the pages read, as Unix seconds, ticking so countdowns and market states stay right.
import { useEffect, useState } from 'react';

export function useNow(everyMs = 15_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}

/** Today's date in New York as yyyymmdd (the trading day, D84). */
export function newYorkDay(unixSeconds: number): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(unixSeconds * 1000),
  );
  return Number(parts.replaceAll('-', ''));
}
