// Live attempts are held above the page, keyed by market, and saved for this tab, so leaving the page or reloading during
// "may still land" can't start a second order (D13, D101).
import { describe, expect, it } from 'vitest';
import { createAttempts } from '../src/attempts.ts';
import type { Steps } from '../src/tracker.ts';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), map: m };
};

function steps(over: Partial<Steps> = {}, calls: string[] = []): Steps {
  return {
    simulate: async () => void calls.push('simulate'),
    sign: async () => (calls.push('sign'), 'signed'),
    signatureOf: () => 'SIG',
    send: async () => void calls.push('send'),
    status: async () => (calls.push('status'), 'finalized' as const),
    blockHeight: async () => 100n,
    lastValidBlockHeight: 150n,
    sleep: async () => {},
    mayStillLandAfterMs: 4000,
    pollMs: 500,
    ...over,
  };
}
const meta = { action: 'buyYes', quantity: 10 };
const finalize = async () => 'Bought 10 Yes';

describe('attempts held above the page', () => {
  it('an attempt keeps running when the page goes away, and a page that comes back sees where it is', async () => {
    const attempts = createAttempts(memory());
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const done = attempts.run('META-680', { steps: steps({ status: async () => (await gate, 'finalized' as const) }), meta, finalize });
    const gone = attempts.subscribe('META-680', () => {});
    gone(); // the page unmounts
    expect(['sending', 'checking', 'awaitingWallet']).toContain(attempts.get('META-680').state.kind);
    release();
    await done;
    expect(attempts.get('META-680')).toMatchObject({ state: { kind: 'done' }, result: 'Bought 10 Yes' });
  });

  it('a second start for the same market while one is live is the same attempt: no second order', async () => {
    const attempts = createAttempts(memory());
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const first = attempts.run('M', { steps: steps({ sign: async () => (await gate, 'signed') }, calls), meta, finalize });
    const second = attempts.run('M', { steps: steps({}, calls), meta, finalize });
    expect(second).toBe(first);
    release();
    await first;
    expect(calls.filter((c) => c === 'simulate')).toHaveLength(1);
  });

  it('saves the signature once the transaction is signed, and forgets it when the attempt ends', async () => {
    const storage = memory();
    const attempts = createAttempts(storage);
    let seen: string | null = null;
    await attempts.run('M', {
      steps: steps({ status: async () => ((seen = storage.getItem('meridian-attempt:M')), 'finalized' as const) }),
      meta,
      finalize,
    });
    expect(JSON.parse(seen!)).toMatchObject({ signature: 'SIG', lastValidBlockHeight: '150', meta });
    expect(storage.getItem('meridian-attempt:M')).toBeNull();
  });

  it('after a reload it resumes by watching the saved signature, and never simulates, signs or sends again', async () => {
    const storage = memory();
    storage.setItem('meridian-attempt:M', JSON.stringify({ signature: 'SIG', lastValidBlockHeight: '150', meta }));
    const attempts = createAttempts(storage);
    const calls: string[] = [];
    const resumed = attempts.resume('M', { stepsFor: () => steps({}, calls), finalize });
    expect(resumed).not.toBeNull();
    await resumed;
    expect(calls).toEqual(['status']);
    expect(attempts.get('M')).toMatchObject({ state: { kind: 'done', signature: 'SIG' }, result: 'Bought 10 Yes' });
    expect(storage.getItem('meridian-attempt:M')).toBeNull();
  });

  it('resume does nothing when nothing was saved', () => {
    const attempts = createAttempts(memory());
    expect(attempts.resume('M', { stepsFor: () => steps(), finalize })).toBeNull();
  });

  it('works without storage (private windows): the attempt just is not saved', async () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    const attempts = createAttempts({ getItem: blocked, setItem: blocked, removeItem: blocked });
    await attempts.run('M', { steps: steps(), meta, finalize });
    expect(attempts.get('M').state.kind).toBe('done');
    expect(attempts.resume('M2', { stepsFor: () => steps(), finalize })).toBeNull();
  });

  it('forgets a finished attempt’s result when asked, so the next order starts clean', async () => {
    const attempts = createAttempts(memory());
    await attempts.run('M', { steps: steps(), meta, finalize });
    attempts.clear('M');
    expect(attempts.get('M')).toMatchObject({ state: { kind: 'idle' }, result: null });
  });

  it('under a different wallet, a saved order is still watched, but its result carries no amounts (D)', async () => {
    const storage = memory();
    storage.setItem('meridian-attempt:M', JSON.stringify({ signature: 'SIG', lastValidBlockHeight: '150', owner: 'alice', meta }));
    const attempts = createAttempts(storage);
    let asked = false;
    await attempts.resume('M', {
      owner: 'bob',
      stepsFor: () => steps(),
      finalize: async () => ((asked = true), 'Bought 10 Yes'),
    });
    expect(asked).toBe(false);
    expect(attempts.get('M').result).toBe('An earlier order from another wallet landed. Check your balances.');
  });

  it('under the same wallet it words the result as usual', async () => {
    const storage = memory();
    storage.setItem('meridian-attempt:M', JSON.stringify({ signature: 'SIG', lastValidBlockHeight: '150', owner: 'alice', meta }));
    const attempts = createAttempts(storage);
    await attempts.resume('M', { owner: 'alice', stepsFor: () => steps(), finalize });
    expect(attempts.get('M').result).toBe('Bought 10 Yes');
  });

  it('saves the owner with the signature', async () => {
    const storage = memory();
    const attempts = createAttempts(storage);
    let seen: string | null = null;
    await attempts.run('M', {
      owner: 'alice',
      steps: steps({ status: async () => ((seen = storage.getItem('meridian-attempt:M')), 'finalized' as const) }),
      meta,
      finalize,
    });
    expect(JSON.parse(seen!)).toMatchObject({ owner: 'alice' });
  });
});
