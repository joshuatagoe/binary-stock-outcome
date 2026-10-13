// The chain reader (D62): the only writer of rows that came from the chain. It lists the program's transactions newest first,
// decodes each one's events (chainEvents.ts) and stores them (eventStore.ts), and after a restart it goes on where it stopped.
//
// Where it stopped is two marks in `reader_state`, because a plain "newest signature I saw" loses data if the process dies
// halfway through a long catch-up (the newest page is in, older ones are not, and the next run would start above the gap):
//   - `frontier`: every transaction up to and including this signature is stored.
//   - `pending_head` and `pending_before`: a catch-up is under way. `pending_head` is the newest signature it began with and
//     `pending_before` the oldest it has stored, so a restart resumes below it. Each page and its mark are saved in one
//     database transaction, so a crash leaves the page whole or absent.
// When the walk reaches the frontier, `pending_head` becomes the frontier, and the reader looks again for anything newer.
import { backoffMs, isRateLimited, isTransient, type Clock } from './sendQueue.ts';
import { extractEvents } from './chainEvents.ts';
import type { Db } from './db.ts';
import { createEventStore } from './eventStore.ts';

/** A transaction as the reader needs it: the same fields whichever way it was fetched. */
export interface RawTx {
  signature: string;
  slot: bigint;
  /** Unix seconds; null when the node has none. */
  blockTime: number | null;
  /** Its place in its block (the node's transactionIndex); null when the node did not give it. */
  index: number | null;
  failed: boolean;
  logs: string[];
  /** Inner instructions by top-level instruction index, with their program and base58 data. */
  inner: { index: number; instructions: { programId: string; data: string }[] }[];
}

export interface SignatureInfo {
  signature: string;
  slot: bigint;
  failed: boolean;
}

/** Where transactions come from. `rpcChainSource` in chainSource.ts reads a node; tests supply a fake. */
export interface ChainSource {
  /** Signatures of transactions that touched the program, newest first, after `until` and before `before` (both exclusive). */
  getSignatures(query: { before?: string; until?: string; limit: number }): Promise<SignatureInfo[]>;
  /** Null when the node does not have it (yet, or any more). */
  getTransaction(signature: string): Promise<RawTx | null>;
}

export interface ChainReaderOptions {
  db: Db;
  source: ChainSource;
  /** The program's address. */
  program: string;
  /** §5: goes up by one at each devnet reset. */
  networkEpoch?: number;
  /** Signatures per page; a node allows up to 1000. Default 100. */
  pageSize?: number;
  /** Transactions fetched at once. Default 4. */
  concurrency?: number;
  clock?: Clock;
  random?: () => number;
  onProgress?: (progress: { page: number; transactions: number; events: number }) => void;
}

export interface CatchUpResult {
  /** Transactions fetched and read. */
  transactions: number;
  /** Event rows that were new. */
  events: number;
  pages: number;
}

const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) };
const RETRIES = 6;

export function createChainReader(options: ChainReaderOptions) {
  const { db, source, program, networkEpoch = 0, pageSize = 100, concurrency = 4, clock = realClock, random = Math.random, onProgress } = options;
  const store = createEventStore(db, { networkEpoch });
  const getMark = db.prepare('SELECT value FROM reader_state WHERE key = ?').pluck();
  const setMark = db.prepare('INSERT INTO reader_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value');
  const clearMark = db.prepare('DELETE FROM reader_state WHERE key = ?');
  const mark = (key: string) => (getMark.get(key) as string | undefined) ?? null;

  // A rate-limit reply or a dropped connection waits and asks again with growing, randomized waits (F3.19); the page is not lost.
  async function retried<T>(read: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await read();
      } catch (error) {
        if (attempt + 1 >= RETRIES || !(isRateLimited(error) || isTransient(error))) throw error;
        await clock.sleep(backoffMs(attempt, random));
      }
    }
  }

  async function fetchAll(signatures: string[]): Promise<RawTx[]> {
    const out: RawTx[] = new Array(signatures.length);
    let next = 0;
    const worker = async () => {
      while (next < signatures.length) {
        const i = next++;
        const signature = signatures[i]!;
        const tx = await retried(() => source.getTransaction(signature));
        if (!tx) throw new Error(`the node lists transaction ${signature} but cannot return it; the reader stays where it is and will try again`);
        // Without it, events of one slot could not be put in the order they happened; a null would be stored and never filled in.
        if (tx.index === null) throw new Error(`the node did not give transaction ${signature}'s position in its block; events of one slot could not be ordered, so the reader stays where it is`);
        out[i] = tx;
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, signatures.length) }, worker));
    return out;
  }

  // The walk reached the old frontier only if the node, asked for one signature below where the walk ended (with no `until`),
  // returns the frontier or something older. An empty answer proves nothing: Agave also answers [] for a signature it does not know.
  async function reachedFrontier(lastSignature: string, frontierSlot: bigint): Promise<boolean> {
    const below = await retried(() => source.getSignatures({ before: lastSignature, limit: 1 }));
    return below.length > 0 && below[0]!.slot <= frontierSlot;
  }

  // Rows stored before migration 0003 have no position. Their transactions are read again, a page at a time, and only the
  // position is written; the events themselves are never touched.
  const withoutPosition = db.prepare('SELECT DISTINCT signature FROM events WHERE tx_index IS NULL LIMIT ?').pluck();
  async function fillPositions(): Promise<number> {
    let filled = 0;
    for (;;) {
      const signatures = withoutPosition.all(pageSize) as string[];
      if (signatures.length === 0) return filled;
      const txs = await fetchAll(signatures);
      db.transaction(() => txs.forEach((tx) => store.addPosition(tx.signature, tx.index!)))();
      filled += txs.length;
    }
  }

  /**
   * Reads what the program has done that is not stored yet. One call walks from the newest transaction at its start down to the
   * stored frontier (plus, if it first had to finish a walk a crash cut short, one more walk for what came after that), then
   * returns; the caller schedules the next call. Safe at any time, and after a crash. Throws, keeping its place, when the walk ends
   * without reaching the frontier (a node that forgot a signature, or a devnet reset): the history below it is not proven stored.
   */
  async function catchUp(): Promise<CatchUpResult> {
    const result: CatchUpResult = { transactions: 0, events: 0, pages: 0 };
    await fillPositions();
    const resumed = mark('pending_head') !== null;

    for (let walk = 1; ; walk++) {
      const frontier = mark('frontier');
      const frontierSlot = mark('frontier_slot');
      let head = mark('pending_head');
      let headSlot = mark('pending_head_slot');
      let before = mark('pending_before');
      let sawAny = false;

      // Short pages are normal (`limit` is only a maximum), so the walk goes on until a page is empty.
      for (;;) {
        const page = await retried(() => source.getSignatures({ before: before ?? undefined, until: frontier ?? undefined, limit: pageSize }));
        if (page.length === 0) break;
        sawAny = true;
        if (head === null) [head, headSlot] = [page[0]!.signature, String(page[0]!.slot)];
        // A failed transaction wrote no events (the program's work was rolled back), and a signature can repeat across pages.
        const wanted = [...new Set(page.filter((p) => !p.failed).map((p) => p.signature))];
        const txs = await fetchAll(wanted);

        const last = page.at(-1)!.signature;
        let added = 0;
        db.transaction(() => {
          for (const tx of txs) added += store.addTransaction(tx, extractEvents(tx, program));
          setMark.run('pending_head', head!);
          setMark.run('pending_head_slot', headSlot!);
          setMark.run('pending_before', last);
        })();

        before = last;
        result.pages++;
        result.transactions += txs.length;
        result.events += added;
        onProgress?.({ page: result.pages, transactions: result.transactions, events: result.events });
      }

      if (head !== null) {
        if (frontier !== null && before !== null && !(await reachedFrontier(before, BigInt(frontierSlot ?? 0)))) {
          throw new Error(`the walk ended at ${before} without reaching the stored frontier ${frontier}; the node may not know it (a devnet reset?). Nothing was marked as caught up.`);
        }
        db.transaction(() => {
          setMark.run('frontier', head!);
          setMark.run('frontier_slot', headSlot!);
          clearMark.run('pending_head');
          clearMark.run('pending_head_slot');
          clearMark.run('pending_before');
        })();
      }
      // Only a walk that finished an old, cut-short one is followed by a second, for what arrived since; otherwise it returns now.
      if (!resumed || walk >= 2 || (!sawAny && head === null)) return result;
    }
  }

  return { catchUp };
}

export type ChainReader = ReturnType<typeof createChainReader>;
