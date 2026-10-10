// Section 1 sizing, devnet demo level. Every input is a decision (Dn) or a labelled assumption (ASSUME).
import { ladder, CLOSE_2026_10_09 as P } from './strikes.mjs';
const markets = Object.fromEntries(Object.entries(P).map(([t, c]) => [t, ladder(c).length]));
const M = Object.values(markets).reduce((a, b) => a + b, 0);
console.log('markets per stock at 10/9 closes:', JSON.stringify(markets), 'total', M, '(D6 ceiling 49)');

// Send pacing (D56): one shared queue under 40 sends per 10 s, so 4 tx/s at most.
const SEND_PER_S = 40 / 10;
const burst = (n) => (n / SEND_PER_S).toFixed(1) + ' s';

// Morning (D56): creating a market. ASSUME 2 transactions per market (accounts and compute may not fit one; measured at M0).
const createTx = 2 * M;
// Bot quotes (D41): ASSUME one bid and one ask per market, posted in one batch transaction per stock at 9:30.
const quoteTx0 = 7;
// Close sweep (D37): ASSUME one transaction per market cancels and refunds its resting orders.
const sweepTx = M;
// Settlement (D81, D83): one record-close transaction per stock, then ASSUME one settle transaction per stock covering its strikes.
const recordTx = 7, settleTx = 7;
console.log(`8:30 create: ${createTx} tx, at least ${burst(createTx)} at the D56 pace (window 8:30-9:00 = 1800 s)`);
console.log(`9:30 first quotes: ${quoteTx0} tx, ${burst(quoteTx0)}`);
console.log(`4:00 close sweep: ${sweepTx} tx, ${burst(sweepTx)}`);
console.log(`~4:02 record + settle: ${recordTx + settleTx} tx, ${burst(recordTx + settleTx)}`);

// Traders (ASSUME, demo level): graders and classmates. Low/high: traders per day, actions each (buy, sell, cancel, redeem), share in the busiest hour.
for (const [label, traders, actions, busyShare] of [['low', 10, 10, 0.3], ['high', 50, 20, 0.3]]) {
  const tx = traders * actions, busy = tx * busyShare;
  console.log(`${label}: ${traders} traders x ${actions} actions = ${tx} user tx/day; busiest hour ${busy} tx = ${(busy / 3600).toFixed(3)} tx/s; per market ${(busy / 3600 / M).toFixed(4)} tx/s`);
}
// Rent locked for good per day (D50 0.008 SOL/market for standard mints; D94 adds ~0.0016704 SOL/market, AR.02).
const perm = 0.008 + 0.0016704;
console.log(`permanent SOL per day: ${(perm * M).toFixed(3)} at ${M} markets, ${(perm * 49).toFixed(3)} at 49; per 30 days ${(perm * M * 21).toFixed(2)} (21 trading days)`);
