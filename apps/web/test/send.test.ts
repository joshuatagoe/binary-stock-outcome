// The tracker's steps against a fake chain: how a status read becomes "none", "pending", "finalized" or an error, and
// that a failed read is never read as "no such transaction" (D13).
import { describe, expect, it } from 'vitest';
import { assertSameBlockhash, liveSteps } from '../src/send.ts';
import { watch } from '../src/tracker.ts';

type Reply = null | { confirmationStatus: string; err: unknown } | Error;

function fakeRpc(opts: { statuses: Reply[]; height: bigint | (() => bigint) }) {
  let i = 0;
  const calls: string[] = [];
  const rpc = {
    getSignatureStatuses: () => ({
      send: async () => {
        calls.push('status');
        const r = opts.statuses[Math.min(i++, opts.statuses.length - 1)]!;
        if (r instanceof Error) throw r;
        return { value: [r] };
      },
    }),
    getBlockHeight: () => ({
      send: async () => {
        calls.push('height');
        return typeof opts.height === 'function' ? opts.height() : opts.height;
      },
    }),
  } as never;
  return { rpc, calls };
}

const stepsFor = (rpc: never) => ({
  ...liveSteps({ rpc, action: 'buyYes', build: async () => ({}) as never }),
  sleep: async () => {},
  lastValidBlockHeight: 150n,
});

describe('reading a transaction’s status', () => {
  it('no answer for the signature is "none"', async () => {
    expect(await stepsFor(fakeRpc({ statuses: [null], height: 1n }).rpc).status('s')).toBe('none');
  });
  it('confirmed or processed, without an error, is "pending": it landed', async () => {
    for (const confirmationStatus of ['processed', 'confirmed']) {
      expect(await stepsFor(fakeRpc({ statuses: [{ confirmationStatus, err: null }], height: 1n }).rpc).status('s')).toBe('pending');
    }
  });
  it('finalized is "finalized", and an error is carried', async () => {
    expect(await stepsFor(fakeRpc({ statuses: [{ confirmationStatus: 'finalized', err: null }], height: 1n }).rpc).status('s')).toBe('finalized');
    expect(await stepsFor(fakeRpc({ statuses: [{ confirmationStatus: 'confirmed', err: { x: 1 } }], height: 1n }).rpc).status('s')).toEqual({ err: { x: 1 } });
  });
  it('a read that fails throws, so it is never taken for "none"', async () => {
    await expect(stepsFor(fakeRpc({ statuses: [new Error('503')], height: 1n }).rpc).status('s')).rejects.toThrow('503');
  });
});

describe('watching with these steps', () => {
  const run = (statuses: Reply[], height: bigint | (() => bigint)) => {
    const fake = fakeRpc({ statuses, height });
    const seen: string[] = [];
    return watch(stepsFor(fake.rpc), 'SIG', (s) => seen.push(s.kind)).then((final) => ({ final, seen, calls: fake.calls }));
  };

  it('a failing status read past the last valid block height does not expire the order', async () => {
    const { final, seen } = await run([new Error('503'), new Error('503'), { confirmationStatus: 'finalized', err: null }], 9999n);
    expect(seen).not.toContain('expired');
    expect(final.kind).toBe('done');
  });

  it('a confirmed status past the last valid block height waits for finalized instead of expiring', async () => {
    const { final } = await run([{ confirmationStatus: 'confirmed', err: null }, { confirmationStatus: 'confirmed', err: null }, { confirmationStatus: 'finalized', err: null }], 9999n);
    expect(final.kind).toBe('done');
  });

  it('a landing between the height read and the status read is not an expiry; the height is read first', async () => {
    const { final, calls } = await run([{ confirmationStatus: 'confirmed', err: null }, { confirmationStatus: 'finalized', err: null }], 9999n);
    expect(calls.slice(0, 2)).toEqual(['height', 'status']);
    expect(final.kind).toBe('done');
  });

  it('no such transaction after the height passed is the one real expiry', async () => {
    const { final } = await run([null], 9999n);
    expect(final).toMatchObject({ kind: 'expired' });
  });
});

describe('the wallet must sign the transaction the site built', () => {
  it('passes when the blockhash is the one the site built', () => {
    expect(() => assertSameBlockhash({ lifetimeConstraint: { blockhash: 'AAA' } } as never, 'AAA')).not.toThrow();
  });
  it('refuses a transaction signed with another blockhash: the site would be watching the wrong deadline', () => {
    expect(() => assertSameBlockhash({ lifetimeConstraint: { blockhash: 'BBB' } } as never, 'AAA')).toThrow(/changed the transaction/);
    expect(() => assertSameBlockhash({} as never, 'AAA')).toThrow(/changed the transaction/);
  });
});
