// Points each wallet test token's metadata at its file on the website, which gives wallets a name and a picture
// (D108, M0 slice f): https://meridian-devnet-2qv.pages.dev/tokens/<key>.json, from apps/web/public/tokens.
// The operator key is the update authority. A longer uri needs a bigger account, so the same transaction first
// tops the mint's deposit up to the new size. Run in WSL after the files are live (D92):
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/devnet/m0-token-uri.ts"
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { getUpdateTokenMetadataFieldInstruction, tokenMetadataField } from '@solana-program/token-2022';

const SITE = 'https://meridian-devnet-2qv.pages.dev/tokens';
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const rpc = createSolanaRpc(RPC);
const send = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws')) });
const keyFile = (name: string) =>
  createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', `meridian-${name}.json`), 'utf8'))));
const [operator, upgrade] = await Promise.all([keyFile('operator'), keyFile('upgrade')]);
const test = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'config', 'm0-wallet-test.json'), 'utf8'));
const tokens = [
  { mint: test.mints[0].address, key: 'm0-yes' },
  { mint: test.mints[1].address, key: 'm0-no' },
  { mint: test.control.address, key: 'm0-control' },
];

async function run(instructions: Instruction[], payer = operator) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  const tx = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    ),
  );
  await send(tx as Parameters<typeof send>[0], { commitment: 'confirmed' });
  return getSignatureFromTransaction(tx);
}

// The operator key pays each mint's extra deposit and must keep its own; the upgrade key tops it up to 0.02 SOL.
const balance = Number((await rpc.getBalance(operator.address).send()).value);
if (balance < 20_000_000) {
  const sig = await run([getTransferSolInstruction({ source: upgrade, destination: operator.address, amount: lamports(BigInt(20_000_000 - balance)) })], upgrade);
  console.log(`topped the operator key up to 0.02 SOL: ${sig}`);
}

for (const { mint, key } of tokens) {
  const uri = `${SITE}/${key}.json`;
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`${uri} answered ${res.status}; deploy the files first`);
  const { value } = await rpc.getAccountInfo(address(mint), { encoding: 'jsonParsed' }).send();
  if (!value || !('parsed' in value.data)) throw new Error(`${mint} doesn't exist or isn't a parsed mint`);
  // The uri is a length-prefixed string, so the account changes size by the difference in byte length. A rerun,
  // with the same uri already set, needs no extra deposit.
  const info = value.data.parsed.info as { extensions?: { extension: string; state: { uri?: string } }[] };
  const current = info.extensions?.find((e) => e.extension === 'tokenMetadata')?.state.uri ?? '';
  const { value: raw } = await rpc.getAccountInfo(address(mint), { encoding: 'base64' }).send();
  const bytes = Buffer.from(raw!.data[0], 'base64').length - Buffer.byteLength(current) + Buffer.byteLength(uri);
  const needed = (await rpc.getMinimumBalanceForRentExemption(BigInt(bytes)).send()) - value.lamports;
  const instructions: Instruction[] = [];
  if (needed > 0n) instructions.push(getTransferSolInstruction({ source: operator, destination: address(mint), amount: lamports(needed) }));
  instructions.push(getUpdateTokenMetadataFieldInstruction({ metadata: address(mint), updateAuthority: operator, field: tokenMetadataField('Uri'), value: uri }));
  console.log(`${key}: ${mint} now points at ${uri} (${bytes} bytes): ${await run(instructions)}`);
}
process.exit(0);
