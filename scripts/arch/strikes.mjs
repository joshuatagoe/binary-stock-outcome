// D52 strike ladder for architecture sizing only: it takes the previous close in whole cents, which is enough to count markets.
// The product's one shared function (built in the implementation phase) must round from Pyth's exact integer price and exponent,
// never from a price first rounded to cents (D52's $499.995 case), and is tested against D52's cases.
// Nearest $10; an exact tie rounds away from the previous close (below: down, above: up); the 7th strike (the close itself) ties up.
export function ladder(prevCents, { offsets = [3, 6, 9], stepCents = 1000, seventh = true } = {}) {
  const r = (v, dir) => {
    const q = Math.floor(v / stepCents), rem = v - q * stepCents;
    if (rem * 2 > stepCents) return (q + 1) * stepCents;
    if (rem * 2 < stepCents) return q * stepCents;
    return dir > 0 ? (q + 1) * stepCents : q * stepCents;
  };
  const s = new Set();
  for (const pct of offsets) {
    s.add(r(Math.round(prevCents * (100 + pct) / 100), +1));
    s.add(r(Math.round(prevCents * (100 - pct) / 100), -1));
  }
  if (seventh) s.add(r(prevCents, +1));
  return [...s].sort((a, b) => a - b);
}
// Pyth closes at 16:00:00 ET on 2026-10-09 (PS.03 cache; AR.04).
export const CLOSE_2026_10_09 = { AAPL: 33651, MSFT: 52261, GOOGL: 34827, AMZN: 25402, NVDA: 22934, META: 71838, TSLA: 41777 };
