// The send queue (D56, D75): the only path from the backend to the chain, shared by every job and the bot.
//   - Pace: fewer than 40 sends in any 10 seconds (devnet's limit is 40 of one kind), and sends plus confirmation checks
//     within 100 in any 10 seconds (F3.17). Sends go out in the order jobs were submitted.
//   - Re-signing: a transaction is signed again only after the chain is past its blockhash's last valid block height and a
//     final check shows it never landed (F3.18). A resend before that would let both copies land.
//   - Failed sends: a rate-limit reply or a network failure sends the same signed bytes again after a growing, randomized wait
//     (F3.19). Anything else is the job's answer: it may call an error success (a repeated create fails with "already exists").
// Failover between two RPC providers (D75) is a `Transport` that wraps two; it joins with the second provider's key.

export interface SignedTx {
  /** The transaction as the transport sends it (base64). */
  wire: string;
  signature: string;
  /** The last block height at which the transaction's blockhash is still accepted. */
  lastValidBlockHeight: bigint;
}

export type TxStatus = { state: 'confirmed' } | { state: 'failed'; error: unknown } | { state: 'not_found' };

export interface Transport {
  /** Sends the bytes and returns the signature. Throws on a rate-limit reply or a rejected transaction. */
  send(wire: string): Promise<string>;
  /**
   * One lookup for many signatures (`getSignatureStatuses` with `searchTransactionHistory: true`, so a transaction the node has moved
   * out of its recent cache is still found), results in the order asked. Read at the commitment the job needs: `confirmed` or higher.
   */
  statuses(signatures: string[]): Promise<TxStatus[]>;
  /** The block height (`getBlockHeight`) at a commitment no lower than `statuses` uses: a lower one could call a blockhash expired too early. */
  blockHeight(): Promise<bigint>;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface SendJob {
  /** Names the job in logs. */
  label: string;
  /** Builds and signs a transaction with a fresh blockhash. Called again only after the last one has expired. */
  sign(): Promise<SignedTx>;
  /** Says an error means the job's goal is already met, like "market already exists" (D56). */
  isDone?(error: unknown): boolean;
  /** Send attempts, counting every wait-and-resend, before the last error is given back. Default 8. */
  maxAttempts?: number;
  /** A time on the queue's clock after which the job gives up with a SendDeadlineError (the morning job's 9:00, D56). */
  deadline?: number;
}

export interface SendResult {
  signature: string;
  /** True when the goal was already met and nothing new landed. */
  alreadyDone: boolean;
  attempts: number;
  signs: number;
}

export class SendFailedError extends Error {
  // Declared as fields: Node strips types without compiling, which has no parameter properties.
  chainError: unknown;
  signature: string;
  constructor(chainError: unknown, signature: string) {
    super(`transaction ${signature} failed on chain: ${JSON.stringify(chainError, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);
    this.name = 'SendFailedError';
    this.chainError = chainError;
    this.signature = signature;
  }
}

export class SendDeadlineError extends Error {
  constructor(label: string) {
    super(`${label}: gave up at its deadline`);
    this.name = 'SendDeadlineError';
  }
}

const statusCodeOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as { statusCode?: unknown; context?: { statusCode?: unknown } };
  const code = e.statusCode ?? e.context?.statusCode;
  return typeof code === 'number' ? code : undefined;
};

/** True for an HTTP 429 (also as Kit's transport error carries it) or a "too many requests" message. */
export function isRateLimited(error: unknown): boolean {
  if (statusCodeOf(error) === 429) return true;
  return error instanceof Error && /\b429\b|too many requests|rate limit/i.test(error.message);
}

/** A failure that a resend can fix: a server error, a dropped connection or a timeout. */
export function isTransient(error: unknown): boolean {
  const code = statusCodeOf(error);
  if (code !== undefined && code >= 500) return true;
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.name === 'TimeoutError' || /fetch failed|ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up|timed out/i.test(error.message);
}

const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 30_000;

/** Equal jitter: half of an exponentially growing step is fixed and half is random, so waits always grow yet two callers never march in step. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const step = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  return Math.floor(step / 2 + random() * (step / 2));
}

export interface SendQueueOptions {
  transport: Transport;
  clock?: Clock;
  random?: () => number;
  /** Devnet's per-address limit; the queue stays below it. Default 40. */
  sendLimit?: number;
  /** Sends plus confirmation checks. Default 100. */
  totalLimit?: number;
  windowMs?: number;
  /** Time between confirmation checks of one transaction. Default 2 s. */
  pollMs?: number;
  onEvent?: (event: { type: 'send' | 'rate_limited' | 'retry' | 'resign' | 'done' | 'failed'; label: string; [key: string]: unknown }) => void;
}

const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) };

const isBlockhashNotFound = (error: unknown) => error instanceof Error && /blockhash not found/i.test(error.message);
const isAlreadyProcessed = (error: unknown) => error instanceof Error && /already (been )?processed/i.test(error.message);

export function createSendQueue(options: SendQueueOptions) {
  const { transport, clock = realClock, random = Math.random, sendLimit = 40, totalLimit = 100, windowMs = 10_000, pollMs = 2_000, onEvent } = options;
  const sendTimes: number[] = [];
  const allTimes: number[] = [];

  // Waits for room, then takes it. The check and the take happen with no await between, so two waiters can't both take the last slot.
  // Sends and checks each wait in their own line so a check is never stuck behind a long queue of sends.
  const lines = { send: Promise.resolve(), check: Promise.resolve() };
  function acquire(kind: 'send' | 'check'): Promise<void> {
    const turn = lines[kind].then(async () => {
      for (;;) {
        const t = clock.now();
        while (sendTimes.length && sendTimes[0]! <= t - windowMs) sendTimes.shift();
        while (allTimes.length && allTimes[0]! <= t - windowMs) allTimes.shift();
        const totalFull = allTimes.length >= totalLimit;
        const sendFull = kind === 'send' && sendTimes.length >= sendLimit - 1; // "under 40"
        if (!totalFull && !sendFull) {
          allTimes.push(t);
          if (kind === 'send') sendTimes.push(t);
          return;
        }
        const frees = Math.max(totalFull ? allTimes[0]! + windowMs : 0, sendFull ? sendTimes[0]! + windowMs : 0);
        await clock.sleep(Math.max(1, frees - t));
      }
    });
    lines[kind] = turn.catch(() => {});
    return turn;
  }

  // Every transaction waiting to be looked up joins one `statuses` call, which takes one slot: ten jobs polling together cost one request.
  let waiting: { signature: string; resolve: (s: TxStatus) => void; reject: (e: unknown) => void }[] = [];
  let flushing = false;
  function statusOf(signature: string): Promise<TxStatus> {
    return new Promise((resolve, reject) => {
      waiting.push({ signature, resolve, reject });
      if (flushing) return;
      flushing = true;
      void (async () => {
        await Promise.resolve(); // let the others polling at this moment join
        let batch: typeof waiting = [];
        try {
          await acquire('check');
          batch = waiting;
          waiting = [];
          flushing = false;
          const unique = [...new Set(batch.map((b) => b.signature))];
          const results = await transport.statuses(unique);
          const by = new Map(unique.map((s, i) => [s, results[i]!]));
          for (const b of batch) b.resolve(by.get(b.signature)!);
        } catch (error) {
          if (flushing) { batch = waiting; waiting = []; flushing = false; }
          for (const b of batch) b.reject(error);
        }
      })();
    });
  }

  async function run(job: SendJob): Promise<SendResult> {
    const { label, maxAttempts = 8, deadline } = job;
    let attempts = 0;
    let signs = 0;
    const pastDeadline = () => deadline !== undefined && clock.now() >= deadline;
    // A wait that does not outlast the deadline, so a retry loop notices it on time.
    const wait = (ms: number) => clock.sleep(deadline === undefined ? ms : Math.max(0, Math.min(ms, deadline - clock.now())));
    const retryable = (error: unknown) => isRateLimited(error) || isTransient(error);
    const done = (signature: string, alreadyDone: boolean): SendResult => {
      onEvent?.({ type: 'done', label, signature, alreadyDone });
      return { signature, alreadyDone, attempts, signs };
    };
    // A call that fails for a rate limit or a dropped connection is "don't know yet": it waits and returns undefined, never "not found" or "expired".
    const check = async <T>(read: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await read();
      } catch (error) {
        if (!retryable(error)) throw error;
        onEvent?.({ type: 'rate_limited', label, during: 'check' });
        await wait(backoffMs(0, random));
        return undefined;
      }
    };
    // Signing needs the latest blockhash from the node, so it takes a slot and is retried like a send.
    async function signed(): Promise<SignedTx> {
      for (let attempt = 0; ; attempt++) {
        await acquire('check');
        try {
          return await job.sign();
        } catch (error) {
          if (!retryable(error) || attempt + 1 >= maxAttempts) throw error;
          await wait(backoffMs(attempt, random));
        }
      }
    }
    // The transaction's status, or undefined when the lookup was refused.
    const lookup = (tx: SignedTx) => check(() => statusOf(tx.signature));
    // Turns a landed status into the job's end, or null while it has not landed.
    const settle = (tx: SignedTx, status: TxStatus | undefined): SendResult | null => {
      if (!status || status.state === 'not_found') return null;
      if (status.state === 'confirmed') return done(tx.signature, false);
      if (job.isDone?.(status.error)) return done(tx.signature, true);
      onEvent?.({ type: 'failed', label, error: status.error });
      throw new SendFailedError(status.error, tx.signature);
    };

    for (;;) {
      if (pastDeadline() && signs > 0) throw new SendDeadlineError(label);
      const tx = await signed();
      signs++;
      if (signs > 1) onEvent?.({ type: 'resign', label, signs });

      // Send. `mayHaveLanded` becomes true once any attempt might have reached the node (it went out, or it timed out). From then
      // on the job may not end in failure until the blockhash has expired and a last look finds nothing: a copy can still land (F3.18).
      let mayHaveLanded = false;
      let expiredAlready = false;
      let pending: unknown;
      for (;;) {
        if (pastDeadline()) { pending = new SendDeadlineError(label); break; }
        await acquire('send');
        attempts++;
        try {
          await transport.send(tx.wire);
          onEvent?.({ type: 'send', label, signature: tx.signature, attempts });
          mayHaveLanded = true;
          break;
        } catch (error) {
          if (job.isDone?.(error)) return done(tx.signature, true);
          if (isAlreadyProcessed(error)) { mayHaveLanded = true; break; }
          if (isBlockhashNotFound(error)) { expiredAlready = true; break; }
          if (isTransient(error)) mayHaveLanded = true; // a timeout does not say the node never got it
          if (!retryable(error) || attempts >= maxAttempts) {
            onEvent?.({ type: 'failed', label, attempts });
            pending = error;
            break;
          }
          onEvent?.({ type: isRateLimited(error) ? 'rate_limited' : 'retry', label, attempts });
          await wait(backoffMs(attempts - 1, random));
        }
      }
      if (!mayHaveLanded && !expiredAlready) throw pending; // nothing of this signature can be on the chain

      // Watch until it lands, or until its blockhash has expired and one last look finds nothing. "Blockhash not found" counts as expired.
      let expired = expiredAlready;
      for (;;) {
        if (!expired) await clock.sleep(pollMs);
        const landed = settle(tx, await lookup(tx));
        if (landed) return landed;
        if (expired) {
          // The last look, taken after expiry, found nothing.
          if (pending) throw pending;
          if (pastDeadline()) throw new SendDeadlineError(label);
          break; // sign a new one
        }
        const height = await check(async () => (await acquire('check'), transport.blockHeight()));
        // Past the last valid block height the transaction can no longer land, but it may have landed just before: look once more.
        if (height !== undefined && height > tx.lastValidBlockHeight) expired = true;
        if (expired) continue;
        if (pending === undefined && pastDeadline()) pending = new SendDeadlineError(label); // wait for the copy, then report the deadline
      }
    }
  }

  return {
    /** Queues a job; resolves when its transaction has landed, or rejects with the reason it could not. */
    submit: (job: SendJob): Promise<SendResult> => run(job),
  };
}

export type SendQueue = ReturnType<typeof createSendQueue>;
