// What the close jobs send to the chain: the Return to owner transaction, and the owner's token accounts it needs (D99).
import * as client from '@meridian/client';
import { getReturnToOwnerDiscriminatorBytes, getMarketDecoder, getMarketEncoder } from '@meridian/client';
import { marketAccounts, marketAddress, PROGRAM_ADDRESS } from '@meridian/shared';
import { generateKeyPairSigner, type Address, type ReadonlyUint8Array } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import { ataOf, ATA_PROGRAM, createCloseChain, isNothingToReturn, returnInstructions, TOKEN_2022_PROGRAM, TOKEN_PROGRAM, type CloseRpc } from '../src/closeChain.ts';
import { rpcTransport, type TransportRpc } from '../src/rpcTransport.ts';
import { SendFailedError } from '../src/sendQueue.ts';

const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as Address;

async function setup() {
  const [operator, owner] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
  const market = await marketAddress('AAPL', 20261013, 100_000);
  const accounts = await marketAccounts(market);
  const own = {
    usdc: await ataOf(owner.address, USDC_MINT, TOKEN_PROGRAM),
    yes: await ataOf(owner.address, accounts.yesMint, TOKEN_2022_PROGRAM),
    no: await ataOf(owner.address, accounts.noMint, TOKEN_2022_PROGRAM),
  };
  return { operator, owner, market, own };
}
const build = async (balance: { usdc: bigint; yes: bigint; no: bigint }, existing: string[], s: Awaited<ReturnType<typeof setup>>) =>
  returnInstructions({ payer: s.operator, market: s.market, owner: s.owner.address, balance, usdcMint: USDC_MINT, existing: new Set(existing) });

describe('Return to owner for an owner whose token account was closed (D99)', () => {
  it('re-creates, in the same transaction and first, each missing account that is about to receive something', async () => {
    const s = await setup();
    const ixs = await build({ usdc: 5_000_000n, yes: 3n, no: 0n }, [s.own.yes], s); // the owner closed the USDC account; no No is owed
    expect(ixs.map((i) => i.programAddress)).toEqual([ATA_PROGRAM, PROGRAM_ADDRESS]);
    const create = ixs[0]!;
    expect(create.accounts!.map((a) => a.address)).toContain(s.own.usdc);
    expect(create.accounts![0]!.address).toBe(s.operator.address); // the operator pays the rent (about 0.002 SOL)
    expect(Array.from(create.data!)).toEqual([1]); // the idempotent create: a no-op if the account came back meanwhile
    expect(Array.from(ixs[1]!.data!.subarray(0, 8))).toEqual(Array.from(getReturnToOwnerDiscriminatorBytes()));
  });

  it('creates nothing when every account that receives something exists', async () => {
    const s = await setup();
    const ixs = await build({ usdc: 5_000_000n, yes: 0n, no: 2n }, [s.own.usdc, s.own.no], s); // Yes is missing, but nothing is owed in Yes
    expect(ixs.map((i) => i.programAddress)).toEqual([PROGRAM_ADDRESS]);
  });

  it('creates all three when all three were closed and all three are owed', async () => {
    const s = await setup();
    const ixs = await build({ usdc: 1n, yes: 1n, no: 1n }, [], s);
    expect(ixs.map((i) => i.programAddress)).toEqual([ATA_PROGRAM, ATA_PROGRAM, ATA_PROGRAM, PROGRAM_ADDRESS]);
    const mints = ixs.slice(0, 3).map((i) => i.accounts![3]!.address);
    expect(new Set(mints).size).toBe(3);
  });
});

describe('which errors mean "nothing to return" (D146)', () => {
  const landed = (code: number) => new SendFailedError({ InstructionError: [0, { Custom: code }] }, 'sig');
  it('is InvalidQuantity (6008) when the transaction landed and failed with it', () => {
    expect(isNothingToReturn(landed(6008))).toBe(true);
    expect(isNothingToReturn(landed(6038))).toBe(false); // BeforeClose is not "done"
  });
  it('is InvalidQuantity when the node’s pre-flight check refused the transaction with it', () => {
    const preflight = Object.assign(new Error('Transaction simulation failed'), { context: { err: { InstructionError: [1, { Custom: 6008 }] }, logs: [] } });
    expect(isNothingToReturn(preflight)).toBe(true);
    expect(isNothingToReturn(new Error('Program kvQX failed: custom program error: 0x1778'))).toBe(true);
    expect(isNothingToReturn(new Error('custom program error: 0x1796'))).toBe(false);
    expect(isNothingToReturn(new Error('fetch failed'))).toBe(false);
  });
});

describe('the transport', () => {
  it('reads a status as landed only once it is confirmed, and as failed with the chain’s error', async () => {
    const reply = [null, { err: null, confirmationStatus: 'processed' }, { err: null, confirmationStatus: 'confirmed' }, { err: { InstructionError: [0, { Custom: 6008 }] }, confirmationStatus: 'finalized' }];
    const rpc = { getSignatureStatuses: () => ({ send: async () => ({ value: reply }) }) } as unknown as TransportRpc;
    expect(await rpcTransport(rpc).statuses(['a', 'b', 'c', 'd'])).toEqual([
      { state: 'not_found' }, { state: 'not_found' }, { state: 'confirmed' }, { state: 'failed', error: { InstructionError: [0, { Custom: 6008 }] } },
    ]);
  });
});

describe('reading a book', () => {
  // Accounts as the node returns them (base64), for Kit's account fetch.
  const reply = (bytes: ReadonlyUint8Array | null) => ({ value: bytes && { data: [Buffer.from(bytes).toString('base64'), 'base64'], executable: false, lamports: 1n, owner: PROGRAM_ADDRESS, space: BigInt(bytes.length) } });
  const marketBytes = (bookClosed: boolean) => {
    const zeros = new Uint8Array(getMarketEncoder().fixedSize);
    zeros.set(client.MARKET_DISCRIMINATOR);
    return getMarketEncoder().encode({ ...getMarketDecoder().decode(zeros), bookClosed });
  };
  const chainWith = async (accounts: Record<string, Uint8Array | ReadonlyUint8Array | null>) => {
    const operator = await generateKeyPairSigner();
    const rpc = { getAccountInfo: (address: string) => ({ send: async () => reply(accounts[address] ?? null) }) } as unknown as CloseRpc;
    return createCloseChain({ rpc, queue: undefined as never, operator });
  };

  it('treats a missing book as closed only when the market says it closed the book', async () => {
    const market = await marketAddress('AAPL', 20261013, 100_000);
    expect(await (await chainWith({ [market]: marketBytes(true) })).readBook(market)).toBeNull();
  });

  it('refuses to call the book closed on a node’s word that the account is missing, so a node that is behind cannot end a market’s jobs', async () => {
    const market = await marketAddress('AAPL', 20261013, 100_000);
    await expect((await chainWith({ [market]: marketBytes(false) })).readBook(market)).rejects.toThrow(/may be behind/);
    await expect((await chainWith({})).readBook(market)).rejects.toThrow(/may be behind/);
  });
});
