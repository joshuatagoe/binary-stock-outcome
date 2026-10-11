// The repeatable check (D97), as a skeleton: each pass reads the chain's slot, and once a minute it logs a
// heartbeat with the genesis hash (D75), which is how a devnet reset shows (D19, §5). The jobs join it in M4.
// `progress()` feeds /api/health, which the standby watches (D98).
import type { Db } from './db.ts';

export type Progress = {
  lastPassAt: Date | null;
  chain: { slot: number; seenAt: Date } | null;
};

// Each read gets a signal that aborts it when it runs out of time.
type Read<T> = (signal: AbortSignal) => Promise<T>;

type Options = {
  db: Db;
  getSlot: Read<bigint>;
  getGenesisHash: Read<string>;
  provider: string;
  heartbeatEverySecs: number;
  readTimeoutMs?: number;
  now?: () => Date;
  onError?: (error: unknown) => void;
};

// Ends a read after `ms`, even one that ignores its signal, so a server that never answers can't hold a pass.
function within<T>(ms: number, read: Read<T>): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`no answer within ${ms} ms`));
    }, ms);
  });
  return Promise.race([read(controller.signal), late]).finally(() => clearTimeout(timer));
}

export function createChecker(options: Options) {
  const { db, getSlot, getGenesisHash, provider, heartbeatEverySecs, readTimeoutMs = 10_000, now = () => new Date(), onError } = options;
  let lastPassAt: Date | null = null;
  let chain: Progress['chain'] = null;
  let lastHeartbeat = -Infinity;
  const insert = db.prepare('INSERT INTO heartbeats (at, provider, slot, genesis_hash) VALUES (?, ?, ?, ?)');

  // A failed read keeps the last chain progress; the pass itself still counts, since the backend is alive.
  async function pass() {
    try {
      const slot = Number(await within(readTimeoutMs, getSlot));
      const seenAt = now();
      chain = { slot, seenAt };
      if (seenAt.getTime() - lastHeartbeat >= heartbeatEverySecs * 1000) {
        const genesisHash = await within(readTimeoutMs, getGenesisHash);
        insert.run(seenAt.toISOString(), provider, slot, genesisHash);
        lastHeartbeat = seenAt.getTime();
      }
    } catch (error) {
      onError?.(error);
    }
    lastPassAt = now();
  }

  return { pass, progress: (): Progress => ({ lastPassAt, chain }) };
}
