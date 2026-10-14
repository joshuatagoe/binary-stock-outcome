// Reads markets, books, Config and the wallet's balances straight from Solana, not through our backend, so the
// money screens stay right while the backend is down (ARCHITECTURE.md §7, D16). Each read gives up after 10 seconds
// (P25), like read-config.ts.
import {
  BOOK_DISCRIMINATOR,
  fetchMaybeBook,
  fetchMaybeConfig,
  fetchMaybeMarket,
  findConfigPda,
  getBookDecoder,
  getMarketDecoder,
  MARKET_DISCRIMINATOR,
  MERIDIAN_PROGRAM_ADDRESS,
  type Book,
} from '@meridian/client';
import { marketAccounts } from '@meridian/shared';
import { getBase64Decoder, getBase64Encoder, type Address, type Rpc, type SolanaRpcApi } from '@solana/kit';
import { bookLevels, toMarketView, type Levels, type MarketView } from './markets.ts';
import { parseCancelled, parseLanded, type Landed, type LandedTx, type OwnerCancels } from './landed.ts';
import { ConfigMissing } from './read-config.ts';

export const READ_TIMEOUT_MS = 10_000;

type ChainRpc = Rpc<SolanaRpcApi>;

const abortAfter = (signal: AbortSignal, timeoutMs: number) => AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
const toBytes = (data: readonly [string, string] | string) => new Uint8Array(getBase64Encoder().encode(typeof data === 'string' ? data : data[0]));

export type MarketRow = { market: MarketView; levels: Levels; book: Book };

/** Every market the program holds, each with its book, sorted by ticker and strike. */
export async function readMarketList(rpc: ChainRpc, signal: AbortSignal, options: { timeoutMs?: number } = {}): Promise<MarketRow[]> {
  const abortSignal = abortAfter(signal, options.timeoutMs ?? READ_TIMEOUT_MS);
  const accountsWith = (discriminator: Uint8Array) =>
    rpc
      .getProgramAccounts(MERIDIAN_PROGRAM_ADDRESS, {
        commitment: 'confirmed',
        encoding: 'base64',
        filters: [{ memcmp: { offset: 0n, bytes: getBase64Decoder().decode(discriminator) as never, encoding: 'base64' } }],
      })
      .send({ abortSignal }) as Promise<readonly { pubkey: Address; account: { data: readonly [string, string] } }[]>;
  const [markets, books] = await Promise.all([accountsWith(MARKET_DISCRIMINATOR as Uint8Array), accountsWith(BOOK_DISCRIMINATOR as Uint8Array)]);

  const bookByMarket = new Map<string, Book>();
  for (const b of books) {
    const book = getBookDecoder().decode(toBytes(b.account.data));
    bookByMarket.set(book.market, book);
  }
  const rows = markets.map((m) => {
    const market = toMarketView(m.pubkey, getMarketDecoder().decode(toBytes(m.account.data)));
    const book = bookByMarket.get(m.pubkey);
    return { market, levels: book ? bookLevels(book) : { asks: [], bids: [] }, book: book ?? emptyBook(m.pubkey) };
  });
  return rows.sort((a, b) => a.market.ticker.localeCompare(b.market.ticker) || a.market.day - b.market.day || a.market.strikeCents - b.market.strikeCents);
}

/** One market's book. */
export async function readBook(rpc: ChainRpc, market: Address, signal: AbortSignal, timeoutMs = READ_TIMEOUT_MS): Promise<{ book: Book; levels: Levels }> {
  const abortSignal = abortAfter(signal, timeoutMs);
  const { book: address } = await marketAccounts(market);
  const account = await fetchMaybeBook(rpc, address, { abortSignal, commitment: 'confirmed' });
  if (!account.exists) throw new Error(`The book ${address} is not on the chain`);
  return { book: account.data, levels: bookLevels(account.data) };
}

// A market whose book account the node did not return: nothing rests and nobody is owed anything.
const emptyBook = (market: Address): Book => ({
  discriminator: BOOK_DISCRIMINATOR,
  market,
  nextSeq: 0n,
  bidCount: 0,
  askCount: 0,
  bump: 0,
  bookUsdcBump: 0,
  bookYesBump: 0,
  bookNoBump: 0,
  reserved: new Uint8Array(),
  bids: [],
  asks: [],
  traders: [],
});

/** One market and its book, or null when no such market is on the chain (markets are created each morning, D72). */
export async function readMarket(rpc: ChainRpc, address: Address, signal: AbortSignal, timeoutMs = READ_TIMEOUT_MS): Promise<MarketRow | null> {
  const abortSignal = abortAfter(signal, timeoutMs);
  const account = await fetchMaybeMarket(rpc, address, { abortSignal, commitment: 'confirmed' });
  if (!account.exists) return null;
  const { book, levels } = await readBook(rpc, address, signal, timeoutMs);
  return { market: toMarketView(address, account.data), levels, book };
}

/** What the ticket needs from Config: the USDC mint, and whether the admin has paused trading (D68). */
export async function readTradeConfig(rpc: ChainRpc, signal: AbortSignal, timeoutMs = READ_TIMEOUT_MS): Promise<{ usdcMint: Address; paused: boolean }> {
  const abortSignal = abortAfter(signal, timeoutMs);
  const [address] = await findConfigPda();
  const account = await fetchMaybeConfig(rpc, address, { abortSignal, commitment: 'confirmed' });
  if (!account.exists) throw new ConfigMissing(`Config ${address} is not on the chain`);
  return { usdcMint: account.data.usdcMint, paused: account.data.paused };
}

export type WalletBalances = { sol: bigint; usdc: bigint; yes: bigint; no: bigint };

// A token account's amount: 8 bytes at offset 64, the same in the classic token program and Token-2022.
const amountOf = (data: readonly [string, string] | null | undefined) =>
  data ? new DataView(toBytes(data).buffer).getBigUint64(64, true) : 0n;

/** SOL, then the USDC, Yes and No amounts of the wallet's token accounts, which count as zero until they exist. */
export async function readBalances(
  rpc: ChainRpc,
  tokenAccounts: readonly [usdc: Address, yes?: Address, no?: Address],
  owner: Address,
  signal: AbortSignal,
  timeoutMs = READ_TIMEOUT_MS,
): Promise<WalletBalances> {
  const abortSignal = abortAfter(signal, timeoutMs);
  const [sol, accounts] = await Promise.all([
    rpc.getBalance(owner, { commitment: 'confirmed' }).send({ abortSignal }),
    rpc.getMultipleAccounts(tokenAccounts.filter((a): a is Address => !!a), { commitment: 'confirmed', encoding: 'base64' }).send({ abortSignal }),
  ]);
  const [usdc = 0n, yes = 0n, no = 0n] = accounts.value.map((a) => amountOf(a?.data as readonly [string, string] | undefined));
  return { sol: BigInt(sol.value), usdc, yes, no };
}

/** How much of the owner's order with this ID rests in the book, on either side (0 when none does). */
export async function readResting(rpc: ChainRpc, market: Address, owner: Address, orderId: bigint, signal: AbortSignal): Promise<number> {
  const { book } = await readBook(rpc, market, signal);
  const index = book.traders.findIndex((t) => t.owner === owner);
  if (index < 0) return 0;
  const mine = (orders: typeof book.bids, count: number) =>
    orders.slice(0, count).filter((o) => o.trader === index && o.orderId === orderId).reduce((n, o) => n + o.quantity, 0);
  return mine(book.bids, book.bidCount) + mine(book.asks, book.askCount);
}

/** Reads a landed transaction until a node has it, a few tries (finalized does not mean every node has it yet). */
async function readTransaction<T>(
  rpc: ChainRpc,
  signature: string,
  parse: (tx: LandedTx) => T | null,
  options: { tries?: number; sleep?: (ms: number) => Promise<void> },
): Promise<T | null> {
  const tries = options.tries ?? 4;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let i = 0; i < tries; i++) {
    try {
      const tx = await rpc
        .getTransaction(signature as never, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
        .send({ abortSignal: AbortSignal.timeout(READ_TIMEOUT_MS) });
      const parsed = parse(tx as never);
      if (parsed) return parsed;
    } catch {
      /* try again */
    }
    if (i < tries - 1) await sleep(700);
  }
  return null;
}

/** The landed transaction's own movements and events, or null when no node can give it. */
export function readLanded(
  rpc: ChainRpc,
  signature: string,
  who: { owner: Address; usdcMint: Address; yesMint: Address; noMint: Address },
  options: { tries?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Landed | null> {
  return readTransaction(rpc, signature, (tx) => parseLanded(tx, who), options);
}

/** What a landed Cancel order did, from its own events, or null when no node can give the transaction. */
export function readCancelled(
  rpc: ChainRpc,
  signature: string,
  owner: Address,
  options: { tries?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<OwnerCancels | null> {
  return readTransaction(rpc, signature, (tx) => parseCancelled(tx, owner), options);
}
