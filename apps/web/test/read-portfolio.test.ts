// The Portfolio's reads, straight from Solana (§7: money screens stay right while our backend is down): every market's book for
// the wallet's own orders and book balance, and the wallet's Yes and No token accounts. Replays encoded accounts, as the other readers' tests do.
import { BOOK_DISCRIMINATOR, MARKET_DISCRIMINATOR } from '@meridian/client';
import { marketAccounts } from '@meridian/shared';
import { findAssociatedTokenPda, TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { describe, expect, it } from 'vitest';
import { readCancelled } from '../src/read-markets.ts';
import { readPortfolio } from '../src/read-portfolio.ts';
import { CREATOR, chainMarket, config, F4_ASKS, F4_BIDS, OTHER_OWNER, toBase64, type ChainMarket } from './fixtures/chain.ts';
import { ownerCancelEvent, type EventInstruction } from './fixtures/events.ts';
import { Side } from '@meridian/client';

const ME = CREATOR;
const usdcMint = config().usdcMint;
const encoded = (bytes: Uint8Array) => ({ data: [toBase64(bytes), 'base64'], executable: false, lamports: 1, owner: 'x', space: bytes.length });
const tokenAccount = (amount: bigint) => {
  const bytes = new Uint8Array(165);
  new DataView(bytes.buffer).setBigUint64(64, amount, true);
  return bytes;
};

async function ata(market: ChainMarket, side: 'yes' | 'no') {
  const a = await marketAccounts(market.address);
  return (await findAssociatedTokenPda({ owner: ME, mint: side === 'yes' ? a.yesMint : a.noMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }))[0];
}

/** An RPC that answers the markets, the books and the wallet's token accounts, and records how many addresses each call asked for. */
function fakeRpc(markets: ChainMarket[], tokens: Map<string, bigint>, asked: number[] = []) {
  return {
    getProgramAccounts: (_p: string, opts: { filters: { memcmp: { bytes: string } }[] }) => ({
      send: async () => {
        const wantsMarkets = opts.filters.some((f) => f.memcmp.bytes === toBase64(MARKET_DISCRIMINATOR as Uint8Array));
        const wantsBooks = opts.filters.some((f) => f.memcmp.bytes === toBase64(BOOK_DISCRIMINATOR as Uint8Array));
        expect(wantsMarkets || wantsBooks).toBe(true);
        return Promise.all(
          markets.map(async (m) => ({ pubkey: wantsMarkets ? m.address : (await marketAccounts(m.address)).book, account: encoded(wantsMarkets ? m.market : m.book) })),
        );
      },
    }),
    getMultipleAccounts: (addresses: string[]) => ({
      send: async () => {
        asked.push(addresses.length);
        return { value: addresses.map((a) => (tokens.has(a) ? encoded(tokenAccount(tokens.get(a)!)) : null)) };
      },
    }),
  } as never;
}

describe('reading the Portfolio from the chain', () => {
  it('finds the wallet’s open orders and book balance, and its Yes and No, and the USDC in its wallet', async () => {
    const m680 = await chainMarket({ strikeDollars: 680 }, [...F4_BIDS, [60, 6, 0, 4242n]], [...F4_ASKS, [67, 6, 0, 4244n, 1]], [
      { owner: ME, freeUsdc: 3_600_000n, freeYes: 2n },
      { owner: OTHER_OWNER },
      { owner: OTHER_OWNER },
    ]);
    const m690 = await chainMarket({ strikeDollars: 690 }, [], []);
    const aapl = await chainMarket({ symbol: 'AAPL', strikeDollars: 270 }, [[40, 3, 1]], [[45, 4, 1]], [{ owner: OTHER_OWNER }, { owner: OTHER_OWNER }]);
    const usdcAta = (await findAssociatedTokenPda({ owner: ME, mint: usdcMint, tokenProgram: TOKEN_PROGRAM_ADDRESS }))[0];
    const tokens = new Map<string, bigint>([[usdcAta, 14_000_000n], [await ata(m690, 'no'), 5n]]);
    const portfolio = await readPortfolio(fakeRpc([m680, m690, aapl], tokens), ME, usdcMint, new AbortController().signal);

    expect(portfolio.usdc).toBe(14_000_000n);
    // The AAPL market holds nothing of the wallet's, so it is not a row.
    expect(portfolio.rows.map((r) => r.market.slug)).toEqual(['META-680-2026-10-08', 'META-690-2026-10-08']);
    const [first, second] = portfolio.rows;
    expect(first!.orders).toEqual([
      { orderId: 4242n, side: 'Buy', priceCents: 60, open: 6, paired: false },
      { orderId: 4244n, side: 'Sell', priceCents: 67, open: 6, paired: true },
    ]);
    expect(first!.bookBalance).toEqual({ usdc: 3_600_000n, yes: 2n, no: 0n });
    expect(first!.levels.bids[0]).toEqual([64, 5]);
    expect(first!.yes).toBe(0n);
    expect(second!.no).toBe(5n);
    expect(second!.orders).toEqual([]);
  });

  it('is empty for a wallet with nothing anywhere, as for no wallet balance at all', async () => {
    const m = await chainMarket({ strikeDollars: 680 }, F4_BIDS, F4_ASKS, [{ owner: OTHER_OWNER }, { owner: OTHER_OWNER }, { owner: OTHER_OWNER }]);
    const portfolio = await readPortfolio(fakeRpc([m], new Map()), ME, usdcMint, new AbortController().signal);
    expect(portfolio).toMatchObject({ usdc: 0n, rows: [] });
  });

  it('asks for the token accounts in batches the node accepts (at most 100 addresses a call)', async () => {
    const markets = await Promise.all([650, 655, 660, 665, 670, 675, 680, 685, 690, 695, 700, 705, 710, 715, 720, 725, 730, 735, 740, 745, 750, 755, 760, 765, 770, 775, 780, 785, 790, 795, 800, 805, 810, 815, 820, 825, 830, 835, 840, 845, 850, 855, 860, 865, 870, 875, 880, 885, 890].map((s) => chainMarket({ strikeDollars: s }, [], [])));
    const asked: number[] = [];
    await readPortfolio(fakeRpc(markets, new Map(), asked), ME, usdcMint, new AbortController().signal);
    expect(asked.reduce((n, x) => n + x, 0)).toBe(1 + 2 * markets.length);
    expect(Math.max(...asked)).toBeLessThanOrEqual(100);
  });
});

describe('reading a landed cancel', () => {
  const tx = (...events: EventInstruction[]) => ({ slot: 1, blockTime: null, transaction: {}, meta: { err: null, innerInstructions: [{ index: 0, instructions: events }] } });
  const rpcFor = (answers: unknown[]) => {
    let calls = 0;
    return { rpc: { getTransaction: () => ({ send: async () => { const a = answers[Math.min(calls++, answers.length - 1)]; if (a instanceof Error) throw a; return a; } }) } as never, calls: () => calls };
  };
  const noSleep = async () => {};

  it('reads the owner’s cancel events from the transaction', async () => {
    const { rpc } = rpcFor([tx(ownerCancelEvent(ME, Side.Buy, 60, 6))]);
    expect(await readCancelled(rpc, 'sig', ME, { sleep: noSleep })).toEqual({ cancels: [{ side: 'Buy', priceCents: 60, quantity: 6 }], pairsClosed: 0n, pairsUsdc: 0n });
  });

  it('tries again when a node does not have it yet, and gives up with null', async () => {
    const found = rpcFor([null, new Error('boom'), tx(ownerCancelEvent(ME, Side.Buy, 60, 6))]);
    expect(await readCancelled(found.rpc, 'sig', ME, { sleep: noSleep })).not.toBeNull();
    expect(found.calls()).toBe(3);
    const missing = rpcFor([null]);
    expect(await readCancelled(missing.rpc, 'sig', ME, { tries: 2, sleep: noSleep })).toBeNull();
    expect(missing.calls()).toBe(2);
  });
});
