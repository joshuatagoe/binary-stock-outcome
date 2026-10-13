// The real `CloseChain` (closeJobs.ts): reads a market's book from the chain, and sends Sweep and Return to owner through the
// send queue (D56), signed with the operator key. Return to owner is open to anyone and pays no one but the owner (D99), so
// the operator's only part is the fee and, when an owner has closed a token account, about 0.002 SOL to re-create it.
import * as client from '@meridian/client';
import { marketAccounts, PROGRAM_ADDRESS } from '@meridian/shared';
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit';
import type { Balance, BookState, CloseChain } from './closeJobs.ts';
import { SendFailedError, type SendQueue, type SignedTx } from './sendQueue.ts';

export const TOKEN_PROGRAM = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ATA_PROGRAM = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const CLOCK_SYSVAR = address('SysvarC1ock11111111111111111111111111111111');
const SYSTEM_PROGRAM = address('11111111111111111111111111111111');

/** An owner's associated token account for a mint. */
export async function ataOf(owner: Address, mint: Address, tokenProgram: Address): Promise<Address> {
  const encoder = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({ programAddress: ATA_PROGRAM, seeds: [encoder.encode(owner), encoder.encode(tokenProgram), encoder.encode(mint)] });
  return pda;
}

/** The associated token program's "create idempotent": creates the account, or does nothing if it exists. The payer funds the rent. */
const createAtaIdempotent = (payer: TransactionSigner, account: Address, owner: Address, mint: Address, tokenProgram: Address): Instruction => ({
  programAddress: ATA_PROGRAM,
  accounts: [
    { address: payer.address, role: AccountRole.WRITABLE_SIGNER, signer: payer } as never,
    { address: account, role: AccountRole.WRITABLE },
    { address: owner, role: AccountRole.READONLY },
    { address: mint, role: AccountRole.READONLY },
    { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    { address: tokenProgram, role: AccountRole.READONLY },
  ],
  data: new Uint8Array([1]),
});

const eventAuthorityOf = async () =>
  (await getProgramDerivedAddress({ programAddress: PROGRAM_ADDRESS, seeds: [new TextEncoder().encode('__event_authority')] }))[0];

/** The owner's three accounts that a return uses (D139), and which of them the balance needs. */
async function ownerAccounts(owner: Address, market: Address, usdcMint: Address, balance: Pick<Balance, 'usdc' | 'yes' | 'no'>) {
  const { yesMint, noMint } = await marketAccounts(market);
  return [
    { key: 'ownerUsdc' as const, account: await ataOf(owner, usdcMint, TOKEN_PROGRAM), mint: usdcMint, program: TOKEN_PROGRAM, needed: balance.usdc > 0n },
    { key: 'ownerYes' as const, account: await ataOf(owner, yesMint, TOKEN_2022_PROGRAM), mint: yesMint, program: TOKEN_2022_PROGRAM, needed: balance.yes > 0n },
    { key: 'ownerNo' as const, account: await ataOf(owner, noMint, TOKEN_2022_PROGRAM), mint: noMint, program: TOKEN_2022_PROGRAM, needed: balance.no > 0n },
  ];
}

/**
 * The instructions of one return: first, a create for each of the owner's accounts that is missing and about to receive something
 * (the owner may have closed it, D99), then Return to owner. Only an account that receives something must be the owner's, so a
 * closed Yes account does not matter when no Yes is owed.
 */
export async function returnInstructions(args: {
  payer: TransactionSigner;
  market: Address;
  owner: Address;
  balance: Pick<Balance, 'usdc' | 'yes' | 'no'>;
  usdcMint: Address;
  /** Addresses of the owner's accounts that exist now. */
  existing: ReadonlySet<string>;
}): Promise<Instruction[]> {
  const { payer, market, owner, balance, usdcMint, existing } = args;
  const mine = await ownerAccounts(owner, market, usdcMint, balance);
  const creates = mine.filter((a) => a.needed && !existing.has(a.account)).map((a) => createAtaIdempotent(payer, a.account, owner, a.mint, a.program));
  const common = { eventAuthority: await eventAuthorityOf(), program: PROGRAM_ADDRESS };
  const give = await client.getReturnToOwnerInstructionAsync({
    market, owner, usdcMint, ...common,
    ownerUsdc: mine[0]!.account, ownerYes: mine[1]!.account, ownerNo: mine[2]!.account,
  });
  return [...creates, give as Instruction];
}

/** Program error numbers found anywhere in an error: a landed failure, or the node's pre-flight refusal. */
export function customCodesOf(error: unknown): number[] {
  const found: number[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number) => {
    if (depth > 8 || typeof value !== 'object' || value === null || seen.has(value)) return;
    seen.add(value);
    const custom = (value as { Custom?: unknown }).Custom;
    if (typeof custom === 'number' || typeof custom === 'bigint') found.push(Number(custom));
    if (Array.isArray(value)) value.forEach((v) => walk(v, depth + 1));
    else for (const key of ['InstructionError', 'chainError', 'cause', 'context', 'err']) walk((value as Record<string, unknown>)[key], depth + 1);
  };
  walk(error instanceof SendFailedError ? error.chainError : error, 0);
  // A pre-flight refusal may carry only the log line "custom program error: 0x1778".
  const logs = JSON.stringify((error as { context?: unknown } | undefined)?.context ?? '', (_k, v) => (typeof v === 'bigint' ? String(v) : v));
  const text = `${error instanceof Error ? error.message : ''} ${logs}`;
  for (const m of text.matchAll(/custom program error: 0x([0-9a-f]+)/gi)) found.push(parseInt(m[1]!, 16));
  return found;
}

/** InvalidQuantity from Return to owner means there was nothing to return: the goal is met (D146). */
export const isNothingToReturn = (error: unknown) => customCodesOf(error).includes(client.MERIDIAN_ERROR__INVALID_QUANTITY);

// The calls it makes, loosely typed (see chainSource.ts).
type Send = { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
export interface CloseRpc {
  getLatestBlockhash(config?: never): Send;
  getMultipleAccounts(addresses: never, config: never): Send;
  getAccountInfo(address: never, config: never): Send;
}

export function createCloseChain(args: { rpc: CloseRpc; queue: SendQueue; operator: TransactionSigner; timeoutMs?: number }): CloseChain {
  const { rpc, queue, operator, timeoutMs = 15_000 } = args;
  const signal = () => ({ abortSignal: AbortSignal.timeout(timeoutMs) });
  const commitment = 'confirmed' as const;
  let usdc: Promise<Address> | undefined;
  const usdcMintOf = () =>
    (usdc ??= (async () => {
      const [configAddress] = await client.findConfigPda();
      return (await client.fetchConfig(rpc as never, configAddress, { commitment } as never)).data.usdcMint;
    })().catch((error) => ((usdc = undefined), Promise.reject(error))));

  async function signed(instructions: Instruction[]): Promise<SignedTx> {
    const { value: blockhash } = (await rpc.getLatestBlockhash({ commitment } as never).send(signal())) as { value: Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[0] };
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(operator, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    );
    const tx = await signTransactionMessageWithSigners(message);
    return { wire: getBase64EncodedWireTransaction(tx), signature: getSignatureFromTransaction(tx), lastValidBlockHeight: blockhash.lastValidBlockHeight };
  }

  return {
    /** The program's own clock: the Clock sysvar at the latest confirmed state. */
    async chainTime() {
      const reply = (await rpc.getAccountInfo(CLOCK_SYSVAR as never, { encoding: 'base64', commitment } as never).send(signal())) as { value: { data: [string, string] } | null };
      if (!reply.value) throw new Error('the node has no Clock sysvar');
      // Clock: slot u64, epoch_start_timestamp i64, epoch u64, leader_schedule_epoch u64, unix_timestamp i64.
      return Number(Buffer.from(reply.value.data[0], 'base64').readBigInt64LE(32));
    },

    async readBook(market): Promise<BookState | null> {
      const marketAddress = market as Address;
      const { book } = await marketAccounts(market as Address);
      const found = await client.fetchMaybeBook(rpc as never, book, { commitment } as never);
      if (!found.exists) {
        // A node that is behind can say an account does not exist. Only the market's own record (D50) says the book was closed on purpose.
        const record = await client.fetchMaybeMarket(rpc as never, marketAddress, { commitment } as never);
        if (record.exists && record.data.bookClosed) return null;
        throw new Error(`the book account of ${marketAddress} is not there, but its market is not marked as having closed it; the node may be behind`);
      }
      const data = found.data;
      const balances = data.traders
        .filter((t) => t.freeUsdc > 0n || t.freeYes > 0n || t.freeNo > 0n)
        .map((t): Balance => ({ owner: t.owner, usdc: t.freeUsdc, yes: t.freeYes, no: t.freeNo }));
      return { orders: data.bidCount + data.askCount, balances };
    },

    async sweep(market) {
      const usdcMint = await usdcMintOf();
      const eventAuthority = await eventAuthorityOf();
      await queue.submit({
        label: `sweep ${market}`,
        sign: async () => signed([(await client.getSweepInstructionAsync({ operator, market: market as Address, usdcMint, eventAuthority, program: PROGRAM_ADDRESS })) as Instruction]),
      });
    },

    async returnToOwner(market, balance) {
      const usdcMint = await usdcMintOf();
      const owner = balance.owner as Address;
      const mine = await ownerAccounts(owner, market as Address, usdcMint, balance);
      const needed = mine.filter((a) => a.needed).map((a) => a.account);
      const reply = (await rpc.getMultipleAccounts(needed as never, { encoding: 'base64', commitment, dataSlice: { offset: 0, length: 0 } } as never).send(signal())) as { value: (unknown | null)[] };
      const existing = new Set(needed.filter((_, i) => reply.value[i] !== null));
      await queue.submit({
        label: `return ${market} ${owner}`,
        isDone: isNothingToReturn,
        sign: async () => signed(await returnInstructions({ payer: operator, market: market as Address, owner, balance, usdcMint, existing })),
      });
    },
  };
}
