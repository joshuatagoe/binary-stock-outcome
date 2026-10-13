// Trade (F4 to F7): one market's book, and the ticket for the four buttons. The page names its market in its address
// (D72). All four buttons go through the transaction tracker (D13): Buy Yes and Sell Yes send Place order, Buy No and Sell
// No their own instructions (D143; market orders only, M5-b). Until the new program is on devnet (M3, P31) devnet's
// simulation refuses the No buttons before the wallet opens, and the page says so in plain words. Attempts live above the
// page (attempts.ts), so leaving it during "may still land" can't lead to a second order.
import { formatCents, formatDollars, formatUsdc, marketAddress, type TradeAction } from '@meridian/shared';
import type { Address } from '@solana/kit';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { attempts, useAttempt, type Saved } from '../attempts.ts';
import { useChainConfig } from '../chain-config.tsx';
import { isLive, type TrackerState } from '../tracker.ts';
import { liveSteps } from '../send.ts';
import { dayWords, marketState, parseMarketSlug, quotes, type Levels, type MarketView } from '../markets.ts';
import { CHAIN } from '../network.ts';
import { useNow } from '../now.ts';
import { describeLanded, type Balances } from '../outcome.ts';
import { chainRpc } from '../read-config.ts';
import { readBalances, readLanded, readMarket, readResting } from '../read-markets.ts';
import { actionName, isBuy, largeOrderConfirm, planLimit, planTicket, sameOrder, TRADE_ACTIONS } from '../ticket.ts';
import { buildTrade, newOrderId, traderTokenAccounts, marketMints } from '../trade-tx.ts';
import { useWallet } from '../wallet.tsx';
import { PAUSED_WORDS } from './Markets.tsx';

const REFRESH_MS = 5000;

type Load =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'ready'; market: MarketView; levels: Levels };

export function Trade() {
  const [params] = useSearchParams();
  const slug = params.get('market') ?? '';
  const parsed = useMemo(() => parseMarketSlug(slug), [slug]);
  if (!parsed) {
    return (
      <>
        <h1>Market not found</h1>
        <p role="alert" className="notice danger">
          {slug ? `“${slug}” isn't a market address.` : "This page needs a market address, such as /trade?market=META-680-2026-10-08."}
        </p>
        <p>
          <Link to="/markets">Browse the markets</Link>
        </p>
      </>
    );
  }
  return <Market key={slug} parsed={parsed} slug={slug} />;
}

function Market({ parsed, slug }: { parsed: NonNullable<ReturnType<typeof parseMarketSlug>>; slug: string }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const now = useNow(5000);
  const { refresh } = useChainConfig();

  useEffect(() => {
    let cancelled = false;
    marketAddress(parsed.ticker, parsed.day, parsed.strikeCents).then(
      (a) => !cancelled && setAddress(a),
      // An address the program could never have made (a strike too large for its seed) is simply not a market.
      () => !cancelled && setLoad({ kind: 'missing' }),
    );
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  const readNow = useRef<() => void>(() => {});
  useEffect(() => {
    if (!address) return;
    const controller = new AbortController();
    const read = (first: boolean) => {
      refresh(); // the pause flag is re-read on the same poll as the book
      return readMarket(chainRpc, address, controller.signal).then(
        (row) => !controller.signal.aborted && setLoad(row ? { kind: 'ready', ...row } : { kind: 'missing' }),
        (error) => {
          if (controller.signal.aborted) return;
          console.error(`Reading the market from ${CHAIN.name} failed:`, error);
          if (first) setLoad({ kind: 'error' });
        },
      );
    };
    readNow.current = () => void read(false);
    setLoad((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }));
    void read(true);
    const timer = setInterval(() => void read(false), REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [address, attempt, refresh]);

  const strike = formatDollars(parsed.strikeCents, { dropZeroCents: true });
  const title = `${parsed.ticker} ${strike} or above`;

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>
        {title}
      </h1>
      <p role="status" className={load.kind === 'loading' ? undefined : 'sr-only'}>
        {load.kind === 'loading' ? `Reading the market from ${CHAIN.name}…` : ''}
      </p>
      {load.kind === 'error' && (
        <div role="alert" className="notice danger">
          <p>{`${CHAIN.name[0]!.toUpperCase()}${CHAIN.name.slice(1)} didn't answer, so this market can't be shown right now. This page only reads until it does.`}</p>
          <button
            type="button"
            onClick={() => {
              heading.current?.focus();
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
      {load.kind === 'missing' && (
        <div className="notice danger" role="alert">
          <p>{`There is no ${title} market on ${CHAIN.name} for ${dayWords(parsed.day)}. Markets are created each morning, so it may not exist yet, or the address may be wrong.`}</p>
          <p>
            <Link to="/markets">Browse the markets</Link>
          </p>
        </div>
      )}
      {load.kind === 'ready' && <Ready market={load.market} levels={load.levels} now={now} title={title} slug={slug} onChanged={() => readNow.current()} />}
    </>
  );
}

function Ready({ market, levels, now, title, slug, onChanged }: { market: MarketView; levels: Levels; now: number; title: string; slug: string; onChanged: () => void }) {
  const state = marketState(market, now);
  const q = quotes(levels);
  const price = (label: string, cents: number | null) => (cents === null ? `${label}: no quotes yet` : `${label} ${formatCents(cents)}`);
  const spoken = (label: string, cents: number | null) => (cents === null ? `${label}: no quotes yet` : `${label} ${cents} cents`);
  return (
    <>
      <p>
        <span className={`pill state-${state.kind}`}>{state.label}</span>
      </p>
      <section className="card" aria-labelledby="prices-heading">
        <h2 id="prices-heading">Prices</h2>
        <ul className="quotes">
          {(
            [
              ['Buy Yes', q.buyYes],
              ['Sell Yes', q.sellYes],
              ['Buy No', q.buyNo],
              ['Sell No', q.sellNo],
            ] as const
          ).map(([label, cents]) => (
            <li key={label} className="mono" aria-label={spoken(label, cents)}>
              {price(label, cents)}
            </li>
          ))}
        </ul>
      </section>
      <BookTable levels={levels} />
      <TicketPanel market={market} levels={levels} state={state} title={title} slug={slug} onChanged={onChanged} />
    </>
  );
}

function BookTable({ levels }: { levels: Levels }) {
  const empty = levels.asks.length === 0 && levels.bids.length === 0;
  return (
    <section className="card" aria-labelledby="book-heading">
      <h2 id="book-heading">Order book</h2>
      {empty ? (
        <p>
          <strong>No quotes yet.</strong> Nobody is offering or bidding on this market. A limit order starts the book.
        </p>
      ) : (
        <div className="book-scroll">
          <table className="book">
            <caption className="sr-only">Yes contracts: asks from the highest price down, then bids from the highest price down</caption>
            <thead>
              <tr>
                <th scope="col">Side</th>
                <th scope="col">Price</th>
                <th scope="col">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {[...levels.asks].reverse().map(([p, n]) => (
                <tr key={`a${p}`} className="ask">
                  <th scope="row">Ask</th>
                  <td className="mono" aria-label={`${p} cents`}>{formatCents(p)}</td>
                  <td className="mono">{n}</td>
                </tr>
              ))}
              {levels.bids.map(([p, n]) => (
                <tr key={`b${p}`} className="bid">
                  <th scope="row">Bid</th>
                  <td className="mono" aria-label={`${p} cents`}>{formatCents(p)}</td>
                  <td className="mono">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type Mode = 'Market' | 'Limit';

// What an attempt remembers about its order, saved with the signature so a resumed attempt can word its result.
type Meta = {
  action: TradeAction;
  quantity: number;
  kind: Mode;
  sendPriceCents: number;
  worst: number;
  orderId: string;
};

function TicketPanel({
  market,
  levels,
  state,
  title,
  slug,
  onChanged,
}: {
  market: MarketView;
  levels: Levels;
  state: ReturnType<typeof marketState>;
  title: string;
  slug: string;
  onChanged: () => void;
}) {
  const wallet = useWallet();
  const { config } = useChainConfig();
  const [action, setAction] = useState<TradeAction>('buyYes');
  const [quantityText, setQuantityText] = useState('10');
  const [mode, setMode] = useState<Mode>('Market');
  const [limitText, setLimitText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [held, setHeld] = useState<Balances | null>(null);
  // Attempts are keyed by the market's address, not by how the page was addressed (E), and saved with the wallet that made them (D).
  const key = market.address as string;
  const { state: tracked, result, meta: attemptMeta } = useAttempt(key);
  const status = useRef<HTMLDivElement>(null);
  const quantityInput = useRef<HTMLInputElement>(null);
  const orderId = useRef<bigint | null>(null);

  const usdcMint = config.kind === 'ready' ? config.usdcMint : null;
  const owner = wallet.address;

  const readHeld = useCallback(
    async (signal?: AbortSignal): Promise<Balances | null> => {
      if (!owner || !usdcMint) return null;
      const t = await traderTokenAccounts(owner, market.address, usdcMint);
      const b = await readBalances(chainRpc, [t.usdc, t.yes, t.no], owner, signal ?? new AbortController().signal);
      return { usdc: b.usdc, yes: b.yes, no: b.no };
    },
    [owner, usdcMint, market.address],
  );

  useEffect(() => {
    if (!owner || !usdcMint) {
      setHeld(null);
      return;
    }
    const controller = new AbortController();
    const read = () => readHeld(controller.signal).then((b) => !controller.signal.aborted && setHeld(b), () => {});
    void read();
    const timer = setInterval(read, 10_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [owner, usdcMint, readHeld]);

  // The done message is worded from the landed transaction itself: the trader's own token movements and the program's events (C).
  const finalize = useCallback(
    async (final: TrackerState, meta: Meta, signature?: string): Promise<string | null> => {
      if (final.kind === 'already-placed') onChanged();
      if (final.kind !== 'done' || !owner || !usdcMint) return null;
      const sig = signature ?? ('signature' in final ? final.signature : undefined);
      const mints = await marketMints(market.address);
      const landed = sig ? await readLanded(chainRpc, sig, { owner, usdcMint, ...mints }) : null;
      let resting: number | null = null;
      if (meta.kind === 'Limit') {
        try {
          resting = await readResting(chainRpc, market.address, owner, BigInt(meta.orderId), new AbortController().signal);
        } catch {
          /* unknown */
        }
      }
      try {
        setHeld(await readHeld());
      } catch {
        /* the next poll shows it */
      }
      wallet.refreshFunds();
      onChanged();
      return describeLanded({
        action: meta.action,
        kind: meta.kind,
        quantity: meta.quantity,
        worstCents: meta.worst,
        priceCents: meta.sendPriceCents,
        resting,
        delta: landed?.delta ?? null,
        selfTrades: landed?.selfTrades ?? [],
        fills: landed?.fills,
        pairsMinted: landed?.pairsMinted,
        pairsClosed: landed?.pairsClosed,
      });
    },
    [owner, usdcMint, readHeld, market.address, wallet, onChanged],
  );

  // A page that comes back (or a reload) during "sent, may still land" picks up the saved attempt and watches its signature.
  useEffect(() => {
    if (!owner || !usdcMint) return;
    void attempts.resume(key, {
      owner,
      stepsFor: (saved: Saved) => ({
        ...liveSteps({ rpc: chainRpc, action: (saved.meta as Meta).action, build: async () => Promise.reject(new Error('resumed')) }),
        lastValidBlockHeight: BigInt(saved.lastValidBlockHeight),
      }),
      finalize: (final, saved) => finalize(final, saved.meta as Meta, saved.signature),
    });
  }, [owner, usdcMint, key, finalize]);

  // A saved or live attempt puts its order back on the ticket, so Try again and the ticket say the same thing (B).
  const restored = useRef(false);
  useEffect(() => {
    const m = attemptMeta as Meta | undefined;
    if (restored.current || !m || tracked.kind === 'done') return;
    restored.current = true;
    setAction(m.action);
    setQuantityText(String(m.quantity));
    setMode(m.kind);
    if (m.kind === 'Limit') setLimitText(String(m.sendPriceCents));
  }, [attemptMeta]);

  const quantity = Number(quantityText);
  const limitCents = Number(limitText);
  const yesAction = action === 'buyYes' || action === 'sellYes';
  const effectiveMode: Mode = yesAction ? mode : 'Market';
  const usdc = held?.usdc ?? wallet.funds?.usdc ?? null;

  // A changed ticket is a new order: it gets a new ID, and a pending confirm is withdrawn (D101).
  useEffect(() => {
    if (!attempts.isLive(key)) orderId.current = null;
    setConfirming(false);
  }, [action, quantityText, mode, limitText, key]);

  const marketPlan = planTicket({
    action,
    book: levels,
    quantity,
    usdc,
    held: held ? (action === 'sellYes' ? held.yes : held.no) : null,
    ticker: market.ticker,
    strikeCents: market.strikeCents,
  });
  const limit = planLimit({ action, quantity, priceCents: limitCents, usdc });
  type Plan = { ok: false; message: string } | { ok: true; sendPriceCents: number; payoff: string; limitLine: string; blocked: string | null; worstCents: number; totalCents: number };
  const plan: Plan =
    effectiveMode === 'Limit'
      ? limit.ok
        ? { ...limit, worstCents: limit.sendPriceCents, totalCents: limit.sendPriceCents * quantity }
        : limit
      : marketPlan.ok
        ? { ...marketPlan, worstCents: marketPlan.traderCents }
        : marketPlan;

  const live = isLive(tracked);
  const paused = config.kind === 'ready' && config.paused;
  const tradable = state.tradable && !paused;
  // The status words as USERS.md writes them.
  const stateWords = paused ? PAUSED_WORDS : state.label;

  // Focus stays on the status line through an attempt and after it (§7): the button that was pressed disables itself.
  useEffect(() => {
    if (tracked.kind !== 'idle') status.current?.focus();
  }, [tracked.kind]);

  const confirmText =
    plan.ok && isBuy(action)
      ? largeOrderConfirm({
          action,
          quantity,
          totalCents: plan.totalCents,
          offered: yesAction ? levels.asks.filter(([p]) => p <= plan.sendPriceCents).reduce((n, [, size]) => n + size, 0) : undefined,
          priceCents: plan.sendPriceCents,
        })
      : null;

  const send = async () => {
    if (!plan.ok || !wallet.signer || !usdcMint || attempts.isLive(key)) return;
    const trader = wallet.signer;
    setConfirming(false);
    orderId.current ??= newOrderId();
    const id = orderId.current;
    const meta: Meta = { action, quantity, kind: effectiveMode, sendPriceCents: plan.sendPriceCents, worst: plan.worstCents, orderId: String(id) };
    const steps = liveSteps({
      rpc: chainRpc,
      action,
      build: (lifetime) =>
        buildTrade({ action, trader, market: market.address, usdcMint, quantity, sendPriceCents: meta.sendPriceCents, kind: effectiveMode, orderId: id, lifetime }),
    });
    const final = await attempts.run(key, { steps, meta, owner: owner ?? undefined, finalize: (f) => finalize(f, meta) });
    // An expired order never landed, so its ID may be used again; everything else is finished with its ID (D13, D101).
    if (final.kind !== 'expired' && final.kind !== 'failed') orderId.current = null;
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (confirmText && !confirming) {
      setConfirming(true);
      return;
    }
    void send();
  };

  const blocked = plan.ok ? plan.blocked : null;
  const reason = !tradable ? stateWords : !plan.ok ? plan.message : blocked;
  const name = actionName(action);

  return (
    <section className="card" aria-labelledby="ticket-heading">
      <h2 id="ticket-heading">Ticket</h2>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={live}>
          <legend>What do you want to do?</legend>
          <div className="choices" role="radiogroup" aria-label="Action">
            {TRADE_ACTIONS.map((a) => (
              <label key={a} className={`choice ${a === action ? 'selected' : ''}`}>
                <input type="radio" name="action" value={a} checked={a === action} onChange={() => setAction(a)} />
                {actionName(a)}
              </label>
            ))}
          </div>
          {yesAction && (
            <div className="choices" role="radiogroup" aria-label="Order type">
              {(['Market', 'Limit'] as const).map((m) => (
                <label key={m} className={`choice ${m === effectiveMode ? 'selected' : ''}`}>
                  <input type="radio" name="mode" value={m} checked={m === effectiveMode} onChange={() => setMode(m)} />
                  {m}
                </label>
              ))}
            </div>
          )}
          <p>
            <label>
              Quantity{' '}
              <input ref={quantityInput} type="number" inputMode="numeric" min={1} step={1} value={quantityText} onChange={(e) => setQuantityText(e.target.value)} aria-describedby="ticket-summary" />
            </label>
          </p>
          {effectiveMode === 'Limit' && (
            <p>
              <label>
                {isBuy(action) ? 'Pay at most (cents each)' : 'Receive at least (cents each)'}{' '}
                <input type="number" inputMode="numeric" min={1} max={99} step={1} value={limitText} onChange={(e) => setLimitText(e.target.value)} />
              </label>
            </p>
          )}
        </fieldset>

        <div id="ticket-summary" className="summary">
          {tradable && plan.ok && (
            <>
              <p>{plan.payoff}</p>
              <p className="mono">{plan.limitLine}</p>
              <p className="muted">Network fee about 0.00001 SOL, plus a one-time deposit of about 0.002 SOL for each new Yes or No account.</p>
            </>
          )}
        </div>

        {reason && (
          <p id="ticket-reason" className="notice warn">
            {reason}
          </p>
        )}
        {config.kind === 'error' && <p className="notice danger">The settings could not be read, so orders are off for now. Reload to try again.</p>}

        {confirming && confirmText ? (
          <div role="group" aria-label="Confirm large order" className="notice warn">
            <p>{confirmText}</p>
            <p className="answers">
              <button type="submit">{name}</button>
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setConfirming(false);
                  quantityInput.current?.focus();
                }}
              >
                Back
              </button>
            </p>
          </div>
        ) : !wallet.address ? (
          <button type="button" onClick={() => wallet.setPanelOpen(true)}>
            Connect wallet
          </button>
        ) : !wallet.signer ? (
          <button type="button" disabled>
            {name}
          </button>
        ) : (
          <button type="submit" disabled={live || !tradable || !plan.ok || !!blocked || !usdcMint} aria-describedby={reason ? 'ticket-reason' : undefined}>
            {name}
          </button>
        )}
      </form>

      <Status
        tracked={tracked}
        result={result}
        statusRef={status}
        name={name}
        // Try again is the same order through the same checks (the confirm included); a changed ticket is a new order (B).
        canRetry={sameOrder(attemptMeta as Meta | null, { action, quantity, mode: effectiveMode, limitCents: limitCents })}
        retry={() => {
          // The button that was pressed removes itself, so focus moves to the status line first.
          status.current?.focus();
          submit();
        }}
      />

      {held && (
        <p className="muted" aria-label="Your tokens on this market">
          {`You hold ${held.yes} Yes and ${held.no} No on ${title}. USDC in your wallet: ${formatUsdc(held.usdc)}.`}
        </p>
      )}
    </section>
  );
}

function Status({
  tracked,
  result,
  statusRef,
  name,
  retry,
  canRetry,
}: {
  tracked: TrackerState;
  result: string | null;
  statusRef: React.RefObject<HTMLDivElement | null>;
  name: string;
  retry: () => void;
  canRetry: boolean;
}) {
  const link = (signature?: string) =>
    signature ? (
      <>
        {' '}
        <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}>View the transaction</a>
      </>
    ) : null;
  const blocking = ['refused', 'orders-closed', 'not-implemented', 'not-enough-usdc', 'no-sol', 'wrong-network', 'failed', 'expired', 'already-placed'].includes(tracked.kind);
  const polite =
    tracked.kind === 'checking'
      ? 'Checking your order on devnet…'
      : tracked.kind === 'awaitingWallet'
        ? 'Waiting for your wallet…'
        : tracked.kind === 'sending'
          ? 'Sending…'
          : tracked.kind === 'mayStillLand'
            ? 'Sent, may still land. This can take up to a minute. Don’t send it again.'
            : tracked.kind === 'closed'
              ? 'message' in tracked
                ? tracked.message
                : ''
              : tracked.kind === 'done'
                ? (result ?? `${name} landed.`)
                : '';
  return (
    <div ref={statusRef} tabIndex={-1} className="status-line">
      <div role="status" aria-live="polite" className={tracked.kind === 'done' ? 'notice ok' : polite ? 'notice' : undefined}>
        {polite}
        {(tracked.kind === 'done' || tracked.kind === 'mayStillLand') && link(tracked.signature)}
      </div>
      {blocking && 'message' in tracked && (
        <div role="alert" className="notice danger">
          <p>{tracked.message}</p>
          {link(tracked.signature)}
          {(tracked.kind === 'expired' || tracked.kind === 'failed' || tracked.kind === 'wrong-network') &&
            (canRetry ? (
              <button type="button" onClick={retry}>
                Try again
              </button>
            ) : (
              <p className="muted">Your ticket has changed since this order. Press {name} to place it as a new order.</p>
            ))}
        </div>
      )}
    </div>
  );
}
