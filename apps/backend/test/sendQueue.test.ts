// The send queue (D56): one queue for every job, under 40 sends per 10 s with confirmation checks inside the 100 per 10 s,
// a transaction re-signed only after its blockhash has expired, and growing, randomized waits after a failed send.
import { describe, expect, it } from 'vitest';
import { backoffMs, createSendQueue, isRateLimited, SendFailedError, SendDeadlineError, type SignedTx, type Transport, type SendJob } from '../src/sendQueue.ts';
import { createFakeClock } from './helpers/fakeClock.ts';

const rateLimit = () => Object.assign(new Error('429 Too Many Requests'), { statusCode: 429 });

type Status = Awaited<ReturnType<Transport['statuses']>>[number];

// A chain the test controls. Every call to the transport is logged with the clock's time.
function setup(options: { status?: (signature: string, calls: number) => Status; send?: (wire: string, calls: number) => void; height?: () => bigint; signError?: (call: number) => void; queue?: Record<string, number> } = {}) {
  const clock = createFakeClock();
  const log: { at: number; kind: 'send' | 'status' | 'height'; arg?: string }[] = [];
  const sends: { at: number; wire: string }[] = [];
  const statusCalls = new Map<string, number>();
  const batches: number[] = [];
  const signTimes: number[] = [];
  let sendCalls = 0;
  const transport: Transport = {
    async send(wire) {
      log.push({ at: clock.now(), kind: 'send', arg: wire });
      sends.push({ at: clock.now(), wire });
      options.send?.(wire, ++sendCalls);
      return `sig-of-${wire}`;
    },
    async statuses(signatures) {
      log.push({ at: clock.now(), kind: 'status', arg: signatures.join(',') });
      batches.push(signatures.length);
      return signatures.map((signature) => {
        const n = (statusCalls.get(signature) ?? 0) + 1;
        statusCalls.set(signature, n);
        return options.status ? options.status(signature, n) : { state: 'confirmed' as const };
      });
    },
    async blockHeight() {
      log.push({ at: clock.now(), kind: 'height' });
      return options.height ? options.height() : 1000n;
    },
  };
  const queue = createSendQueue({ transport, clock, random: () => 0.5, ...options.queue });
  let signed = 0;
  const job = (label = 'job', extra: Partial<SendJob> = {}): SendJob & { signs: () => number } => ({
    label,
    async sign(): Promise<SignedTx> {
      signTimes.push(clock.now());
      options.signError?.(signTimes.length);
      signed++;
      const wire = `${label}-${signed}`;
      return { wire, signature: `sig-of-${wire}`, lastValidBlockHeight: 1150n };
    },
    signs: () => signed,
    ...extra,
  });
  return { clock, queue, job, log, sends, transport, batches, signTimes };
}

// The most events of a kind in any window of `windowMs` ms (half-open at the start).
function busiest(entries: { at: number }[], windowMs: number): number {
  let most = 0;
  for (const e of entries) most = Math.max(most, entries.filter((x) => x.at > e.at - windowMs && x.at <= e.at).length);
  return most;
}

describe('the pace (D56)', () => {
  it('sends fewer than 40 in any 10 seconds, however many jobs are waiting', async () => {
    const { clock, queue, job, sends } = setup();
    const results = await clock.drive(Promise.all(Array.from({ length: 120 }, (_, i) => queue.submit(job(`j${i}`)))));
    expect(results).toHaveLength(120);
    expect(sends).toHaveLength(120);
    expect(busiest(sends, 10_000)).toBeLessThan(40);
    expect(busiest(sends, 10_000)).toBeGreaterThanOrEqual(30); // it uses the room it has
  });

  it('keeps sends plus confirmation checks within 100 in any 10 seconds', async () => {
    // Every job needs three checks before it lands, so the total, not the send count, binds.
    const { clock, queue, job, log } = setup({ status: (_s, n) => (n < 3 ? { state: 'not_found' } : { state: 'confirmed' }) });
    await clock.drive(Promise.all(Array.from({ length: 60 }, (_, i) => queue.submit(job(`j${i}`)))));
    expect(busiest(log, 10_000)).toBeLessThanOrEqual(100);
  });

  it('sends in the order jobs were submitted', async () => {
    const { clock, queue, job, sends } = setup();
    await clock.drive(Promise.all(Array.from({ length: 50 }, (_, i) => queue.submit(job(`j${String(i).padStart(2, '0')}`)))));
    expect(sends.map((s) => s.wire)).toEqual(Array.from({ length: 50 }, (_, i) => `j${String(i).padStart(2, '0')}-${i + 1}`));
  });
});

describe('a rate-limit reply', () => {
  it('waits longer each time and sends the same signed bytes again, without signing again', async () => {
    const { clock, queue, job, sends } = setup({
      send: (_w, n) => {
        if (n <= 3) throw rateLimit();
      },
    });
    const j = job('a');
    const result = await clock.drive(queue.submit(j));
    expect(result.signature).toBe('sig-of-a-1');
    expect(j.signs()).toBe(1);
    expect(sends.map((s) => s.wire)).toEqual(['a-1', 'a-1', 'a-1', 'a-1']);
    const gaps = sends.slice(1).map((s, i) => s.at - sends[i]!.at);
    expect(gaps[1]!).toBeGreaterThan(gaps[0]!);
    expect(gaps[2]!).toBeGreaterThan(gaps[1]!);
  });

  it('is told apart from a failure that retrying cannot fix', async () => {
    expect(isRateLimited(rateLimit())).toBe(true);
    expect(isRateLimited({ context: { statusCode: 429 } })).toBe(true);
    expect(isRateLimited(new Error('Too Many Requests'))).toBe(true);
    expect(isRateLimited(new Error('custom program error: 0x1'))).toBe(false);
    expect(isRateLimited(null)).toBe(false);
  });

  it('gives up with the last error when attempts run out', async () => {
    const { clock, queue, job } = setup({ send: () => { throw rateLimit(); } });
    const q = queue;
    await expect(clock.drive(q.submit(job('a', { maxAttempts: 4 })))).rejects.toThrow(/429/);
  });

  it('does not retry an error that is neither rate limiting nor transient', async () => {
    const { clock, queue, job, sends } = setup({ send: () => { throw new Error('Transaction simulation failed: custom program error: 0x1771'); } });
    await expect(clock.drive(queue.submit(job('a')))).rejects.toThrow(/0x1771/);
    expect(sends).toHaveLength(1);
  });

  it('retries a network failure like a rate limit', async () => {
    const { clock, queue, job, sends } = setup({ send: (_w, n) => { if (n === 1) throw new TypeError('fetch failed'); } });
    await clock.drive(queue.submit(job('a')));
    expect(sends).toHaveLength(2);
  });
});

describe('the backoff', () => {
  it('grows with each attempt up to a cap', () => {
    const waits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => backoffMs(a, () => 0.5));
    for (let i = 1; i < 7; i++) expect(waits[i]!).toBeGreaterThan(waits[i - 1]!);
    expect(Math.max(...waits)).toBeLessThanOrEqual(30_000);
    expect(waits[10]).toBe(waits[9]); // capped
  });
  it('is randomized: different draws give different waits, within [half, full] of the step', () => {
    const low = backoffMs(3, () => 0);
    const high = backoffMs(3, () => 0.999999);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeLessThanOrEqual(low * 2);
  });
});

describe('re-signing (D56: only after the old blockhash has expired)', () => {
  it('does not sign again while the blockhash is still valid, however long the transaction is unseen', async () => {
    // Unseen for the first 10 checks, valid blockhash throughout, then it lands.
    const { clock, queue, job, sends } = setup({ status: (_s, n) => (n < 10 ? { state: 'not_found' } : { state: 'confirmed' }), height: () => 1100n });
    const j = job('a');
    await clock.drive(queue.submit(j));
    expect(j.signs()).toBe(1);
    expect(sends).toHaveLength(1);
  });

  it('signs again once the chain is past the last valid block height and the old one never landed', async () => {
    let height = 1000n;
    const { clock, queue, job, sends } = setup({
      // The first signature never shows; the second lands.
      status: (signature) => (signature === 'sig-of-a-2' ? { state: 'confirmed' } : { state: 'not_found' }),
      height: () => (height += 40n),
    });
    const j = job('a');
    const result = await clock.drive(queue.submit(j));
    expect(j.signs()).toBe(2);
    expect(sends.map((s) => s.wire)).toEqual(['a-1', 'a-2']);
    expect(result.signature).toBe('sig-of-a-2');
  });

  it('does not sign again if the old transaction lands in the last moment before the check', async () => {
    let height = 1000n;
    const { clock, queue, job, sends } = setup({
      // Unseen until the chain passes expiry; the final check after expiry finds it.
      status: (_s, n) => (height > 1150n ? { state: 'confirmed' } : n >= 99 ? { state: 'confirmed' } : { state: 'not_found' }),
      height: () => (height += 60n),
    });
    const j = job('a');
    await clock.drive(queue.submit(j));
    expect(j.signs()).toBe(1);
    expect(sends).toHaveLength(1);
  });

  it('never has two signed copies in flight: the second is sent only after the first has been checked past expiry', async () => {
    let height = 1000n;
    const { clock, queue, job, log } = setup({
      status: (signature) => (signature === 'sig-of-a-2' ? { state: 'confirmed' } : { state: 'not_found' }),
      height: () => (height += 40n),
    });
    await clock.drive(queue.submit(job('a')));
    const secondSend = log.findIndex((l) => l.kind === 'send' && l.arg === 'a-2');
    const lastCheckOfFirst = log.map((l, i) => (l.kind === 'status' && l.arg === 'sig-of-a-1' ? i : -1)).filter((i) => i >= 0).pop()!;
    expect(lastCheckOfFirst).toBeLessThan(secondSend);
    expect(log.slice(0, secondSend).some((l) => l.kind === 'height')).toBe(true);
  });
});

describe('how a job ends', () => {
  it('rejects when the transaction lands with an error', async () => {
    const { clock, queue, job } = setup({ status: () => ({ state: 'failed', error: { InstructionError: [0, { Custom: 6001 }] } }) });
    await expect(clock.drive(queue.submit(job('a')))).rejects.toBeInstanceOf(SendFailedError);
  });

  it('counts an error the job calls success, like "market already exists" (D56)', async () => {
    const exists = { InstructionError: [0, { Custom: 0 }] };
    const { clock, queue, job } = setup({ status: () => ({ state: 'failed', error: exists }) });
    const result = await clock.drive(queue.submit(job('a', { isDone: (e) => e === exists })));
    expect(result.alreadyDone).toBe(true);
  });

  it('counts a send error the job calls success (a preflight "already exists")', async () => {
    const { clock, queue, job } = setup({ send: () => { throw new Error('already exists'); } });
    const result = await clock.drive(queue.submit(job('a', { isDone: (e) => /already exists/.test(String(e)) })));
    expect(result.alreadyDone).toBe(true);
  });

  it('rejects at the deadline, while waiting to send', async () => {
    const { clock, queue, job } = setup({ send: () => { throw rateLimit(); } });
    await expect(clock.drive(queue.submit(job('a', { maxAttempts: 100, deadline: 20_000 })))).rejects.toBeInstanceOf(SendDeadlineError);
    expect(clock.now()).toBeLessThanOrEqual(20_000 + 30_000);
  });

  it('keeps going for the other jobs when one fails', async () => {
    const { clock, queue, job } = setup({ status: (s) => (s.startsWith('sig-of-bad') ? { state: 'failed', error: 'x' } : { state: 'confirmed' }) });
    const outcomes = await clock.drive(Promise.allSettled([queue.submit(job('bad')), queue.submit(job('good'))]));
    expect(outcomes.map((o) => o.status)).toEqual(['rejected', 'fulfilled']);
  });
});

describe('signing is inside the budget and the retries', () => {
  it('takes a slot before every signing: no more signs than the total limit in a window', async () => {
    const { clock, queue, job, signTimes } = setup({ queue: { totalLimit: 10 } });
    await clock.drive(Promise.all(Array.from({ length: 30 }, (_, i) => queue.submit(job(`j${i}`)))));
    expect(busiest(signTimes.map((at) => ({ at })), 10_000)).toBeLessThanOrEqual(10);
  });

  it('retries a signing that fails on a rate limit or a dropped connection, with growing waits', async () => {
    const { clock, queue, job, signTimes } = setup({
      signError: (n) => {
        if (n === 1) throw rateLimit();
        if (n === 2) throw new TypeError('fetch failed');
      },
    });
    const j = job('a');
    await clock.drive(queue.submit(j));
    expect(signTimes).toHaveLength(3);
    expect(signTimes[2]! - signTimes[1]!).toBeGreaterThan(signTimes[1]! - signTimes[0]!);
  });

  it('does not retry a signing that fails for another reason', async () => {
    const { clock, queue, job, signTimes } = setup({ signError: () => { throw new Error('no key'); } });
    await expect(clock.drive(queue.submit(job('a')))).rejects.toThrow(/no key/);
    expect(signTimes).toHaveLength(1);
  });
});

describe('a node that said "Blockhash not found"', () => {
  it('is treated as expired: one last status check, then a new signature, without waiting out the blockhash', async () => {
    const { clock, queue, job, sends, log } = setup({
      send: (_w, n) => { if (n === 1) throw new Error('Transaction simulation failed: Blockhash not found'); },
      status: (s) => (s === 'sig-of-a-2' ? { state: 'confirmed' } : { state: 'not_found' }),
      height: () => 1000n, // still valid by the chain's count
    });
    const j = job('a');
    await clock.drive(queue.submit(j));
    expect(sends.map((s) => s.wire)).toEqual(['a-1', 'a-2']);
    const checkedFirst = log.findIndex((l) => l.kind === 'status' && l.arg === 'sig-of-a-1');
    expect(checkedFirst).toBeGreaterThanOrEqual(0);
    expect(checkedFirst).toBeLessThan(log.findIndex((l) => l.kind === 'send' && l.arg === 'a-2'));
  });
});

describe('a copy that may already have reached the node (D56, F3.18)', () => {
  const timeout = () => new TypeError('fetch failed');

  it('does not give up on a timed-out send while the copy can still land: it lands, so the job succeeds', async () => {
    const { clock, queue, job, sends } = setup({
      send: () => { throw timeout(); },
      status: () => ({ state: 'confirmed' }),
    });
    const result = await clock.drive(queue.submit(job('a', { maxAttempts: 1 })));
    expect(result.signature).toBe('sig-of-a-1');
    expect(sends).toHaveLength(1);
  });

  it('rejects with the send error only after the blockhash has expired and a last status check found nothing', async () => {
    let height = 1000n;
    const { clock, queue, job, log, sends } = setup({
      send: () => { throw timeout(); },
      status: () => ({ state: 'not_found' }),
      height: () => (height += 60n),
    });
    await expect(clock.drive(queue.submit(job('a', { maxAttempts: 1 })))).rejects.toThrow(/fetch failed/);
    expect(sends).toHaveLength(1); // never signed or sent a second copy for this
    expect(log.filter((l) => l.kind === 'height').length).toBeGreaterThanOrEqual(2);
    expect(log.at(-1)!.kind).toBe('status'); // the last thing it did was look once more
  });

  it('treats "already been processed" as sent', async () => {
    const { clock, queue, job } = setup({ send: () => { throw new Error('Transaction simulation failed: This transaction has already been processed'); } });
    const result = await clock.drive(queue.submit(job('a')));
    expect(result.alreadyDone).toBe(false);
    expect(result.signature).toBe('sig-of-a-1');
  });

  it('keeps watching a sent copy past its job’s deadline and rejects at the deadline only once it can no longer land', async () => {
    let height = 1000n;
    const { clock, queue, job, log, sends } = setup({
      status: () => ({ state: 'not_found' }),
      height: () => (height += 30n),
    });
    await expect(clock.drive(queue.submit(job('a', { deadline: 1_000 })))).rejects.toBeInstanceOf(SendDeadlineError);
    expect(sends).toHaveLength(1); // no new signature after the deadline
    expect(log.filter((l) => l.kind === 'height').length).toBeGreaterThanOrEqual(4); // it waited for the chain to pass expiry
  });
});

describe('status checks are batched', () => {
  it('asks about every waiting transaction in one call per poll', async () => {
    const { clock, queue, job, batches } = setup({ status: (_s, n) => (n < 3 ? { state: 'not_found' } : { state: 'confirmed' }) });
    await clock.drive(Promise.all(Array.from({ length: 10 }, (_, i) => queue.submit(job(`j${i}`)))));
    expect(Math.max(...batches)).toBeGreaterThan(1);
    expect(batches.length).toBeLessThan(10 * 3);
  });
});
