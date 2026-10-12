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
const operator = await createKeyPairSignerFromBytes(
  new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'meridian-operator.json'), 'utf8'))),
);
const test = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'config', 'm0-wallet-test.json'), 'utf8'));
const tokens = [
  { mint: test.mints[0].address, key: 'm0-yes' },
  { mint: test.mints[1].address, key: 'm0-no' },
  { mint: test.control.address, key: 'm0-control' },
];

async function run(instructions: Instruction[]) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  const tx = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(operator, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    ),
  );
  await send(tx as Parameters<typeof send>[0], { commitment: 'confirmed' });
  return getSignatureFromTransaction(tx);
}

for (const { mint, key } of tokens) {
  const uri = `${SITE}/${key}.json`;
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`${uri} answered ${res.status}; deploy the files first`);
  const { value } = await rpc.getAccountInfo(address(mint), { encoding: 'base64' }).send();
  if (!value) throw new Error(`${mint} doesn't exist`);
  // The uri is stored as a length-prefixed string that is empty now, so the account grows by its byte length.
  const bytes = Buffer.from(value.data[0], 'base64').length + Buffer.byteLength(uri);
  const needed = (await rpc.getMinimumBalanceForRentExemption(BigInt(bytes)).send()) - value.lamports;
  const instructions: Instruction[] = [];
  if (needed > 0n) instructions.push(getTransferSolInstruction({ source: operator, destination: address(mint), amount: lamports(needed) }));
  instructions.push(getUpdateTokenMetadataFieldInstruction({ metadata: address(mint), updateAuthority: operator, field: tokenMetadataField('Uri'), value: uri }));
  console.log(`${key}: ${mint} now points at ${uri} (${bytes} bytes): ${await run(instructions)}`);
}
process.exit(0);
