// Live attempts, held above the page (D13, D101). Leaving the page, or reloading it, during "sent, may still land" must not
// let the trader start a second order while the first can still land, and a filled Market order's ID isn't kept on chain
// (D138). So an attempt runs in this module, not in a component, and once its transaction is signed its signature is saved
// for this tab; a page that comes back resumes watching that signature.
import { useSyncExternalStore } from 'react';
import { runAttempt, watch, type Steps, type TrackerState } from './tracker.ts';

export type AttemptView = { state: TrackerState; result: string | null; meta?: unknown };

export const FOREIGN_WALLET_WORDS = 'An earlier order from another wallet landed. Check your balances.';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type Saved = { signature: string; lastValidBlockHeight: string; owner?: string; meta: unknown };

const IDLE: AttemptView = { state: { kind: 'idle' }, result: null };
const KEY = (market: string) => `meridian-attempt:${market}`;

export function createAttempts(storage: Store | null) {
  const views = new Map<string, AttemptView>();
  const running = new Map<string, Promise<TrackerState>>();
  const listeners = new Map<string, Set<() => void>>();

  const publish = (key: string, view: AttemptView) => {
    views.set(key, view);
    listeners.get(key)?.forEach((l) => l());
  };
  const save = (key: string, value: Saved) => {
    try {
      storage?.setItem(KEY(key), JSON.stringify(value));
    } catch {
      /* the attempt just is not saved */
    }
  };
  const forget = (key: string) => {
    try {
      storage?.removeItem(KEY(key));
    } catch {
      /* as above */
    }
  };
  const load = (key: string): Saved | null => {
    try {
      const text = storage?.getItem(KEY(key));
      return text ? (JSON.parse(text) as Saved) : null;
    } catch {
      return null;
    }
  };

  const track = (
    key: string,
    work: (emit: (s: TrackerState) => void) => Promise<TrackerState>,
    finalize: (final: TrackerState) => Promise<string | null>,
    meta?: unknown,
  ) => {
    publish(key, { state: { kind: 'checking' }, result: null, meta });
    const promise = (async () => {
      const final = await work((state) => publish(key, { state, result: null, meta }));
      forget(key);
      let result: string | null = null;
      try {
        result = await finalize(final);
      } catch {
        /* the done message then falls back to the balances */
      }
      publish(key, { state: final, result, meta });
      return final;
    })().finally(() => running.delete(key));
    running.set(key, promise);
    return promise;
  };

  return {
    get: (key: string): AttemptView => views.get(key) ?? IDLE,
    subscribe(key: string, listener: () => void) {
      const set = listeners.get(key) ?? new Set<() => void>();
      set.add(listener);
      listeners.set(key, set);
      return () => void set.delete(listener);
    },
    isLive: (key: string) => running.has(key),
    /** Starts an attempt, or returns the one already live for this market. */
    run(key: string, o: { steps: Steps; meta: unknown; owner?: string; finalize: (final: TrackerState) => Promise<string | null> }): Promise<TrackerState> {
      const live = running.get(key);
      if (live) return live;
      const steps: Steps = {
        ...o.steps,
        get lastValidBlockHeight() {
          return o.steps.lastValidBlockHeight;
        },
        get tradeIndex() {
          return o.steps.tradeIndex;
        },
        signatureOf: (signed) => {
          const signature = o.steps.signatureOf(signed);
          save(key, { signature, lastValidBlockHeight: String(o.steps.lastValidBlockHeight), owner: o.owner, meta: o.meta });
          return signature;
        },
      };
      return track(key, (emit) => runAttempt(steps, emit), o.finalize, o.meta);
    },
    /** After a reload: watches the saved signature, if there is one and nothing is live. Null otherwise. */
    resume(
      key: string,
      o: { owner?: string; stepsFor: (saved: Saved) => Steps; finalize: (final: TrackerState, saved: Saved) => Promise<string | null> },
    ): Promise<TrackerState> | null {
      const live = running.get(key);
      if (live) return live;
      const saved = load(key);
      if (!saved) return null;
      const steps = o.stepsFor(saved);
      return track(
        key,
        (emit) => {
          emit({ kind: 'sending' });
          return watch(steps, saved.signature, emit);
        },
        // Another wallet's order is still watched (it can still land), but its amounts are not this wallet's to word.
        async (final) =>
          saved.owner !== undefined && o.owner !== undefined && saved.owner !== o.owner
            ? final.kind === 'done'
              ? FOREIGN_WALLET_WORDS
              : null
            : o.finalize(final, saved),
        saved.meta,
      );
    },
    saved: load,
    clear(key: string) {
      if (!running.has(key)) publish(key, IDLE);
    },
  };
}

export const attempts = createAttempts(
  (() => {
    try {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
      return null;
    }
  })(),
);

export function useAttempt(key: string): AttemptView {
  return useSyncExternalStore(
    (listener) => attempts.subscribe(key, listener),
    () => attempts.get(key),
  );
}
