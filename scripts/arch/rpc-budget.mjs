// Section 1: the backend's RPC budget against public devnet (100 requests per 10 s per IP, 40 per method; solana.com clusters page,
// research of 2026-10-10), and SSE fan-out. ASSUME marks inputs no source gave.
const LIMIT_TOTAL = 100 / 10, LIMIT_METHOD = 40 / 10; // per second
// L1 transactions per day: users <= 1,000 (scale-demo.mjs high), bot <= 202 (requotes.mjs p95 at 3%), jobs 92 + 7 + 46 + 14 = 159.
const txPerDay = 1000 + 202 + 159, busiestHourShare = 0.3; // ASSUME 30% of the day in the busiest hour
const txBusy = (txPerDay * busiestHourShare) / 3600;
const rows = [
  ['getTransaction: read each of our program\'s transactions for its events (D62)', txBusy],
  ['sends from the shared queue at its cap (D56)', LIMIT_METHOD],
  ['confirmation checks, ASSUME 2 per transaction of ours in the busiest hour', 2 * txBusy],
  ['price watch, 4:00-4:15: getMultipleAccounts on 7 accounts every 2 s (D81)', 0.5],
  ['heartbeat: 2 calls every 10 s per provider (D75)', 0.2],
];
let sum = 0; for (const [what, rate] of rows) { sum += rate; console.log(`${rate.toFixed(3)}/s  ${what}`); }
console.log(`total ${sum.toFixed(2)}/s against the ${LIMIT_TOTAL}/s per-IP limit (busiest hour, with the send queue at its cap)`);
// SSE fan-out: messages out per second = changes per second x tabs receiving each change.
// L1: ASSUME 50 open tabs, every tab gets every change (D16, one stream per tab). L2: ASSUME 5,000 tabs.
// Changes/s: L1 busiest hour txBusy; L2 x7 stocks 3.14 trades/s average (scale-levels.mjs) x ASSUME 10 order changes per trade.
for (const [lvl, tabs, changes] of [['L1', 50, txBusy], ['L2', 5000, 3.14 * 10]]) {
  const all = tabs * changes; // a tab that watches one stock gets about 1/7 of the changes
  console.log(`${lvl}: ${changes.toFixed(2)} changes/s; every tab gets everything: ${Math.round(all).toLocaleString()} msgs/s; tabs get only their stock: ${Math.round(tabs * changes / 7).toLocaleString()} msgs/s`);
}
