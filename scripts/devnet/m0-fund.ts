// Gives a wallet what M0's wallet test needs (D94, D115): 0.05 devnet SOL for fees, and 5 Yes and 5 No test tokens
// from config/m0-wallet-test.json. The operator key pays and mints; the upgrade key tops it up first if needed.
// Run in WSL, where the key files are (D92), with the wallet's public address:
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/devnet/m0-fund.ts <wallet address>"
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
  type TransactionSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getMintToCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';

const wallet = address(process.argv[2] ?? '');
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const rpc = createSolanaRpc(RPC);
const send = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws')) });
const test = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'config', 'm0-wallet-test.json'), 'utf8'));

const keyFile = (name: string) =>
  createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', `meridian-${name}.json`), 'utf8'))));
const [operator, upgrade] = await Promise.all([keyFile('operator'), keyFile('upgrade')]);

async function run(payer: TransactionSigner, instructions: Instruction[]) {
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

// 0.05 SOL to the wallet plus two token accounts' deposits and fees: 0.06 SOL is enough.
const need = 60_000_000;
const balance = Number((await rpc.getBalance(operator.address).send()).value);
if (balance < need) {
  const sig = await run(upgrade, [getTransferSolInstruction({ source: upgrade, destination: operator.address, amount: lamports(BigInt(need - balance)) })]);
  console.log(`topped the operator key up by ${(need - balance) / 1e9} SOL: ${sig}`);
}

const instructions: Instruction[] = [getTransferSolInstruction({ source: operator, destination: wallet, amount: lamports(50_000_000n) })];
for (const mint of test.mints as { address: string; name: string }[]) {
  const [ata] = await findAssociatedTokenPda({ owner: wallet, mint: address(mint.address), tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  instructions.push(
    await getCreateAssociatedTokenIdempotentInstructionAsync({ payer: operator, owner: wallet, mint: address(mint.address), tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }),
    getMintToCheckedInstruction({ mint: address(mint.address), token: ata, mintAuthority: operator, amount: 5n, decimals: 0 }),
  );
}
const signature = await run(operator, instructions);
console.log(`sent 0.05 SOL and 5 of each test token to ${wallet}: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
process.exit(0);
