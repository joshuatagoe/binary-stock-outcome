// The transaction each button builds, with the generated client (clients/ts). Buy No and Sell No are built the same way;
// the program answers NotImplemented to them until M2 lands (P31).
import {
  getBuyNoInstructionDataDecoder,
  getPlaceOrderInstructionDataDecoder,
  getSellNoInstructionDataDecoder,
  MERIDIAN_PROGRAM_ADDRESS,
  OrderKind,
  Side,
} from '@meridian/client';
import { marketAccounts } from '@meridian/shared';
import { address, createNoopSigner, getBase64EncodedWireTransaction, compileTransaction, type Blockhash } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { describe, expect, it } from 'vitest';
import { buildTrade, newOrderId } from '../src/trade-tx.ts';
import { chainMarket, config } from './fixtures/chain.ts';

const trader = createNoopSigner(address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q'));
const lifetime = { blockhash: '11111111111111111111111111111111' as Blockhash, lastValidBlockHeight: 100n };
const usdcMint = config().usdcMint;

async function build(action: Parameters<typeof buildTrade>[0]['action'], over: Partial<Parameters<typeof buildTrade>[0]> = {}) {
  const { address: market } = await chainMarket({ strikeDollars: 680 }, [], []);
  const message = await buildTrade({
    action, trader, market, usdcMint, quantity: 10, sendPriceCents: 66, kind: 'Market', orderId: 7n, lifetime, ...over,
  });
  return { message, market };
}

const dataOf = (ix: { data?: ArrayLike<number> }) => Uint8Array.from(ix.data ?? []);

describe('Buy Yes and Sell Yes send Place order (D13)', () => {
  it('Buy Yes: a market order to buy 10 at no more than 66¢, from the trader’s own accounts', async () => {
    const { message, market } = await build('buyYes');
    const accounts = await marketAccounts(market);
    const place = message.instructions.at(-1)!;
    expect(place.programAddress).toBe(MERIDIAN_PROGRAM_ADDRESS);
    expect(getPlaceOrderInstructionDataDecoder().decode(dataOf(place))).toMatchObject({ side: Side.Buy, kind: OrderKind.Market, price: 66, quantity: 10, orderId: 7n });
    const [usdc] = await findAssociatedTokenPda({ owner: trader.address, mint: usdcMint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const [yes] = await findAssociatedTokenPda({ owner: trader.address, mint: accounts.yesMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
    const keys = place.accounts!.map((a) => a.address);
    expect(keys).toContain(usdc);
    expect(keys).toContain(yes);
    expect(keys).toContain(trader.address);
    expect(keys).toContain(accounts.book);
  });

  it('opens the trader’s Yes account first if it is not there (a one-time deposit, F4), and the wallet pays', async () => {
    const { message } = await build('buyYes');
    expect(message.feePayer.address).toBe(trader.address);
    expect(message.instructions).toHaveLength(2);
    expect(message.instructions[0]!.programAddress).toBe('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  });

  it('Sell Yes: sells with a floor of 64¢', async () => {
    const { message } = await build('sellYes', { sendPriceCents: 64 });
    expect(getPlaceOrderInstructionDataDecoder().decode(dataOf(message.instructions.at(-1)!))).toMatchObject({ side: Side.Sell, kind: OrderKind.Market, price: 64 });
  });

  it('a limit order carries its kind and price', async () => {
    const { message } = await build('buyYes', { kind: 'Limit', sendPriceCents: 60 });
    expect(getPlaceOrderInstructionDataDecoder().decode(dataOf(message.instructions.at(-1)!))).toMatchObject({ side: Side.Buy, kind: OrderKind.Limit, price: 60 });
  });

  it('serializes to a transaction a wallet can sign', async () => {
    const { message } = await build('buyYes');
    expect(getBase64EncodedWireTransaction(compileTransaction(message)).length).toBeGreaterThan(100);
  });
});

describe('Buy No and Sell No are built with the generated client too', () => {
  it('Buy No sends the most it pays per No', async () => {
    const { message, market } = await build('buyNo', { sendPriceCents: 36 });
    const accounts = await marketAccounts(market);
    const ix = message.instructions.at(-1)!;
    expect(getBuyNoInstructionDataDecoder().decode(dataOf(ix))).toMatchObject({ kind: OrderKind.Market, price: 36, quantity: 10, orderId: 7n });
    expect(ix.accounts!.map((a) => a.address)).toContain(accounts.bookNo);
    // Opens the Yes and the No accounts first.
    expect(message.instructions).toHaveLength(3);
  });

  it('Sell No sends the worst Yes price it will pay', async () => {
    const { message } = await build('sellNo', { sendPriceCents: 81 });
    expect(getSellNoInstructionDataDecoder().decode(dataOf(message.instructions.at(-1)!))).toMatchObject({ price: 81, quantity: 10 });
  });
});

describe('order IDs (D101)', () => {
  it('are fresh 64-bit numbers for each order', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newOrderId()));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toBeGreaterThan(0n);
      expect(id).toBeLessThan(1n << 64n);
    }
  });
});
