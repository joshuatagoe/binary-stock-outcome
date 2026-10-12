// A clock the test moves: `sleep` parks until `drive` advances time to the earliest sleeper. Real timers are never used,
// so a minute of backoff runs in milliseconds and the order of events is exact.
export function createFakeClock(start = 0) {
  let now = start;
  const sleepers: { at: number; seq: number; resolve: () => void }[] = [];
  let seq = 0;
  const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

  return {
    now: () => now,
    sleep: (ms: number) =>
      new Promise<void>((resolve) => {
        sleepers.push({ at: now + Math.max(0, ms), seq: seq++, resolve });
      }),
    /** Runs time forward until the promise settles; fails if everything is asleep forever. */
    async drive<T>(promise: Promise<T>): Promise<T> {
      let settled = false;
      promise.then(() => (settled = true), () => (settled = true));
      for (;;) {
        for (let i = 0; i < 5; i++) await tick();
        if (settled) return promise;
        // Work that takes real turns of the event loop (a slow read) may still be running: give it time before calling it a deadlock.
        for (let i = 0; i < 500 && !settled && sleepers.length === 0; i++) await tick();
        if (settled) return promise;
        sleepers.sort((a, b) => a.at - b.at || a.seq - b.seq);
        const next = sleepers.shift();
        const together = next ? sleepers.splice(0, sleepers.length, ...sleepers.filter((s) => s.at !== next.at)).filter((s) => s.at === next.at) : [];
        if (!next) throw new Error('deadlock: nothing is asleep and the promise has not settled');
        now = Math.max(now, next.at);
        next.resolve();
        for (const s of together) s.resolve();
      }
    },
  };
}
