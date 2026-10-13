// Reading markets and books straight from the chain (§7: money screens stay right while our backend is down), replaying
// recorded accounts as the Config tests do (P27).
import { MARKET_DISCRIMINATOR } from '@meridian/client';
import { describe, expect, it } from 'vitest';
import { readBook, readBalances, readMarket, readMarketList, readResting, readTradeConfig } from '../src/read-markets.ts';
import { bookBytes, CREATOR, chainMarket, config, configAccount, F4_ASKS, F4_BIDS, toBase64, type ChainMarket } from './fixtures/chain.ts';

const encoded = (bytes: Uint8Array) => ({ data: [toBase64(bytes), 'base64'], executable: false, lamports: 1, owner: 'x', space: bytes.length });

// A fake RPC that answers only the calls the reader makes.
function fakeRpc(chain: { markets: ChainMarket[]; hang?: boolean; balances?: { sol: bigint; accounts: (Uint8Array | null)[] } }) {
  return {
    getProgramAccounts: (_program: string, opts: { filters: { memcmp: { bytes: string } }[] }) => ({
      send: async ({ abortSignal }: { abortSignal?: AbortSignal } = {}) => {
        if (chain.hang) return new Promise((_, reject) => abortSignal?.addEventListener('abort', () => reject(abortSignal.reason)));
        // Accounts are asked for by their 8-byte discriminator: Markets, or Books otherwise.
        const wantsMarkets = opts.filters.some((f) => f.memcmp.bytes === toBase64(MARKET_DISCRIMINATOR as Uint8Array));
        return chain.markets.map((m) => ({ pubkey: m.address, account: encoded(wantsMarkets ? m.market : m.book) }));
      },
    }),
    getAccountInfo: () => ({
      send: async () => ({ context: configAccount.context, value: configAccount.value }),
    }),
    getBalance: () => ({ send: async () => ({ value: chain.balances?.sol ?? 0n }) }),
    getMultipleAccounts: () => ({
      send: async () => ({ value: (chain.balances?.accounts ?? []).map((a) => (a ? encoded(a) : null)) }),
    }),
  } as never;
}

describe('reading the day’s markets', () => {
  it('returns each market with its book, sorted by ticker and strike', async () => {
    const m680 = await chainMarket({ strikeDollars: 680 }, F4_BIDS, F4_ASKS);
    const m670 = await chainMarket({ strikeDollars: 670 }, [], []);
    const aapl = await chainMarket({ symbol: 'AAPL', strikeDollars: 270 }, [], []);
    const list = await readMarketList(fakeRpc({ markets: [m680, m670, aapl] }), new AbortController().signal);
    expect(list.map((x) => x.market.slug)).toEqual(['AAPL-270-2026-10-08', 'META-670-2026-10-08', 'META-680-2026-10-08']);
    expect(list[2]!.levels).toEqual({ asks: [[65, 10], [66, 5]], bids: [[64, 5]] });
    expect(list[1]!.levels).toEqual({ asks: [], bids: [] });
  });

  it('is empty when the chain holds no markets, as devnet does while it runs M0’s program', async () => {
    expect(await readMarketList(fakeRpc({ markets: [] }), new AbortController().signal)).toEqual([]);
  });

  it('gives up on a chain that never answers (P25)', async () => {
    const started = Date.now();
    await expect(readMarketList(fakeRpc({ markets: [], hang: true }), new AbortController().signal, { timeoutMs: 50 })).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('reads one book by its market', async () => {
    const m = await chainMarket({ strikeDollars: 680 }, F4_BIDS, F4_ASKS);
    const rpc = {
      getAccountInfo: () => ({ send: async () => ({ context: { slot: 1n }, value: encoded(m.book) }) }),
    } as never;
    expect((await readBook(rpc, m.address, new AbortController().signal)).levels).toEqual({ asks: [[65, 10], [66, 5]], bids: [[64, 5]] });
  });
});

describe('reading one market for its page', () => {
  it('returns the market with its book', async () => {
    const m = await chainMarket({ strikeDollars: 680 }, F4_BIDS, F4_ASKS);
    // The fake answers the market's address with the Market account and any other with the Book.
    const rpc = {
      getAccountInfo: (address: string) => ({
        send: async () => ({ context: { slot: 1n }, value: encoded(address === m.address ? m.market : m.book) }),
      }),
    } as never;
    const row = await readMarket(rpc, m.address, new AbortController().signal);
    expect(row?.market.slug).toBe('META-680-2026-10-08');
    expect(row?.levels.asks).toEqual([[65, 10], [66, 5]]);
  });

  it('returns null when no such market is on the chain, as before the morning’s create (D72)', async () => {
    const rpc = { getAccountInfo: () => ({ send: async () => ({ context: { slot: 1n }, value: null }) }) } as never;
    expect(await readMarket(rpc, 'x' as never, new AbortController().signal)).toBeNull();
  });
});

describe('reading Config for the ticket', () => {
  it('gives the USDC mint and whether trading is paused', async () => {
    const c = await readTradeConfig(fakeRpc({ markets: [] }), new AbortController().signal);
    expect(c.usdcMint).toBe(config().usdcMint);
    expect(c.paused).toBe(false);
  });
});

describe('reading the wallet’s balances', () => {
  const tokenAccount = (amount: bigint) => {
    const bytes = new Uint8Array(165);
    new DataView(bytes.buffer).setBigUint64(64, amount, true);
    return bytes;
  };

  it('reads SOL and the USDC, Yes and No amounts', async () => {
    const rpc = fakeRpc({ markets: [], balances: { sol: 420_000_000n, accounts: [tokenAccount(20_000_000n), tokenAccount(10n), null] } });
    expect(await readBalances(rpc, ['u', 'y', 'n'] as never, 'owner' as never, new AbortController().signal)).toEqual({
      sol: 420_000_000n,
      usdc: 20_000_000n,
      yes: 10n,
      no: 0n,
    });
  });

  it('counts a token account that does not exist yet as zero', async () => {
    const rpc = fakeRpc({ markets: [], balances: { sol: 0n, accounts: [null, null, null] } });
    expect(await readBalances(rpc, ['u', 'y', 'n'] as never, 'owner' as never, new AbortController().signal)).toEqual({ sol: 0n, usdc: 0n, yes: 0n, no: 0n });
  });
});

describe('finding the trader’s own order in the book', () => {
  it('adds up what rests under the owner and the order ID, on either side', async () => {
    const { address } = await chainMarket({ strikeDollars: 680 }, [], []);
    // Fixture order IDs are 1000 + sequence; the first bid is sequence 1.
    const bytes = bookBytes(address, [[60, 6, 0, 4242n]], [[70, 3, 0, 4242n], [71, 2, 0, 9n]]);
    const rpc = { getAccountInfo: () => ({ send: async () => ({ context: { slot: 1n }, value: encoded(bytes) }) }) } as never;
    expect(await readResting(rpc, address, CREATOR, 4242n, new AbortController().signal)).toBe(9);
    expect(await readResting(rpc, address, CREATOR, 7n, new AbortController().signal)).toBe(0);
    expect(await readResting(rpc, address, 'someone-else' as never, 4242n, new AbortController().signal)).toBe(0);
  });
});
