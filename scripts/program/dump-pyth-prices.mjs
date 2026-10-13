// Saves real Pyth price accounts from devnet for Record close's and Settle's tests (M3-a; D28, D80, D125): each
// account's data as <name>.bin, and in pyth-prices.json its address, owner, lamports, slot, size, SHA-256 and decoded
// price. Read-only: one getAccountInfo per account.
//   node scripts/program/dump-pyth-prices.mjs programs/meridian/tests/fixtures
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const OUT = process.argv[2];
if (!OUT) throw new Error('usage: node dump-pyth-prices.mjs <fixtures folder>');
const ACCOUNTS = {
  // Zach Gardner's push accounts (S15 research, PS.01, PS.02): Pyth's legacy receiver, Full verification.
  meta_push_legacy: { address: '6NJCSCAWy1yB1jEGhPbsMTrT4WH13o8BGD5wgPbBtdY9', source: "PS.01: Zach's META push account (legacy receiver)" },
  aapl_push_legacy: { address: 'D9uk39pqZMcnmtPP9WeC8cREUpKZmyXLga9mSQ79SphW', source: "PS.01: Zach's AAPL push account (legacy receiver)" },
  // A classmate's post through the upgraded receiver (PS.06, wallet fdKg…/5LzcEk…): META's 4:00:00 PM close of 2026-10-08.
  meta_close_20261008_upgraded: { address: '4CYyLSzEQA84RvvEbqTYuTZscEmJoWsdyGNsWtddm2k9', source: "PS.06: META's 2026-10-08 4:00:00 PM close posted through the upgraded receiver" },
  // An older post through the legacy receiver, only partly verified (5 signatures).
  meta_partial_legacy: { address: 'FuJTz8B4FGyUxCAXY5frSAwWY8F3rNR5UqX2uksb8JF', source: 'A 2026-06-04 META post through the legacy receiver, verification Partial (5 signatures)' },
};
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes) {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let s = '';
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b === 0) s = '1' + s; else break; }
  return s;
}
// PriceUpdateV2 (pyth-solana-receiver-sdk 2.0.0): discriminator, write authority, verification level (1 byte for
// Full, 2 for Partial), then the price message.
function decode(data) {
  const full = data[40] === 1;
  let o = full ? 41 : 42;
  const feed = data.subarray(o, o + 32).toString('hex'); o += 32;
  const price = data.readBigInt64LE(o).toString(); o += 8;
  const conf = data.readBigUInt64LE(o).toString(); o += 8;
  const expo = data.readInt32LE(o); o += 4;
  const publishTime = Number(data.readBigInt64LE(o));
  const publishTimeEt = new Date(publishTime * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' });
  return { writeAuthority: b58(data.subarray(8, 40)), verification: full ? 'Full' : `Partial (${data[41]} signatures)`, feed, price, conf, expo, publishTime, publishTimeEt };
}
mkdirSync(OUT, { recursive: true });
const record = {};
for (const [name, { address, source }] of Object.entries(ACCOUNTS)) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'base64', commitment: 'finalized' }] }),
  });
  const body = await res.json();
  if (body.error || !body.result?.value) throw new Error(`${address}: ${JSON.stringify(body.error ?? 'not found')}`);
  const { value, context } = body.result;
  const data = Buffer.from(value.data[0], 'base64');
  writeFileSync(join(OUT, `pyth_${name}.bin`), data);
  record[name] = {
    address,
    source,
    owner: value.owner,
    lamports: value.lamports,
    slot: context.slot,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    ...decode(data),
  };
}
record.savedAt = new Date().toISOString();
writeFileSync(join(OUT, 'pyth-prices.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(record);
