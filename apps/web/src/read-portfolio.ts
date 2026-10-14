// The Portfolio's reads, straight from Solana, not through our backend (§7, D16): every market's book for the wallet's own orders and
// book balance, and the wallet's USDC, Yes and No. So the money on this page stays right while the backend is down (F13).
import { marketAccounts } from '@meridian/shared';
import { findAssociatedTokenPda, TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { getBase64Encoder, type Address, type Rpc, type SolanaRpcApi } from '@solana/kit';
import type { Levels, MarketView } from './markets.ts';
import { ownBalance, ownOrders, type BookBalance, type OpenOrder } from './orders.ts';
import { READ_TIMEOUT_MS, readMarketList } from './read-markets.ts';

type ChainRpc = Rpc<SolanaRpcApi>;

export type PortfolioRow = {
  market: MarketView;
  levels: Levels;
  orders: OpenOrder[];
  /** What the book holds for the wallet until Return to owner pays it out (D99). */
  bookBalance: BookBalance;
  /** The wallet's own Yes and No on this market. */
  yes: bigint;
  no: bigint;
};

export type Portfolio = { usdc: bigint; rows: PortfolioRow[] };

// getMultipleAccounts takes at most 100 addresses.
const BATCH = 100;

const amountOf = (data: readonly [string, string] | null | undefined) =>
  data ? new DataView(new Uint8Array(getBase64Encoder().encode(data[0])).buffer).getBigUint64(64, true) : 0n;

const tokenAccounts = new Map<string, Promise<{ yes: Address; no: Address }>>();
/** A market's Yes and No accounts for an owner: the same every time, so derived once. */
function yesNoAccounts(owner: Address, market: Address) {
  const key = `${owner}:${market}`;
  let found = tokenAccounts.get(key);
  if (!found) {
    found = (async () => {
      const { yesMint, noMint } = await marketAccounts(market);
      const [[yes], [no]] = await Promise.all([
        findAssociatedTokenPda({ owner, mint: yesMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }),
        findAssociatedTokenPda({ owner, mint: noMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }),
      ]);
      return { yes, no };
    })();
    tokenAccounts.set(key, found);
  }
  return found;
}

/** Every market the wallet has an order, a book balance or a token in. A market the wallet has nothing in is left out. */
export async function readPortfolio(rpc: ChainRpc, owner: Address, usdcMint: Address, signal: AbortSignal, options: { timeoutMs?: number } = {}): Promise<Portfolio> {
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS;
  const abortSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  const markets = await readMarketList(rpc, signal, { timeoutMs });
  const [usdcAccount] = await findAssociatedTokenPda({ owner, mint: usdcMint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const accounts = await Promise.all(markets.map((m) => yesNoAccounts(owner, m.market.address)));
  const addresses: Address[] = [usdcAccount, ...accounts.flatMap((a) => [a.yes, a.no])];

  const amounts: bigint[] = [];
  for (let i = 0; i < addresses.length; i += BATCH) {
    const { value } = await rpc.getMultipleAccounts(addresses.slice(i, i + BATCH), { commitment: 'confirmed', encoding: 'base64' }).send({ abortSignal });
    amounts.push(...value.map((a) => amountOf(a?.data as readonly [string, string] | undefined)));
  }

  const rows: PortfolioRow[] = [];
  markets.forEach((m, i) => {
    const row: PortfolioRow = {
      market: m.market,
      levels: m.levels,
      orders: ownOrders(m.book, owner),
      bookBalance: ownBalance(m.book, owner),
      yes: amounts[1 + 2 * i]!,
      no: amounts[2 + 2 * i]!,
    };
    const holds = row.orders.length > 0 || row.yes > 0n || row.no > 0n || row.bookBalance.usdc > 0n || row.bookBalance.yes > 0n || row.bookBalance.no > 0n;
    if (holds) rows.push(row);
  });
  return { usdc: amounts[0]!, rows };
}
