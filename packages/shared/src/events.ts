// The program's events as programs/meridian/src/events.rs defines them now, with the field names and number types of the generated client
// (clients/ts/src/generated/events): u8, u32 as number; u64, i64 as bigint; keys as base58 addresses; enums by name. A change in the
// program's events is a change here; test/events.test.ts fails if a struct in events.rs is missing here.
import type { Address } from '@solana/kit';

/** What the taker did with Yes. */
export type Side = 'Buy' | 'Sell';
export type CancelReason = 'Owner' | 'SelfTrade' | 'Sweep';
export type RedeemMode = 'Pairs' | 'Winning' | 'Losing';

export const SIDES: readonly Side[] = ['Buy', 'Sell'];
export const CANCEL_REASONS: readonly CancelReason[] = ['Owner', 'SelfTrade', 'Sweep'];
export const REDEEM_MODES: readonly RedeemMode[] = ['Pairs', 'Winning', 'Losing'];
export type Outcome = 'None' | 'Yes' | 'No';
export type SettledBy = 'None' | 'Oracle' | 'Override' | 'Backstop';
export type HoldReason = 'None' | 'BandOnStrike' | 'NoPrice' | 'Admin';
export const OUTCOMES: readonly Outcome[] = ['None', 'Yes', 'No'];
export const SETTLED_BY: readonly SettledBy[] = ['None', 'Oracle', 'Override', 'Backstop'];
export const HOLD_REASONS: readonly HoldReason[] = ['None', 'BandOnStrike', 'NoPrice', 'Admin'];

/** Config's per-stock settings (programs/meridian/src/config.rs). */
export interface Ticker {
  symbol: string;
  feedId: Uint8Array;
  strikeStepCents: number;
  enabled: boolean;
}

/** The thresholds the program enforces (D102 to D106), each in seconds or basis points. */
export interface Thresholds {
  ordersCloseBeforeSecs: number;
  publishWindowSecs: number;
  maxBandBps: number;
  overrideBoundBps: number;
  overrideWaitSecs: number;
  overrideWaitLongSecs: number;
  operatorOnlySettleSecs: number;
  adminHoldBackstopSecs: number;
  bandHoldBackstopSecs: number;
  noPriceHoldAfterSecs: number;
}

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

/** Config after a change, in full (D70). */
export interface ConfigUpdated {
  admin: Address;
  pythReceivers: Address[];
  tickers: Ticker[];
  ladderBps: [number, number, number];
  thresholds: Thresholds;
  fillLimit: number;
}
export interface AdminProposed { admin: Address; proposed: Address }
export interface AdminAccepted { previous: Address; admin: Address }
export interface OperatorChanged { previous: Address; operator: Address }
export interface Paused { admin: Address }
export interface Unpaused { admin: Address }
export interface MarketRemoved { market: Address }
/** An owner's book balance paid to its own accounts (D99); Yes and No as whole tokens (D142). */
export interface BalanceReturned { market: Address; owner: Address; usdc: bigint; yes: bigint }
export interface BookClosed { market: Address }
/** A stock's close recorded or improved (D105), in Pyth's units. */
export interface CloseRecorded {
  ticker: string;
  day: number;
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: bigint;
  priceAccount: Address;
  recorder: Address;
}
export interface MarketSettled {
  market: Address;
  outcome: Outcome;
  settledBy: SettledBy;
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: bigint;
}
/** `note` is the admin's public answer on an admin hold (D70, D91). */
export interface MarketHeld { market: Address; reason: HoldReason; note: string }
export interface ResultProposed { market: Address; outcome: Outcome; officialCloseCents: bigint; source: string; finalAt: bigint }
export interface ProposalWithdrawn { market: Address }

export interface EventsByKind {
  ConfigInitialized: ConfigInitialized;
  ConfigUpdated: ConfigUpdated;
  AdminProposed: AdminProposed;
  AdminAccepted: AdminAccepted;
  OperatorChanged: OperatorChanged;
  Paused: Paused;
  Unpaused: Unpaused;
  MarketCreated: MarketCreated;
  MarketRemoved: MarketRemoved;
  PairsMinted: PairsMinted;
  Redeemed: Redeemed;
  Fill: Fill;
  OrderPlaced: OrderPlaced;
  OrderCancelled: OrderCancelled;
  BalanceReturned: BalanceReturned;
  BookClosed: BookClosed;
  CloseRecorded: CloseRecorded;
  MarketSettled: MarketSettled;
  MarketHeld: MarketHeld;
  ResultProposed: ResultProposed;
  ProposalWithdrawn: ProposalWithdrawn;
}

export type EventKind = keyof EventsByKind;

/** An event with its name, as the store's `kind` column holds it (section 5). */
export type MeridianEvent = { [K in EventKind]: { kind: K } & EventsByKind[K] }[EventKind];

type FieldType =
  | 'address' | 'addresses' | 'u8' | 'u16' | 'u32' | 'u64' | 'i32' | 'i64' | 'string' | 'side' | 'reason' | 'mode'
  | 'outcome' | 'settledBy' | 'holdReason' | 'tickers' | 'ladder' | 'thresholds';

const FIELDS: { [K in EventKind]: { [F in keyof EventsByKind[K]]-?: FieldType } } = {
  ConfigInitialized: { admin: 'address', operator: 'address', usdcMint: 'address', tickers: 'u8' },
  Fill: { market: 'address', maker: 'address', makerOrderId: 'u64', taker: 'address', takerOrderId: 'u64', side: 'side', price: 'u8', quantity: 'u32' },
  OrderPlaced: { market: 'address', owner: 'address', orderId: 'u64', side: 'side', price: 'u8', quantity: 'u32' },
  OrderCancelled: { market: 'address', owner: 'address', orderId: 'u64', side: 'side', price: 'u8', quantity: 'u32', reason: 'reason' },
  MarketCreated: { market: 'address', ticker: 'string', day: 'u32', strikeCents: 'u64', mintOpen: 'u64', open: 'u64', close: 'u64', creator: 'address' },
  PairsMinted: { market: 'address', owner: 'address', quantity: 'u64' },
  Redeemed: { market: 'address', owner: 'address', mode: 'mode', quantity: 'u64', usdc: 'u64' },
  ConfigUpdated: { admin: 'address', pythReceivers: 'addresses', tickers: 'tickers', ladderBps: 'ladder', thresholds: 'thresholds', fillLimit: 'u16' },
  AdminProposed: { admin: 'address', proposed: 'address' },
  AdminAccepted: { previous: 'address', admin: 'address' },
  OperatorChanged: { previous: 'address', operator: 'address' },
  Paused: { admin: 'address' },
  Unpaused: { admin: 'address' },
  MarketRemoved: { market: 'address' },
  BalanceReturned: { market: 'address', owner: 'address', usdc: 'u64', yes: 'u64' },
  BookClosed: { market: 'address' },
  CloseRecorded: { ticker: 'string', day: 'u32', price: 'i64', conf: 'u64', expo: 'i32', publishTime: 'i64', priceAccount: 'address', recorder: 'address' },
  MarketSettled: { market: 'address', outcome: 'outcome', settledBy: 'settledBy', price: 'i64', conf: 'u64', expo: 'i32', publishTime: 'i64' },
  MarketHeld: { market: 'address', reason: 'holdReason', note: 'string' },
  ResultProposed: { market: 'address', outcome: 'outcome', officialCloseCents: 'u64', source: 'string', finalAt: 'i64' },
  ProposalWithdrawn: { market: 'address' },
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const intIn = (v: unknown, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

function fieldOk(type: FieldType, v: unknown): boolean {
  switch (type) {
    case 'address': return typeof v === 'string' && BASE58.test(v);
    case 'u8': return intIn(v, 0xff);
    case 'u16': return intIn(v, 0xffff);
    case 'u32': return intIn(v, 0xffff_ffff);
    case 'i32': return typeof v === 'number' && Number.isInteger(v) && v >= -(2 ** 31) && v < 2 ** 31;
    case 'i64': return typeof v === 'bigint' && v >= -(1n << 63n) && v < 1n << 63n;
    case 'addresses': return Array.isArray(v) && v.every((a) => typeof a === 'string' && BASE58.test(a));
    case 'outcome': return OUTCOMES.includes(v as Outcome);
    case 'settledBy': return SETTLED_BY.includes(v as SettledBy);
    case 'holdReason': return HOLD_REASONS.includes(v as HoldReason);
    case 'tickers': return Array.isArray(v) && v.every((t) => typeof t === 'object' && t !== null && typeof (t as Ticker).symbol === 'string');
    case 'ladder': return Array.isArray(v) && v.length === 3 && v.every((x) => intIn(x, 0xffff));
    case 'thresholds': return typeof v === 'object' && v !== null && typeof (v as Thresholds).ordersCloseBeforeSecs === 'number';
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

/** Every event kind, in the program's order of instructions. */
export const EVENT_KINDS = Object.keys(FIELDS) as EventKind[];
