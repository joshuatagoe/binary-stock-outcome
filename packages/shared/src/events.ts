// The program's events as programs/meridian/src/events.rs defines them now, with the field names and number types of the generated client
// (clients/ts/src/generated/events): u8, u32 as number; u64, i64 as bigint; keys as base58 addresses; enums by name. A change in the
// program's events is a change here (the later events in section 6, such as MarketSettled, arrive with their instructions).
import type { Address } from '@solana/kit';

/** What the taker did with Yes. */
export type Side = 'Buy' | 'Sell';
export type CancelReason = 'Owner' | 'SelfTrade' | 'Sweep';
export type RedeemMode = 'Pairs' | 'Winning' | 'Losing';

export const SIDES: readonly Side[] = ['Buy', 'Sell'];
export const CANCEL_REASONS: readonly CancelReason[] = ['Owner', 'SelfTrade', 'Sweep'];
export const REDEEM_MODES: readonly RedeemMode[] = ['Pairs', 'Winning', 'Losing'];

export interface ConfigInitialized {
  admin: Address;
  operator: Address;
  usdcMint: Address;
  tickers: number;
}

/** The taker's order traded with one resting order, at that order's price (D42). */
export interface Fill {
  market: Address;
  maker: Address;
  makerOrderId: bigint;
  taker: Address;
  takerOrderId: bigint;
  side: Side;
  /** Cents, 1 to 99. */
  price: number;
  quantity: number;
}

/** A Limit order's remainder now rests on the book. */
export interface OrderPlaced {
  market: Address;
  owner: Address;
  orderId: bigint;
  side: Side;
  price: number;
  quantity: number;
}

/** A resting order left the book; what it locked waits in its owner's book balance (D99). `side` is the resting order's side. */
export interface OrderCancelled {
  market: Address;
  owner: Address;
  orderId: bigint;
  side: Side;
  price: number;
  quantity: number;
  reason: CancelReason;
}

export interface MarketCreated {
  market: Address;
  ticker: string;
  /** yyyymmdd. */
  day: number;
  strikeCents: bigint;
  /** Unix seconds. */
  mintOpen: bigint;
  open: bigint;
  close: bigint;
  creator: Address;
}

export interface PairsMinted {
  market: Address;
  owner: Address;
  quantity: bigint;
}

/** Tokens redeemed or burned, and the USDC paid, in base units. */
export interface Redeemed {
  market: Address;
  owner: Address;
  mode: RedeemMode;
  quantity: bigint;
  usdc: bigint;
}

export interface EventsByKind {
  ConfigInitialized: ConfigInitialized;
  Fill: Fill;
  OrderPlaced: OrderPlaced;
  OrderCancelled: OrderCancelled;
  MarketCreated: MarketCreated;
  PairsMinted: PairsMinted;
  Redeemed: Redeemed;
}

export type EventKind = keyof EventsByKind;

/** An event with its name, as the store's `kind` column holds it (section 5). */
export type MeridianEvent = { [K in EventKind]: { kind: K } & EventsByKind[K] }[EventKind];

type FieldType = 'address' | 'u8' | 'u32' | 'u64' | 'string' | 'side' | 'reason' | 'mode';

const FIELDS: { [K in EventKind]: { [F in keyof EventsByKind[K]]-?: FieldType } } = {
  ConfigInitialized: { admin: 'address', operator: 'address', usdcMint: 'address', tickers: 'u8' },
  Fill: { market: 'address', maker: 'address', makerOrderId: 'u64', taker: 'address', takerOrderId: 'u64', side: 'side', price: 'u8', quantity: 'u32' },
  OrderPlaced: { market: 'address', owner: 'address', orderId: 'u64', side: 'side', price: 'u8', quantity: 'u32' },
  OrderCancelled: { market: 'address', owner: 'address', orderId: 'u64', side: 'side', price: 'u8', quantity: 'u32', reason: 'reason' },
  MarketCreated: { market: 'address', ticker: 'string', day: 'u32', strikeCents: 'u64', mintOpen: 'u64', open: 'u64', close: 'u64', creator: 'address' },
  PairsMinted: { market: 'address', owner: 'address', quantity: 'u64' },
  Redeemed: { market: 'address', owner: 'address', mode: 'mode', quantity: 'u64', usdc: 'u64' },
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const intIn = (v: unknown, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

function fieldOk(type: FieldType, v: unknown): boolean {
  switch (type) {
    case 'address': return typeof v === 'string' && BASE58.test(v);
    case 'u8': return intIn(v, 0xff);
    case 'u32': return intIn(v, 0xffff_ffff);
    case 'u64': return typeof v === 'bigint' && v >= 0n && v < 1n << 64n;
    case 'string': return typeof v === 'string';
    case 'side': return SIDES.includes(v as Side);
    case 'reason': return CANCEL_REASONS.includes(v as CancelReason);
    case 'mode': return REDEEM_MODES.includes(v as RedeemMode);
  }
}

/** A runtime check that a value is one of the program's events, with every field of the right kind. */
export function isMeridianEvent(value: unknown): value is MeridianEvent {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (typeof kind !== 'string' || !Object.hasOwn(FIELDS, kind)) return false;
  const fields = FIELDS[kind as EventKind] as Record<string, FieldType>;
  const record = value as Record<string, unknown>;
  return Object.entries(fields).every(([name, type]) => fieldOk(type, record[name]));
}
