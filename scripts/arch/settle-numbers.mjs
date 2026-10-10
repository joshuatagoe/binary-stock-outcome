// Section 4: the settlement numbers (items 9, 10, 11, 13, 14) and the close buffer (D37), from measured data (AR.04, AR.10).
const SIGMA = 0.02, SESSION_S = 6.5 * 3600;                       // ASSUME 2% daily moves, as in requotes.mjs
const META = 684.00;                                               // the running example's close
const drift = (sec, price) => price * SIGMA * Math.sqrt(sec / SESSION_S);   // 1 standard deviation of the move in `sec` seconds
const bandMedianMeta = 0.1965;                                     // AR.04: META's median band at the close

console.log('Item 9, publish-time window (D57): a price published `w` s before the close can differ from the close by about');
const offsets = { 0: 23, 27: 1, 300: 1 };                          // AR.04 data: seconds before 16:00:00, count of closing prices
for (const w of [0, 5, 30, 60, 300]) {
  const admitted = Object.entries(offsets).filter(([o]) => +o <= w).reduce((s, [, n]) => s + n, 0);
  console.log(`  w=${String(w).padStart(3)} s: +/- ${drift(w, META).toFixed(2)} on META (band ${bandMedianMeta}); admits ${admitted} of 25 closing prices seen`);
}
console.log('Item 10, widest band accepted (D26): observed at the close median 2.53, max 10.50 bps; session p99 24.41, outlier 490.72 bps (AR.04)');
for (const bps of [10, 25, 50]) console.log(`  ${bps} bps = +/- ${(META * bps / 1e4).toFixed(2)} on META at ${META}`);
console.log('Item 11, override bound (D63), around Pyth\'s 4:00 price 680.02 +/- 0.04 (USERS F11):');
for (const pct of [0.25, 0.5, 1]) {
  const b = 680.02 * pct / 100;
  const typo = Math.abs(697.97 - 680.02), real = Math.abs(679.97 - 680.02);
  console.log(`  ${pct}% = +/- ${b.toFixed(2)}: typo 697.97 (off ${typo.toFixed(2)}) ${typo > b ? 'outside' : 'inside'}; official 679.97 (off ${real.toFixed(2)}) ${real > b ? 'outside' : 'inside'}`);
}
console.log('Item 13, two-source previous close (D55): a split moves the close by at least a third (3-for-2); auction differences are cents');
for (const pct of [0.5, 1, 2]) console.log(`  ${pct}% of 680 = ${(6.80 * pct).toFixed(2)}; a 3-for-2 split (680 -> 453.33) differs by 33.3%`);
console.log('D37 close buffer: devnet block time ran 1.5 to 2.4 s behind this machine, which ran ~0.9 s ahead of a Date header (AR.10)');
