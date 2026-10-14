// What a landed Cancel order says (F6, D143): the owner's own OrderCancelled events, and for a paired offer the Redeemed (pairs)
// that follows, read from the transaction itself, never from a balance that other transfers can disturb.
import { RedeemMode, Side } from '@meridian/client';
import { describe, expect, it } from 'vitest';
import { parseCancelled, type LandedTx } from '../src/landed.ts';
import { describeCancelled } from '../src/orders.ts';
import { ownerCancelEvent, redeemedEvent, selfTradeEvent, sweepCancelEvent, type EventInstruction } from './fixtures/events.ts';

const ME = '5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q';
const BOB = 'AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY';
const tx = (...events: EventInstruction[]): LandedTx => ({ meta: { innerInstructions: [{ index: 1, instructions: events }] } });

describe('reading a landed Cancel order', () => {
  it('is null when the transaction is not available', () => {
    expect(parseCancelled(null, ME as never)).toBeNull();
    expect(parseCancelled({ meta: null }, ME as never)).toBeNull();
  });

  it('reads a bid cancelled by its owner: 6 left at 60¢', () => {
    const c = parseCancelled(tx(ownerCancelEvent(ME, Side.Buy, 60, 6)), ME as never);
    expect(c).toEqual({ cancels: [{ side: 'Buy', priceCents: 60, quantity: 6 }], pairsClosed: 0n, pairsUsdc: 0n });
    expect(describeCancelled(c)).toBe('Order cancelled · 3.60 USDC returned');
  });

  it('reads a paired offer: the cancel, then the pairs it closed and their USDC', () => {
    const c = parseCancelled(tx(ownerCancelEvent(ME, Side.Sell, 67, 6), redeemedEvent(ME, 6, RedeemMode.Pairs)), ME as never);
    expect(c).toEqual({ cancels: [{ side: 'Sell', priceCents: 67, quantity: 6 }], pairsClosed: 6n, pairsUsdc: 6_000_000n });
    expect(describeCancelled(c)).toBe('Order cancelled · 6 pairs closed · 6.00 USDC returned');
  });

  it('counts only the wallet’s own cancels by the owner’s hand: not a self-trade cancel, a sweep, or another wallet’s', () => {
    const c = parseCancelled(
      tx(selfTradeEvent(ME, Side.Sell, 65, 10), sweepCancelEvent(ME, Side.Buy, 60, 5), ownerCancelEvent(BOB, Side.Buy, 60, 9), ownerCancelEvent(ME, Side.Sell, 80, 5)),
      ME as never,
    );
    expect(c?.cancels).toEqual([{ side: 'Sell', priceCents: 80, quantity: 5 }]);
    expect(describeCancelled(c)).toBe('Order cancelled · 5 Yes returned');
  });

  it('counts only the wallet’s pairs, and only pairs, not winning or losing redemptions', () => {
    const c = parseCancelled(tx(ownerCancelEvent(ME, Side.Sell, 67, 6), redeemedEvent(BOB, 3, RedeemMode.Pairs), redeemedEvent(ME, 2, RedeemMode.Winning)), ME as never);
    expect(c).toMatchObject({ pairsClosed: 0n, pairsUsdc: 0n });
  });

  it('a transaction with no cancel event reads as nothing cancelled, so the words promise no amount', () => {
    const c = parseCancelled(tx(), ME as never);
    expect(c).toEqual({ cancels: [], pairsClosed: 0n, pairsUsdc: 0n });
    expect(describeCancelled(c)).toMatch(/^Order cancelled\. What it held is back/);
  });
});
