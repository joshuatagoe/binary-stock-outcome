// The close-time jobs (D37, D97, D99, D146), as one job of the repeatable check. Once a market's orders close, it sweeps the
// book until no order rests (the program takes up to 28 a call), then returns every balance left in the book to its owner.
//
// It keeps no memory of what it sent. Each pass reads the book from the chain and sends only what the book still needs, so a
// restart, a second pass and the standby's takeover are one case (D97): a sweep that landed has already emptied its orders, and a
// return that landed has already zeroed its balance. The program makes a repeat harmless as well: a sweep of an empty book
// writes nothing, and a return with nothing to return is refused with InvalidQuantity, which counts as done (D146).
// The one thing stored is a mark that a market is finished, so the finished ones are not read again every 30 seconds; losing it
// costs one read. The mark lives in `reader_state`, so no new table is needed.
import type { Db } from './db.ts';

export interface Balance {
  owner: string;
  /** In base units: USDC 6 decimals, Yes and No whole tokens. */
  usdc: bigint;
  yes: bigint;
  no: bigint;
}

export interface BookState {
  /** Orders resting in the book, both sides. */
  orders: number;
  /** Owners with something waiting in the book (all three amounts are not zero together). */
  balances: Balance[];
}

/** What the jobs need of the chain. `closeChain.ts` is the real one; a test supplies a fake. */
export interface CloseChain {
  /** The chain's own clock in Unix seconds: the program judges the close by it. */
  chainTime(): Promise<number>;
  /** Null when the market's book account no longer exists (Close book, D50). */
  readBook(market: string): Promise<BookState | null>;
  /** One Sweep transaction, through the send queue. Resolves when it has landed. */
  sweep(market: string): Promise<void>;
  /** Return to owner for one owner, through the send queue; re-creates a closed token account first (D99). Nothing to return counts as done. */
  returnToOwner(market: string, balance: Balance): Promise<void>;
}

export interface CloseJobsOptions {
  db: Db;
  chain: CloseChain;
  now?: () => Date;
  /** Seconds before the stored close at which orders stop (D102). Default 5; Config's `ordersCloseBeforeSecs` on chain. */
  ordersCloseBeforeSecs?: number;
  /** §5: the epoch of the markets this backend looks after. */
  networkEpoch?: number;
  /** Returns in flight at once; each is its own transaction. Default 4. */
  returnConcurrency?: number;
  onStep?: (step: { market: string; step: 'sweep' | 'return' | 'done'; [key: string]: unknown }) => void;
}

export interface CloseSummary {
  /** Markets whose orders have closed and are not yet finished, looked at in this pass. */
  markets: number;
  sweeps: number;
  returns: number;
  /** Markets that ended this pass with an empty book and nothing owed. */
  finished: number;
}

/** A book holds at most 128 orders and a call takes 28, so more calls than this means the sweep is not working. */
const MAX_SWEEPS_PER_MARKET = 12;

export function createCloseJobs(options: CloseJobsOptions) {
  const { db, chain, now = () => new Date(), ordersCloseBeforeSecs = 5, networkEpoch = 0, returnConcurrency = 4, onStep } = options;
  const unfinished = db.prepare(
    `SELECT market, close_at FROM markets
     WHERE network_epoch = ? AND NOT EXISTS (SELECT 1 FROM reader_state WHERE key = 'close_done:' || markets.market)
     ORDER BY close_at, market`,
  );
  const markFinished = db.prepare(`INSERT INTO reader_state (key, value) VALUES ('close_done:' || ?, ?) ON CONFLICT (key) DO NOTHING`);

  async function closeMarket(market: string, summary: CloseSummary): Promise<void> {
    let book = await chain.readBook(market);
    for (let calls = 0; book !== null && book.orders > 0; calls++) {
      if (calls >= MAX_SWEEPS_PER_MARKET) throw new Error(`${calls} sweeps have not emptied the book (${book.orders} orders left)`);
      const before = book.orders;
      await chain.sweep(market);
      summary.sweeps++;
      onStep?.({ market, step: 'sweep', ordersBefore: before });
      book = await chain.readBook(market);
      if (book !== null && book.orders >= before) throw new Error(`a sweep landed but did not take any order off the book (${before} before, ${book.orders} after)`);
    }

    // Returns come after the last sweep, since each sweep credits more balances. Different owners' returns do not depend on each other.
    const failures: unknown[] = [];
    const owed = book?.balances ?? [];
    for (let i = 0; i < owed.length; i += returnConcurrency) {
      const results = await Promise.allSettled(
        owed.slice(i, i + returnConcurrency).map(async (balance) => {
          await chain.returnToOwner(market, balance);
          summary.returns++;
          onStep?.({ market, step: 'return', owner: balance.owner });
        }),
      );
      for (const r of results) if (r.status === 'rejected') failures.push(r.reason);
    }
    if (failures.length > 0) throw failures.length === 1 ? failures[0] : new AggregateError(failures, `${failures.length} returns failed (first: ${failures[0] instanceof Error ? failures[0].message : String(failures[0])})`);

    // Finished only when the chain shows an empty book with nothing owed, never because the sends went well.
    const after = owed.length > 0 ? await chain.readBook(market) : book;
    if (after === null || (after.orders === 0 && after.balances.length === 0)) {
      markFinished.run(market, now().toISOString());
      summary.finished++;
      onStep?.({ market, step: 'done' });
    }
  }

  /** One pass. Markets are independent: a failure in one is reported after the others have been looked after. */
  async function run(): Promise<CloseSummary> {
    const summary: CloseSummary = { markets: 0, sweeps: 0, returns: 0, finished: 0 };
    const t = now().getTime();
    const due = (unfinished.all(networkEpoch) as { market: string; close_at: string }[]).filter((m) => t >= Date.parse(m.close_at) - ordersCloseBeforeSecs * 1000);
    if (due.length === 0) return summary;

    // The backend's clock chooses the markets worth a look; the chain's clock decides, since the program does.
    const chainNow = await chain.chainTime();
    const failures: { market: string; error: unknown }[] = [];
    for (const { market, close_at } of due) {
      if (chainNow < Date.parse(close_at) / 1000 - ordersCloseBeforeSecs) continue;
      summary.markets++;
      try {
        await closeMarket(market, summary);
      } catch (error) {
        failures.push({ market, error });
      }
    }
    if (failures.length > 0) {
      const text = failures.map((f) => `${f.market}: ${f.error instanceof Error ? f.error.message : String(f.error)}`).join('; ');
      throw new AggregateError(failures.map((f) => f.error), `close jobs failed for ${text}`);
    }
    return summary;
  }

  return { run };
}

export type CloseJobs = ReturnType<typeof createCloseJobs>;
