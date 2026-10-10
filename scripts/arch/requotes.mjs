// How many batch re-quote transactions the bot sends per day (D41: one transaction per stock replaces its quotes;
// a book re-quotes only when its fair Yes price moves more than STEP). Fair Yes = P(close >= K) under a driftless normal model.
// ASSUME: daily move sigma 2%; the bot checks every 5 s; stock price updates either hourly at :05 (Zach's posts, PS.03) or every second.
import { ladder, CLOSE_2026_10_09 as P } from './strikes.mjs';
const SIGMA = Number(process.argv[2] ?? 0.02), STEP = 0.02, CHECK = 5, OPEN = 9.5 * 3600, CLOSE = 16 * 3600, DAYS = 400;
const phi = (x) => 0.5 * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x ** 3)));   // normal CDF approximation, error < 3e-4
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
function day(updateEvery) {
  let tx = 0, maxIn10 = 0; const sends = [];
  for (const c of Object.values(P)) {
    const ks = ladder(c).map((k) => k / 100); let S = c / 100, quoted = null;
    for (let t = OPEN; t < CLOSE; t += CHECK) {
      const hourly = updateEvery === 'hourly';
      if (hourly ? ((t - OPEN) % 3600 === 2100) : true) S *= Math.exp(SIGMA * Math.sqrt((hourly ? 3600 : CHECK) / (6.5 * 3600)) * gauss());
      const tau = Math.max((CLOSE - t) / (6.5 * 3600), 1e-6);
      const fair = ks.map((k) => phi(Math.log(S / k) / (SIGMA * Math.sqrt(tau))));
      if (!quoted || fair.some((f, i) => Math.abs(f - quoted[i]) > STEP)) { quoted = fair; tx++; sends.push(t); }
    }
  }
  sends.sort((a, b) => a - b);
  for (let i = 0, j = 0; i < sends.length; i++) { while (sends[i] - sends[j] >= 10) j++; maxIn10 = Math.max(maxIn10, i - j + 1); }
  return { tx, maxIn10, last30min: sends.filter((t) => t >= CLOSE - 1800).length };
}
for (const mode of ['hourly', 'every second']) {
  const r = Array.from({ length: DAYS }, () => day(mode));
  const q = (k, p) => r.map((x) => x[k]).sort((a, b) => a - b)[Math.floor(p * (r.length - 1))];
  console.log(`price updates ${mode}, sigma ${SIGMA * 100}%: bot tx/day median ${q('tx', .5)}, p95 ${q('tx', .95)}; in the last 30 min median ${q('last30min', .5)}; max in any 10 s p95 ${q('maxIn10', .95)} (D56 cap 40, shared)`);
}
