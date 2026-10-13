// The program's events as they appear inside a landed transaction (Anchor event CPI), encoded with the generated client,
// for the website's unit and browser tests. A layout change breaks them, as it should.
import { CancelReason, getFillEventEncoder, getOrderCancelledEventEncoder, getPairsMintedEventEncoder, getRedeemedEventEncoder, RedeemMode, Side } from '@meridian/client';
import { address, getBase58Decoder } from '@solana/kit';
import { EVENT_IX_TAG } from '../../src/landed.ts';

export const MARKET_FOR_EVENTS = address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q');
const OTHER_MAKER = address('AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY');

export type EventInstruction = { programIdIndex: number; accounts: number[]; data: string };

/** An event's bytes wrapped as the program's call to itself. */
export function tagged(payload: Uint8Array): EventInstruction {
  const data = new Uint8Array(EVENT_IX_TAG.length + payload.length);
  data.set(EVENT_IX_TAG);
  data.set(payload, EVENT_IX_TAG.length);
  return { programIdIndex: 1, accounts: [0], data: getBase58Decoder().decode(data) };
}

/** A fill the taker made against another trader's resting order, at the Yes price. */
export const fillEvent = (taker: string, price: number, quantity: number, side: Side = Side.Sell) =>
  tagged(
    new Uint8Array(
      getFillEventEncoder().encode({ market: MARKET_FOR_EVENTS, maker: OTHER_MAKER, makerOrderId: 3, taker: address(taker), takerOrderId: 0, side, price, quantity }),
    ),
  );

export const pairsMintedEvent = (owner: string, quantity: number) =>
  tagged(new Uint8Array(getPairsMintedEventEncoder().encode({ market: MARKET_FOR_EVENTS, owner: address(owner), quantity })));

export const redeemedEvent = (owner: string, quantity: number, mode: 0 | 1 | 2 = RedeemMode.Pairs) =>
  tagged(new Uint8Array(getRedeemedEventEncoder().encode({ market: MARKET_FOR_EVENTS, owner: address(owner), mode, quantity, usdc: quantity * 1_000_000 })));

/** The trader's own resting order, cancelled because the trader's new order would have traded with it (D90). `side` is the resting order's. */
export const selfTradeEvent = (owner: string, side: Side, price: number, quantity: number) =>
  tagged(
    new Uint8Array(
      getOrderCancelledEventEncoder().encode({ market: MARKET_FOR_EVENTS, owner: address(owner), orderId: 9, side, price, quantity, reason: CancelReason.SelfTrade }),
    ),
  );
