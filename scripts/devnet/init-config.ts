// Initializes Config on devnet, once, signed by the upgrade key (ARCHITECTURE.md §6, D133), then reads it back.
// Run in WSL, where the key files are (D92):
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/devnet/init-config.ts"
// If Config already exists, it only reads it back. Values: config/program-<network>.json.
// MERIDIAN_NETWORK=local initializes make dev's local chain instead (D74), with MERIDIAN_KEYS naming the folder of
// its local key files. SOLANA_RPC_URL and SOLANA_WS_URL override the network's endpoints.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  address,
  appendTransactionMessageInstruction,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getAddressEncoder,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit';
import {
  fetchMaybeConfig,
  findConfigPda,
  getInitializeConfigInstructionAsync,
  MERIDIAN_PROGRAM_ADDRESS,
} from '../../clients/ts/src/generated/index.ts';

type ProgramConfig = {
  usdcMint: string;
  pythReceivers: string[];
  tickers: { symbol: string; feedId: string; strikeStepCents: number; enabled: boolean }[];
  ladderBps: number[];
  thresholds: {
    ordersCloseBeforeSecs: number; publishWindowSecs: number; maxBandBps: number; overrideBoundBps: number;
    overrideWaitSecs: number; overrideWaitLongSecs: number; operatorOnlySettleSecs: number;
    adminHoldBackstopSecs: number; bandHoldBackstopSecs: number; noPriceHoldAfterSecs: number;
  };
};

const NETWORK = process.env.MERIDIAN_NETWORK ?? 'devnet';
if (NETWORK !== 'devnet' && NETWORK !== 'local') throw new Error(`MERIDIAN_NETWORK must be devnet or local; it is "${NETWORK}"`);
const RPC = process.env.SOLANA_RPC_URL ?? (NETWORK === 'local' ? 'http://127.0.0.1:8899' : 'https://api.devnet.solana.com');
// Devnet serves its websocket on the same port as its RPC; a local chain serves it on the next port.
const WS = process.env.SOLANA_WS_URL ?? (NETWORK === 'local' ? 'ws://127.0.0.1:8900' : RPC.replace(/^http/, 'ws'));
const KEYS = process.env.MERIDIAN_KEYS ?? join(homedir(), '.config', 'solana');
const LOADER = address('BPFLoaderUpgradeab1e11111111111111111111111');
const repo = join(import.meta.dirname, '..', '..');
const values: ProgramConfig = JSON.parse(readFileSync(join(repo, 'config', `program-${NETWORK}.json`), 'utf8'));

// A key file holds the 64-byte key pair; only its public half is printed.
const signer = (name: string) =>
  createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(KEYS, `meridian-${name}.json`), 'utf8'))));

const rpc = createSolanaRpc(RPC);
const rpcSubscriptions = createSolanaRpcSubscriptions(WS);
const [configAddress] = await findConfigPda();

function show(config: Awaited<ReturnType<typeof fetchMaybeConfig>>) {
  if (!config.exists) return;
  const c = config.data;
  console.log(`Config ${configAddress}`);
  console.log(`  admin     ${c.admin}`);
  console.log(`  operator  ${c.operator}`);
  console.log(`  USDC      ${c.usdcMint}`);
  console.log(`  receivers ${c.pythReceivers.join(', ')}`);
  console.log(`  tickers   ${c.tickers.map((t) => t.symbol).join(', ')}`);
  console.log(`  paused    ${c.paused}, fill limit ${c.fillLimit}`);
}

const existing = await fetchMaybeConfig(rpc, configAddress);
if (existing.exists) {
  console.log('Config already exists; nothing sent.');
  show(existing);
  process.exit(0);
}

const [upgrade, admin, operator] = await Promise.all([signer('upgrade'), signer('admin'), signer('operator')]);
const [programData] = await getProgramDerivedAddress({
  programAddress: LOADER,
  seeds: [getAddressEncoder().encode(MERIDIAN_PROGRAM_ADDRESS)],
});

const instruction = await getInitializeConfigInstructionAsync({
  authority: upgrade,
  programData,
  admin: admin.address,
  operator: operator.address,
  usdcMint: address(values.usdcMint),
  pythReceivers: values.pythReceivers.map((r) => address(r)),
  tickers: values.tickers.map((t) => ({
    symbol: t.symbol,
    feedId: Uint8Array.from(Buffer.from(t.feedId, 'hex')),
    strikeStepCents: t.strikeStepCents,
    enabled: t.enabled,
  })),
  ladderBps: values.ladderBps,
  thresholds: values.thresholds,
});

const { value: blockhash } = await rpc.getLatestBlockhash().send();
const message = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(upgrade, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => appendTransactionMessageInstruction(instruction, m),
);
const transaction = await signTransactionMessageWithSigners(message);
assertIsTransactionWithBlockhashLifetime(transaction);
await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(transaction, { commitment: 'confirmed' });
const signature = getSignatureFromTransaction(transaction);
console.log(NETWORK === 'local' ? `Initialized on the local chain: ${signature}` : `Initialized: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
show(await fetchMaybeConfig(rpc, configAddress));
