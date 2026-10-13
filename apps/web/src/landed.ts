// What a landed transaction itself says (C, D90): the trader's own token movements from its pre and post token balances,
// and the program's OrderCancelled events (self-trade cancellations) from its event-CPI inner instructions, decoded with the
// generated client. Unlike two balance reads, nothing else the wallet does in between can disturb it.
import { CancelReason, getOrderCancelledEventDecoder, ORDER_CANCELLED_EVENT_DISCRIMINATOR, Side } from '@meridian/client';
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
export type Landed = { delta: { usdc: bigint; yes: bigint; no: bigint }; selfTrades: SelfTrade[] };

const sum = (list: readonly TokenBalance[] | null | undefined, owner: string, mint: string) =>
  (list ?? []).filter((b) => b.owner === owner && b.mint === mint).reduce((n, b) => n + BigInt(b.uiTokenAmount.amount), 0n);

const startsWith = (bytes: Uint8Array, prefix: ArrayLike<number>) => prefix.length <= bytes.length && Array.from(prefix).every((b, i) => bytes[i] === b);

export function parseLanded(
  tx: LandedTx,
  who: { owner: Address; usdcMint: Address; yesMint: Address; noMint: Address },
): Landed | null {
  const meta = tx?.meta;
  if (!meta) return null;
  const move = (mint: string) => sum(meta.postTokenBalances, who.owner, mint) - sum(meta.preTokenBalances, who.owner, mint);

  const selfTrades: SelfTrade[] = [];
  for (const inner of meta.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(getBase58Encoder().encode(ix.data));
      } catch {
        continue;
      }
      if (!startsWith(bytes, EVENT_IX_TAG)) continue;
      const event = bytes.slice(EVENT_IX_TAG.length);
      if (!startsWith(event, ORDER_CANCELLED_EVENT_DISCRIMINATOR)) continue;
      try {
        const e = getOrderCancelledEventDecoder().decode(event);
        if (e.owner === who.owner && e.reason === CancelReason.SelfTrade) {
          selfTrades.push({ side: e.side === Side.Sell ? 'Sell' : 'Buy', quantity: e.quantity, priceCents: e.price });
        }
      } catch {
        /* not an event this page understands */
      }
    }
  }
  return { delta: { usdc: move(who.usdcMint), yes: move(who.yesMint), no: move(who.noMint) }, selfTrades };
}
