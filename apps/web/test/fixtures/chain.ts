// Market and Book accounts in the frozen layouts (clients/ts, the program's state), for the website's tests.
// Devnet still runs M0's program and has no markets (P31), so nothing can be recorded from it yet. These are
// encoded with the generated client's own encoders, so a layout change breaks them, as it should. USERS.md F4's
// book at 10:16 AM: asks 65c x 10 (Dave) and 66c x 5 (the bot); bids 64c x 5 (the bot) and 60c x 10 (Carol).
// Re-record them from devnet once the program lane's markets are there (M3).
import {
  getBookEncoder,
  getMarketEncoder,
  getConfigDecoder,
  type Market,
  type Config,
} from '@meridian/client';
import { marketAddress, tradingTimes } from '@meridian/shared';
import { address, getBase64Decoder, type Address } from '@solana/kit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DAY = 20261008;
export const CREATOR = address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q');
const text = new TextEncoder();
const base64 = getBase64Decoder();

export const ticker = (symbol: string) => {
  const bytes = new Uint8Array(8);
  bytes.set(text.encode(symbol));
  return bytes;
};

/** [price in cents, quantity, trader index, order ID, flags (1 is a paired offer, D142)]. */
export type Resting = readonly [price: number, quantity: number, trader?: number, orderId?: bigint, flags?: number];

/** A trader entry in the book: who, and what is waiting for Return to owner (D99), in USDC base units and whole tokens. */
export type BookTrader = { owner: Address; freeUsdc?: bigint; freeYes?: bigint; freeNo?: bigint; openOrders?: number };

/** Anyone but the test wallet: the bot and Dave of USERS.md F4. */
export const OTHER_OWNER = address('AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY');

export type MarketOptions = {
  symbol?: string;
  strikeDollars: number;
  day?: number;
  status?: 'Trading' | 'UnderReview' | 'Proposed' | 'Settled';
  outcome?: 'None' | 'Yes' | 'No';
  earlyClose?: boolean;
  proposal?: { outcome: 'Yes' | 'No'; finalAt: number };
};

export function marketData(o: MarketOptions) {
  const day = o.day ?? DAY;
  const t = tradingTimes(day, o.earlyClose ?? false);
  const none = { outcome: 'None', officialCloseCents: 0n, proposedAt: 0n, finalAt: 0n, source: new Uint8Array(32) } as const;
  return {
    ticker: ticker(o.symbol ?? 'META'),
    day,
    strikeCents: BigInt(o.strikeDollars * 100),
    mintOpen: t.mintOpen,
    open: t.open,
    close: t.close,
    owed: 0n,
    status: o.status ?? 'Trading',
    hold: 'None',
    outcome: o.outcome ?? 'None',
    settledBy: o.status === 'Settled' ? 'Oracle' : 'None',
    price: 0n,
    conf: 0n,
    expo: -5,
    publishTime: 0n,
    proposal: o.proposal ? { ...none, outcome: o.proposal.outcome, finalAt: BigInt(o.proposal.finalAt) } : none,
    bookClosed: false,
    createdSlot: 1n,
    creator: CREATOR,
    bump: 255,
    yesBump: 255,
    noBump: 255,
    vaultBump: 255,
    feedId: new Uint8Array(32),
    reserved: new Uint8Array(),
  } as const;
}

export function marketBytes(o: MarketOptions): Uint8Array {
  return new Uint8Array(getMarketEncoder().encode(marketData(o) as never));
}

export function bookBytes(
  market: Address,
  bids: readonly Resting[],
  asks: readonly Resting[],
  owner: Address = CREATOR,
  traders: readonly BookTrader[] = [],
): Uint8Array {
  const order = (seq: number, [price, quantity, trader = 0, orderId, flags = 0]: Resting) => ({
    seq: BigInt(seq), orderId: orderId ?? BigInt(1000 + seq), quantity, trader, price, flags, pad: 0,
  });
  const empty = { seq: 0n, orderId: 0n, quantity: 0, trader: 0, price: 0, flags: 0, pad: 0 };
  const fill = (rows: readonly Resting[], first: number) =>
    Array.from({ length: 64 }, (_, i) => (rows[i] ? order(first + i, rows[i]!) : empty));
  // Without a trader table the first entry is the owner's (the test wallet, who rests orders as trader 0) and the rest are the
  // bot's and Dave's, other wallets. A table fills the first entries itself, and the rest belong to someone else.
  const noTrader = { owner: OTHER_OWNER, freeUsdc: 0n, freeYes: 0n, freeNo: 0n, openOrders: 0, pad: new Uint8Array(6) };
  const first = traders.length > 0 ? traders : [{ owner }];
  const entry = (t: BookTrader) => ({ owner: t.owner, freeUsdc: t.freeUsdc ?? 0n, freeYes: t.freeYes ?? 0n, freeNo: t.freeNo ?? 0n, openOrders: t.openOrders ?? 0, pad: new Uint8Array(6) });
  return new Uint8Array(
    getBookEncoder().encode({
      market,
      nextSeq: BigInt(bids.length + asks.length + 1),
      bidCount: bids.length,
      askCount: asks.length,
      bump: 255, bookUsdcBump: 255, bookYesBump: 255, bookNoBump: 255,
      reserved: new Uint8Array(18),
      bids: fill(bids, 1),
      asks: fill(asks, 100),
      traders: Array.from({ length: 64 }, (_, i) => (first[i] ? entry(first[i]!) : noTrader)),
    } as never),
  );
}

export const toBase64 = (bytes: Uint8Array) => base64.decode(bytes);

export type ChainMarket = { address: Address; market: Uint8Array; book: Uint8Array };

/** One market with its book, at the address the program derives (D139). A trader table names who owns the entries. */
export async function chainMarket(o: MarketOptions, bids: readonly Resting[], asks: readonly Resting[], traders: readonly BookTrader[] = []): Promise<ChainMarket> {
  const addr = await marketAddress(o.symbol ?? 'META', o.day ?? DAY, o.strikeDollars * 100);
  return { address: addr, market: marketBytes(o), book: bookBytes(addr, bids, asks, CREATOR, traders) };
}

/** The F4 book. */
export const F4_BIDS: Resting[] = [[64, 5, 1]];
export const F4_ASKS: Resting[] = [[65, 10, 2], [66, 5, 1]];

/** Config as devnet holds it (recorded 2026-10-11). */
const recorded = JSON.parse(readFileSync(join(import.meta.dirname, 'config-account.json'), 'utf8'));
export const configAccount = recorded;
export const configBytes = (): Uint8Array => Uint8Array.from(Buffer.from(recorded.value.data[0]!, 'base64'));
export const config = (): Config => getConfigDecoder().decode(configBytes());
export type { Market };
