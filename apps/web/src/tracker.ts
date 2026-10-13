// The transaction tracker (D13, D115, ARCHITECTURE.md §7). One attempt per order: simulate on devnet, ask the wallet to
// sign, send from the site, and wait for "finalized". "Not found yet" is never a failure: only an expired blockhash ends
// the wait, and then nothing was spent. The steps are passed in, so tests need no network and no clock.
import type { TradeAction } from '@meridian/shared';
import { describeLandedFailure, describeSimulationFailure, describeWalletFailure, type Failure } from './failures.ts';

export type TrackerState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'awaitingWallet' }
  | { kind: 'sending' }
  | { kind: 'mayStillLand'; signature: string }
  | { kind: 'done'; signature: string }
  | (Failure & { signature?: string });

/** 'none': the chain answered that it has no such transaction. 'pending': it landed and waits to be finalized. A failed read throws. */
export type TxStatus = 'none' | 'pending' | 'finalized' | { err: unknown };

export interface Steps {
  /** Throws SimulationFailed when devnet refuses the transaction. */
  simulate(): Promise<void>;
  /** Throws the wallet's error when it refuses. */
  sign(): Promise<unknown>;
  /** The signature, known from the signed transaction before it is sent. */
  signatureOf(signed: unknown): string;
  /** Sends the signed transaction through the site's own devnet connection. An error here does not mean it did not land. */
  send(signed: unknown): Promise<void>;
  status(signature: string): Promise<TxStatus>;
  blockHeight(): Promise<bigint>;
  lastValidBlockHeight: bigint;
  sleep(ms: number): Promise<void>;
  /** How long to wait for an answer before showing "Sent, may still land". */
  mayStillLandAfterMs: number;
  pollMs: number;
  action?: TradeAction;
  /** The index of the trade instruction in the transaction, so an earlier instruction's error isn't read as the trade's. */
  tradeIndex?: number;
}

const LIVE: ReadonlySet<TrackerState['kind']> = new Set(['checking', 'awaitingWallet', 'sending', 'mayStillLand']);
export const isLive = (s: TrackerState) => LIVE.has(s.kind);

/**
 * Expiry needs more than one node's word: devnet answers through several nodes, and one that is behind says "no such
 * transaction" for one that landed. So the chain must say none on two rounds in a row, with the height this far past the
 * last valid one.
 */
export const EXPIRY_MARGIN_BLOCKS = 20;

const withSignature = (f: Failure, signature: string): TrackerState => ({ ...f, signature });

export async function runAttempt(steps: Steps, emit: (s: TrackerState) => void): Promise<TrackerState> {
  const action = steps.action ?? 'buyYes';
  const end = (s: TrackerState) => (emit(s), s);

  emit({ kind: 'checking' });
  try {
    await steps.simulate();
  } catch (error) {
    const err = (error as { simulationErr?: unknown } | null)?.simulationErr;
    if (err !== undefined) return end(describeSimulationFailure(err, action, steps.tradeIndex));
    return end({
      kind: 'failed',
      message: `Devnet couldn't be reached to check this order, so nothing was sent. (${(error as Error)?.message ?? error})`,
    });
  }

  emit({ kind: 'awaitingWallet' });
  let signed: unknown;
  try {
    signed = await steps.sign();
  } catch (error) {
    return end(describeWalletFailure(error));
  }

  let signature: string;
  try {
    signature = steps.signatureOf(signed);
  } catch {
    return end({ kind: 'failed', message: "The signed transaction couldn't be read, so nothing was sent. Try again." });
  }
  emit({ kind: 'sending' });
  try {
    await steps.send(signed);
  } catch {
    // The send may have reached the network even though its answer didn't come back. The signature is known, so the
    // site keeps watching for it exactly as for "may still land", and offers Try again only after a real expiry (D13).
  }
  return watch(steps, signature, emit);
}

/**
 * Waits for a sent transaction. Each round reads the block height, then the status. Expiry is declared only when the chain
 * says it has no such transaction on two rounds in a row, with the height past the last valid one by a margin (see
 * EXPIRY_MARGIN_BLOCKS). Any other answer, including "landed", resets that count, and a read that fails changes nothing.
 */
export async function watch(steps: Steps, signature: string, emit: (s: TrackerState) => void): Promise<TrackerState> {
  const action = steps.action ?? 'buyYes';
  const end = (s: TrackerState) => (emit(s), s);
  let waited = 0;
  let showedMaybe = false;
  let nones = 0;
  for (;;) {
    let height: bigint | null = null;
    try {
      height = await steps.blockHeight();
    } catch {
      /* unknown */
    }
    let status: TxStatus | null = null;
    try {
      status = await steps.status(signature);
    } catch {
      /* unknown */
    }
    if (status === 'finalized') return end({ kind: 'done', signature });
    if (status && status !== 'none' && status !== 'pending') return end(withSignature(describeLandedFailure(status.err, action), signature));
    if (status === 'none' && height !== null && height > steps.lastValidBlockHeight + BigInt(EXPIRY_MARGIN_BLOCKS)) nones++;
    else if (status !== null) nones = 0;
    if (nones >= 2) {
      return end({
        kind: 'expired',
        message: 'Your order expired before it reached the network. Nothing was spent. Try again to send a new one.',
        signature,
      });
    }
    if (!showedMaybe && waited >= steps.mayStillLandAfterMs) {
      showedMaybe = true;
      emit({ kind: 'mayStillLand', signature });
    }
    await steps.sleep(steps.pollMs);
    waited += steps.pollMs;
  }
}

/** Holds the live attempt, so a second start while one runs gets the same attempt (D13, D101). */
export function createTracker(onState: (s: TrackerState) => void) {
  let current: Promise<TrackerState> | null = null;
  return {
    start(steps: Steps): Promise<TrackerState> {
      if (current) return current;
      const attempt = runAttempt(steps, onState).finally(() => {
        current = null;
      });
      current = attempt;
      return attempt;
    },
    get live() {
      return current !== null;
    },
  };
}
