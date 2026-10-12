// The wallet test's transactions (M0 slice f): what the page asks Phantom and Solflare to sign. The wallet pays
// the fees from the test SOL that scripts/devnet/m0-fund.ts sent it.
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  lamports,
  pipe,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  type Address,
  type Blockhash,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';

export type Lifetime = { blockhash: Blockhash; lastValidBlockHeight: bigint };

const v0 = (wallet: TransactionSigner, lifetime: Lifetime, instructions: Instruction[]) =>
  pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(wallet, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

const v1 = (wallet: TransactionSigner, lifetime: Lifetime, instructions: Instruction[]) =>
  pipe(
    createTransactionMessage({ version: 1 }),
    (m) => setTransactionMessageFeePayerSigner(wallet, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

// One Permissioned Burn token from the wallet to the test authority: does the wallet send these tokens (D94)?
export async function sendOneToken(wallet: TransactionSigner, mint: Address, to: Address, lifetime: Lifetime) {
  const tokenProgram = TOKEN_2022_PROGRAM_ADDRESS;
  const [source] = await findAssociatedTokenPda({ owner: wallet.address, mint, tokenProgram });
  const [destination] = await findAssociatedTokenPda({ owner: to, mint, tokenProgram });
  return v0(wallet, lifetime, [
    await getCreateAssociatedTokenIdempotentInstructionAsync({ payer: wallet, owner: to, mint, tokenProgram }),
    getTransferCheckedInstruction({ source, mint, destination, authority: wallet, amount: 1n, decimals: 0 }),
  ]);
}

// Three small transfers with different amounts, so each transaction differs: one approval or three (D66)?
export function batchOfThree(wallet: TransactionSigner, to: Address, lifetime: Lifetime) {
  return [1n, 2n, 3n].map((n) =>
    v0(wallet, lifetime, [getTransferSolInstruction({ source: wallet, destination: to, amount: lamports(n) })]),
  );
}

// A version 1 transaction: can the wallet sign it (D110)? A v1 transaction states its own limits; without them,
// devnet's simulation refused it with "MaxLoadedAccountsDataSizeExceeded" (M0.13). 64 KiB and 10,000 compute
// units are ample for one transfer.
export function v1Transfer(wallet: TransactionSigner, to: Address, lifetime: Lifetime) {
  return pipe(
    v1(wallet, lifetime, [getTransferSolInstruction({ source: wallet, destination: to, amount: lamports(4n) })]),
    (m) => setTransactionMessageLoadedAccountsDataSizeLimit(64 * 1024, m),
    (m) => setTransactionMessageComputeUnitLimit(10_000, m),
  );
}
