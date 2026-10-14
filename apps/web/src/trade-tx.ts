// The transaction each button builds (D13, ARCHITECTURE.md §3, §6), with the generated client. Buy Yes and Sell Yes
// send Place order; Buy No and Sell No are built the same way, and the program answers NotImplemented to them until
// the M2 program is on devnet (M3, P31; turned on in M5-b), so the devnet simulation refuses them before the wallet opens.
import {
  getBuyNoInstructionAsync,
  getCancelOrderInstructionAsync,
  getPlaceOrderInstructionAsync,
  getSellNoInstructionAsync,
  MERIDIAN_PROGRAM_ADDRESS,
  OrderKind,
  Side,
} from '@meridian/client';
import { marketAccounts, type TradeAction } from '@meridian/shared';
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getProgramDerivedAddress,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';

export type Lifetime = { blockhash: Blockhash; lastValidBlockHeight: bigint };

export type TradeInput = {
  action: TradeAction;
  trader: TransactionSigner;
  market: Address;
  usdcMint: Address;
  quantity: number;
  /** What the instruction takes as its price: see Ticket.sendPriceCents. */
  sendPriceCents: number;
  kind: 'Market' | 'Limit';
  orderId: bigint;
  lifetime: Lifetime;
};

/** A fresh 64-bit order ID (D101). */
export function newOrderId(): bigint {
  const words = crypto.getRandomValues(new BigUint64Array(1));
  return words[0]! || 1n;
}

/** Anchor's event authority: the PDA that signs the program's event calls to itself. */
async function eventAuthority(): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: MERIDIAN_PROGRAM_ADDRESS,
    seeds: [new TextEncoder().encode('__event_authority')],
  });
  return address;
}

/** The trader's token accounts for a market: USDC (the classic token program), Yes and No (Token-2022). */
export async function traderTokenAccounts(owner: Address, market: Address, usdcMint: Address) {
  const { yesMint, noMint } = await marketAccounts(market);
  const ata = async (mint: Address, tokenProgram: Address) => (await findAssociatedTokenPda({ owner, mint, tokenProgram }))[0];
  const [usdc, yes, no] = await Promise.all([
    ata(usdcMint, TOKEN_PROGRAM_ADDRESS),
    ata(yesMint, TOKEN_2022_PROGRAM_ADDRESS),
    ata(noMint, TOKEN_2022_PROGRAM_ADDRESS),
  ]);
  return { usdc, yes, no, yesMint, noMint };
}

export async function buildTrade(i: TradeInput) {
  const { trader, market, usdcMint } = i;
  const t = await traderTokenAccounts(trader.address, market, usdcMint);
  const common = {
    market,
    taker: trader,
    takerUsdc: t.usdc,
    takerYes: t.yes,
    usdcMint,
    eventAuthority: await eventAuthority(),
    program: MERIDIAN_PROGRAM_ADDRESS,
    quantity: i.quantity,
  };
  // A trader's Yes and No accounts open with their first trade (a one-time deposit, USERS.md F4). Idempotent, so a
  // second order opens nothing.
  const open = (mint: Address) =>
    getCreateAssociatedTokenIdempotentInstructionAsync({ payer: trader, owner: trader.address, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  const instructions: Instruction[] = [await open(t.yesMint)];

  switch (i.action) {
    case 'buyYes':
    case 'sellYes':
      instructions.push(
        await getPlaceOrderInstructionAsync({
          ...common,
          side: i.action === 'buyYes' ? Side.Buy : Side.Sell,
          kind: OrderKind[i.kind],
          price: i.sendPriceCents,
          orderId: i.orderId,
        }),
      );
      break;
    case 'buyNo':
      instructions.push(
        await open(t.noMint),
        await getBuyNoInstructionAsync({ ...common, takerNo: t.no, kind: OrderKind[i.kind], price: i.sendPriceCents, orderId: i.orderId }),
      );
      break;
    case 'sellNo':
      instructions.push(await open(t.noMint), await getSellNoInstructionAsync({ ...common, takerNo: t.no, price: i.sendPriceCents }));
      break;
  }

  return pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(trader, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(i.lifetime, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
}

/** A market's Yes and No mints, for reading a landed transaction's token movements. */
export async function marketMints(market: Address) {
  const { yesMint, noMint } = await marketAccounts(market);
  return { yesMint, noMint };
}

export type CancelInput = {
  owner: TransactionSigner;
  market: Address;
  usdcMint: Address;
  orderId: bigint;
  lifetime: Lifetime;
};

/**
 * Cancel order (F6): one instruction, signed by the order's owner. It moves what the order locked into the owner's balance in the
 * book, which Return to owner pays to the wallet (D99); a paired offer's pairs close instead (D142, D143). It touches none of the
 * wallet's token accounts, so it opens none. Never paused (D68).
 */
export async function buildCancel(i: CancelInput) {
  const instruction = await getCancelOrderInstructionAsync({
    market: i.market,
    owner: i.owner,
    usdcMint: i.usdcMint,
    eventAuthority: await eventAuthority(),
    program: MERIDIAN_PROGRAM_ADDRESS,
    orderId: i.orderId,
  });
  return pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(i.owner, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(i.lifetime, m),
    (m) => appendTransactionMessageInstructions([instruction], m),
  );
}
