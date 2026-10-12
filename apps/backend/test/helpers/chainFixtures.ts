// Transactions as the chain reader sees them, built with the generated client's own encoders. The bytes of an event call are
// the ones programs/meridian/src/events.rs writes (Anchor's tag, the event's discriminator, the fields; its unit test proves
// they equal emit_cpi!'s), so decoding them here exercises the same decoder a real transaction meets.
import * as client from '@meridian/client';
import { PROGRAM_ADDRESS, type EventKind, type EventsByKind } from '@meridian/shared';
import { getBase58Decoder, type Address } from '@solana/kit';
import type { ChainSource, RawTx, SignatureInfo } from '../../src/chainReader.ts';

/** Anchor's EVENT_IX_TAG_LE. */
export const EVENT_TAG = new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29]);

export const A: Record<'alice' | 'bob' | 'carol' | 'market' | 'other', Address> = {
  alice: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as Address,
  bob: 'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ' as Address,
  carol: 'rec2HHDDnjLfj4kE7VyEtFA1HPGQLK33259532cRyHp' as Address,
  market: 'kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly' as Address,
  other: '11111111111111111111111111111111' as Address,
};

type Anyfn = (...args: never[]) => { encode(value: unknown): Uint8Array };
/** The bytes of an event as the program writes them: discriminator, then fields. */
export function eventBytes<K extends EventKind>(kind: K, value: EventsByKind[K]): Uint8Array {
  const encoder = (client as unknown as Record<string, Anyfn>)[`get${kind}EventEncoder`]!();
  return encoder.encode(value);
}

const b58 = getBase58Decoder();
export const callData = (bytes: Uint8Array) => b58.decode(new Uint8Array([...EVENT_TAG, ...bytes]));

export const SAMPLES: { [K in EventKind]: EventsByKind[K] } = {
  ConfigInitialized: { admin: A.alice, operator: A.bob, usdcMint: A.carol, tickers: 7 },
  ConfigUpdated: {
    admin: A.alice,
    pythReceivers: [A.bob, A.carol],
    tickers: [{ symbol: 'META', feedId: new Uint8Array(32).fill(7), strikeStepCents: 1000, enabled: true }],
    ladderBps: [300, 600, 900],
    thresholds: {
      ordersCloseBeforeSecs: 5, publishWindowSecs: 5, maxBandBps: 25, overrideBoundBps: 50, overrideWaitSecs: 3600,
      overrideWaitLongSecs: 86400, operatorOnlySettleSecs: 86400, adminHoldBackstopSecs: 86400, bandHoldBackstopSecs: 604800, noPriceHoldAfterSecs: 900,
    },
    fillLimit: 32,
  },
  AdminProposed: { admin: A.alice, proposed: A.bob },
  AdminAccepted: { previous: A.alice, admin: A.bob },
  OperatorChanged: { previous: A.alice, operator: A.bob },
  Paused: { admin: A.alice },
  Unpaused: { admin: A.alice },
  MarketCreated: { market: A.market, ticker: 'META', day: 20261012, strikeCents: 68000n, mintOpen: 1_791_810_000n, open: 1_791_811_800n, close: 1_791_835_200n, creator: A.alice },
  MarketRemoved: { market: A.market },
  PairsMinted: { market: A.market, owner: A.alice, quantity: 10n },
  Redeemed: { market: A.market, owner: A.alice, mode: 'Pairs', quantity: 10n, usdc: 10_000_000n },
  Fill: { market: A.market, maker: A.bob, makerOrderId: 1n, taker: A.alice, takerOrderId: 7n, side: 'Buy', price: 65, quantity: 10 },
  OrderPlaced: { market: A.market, owner: A.alice, orderId: 7n, side: 'Buy', price: 65, quantity: 4 },
  OrderCancelled: { market: A.market, owner: A.alice, orderId: 7n, side: 'Buy', price: 65, quantity: 4, reason: 'Owner' },
  BalanceReturned: { market: A.market, owner: A.alice, usdc: 2_600_000n, yes: 0n },
  BookClosed: { market: A.market },
  CloseRecorded: { ticker: 'META', day: 20261012, price: 68_000_000n, conf: 1000n, expo: -5, publishTime: 1_791_835_200n, priceAccount: A.carol, recorder: A.alice },
  MarketSettled: { market: A.market, outcome: 'Yes', settledBy: 'Oracle', price: 68_100_000n, conf: 1000n, expo: -5, publishTime: 1_791_835_200n },
  MarketHeld: { market: A.market, reason: 'Admin', note: 'checking the close' },
  ResultProposed: { market: A.market, outcome: 'No', officialCloseCents: 67_950n, source: 'Nasdaq', finalAt: 1_791_900_000n },
  ProposalWithdrawn: { market: A.market },
};

let counter = 0;
export const signatureOf = (n: number) => `sig${String(n).padStart(6, '0')}`;

export interface TxSpec {
  signature?: string;
  slot?: number;
  blockTime?: number | null;
  failed?: boolean;
  /** Event calls, grouped by the top-level instruction that made them. */
  calls?: { index: number; events: Uint8Array[]; programId?: string; tag?: Uint8Array }[];
  logs?: string[];
}

/** A transaction in the reader's own shape. */
export function tx(spec: TxSpec = {}): RawTx {
  const n = ++counter;
  return {
    signature: spec.signature ?? signatureOf(n),
    slot: BigInt(spec.slot ?? 1000 + n),
    blockTime: spec.blockTime === undefined ? 1_791_811_900 + n : spec.blockTime,
    failed: spec.failed ?? false,
    logs: spec.logs ?? [],
    inner: (spec.calls ?? []).map((c) => ({
      index: c.index,
      instructions: c.events.map((e) => ({
        programId: c.programId ?? PROGRAM_ADDRESS,
        data: b58.decode(new Uint8Array([...(c.tag ?? EVENT_TAG), ...e])),
      })),
    })),
  };
}

export const cpiTx = <K extends EventKind>(kind: K, value: EventsByKind[K], spec: TxSpec = {}) =>
  tx({ calls: [{ index: 0, events: [eventBytes(kind, value)] }], ...spec });

/** A chain with these transactions, newest first. Counts the calls it gets and can fail on demand. */
export function fakeSource(txs: RawTx[], hooks: { failTxAt?: number; pageCap?: number } = {}) {
  const calls = { signatures: [] as { before?: string; until?: string; limit: number }[], transactions: [] as string[] };
  const bySig = new Map(txs.map((t) => [t.signature, t]));
  const indexOf = (s: string) => txs.findIndex((t) => t.signature === s);
  const source: ChainSource = {
    // Like Agave: an unknown `before` gives an empty list, an unknown `until` is ignored, and `limit` is only a maximum.
    async getSignatures({ before, until, limit }): Promise<SignatureInfo[]> {
      calls.signatures.push({ before, until, limit });
      let from = 0;
      if (before) {
        const i = indexOf(before);
        if (i < 0) return [];
        from = i + 1;
      }
      const to = until ? indexOf(until) : -1;
      const end = to >= 0 ? to : txs.length;
      return txs.slice(from, end).slice(0, Math.min(limit, hooks.pageCap ?? Infinity)).map((t) => ({ signature: t.signature, slot: t.slot, failed: t.failed }));
    },
    async getTransaction(signature) {
      calls.transactions.push(signature);
      if (hooks.failTxAt !== undefined && calls.transactions.length === hooks.failTxAt) throw new Error('rpc went away');
      return bySig.get(signature) ?? null;
    },
  };
  return { source, calls, add: (t: RawTx) => (txs.unshift(t), bySig.set(t.signature, t)) };
}
