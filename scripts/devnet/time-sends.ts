// Times sample transactions on devnet, from sending to "confirmed" and to "finalized" (D71, M0).
// Each one moves n lamports from the operator key to the upgrade key, so no two messages are alike.
// Run in WSL, where the key files are (D92); the operator key pays about 0.000005 SOL a transaction:
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/devnet/time-sends.ts 50"
// SOLANA_RPC_URL overrides the public devnet endpoint.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Commitment,
  type Signature,
} from '@solana/kit';

const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const SYSTEM_PROGRAM = address('11111111111111111111111111111111');
const count = Number(process.argv[2] ?? 50);
if (!Number.isInteger(count) || count < 1) throw new Error('usage: node scripts/devnet/time-sends.ts <count>');

const keyFile = (name: string) =>
  new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', `meridian-${name}.json`), 'utf8')));
const operator = await createKeyPairSignerFromBytes(keyFile('operator'));
const upgrade = (await createKeyPairSignerFromBytes(keyFile('upgrade'))).address;

const rpc = createSolanaRpc(RPC);
const rpcSubscriptions = createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws'));

// The System program's Transfer: instruction 2 as a little-endian u32, then the lamports as a u64.
function transfer(from: Address, to: Address, lamports: bigint) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, lamports, true);
  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

type Notifications = Awaited<ReturnType<ReturnType<typeof rpcSubscriptions.signatureNotifications>['subscribe']>>;

// Resolves with the time, in ms from `start`, of the first notification. Calling it starts reading at once.
async function first(notifications: Notifications, signature: Signature, start: () => number) {
  for await (const { value } of notifications) {
    if (value.err) throw new Error(`${signature} failed: ${JSON.stringify(value.err, (_, v) => (typeof v === 'bigint' ? `${v}` : v))}`);
    return performance.now() - start();
  }
  throw new Error(`${signature}: the subscription closed first`);
}

const rows: { sent: number; confirmed: number; finalized: number }[] = [];
for (let i = 1; i <= count; i++) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  const transaction = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(operator, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstruction(transfer(operator.address, upgrade, BigInt(i)), m),
    ),
  );
  const signature = getSignatureFromTransaction(transaction);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 120_000);
  // Both subscriptions are live and being read before the send, so no notification can be missed.
  const subscribe = (commitment: Commitment) =>
    rpcSubscriptions.signatureNotifications(signature, { commitment }).subscribe({ abortSignal: abort.signal });
  const [toConfirmed, toFinalized] = await Promise.all([subscribe('confirmed'), subscribe('finalized')]);
  let t0 = 0;
  const confirmed = first(toConfirmed, signature, () => t0);
  const finalized = first(toFinalized, signature, () => t0);
  t0 = performance.now();
  await rpc.sendTransaction(getBase64EncodedWireTransaction(transaction), { encoding: 'base64', preflightCommitment: 'confirmed' }).send();
  const sent = performance.now() - t0;
  const row = { sent, confirmed: await confirmed, finalized: await finalized };
  clearTimeout(timeout);
  abort.abort();
  rows.push(row);
  console.log(`${String(i).padStart(3)} ${signature}  sent ${row.sent.toFixed(0)} ms, confirmed ${row.confirmed.toFixed(0)} ms, finalized ${row.finalized.toFixed(0)} ms`);
}

const stats = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  const at = (p: number) => v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)].toFixed(0);
  return `min ${v[0].toFixed(0)}, median ${at(0.5)}, p90 ${at(0.9)}, max ${v[v.length - 1].toFixed(0)} ms`;
};
console.log(`\n${count} transactions on ${RPC}, ${new Date().toISOString()}`);
console.log(`send call returned: ${stats(rows.map((r) => r.sent))}`);
console.log(`to "confirmed":     ${stats(rows.map((r) => r.confirmed))}`);
console.log(`to "finalized":     ${stats(rows.map((r) => r.finalized))}`);
process.exit(0);
