// What a landed transaction itself says (C, D90): the trader's own token movements from its pre and post token balances,
// and the program's OrderCancelled events (self-trade cancellations) from its event-CPI inner instructions, decoded with the
// generated client. Unlike two balance reads, nothing else the wallet does in between can disturb it.
import {
  CancelReason,
  FILL_EVENT_DISCRIMINATOR,
  getFillEventDecoder,
  getOrderCancelledEventDecoder,
  getPairsMintedEventDecoder,
  getRedeemedEventDecoder,
  ORDER_CANCELLED_EVENT_DISCRIMINATOR,
  PAIRS_MINTED_EVENT_DISCRIMINATOR,
  REDEEMED_EVENT_DISCRIMINATOR,
  RedeemMode,
  Side,
} from '@meridian/client';
import { getBase58Encoder, type Address } from '@solana/kit';

/** Anchor's event-CPI marker: the first 8 bytes of the data of the program's call to itself. */
export const EVENT_IX_TAG = Uint8Array.from([228, 69, 165, 46, 81, 203, 154, 29]);

type TokenBalance = { accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } };
export type LandedTx = {
  meta: {
    preTokenBalances?: readonly TokenBalance[] | null;
    postTokenBalances?: readonly TokenBalance[] | null;
    innerInstructions?: readonly { index: number; instructions: readonly { data: string }[] }[] | null;
  } | null;
} | null;

export type SelfTrade = { side: 'Buy' | 'Sell'; quantity: number; priceCents: number };
/** One of the trader's own fills as taker: how many Yes changed hands, at the Yes price. */
export type TakerFill = { quantity: number; priceCents: number };
export type Landed = {
  delta: { usdc: bigint; yes: bigint; no: bigint };
  selfTrades: SelfTrade[];
  /** The trader's own fills as taker, in the order the program reached them (D143). */
  fills: TakerFill[];
  /** Pairs the trader's transaction minted (Buy No), and pairs it closed (Sell No). */
  pairsMinted: bigint;
  pairsClosed: bigint;
};

const sum = (list: readonly TokenBalance[] | null | undefined, owner: string, mint: string) =>
  (list ?? []).filter((b) => b.owner === owner && b.mint === mint).reduce((n, b) => n + BigInt(b.uiTokenAmount.amount), 0n);

const startsWith = (bytes: Uint8Array, prefix: ArrayLike<number>) => prefix.length <= bytes.length && Array.from(prefix).every((b, i) => bytes[i] === b);

type Meta = NonNullable<NonNullable<LandedTx>['meta']>;

/** The program's events inside a transaction, as bytes after Anchor's event-CPI marker. */
function* eventsOf(meta: Meta): Generator<Uint8Array> {
  for (const inner of meta.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(getBase58Encoder().encode(ix.data));
      } catch {
        continue;
      }
      if (startsWith(bytes, EVENT_IX_TAG)) yield bytes.slice(EVENT_IX_TAG.length);
    }
  }
}

export function parseLanded(
  tx: LandedTx,
  who: { owner: Address; usdcMint: Address; yesMint: Address; noMint: Address },
): Landed | null {
  const meta = tx?.meta;
  if (!meta) return null;
  const move = (mint: string) => sum(meta.postTokenBalances, who.owner, mint) - sum(meta.preTokenBalances, who.owner, mint);

  const selfTrades: SelfTrade[] = [];
  const fills: TakerFill[] = [];
  let pairsMinted = 0n;
  let pairsClosed = 0n;
  for (const event of eventsOf(meta)) {
    try {
      if (startsWith(event, ORDER_CANCELLED_EVENT_DISCRIMINATOR)) {
        const e = getOrderCancelledEventDecoder().decode(event);
        if (e.owner === who.owner && e.reason === CancelReason.SelfTrade) {
          selfTrades.push({ side: e.side === Side.Sell ? 'Sell' : 'Buy', quantity: e.quantity, priceCents: e.price });
        }
      } else if (startsWith(event, FILL_EVENT_DISCRIMINATOR)) {
        const e = getFillEventDecoder().decode(event);
        if (e.taker === who.owner) fills.push({ quantity: e.quantity, priceCents: e.price });
      } else if (startsWith(event, PAIRS_MINTED_EVENT_DISCRIMINATOR)) {
        const e = getPairsMintedEventDecoder().decode(event);
        if (e.owner === who.owner) pairsMinted += e.quantity;
      } else if (startsWith(event, REDEEMED_EVENT_DISCRIMINATOR)) {
        const e = getRedeemedEventDecoder().decode(event);
        if (e.owner === who.owner && e.mode === RedeemMode.Pairs) pairsClosed += e.quantity;
      }
    } catch {
      /* not an event this page understands */
    }
  }
  return { delta: { usdc: move(who.usdcMint), yes: move(who.yesMint), no: move(who.noMint) }, selfTrades, fills, pairsMinted, pairsClosed };
}

export type OwnerCancels = {
  /** The owner's own Cancel order events, in order: the resting order's side and price, and what was still open. */
  cancels: { side: 'Buy' | 'Sell'; priceCents: number; quantity: number }[];
  /** The pairs the cancel closed, and their USDC, when it was a paired offer (D143). */
  pairsClosed: bigint;
  pairsUsdc: bigint;
};

/**
 * What a landed Cancel order did, from its own events: the owner's OrderCancelled with the reason Owner (not a self-trade or a
 * sweep, which are other orders' doing), and the Redeemed (pairs) a paired offer's cancel writes after it (D143).
 */
export function parseCancelled(tx: LandedTx, owner: Address): OwnerCancels | null {
  const meta = tx?.meta;
  if (!meta) return null;
  const out: OwnerCancels = { cancels: [], pairsClosed: 0n, pairsUsdc: 0n };
  for (const event of eventsOf(meta)) {
    try {
      if (startsWith(event, ORDER_CANCELLED_EVENT_DISCRIMINATOR)) {
        const e = getOrderCancelledEventDecoder().decode(event);
        if (e.owner === owner && e.reason === CancelReason.Owner) {
          out.cancels.push({ side: e.side === Side.Sell ? 'Sell' : 'Buy', priceCents: e.price, quantity: e.quantity });
        }
      } else if (startsWith(event, REDEEMED_EVENT_DISCRIMINATOR)) {
        const e = getRedeemedEventDecoder().decode(event);
        if (e.owner === owner && e.mode === RedeemMode.Pairs) {
          out.pairsClosed += e.quantity;
          out.pairsUsdc += e.usdc;
        }
      }
    } catch {
      /* not an event this page understands */
    }
  }
  return out;
}
