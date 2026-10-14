// The transaction tracker (D13, ARCHITECTURE.md §7): refused, closed window, wrong network, sent, may still land,
// done, expired. No clock and no network here: the steps are fakes.
import { describe, expect, it } from 'vitest';
import { createTracker, EXPIRY_MARGIN_BLOCKS, type Steps, type TrackerState } from '../src/tracker.ts';

type Status = 'none' | 'pending' | 'finalized' | { err: unknown };

function steps(over: Partial<Steps> = {}): Steps & { calls: string[] } {
  const calls: string[] = [];
  const s: Steps = {
    simulate: async () => void calls.push('simulate'),
    sign: async () => (calls.push('sign'), 'signed'),
    signatureOf: () => 'SIG',
    send: async () => void calls.push('send'),
    status: async (): Promise<Status> => (calls.push('status'), 'finalized'),
    blockHeight: async () => (calls.push('height'), 100n),
    lastValidBlockHeight: 150n,
    sleep: async () => {},
    mayStillLandAfterMs: 4000,
    pollMs: 500,
    ...over,
  };
  return Object.assign(s, { calls });
}

const failWith = (value: unknown) => async () => {
  throw value;
};
const walletError = (code: number) => Object.assign(new Error('wallet'), { code });

async function run(s: Steps) {
  const seen: TrackerState['kind'][] = [];
  const tracker = createTracker((state) => seen.push(state.kind));
  const final = await tracker.start(s);
  return { final, seen, tracker };
}

describe('the tracker', () => {
  it('simulates on devnet first, then the wallet, then sends, and is done only when finalized', async () => {
    const s = steps();
    const { final, seen } = await run(s);
    expect(s.calls).toEqual(['simulate', 'sign', 'send', 'height', 'status']);
    expect(seen).toEqual(['checking', 'awaitingWallet', 'sending', 'done']);
    expect(final).toEqual({ kind: 'done', signature: 'SIG' });
  });

  it('a simulation that fails refuses the order before the wallet opens, with the reason', async () => {
    const s = steps({ simulate: failWith({ simulationErr: { InstructionError: [1, { Custom: 6022 }] } }), action: 'buyYes' });
    const { final } = await run(s);
    expect(s.calls).toEqual([]);
    expect(final).toMatchObject({ kind: 'orders-closed', message: 'Trading has ended, so nothing was bought and nothing was sent.' });
  });

  it('a closed wallet window (4001) is "closed", not a failure, and nothing is sent', async () => {
    const s = steps({ sign: failWith(walletError(4001)) });
    const { final } = await run(s);
    expect(s.calls).toEqual(['simulate']);
    expect(final).toMatchObject({ kind: 'closed' });
  });

  it('a wallet that refuses a transaction that passed simulation is on the wrong network (-32003)', async () => {
    const { final } = await run(steps({ sign: failWith(walletError(-32003)) }));
    expect(final).toMatchObject({ kind: 'wrong-network', message: 'Your wallet seems to be on Mainnet. Switch it to Solana Devnet, then try again.' });
  });

  it('no answer within a few seconds shows "sent, may still land", then done when it lands', async () => {
    let waited = 0;
    let polls = 0;
    const s = steps({
      status: async () => (++polls < 12 ? 'none' : 'finalized'),
      sleep: async (ms) => void (waited += ms),
    });
    const { final, seen } = await run(s);
    expect(seen).toEqual(['checking', 'awaitingWallet', 'sending', 'mayStillLand', 'done']);
    expect(waited).toBeGreaterThanOrEqual(4000);
    expect(final.kind).toBe('done');
  });

  it('never calls "not found yet" a failure: it keeps waiting, and only expiry ends it, with nothing spent', async () => {
    let height = 100n;
    const s = steps({
      status: async () => 'none' as const,
      blockHeight: async () => (height += 1n),
    });
    const { final, seen } = await run(s);
    expect(seen).toContain('mayStillLand');
    expect(final).toMatchObject({ kind: 'expired' });
    expect((final as { message: string }).message).toMatch(/Nothing was spent/);
  });

  it('an order that landed with an error is a failure, with the program’s words', async () => {
    const s = steps({ status: async () => ({ err: { InstructionError: [1, { Custom: 6022 }] } }), action: 'buyYes' });
    const { final } = await run(s);
    expect(final).toMatchObject({
      kind: 'orders-closed',
      message: 'Trading ended before your order reached the network. Nothing was bought; only the network fee was charged.',
    });
  });

  it('a send that errors is not the end: the signature is known, so it keeps polling and is done when that lands (no second order)', async () => {
    let polls = 0;
    const s = steps({
      send: failWith(new Error('fetch failed')),
      status: async () => (++polls < 3 ? 'none' : 'finalized'),
    });
    const { final, seen } = await run(s);
    expect(seen).not.toContain('failed');
    expect(final).toEqual({ kind: 'done', signature: 'SIG' });
  });

  it('a send that errors and never lands ends only at a real expiry, with nothing spent', async () => {
    let height = 100n;
    const s = steps({ send: failWith(new Error('fetch failed')), status: async () => 'none' as const, blockHeight: async () => (height += 1n) });
    const { final } = await run(s);
    expect(final).toMatchObject({ kind: 'expired', signature: 'SIG' });
  });

  it('a cancel that expires says the order is still open, and offers Try again (F6)', async () => {
    let height = 100n;
    const s = steps({ action: 'cancel', send: failWith(new Error('fetch failed')), status: async () => 'none' as const, blockHeight: async () => (height += 1n) });
    const { final } = await run(s);
    expect(final).toMatchObject({
      kind: 'expired',
      message: 'Your cancel expired before it reached the network. Nothing was spent, and the order is still open. Try again to send a new cancel.',
    });
  });

  it('a transaction that is confirmed (landed, not final) never expires, however high the block height', async () => {
    let polls = 0;
    const s = steps({ blockHeight: async () => 9999n, status: async () => (++polls < 5 ? 'pending' : 'finalized') });
    const { final } = await run(s);
    expect(final).toEqual({ kind: 'done', signature: 'SIG' });
  });

  it('a transaction that lands between the height read and the status read is not expired', async () => {
    const order: string[] = [];
    let polls = 0;
    const s = steps({
      blockHeight: async () => (order.push('height'), 200n),
      status: async () => (order.push('status'), ++polls === 1 ? 'pending' : 'finalized'),
    });
    const { final } = await run(s);
    expect(order.slice(0, 2)).toEqual(['height', 'status']);
    expect(final.kind).toBe('done');
  });

  it('a status read that fails never declares expiry: it stays "may still land" until a read succeeds', async () => {
    let polls = 0;
    const s = steps({
      blockHeight: async () => 9999n,
      status: async () => {
        if (++polls < 20) throw new Error('503');
        return 'finalized' as const;
      },
    });
    const { final, seen } = await run(s);
    expect(seen).not.toContain('expired');
    expect(seen).toContain('mayStillLand');
    expect(final.kind).toBe('done');
  });

  it('a block-height read that fails never declares expiry either', async () => {
    let polls = 0;
    const s = steps({
      blockHeight: failWith(new Error('503')),
      status: async () => (++polls < 20 ? 'none' : 'finalized'),
    });
    const { final } = await run(s);
    expect(final.kind).toBe('done');
  });

  it('keeps one live attempt per order: a second start while one is running returns the same attempt', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const s = steps({ sign: async () => (await gate, 'signed') });
    const tracker = createTracker(() => {});
    const first = tracker.start(s);
    const second = tracker.start(steps());
    expect(second).toBe(first);
    release();
    await first;
    expect(s.calls.filter((c) => c === 'simulate')).toHaveLength(1);
  });

  it('after an attempt ends, Try again may start a new one', async () => {
    const tracker = createTracker(() => {});
    await tracker.start(steps({ sign: failWith(walletError(4001)) }));
    const again = await tracker.start(steps());
    expect(again.kind).toBe('done');
  });

  describe('expiry across load-balanced nodes (A, F)', () => {
    const lastValid = 150n;
    const past = lastValid + BigInt(EXPIRY_MARGIN_BLOCKS) + 5n;

    it('one "no such transaction" past the last valid height is not an expiry: a node that is behind may say it', async () => {
      const replies = ['none', 'pending', 'none', 'finalized'] as const;
      let i = 0;
      const { final, seen } = await run(steps({ blockHeight: async () => past, status: async () => replies[Math.min(i++, 3)]! }));
      expect(seen).not.toContain('expired');
      expect(final.kind).toBe('done');
    });

    it('two "no such transaction" rounds in a row, past the margin, are the expiry', async () => {
      const { final } = await run(steps({ blockHeight: async () => past, status: async () => 'none' as const }));
      expect(final).toMatchObject({ kind: 'expired' });
    });

    it('just past the last valid height, inside the margin, is not yet an expiry', async () => {
      let polls = 0;
      const { final, seen } = await run(
        steps({ blockHeight: async () => lastValid + 1n, status: async () => (++polls < 30 ? 'none' : 'finalized') }),
      );
      expect(seen).not.toContain('expired');
      expect(final.kind).toBe('done');
    });

    it('a transaction seen as landed and then gone expires the same way, instead of waiting for ever', async () => {
      let polls = 0;
      const { final } = await run(steps({ blockHeight: async () => past, status: async () => (++polls <= 3 ? 'pending' : 'none') }));
      expect(final).toMatchObject({ kind: 'expired' });
    });
  });

  it('a signed transaction whose signature cannot be read ends as failed, with nothing sent (F)', async () => {
    const s = steps({ signatureOf: () => { throw new Error('unreadable'); } });
    const { final } = await run(s);
    expect(final).toMatchObject({ kind: 'failed', message: expect.stringMatching(/nothing was sent/i) });
    expect(s.calls).not.toContain('send');
  });

  it('an order that landed with 6010 is "already placed" (the landed path)', async () => {
    const { final } = await run(steps({ status: async () => ({ err: { InstructionError: [2, { Custom: 6010 }] } }), action: 'buyYes' }));
    expect(final).toMatchObject({ kind: 'already-placed' });
  });
});
