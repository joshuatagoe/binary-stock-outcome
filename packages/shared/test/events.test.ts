import { describe, expect, it } from 'vitest';
import { isMeridianEvent, isStreamMessage, STREAM_MESSAGE_TYPES } from '../src/index.ts';
import type { Address } from '@solana/kit';
import type { Fill, StreamMessage } from '../src/index.ts';

const A = 'kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly' as Address;

describe('program events', () => {
  it('lists every event the program defines, so the two cannot drift apart', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const rust = readFileSync(join(import.meta.dirname, '..', '..', '..', 'programs', 'meridian', 'src', 'events.rs'), 'utf8');
    const inProgram = [...rust.matchAll(/#\[event\]\s*pub struct (\w+)/g)].map((m) => m[1]).sort();
    const { EVENT_KINDS } = await import('../src/index.ts');
    expect([...EVENT_KINDS].sort()).toEqual(inProgram);
    expect(inProgram).toHaveLength(21);
  });

  it('knows a MarketHeld by its reason and an admin note', () => {
    expect(isMeridianEvent({ kind: 'MarketHeld', market: A, reason: 'Admin', note: 'Checking a halted stock' })).toBe(true);
    expect(isMeridianEvent({ kind: 'MarketHeld', market: A, reason: 'Halted', note: '' })).toBe(false);
  });

  it('a Fill carries the generated client\'s camelCase fields', () => {
    const fill: Fill = { market: A, maker: A, makerOrderId: 1n, taker: A, takerOrderId: 7n, side: 'Buy', price: 65, quantity: 10 };
    expect(isMeridianEvent({ kind: 'Fill', ...fill })).toBe(true);
  });

  it('knows an OrderCancelled by its reason', () => {
    const base = { kind: 'OrderCancelled', market: A, owner: A, orderId: 3n, side: 'Sell', price: 65, quantity: 10 };
    expect(isMeridianEvent({ ...base, reason: 'SelfTrade' })).toBe(true);
    expect(isMeridianEvent({ ...base, reason: 'Nonsense' })).toBe(false);
  });

  it('refuses an unknown kind or a missing field', () => {
    expect(isMeridianEvent({ kind: 'Nope' })).toBe(false);
    expect(isMeridianEvent({ kind: 'PairsMinted', market: A, owner: A })).toBe(false);
    expect(isMeridianEvent(null)).toBe(false);
  });

  it('knows Redeemed by its mode', () => {
    const e = { kind: 'Redeemed', market: A, owner: A, quantity: 5n, usdc: 5_000_000n };
    expect(isMeridianEvent({ ...e, mode: 'Winning' })).toBe(true);
    expect(isMeridianEvent({ ...e, mode: 'Pairs' })).toBe(true);
    expect(isMeridianEvent({ ...e, mode: 'Both' })).toBe(false);
  });
});

describe('live stream messages (D95)', () => {
  it('has the five types ARCHITECTURE.md section 6 lists', () => {
    expect([...STREAM_MESSAGE_TYPES]).toEqual(['snapshot', 'book', 'price', 'market', 'heartbeat']);
  });

  it('every message has a sequence number and a topic', () => {
    const msg: StreamMessage = { type: 'heartbeat', seq: 12, topic: 'META', at: 1_791_000_000 };
    expect(isStreamMessage(msg)).toBe(true);
    expect(isStreamMessage({ type: 'heartbeat', topic: 'META', at: 1 })).toBe(false);
    expect(isStreamMessage({ type: 'heartbeat', seq: 1, at: 1 })).toBe(false);
    expect(isStreamMessage({ type: 'tick', seq: 1, topic: 'META' })).toBe(false);
  });
});
