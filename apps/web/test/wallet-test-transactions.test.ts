// The wallet test's transactions (M0 slice f): what the page asks Phantom and Solflare to sign.
import { address, createNoopSigner, type Blockhash } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { describe, expect, it } from 'vitest';
import { batchOfThree, sendOneToken, v1Transfer } from '../src/wallet-test/transactions.ts';

const wallet = createNoopSigner(address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q'));
const authority = address('AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY');
const yes = address('9XqLMoYz4iteiumAiKb5Myv98efzpfYWpFSLb1KvJRGG');
const lifetime = { blockhash: '11111111111111111111111111111111' as Blockhash, lastValidBlockHeight: 100n };

describe("the wallet test's transactions", () => {
  it('sends one Yes token from the wallet to the test authority, through Token-2022, with the wallet paying', async () => {
    const message = await sendOneToken(wallet, yes, authority, lifetime);
    expect(message.version).toBe(0);
    expect(message.feePayer.address).toBe(wallet.address);
    const transfer = message.instructions.at(-1)!;
    expect(transfer.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    const [from] = await findAssociatedTokenPda({ owner: wallet.address, mint: yes, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
    const [to] = await findAssociatedTokenPda({ owner: authority, mint: yes, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
    expect(transfer.accounts?.map((a) => a.address)).toEqual([from, yes, to, wallet.address]);
  });

  it('makes three different transactions for the batch, so each has its own signature', () => {
    const batch = batchOfThree(wallet, authority, lifetime);
    expect(batch).toHaveLength(3);
    const data = batch.map((m) => Buffer.from(m.instructions[0].data!).toString('hex'));
    expect(new Set(data).size).toBe(3);
  });

  it('builds the v1 transaction as version 1 (D110)', () => {
    expect(v1Transfer(wallet, authority, lifetime).version).toBe(1);
  });
});
