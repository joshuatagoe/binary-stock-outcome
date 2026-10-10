// Section 9: monthly running cost for the devnet demo and a rough production level. Prices from the research of 2026-10-10
// (pricing pages: Fly.io, Northflank, Neon, Cloudflare, Alchemy, Triton; Pyth Pro from F7.22). ASSUME marks inputs no source gave.
const HOURS = 730;
const demo = {
  'Fly.io shared-cpu-1x 256 MB, ewr ($2.19 per 30 days)': 2.19 * (30.44 / 30),
  'Fly.io volume, 1 GB ($0.15/GB-month)': 0.15,
  'Standby on Northflank Sandbox (free, always on; allowances unconfirmed)': 0,
  'Cloudflare Pages (free), R2 backups (free to 10 GB)': 0,
  'Alchemy, Healthchecks.io, Telegram, Tiingo (free tiers)': 0,
};
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(demo)) console.log(`demo  ${v.toFixed(2).padStart(8)}  ${k}`);
console.log(`demo  ${sum(demo).toFixed(2).padStart(8)}  total a month (devnet SOL and USDC are free)\n`);
// Production (L2 traffic on mainnet; the mainnet bonus is deferred, so this is a price, not a plan).
const prod = {
  'two backends, 1 vCPU + 2 GB each on Northflank rates ($0.01667/vCPU-h, $0.00833/GB-h)': 2 * (0.01667 + 2 * 0.00833) * HOURS,
  'managed Postgres, Neon Launch at 0.25 CU always on ($0.106/CU-h; 0.25 CU ASSUMED) + 5 GB ($0.35/GB)': 0.25 * 0.106 * HOURS + 5 * 0.35,
  'paid RPC, Triton ($10 per million calls; ASSUME 30M calls a month at L2)': 30 * 10,
  'Pyth Pro stock data (from $2,500 a month, F7.22)': 2500,
  'static site and backups (free tiers)': 0,
};
for (const [k, v] of Object.entries(prod)) console.log(`prod  ${v.toFixed(2).padStart(8)}  ${k}`);
console.log(`prod  ${sum(prod).toFixed(2).padStart(8)}  total a month, before mainnet SOL rent and any legal costs`);
