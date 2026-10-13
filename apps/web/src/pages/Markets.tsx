// Markets (F3): today's contracts per stock, with prices from the book, read from the chain (ARCHITECTURE.md §7).
import { formatDollars } from '@meridian/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useChainConfig } from '../chain-config.tsx';
import { chanceText, contractsNotYet, dayWords, formatEt, marketState, pickDay, pricePair, type MarketState } from '../markets.ts';
import { CHAIN } from '../network.ts';
import { newYorkDay, useNow } from '../now.ts';
import { chainRpc } from '../read-config.ts';
import { readMarketList, type MarketRow } from '../read-markets.ts';

const Chain = CHAIN.name[0]!.toUpperCase() + CHAIN.name.slice(1);
const REFRESH_MS = 10_000;

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; rows: MarketRow[] };

export const PAUSED_WORDS = 'Trading is paused by the admin. You can still cancel orders, close pairs and redeem.';

export function Markets() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const now = useNow();
  const { config } = useChainConfig();
  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const read = (first: boolean) =>
      readMarketList(chainRpc, controller.signal).then(
        (rows) => setState({ kind: 'ready', rows }),
        (error) => {
          if (controller.signal.aborted) return;
          console.error(`Reading the markets from ${CHAIN.name} failed:`, error);
          // A refresh that fails keeps what is on screen; only the first read has nothing to keep.
          if (first) setState({ kind: 'error' });
        },
      );
    setState({ kind: 'loading' });
    void read(true);
    const timer = setInterval(() => void read(false), REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [attempt]);

  const today = newYorkDay(now);
  const shown = state.kind === 'ready' ? pickDay(state.rows.map((r) => ({ ...r, day: r.market.day })), today) : null;
  // Before 9:00 AM ET the morning's contracts are not there yet, whatever an earlier day left behind (F3).
  const early = shown !== null && shown.day !== today && contractsNotYet(today, now);

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>
        Markets
      </h1>
      <p role="status" className={state.kind === 'loading' ? undefined : 'sr-only'}>
        {state.kind === 'loading' && `Reading the markets from ${CHAIN.name}…`}
        {state.kind === 'ready' && `Read ${state.rows.length} markets from ${CHAIN.name}.`}
      </p>
      {config.kind === 'ready' && config.paused && (
        <p role="note" className="notice danger">
          {PAUSED_WORDS}
        </p>
      )}
      {state.kind === 'error' && (
        <div role="alert" className="notice danger">
          <p>{`${Chain} didn't answer, so the markets can't be shown right now. This page only reads.`}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {early && (
        <p role="note" className="notice warn">
          Today's contracts appear at 9:00 AM ET.
        </p>
      )}
      {shown && shown.day === null && !early && (
        <section className="card" aria-labelledby="none-heading">
          <h2 id="none-heading">No markets yet</h2>
          <p>{`There are no markets on ${CHAIN.name} right now. Today's contracts appear at 9:00 AM ET on trading days.`}</p>
          <p className="muted">Each market asks one question about one stock on one day, such as “Will META close at or above $680 today?”</p>
        </section>
      )}
      {shown && shown.day !== null && (
        <Day day={shown.day} isToday={shown.isToday} rows={shown.rows} now={now} early={early} />
      )}
    </>
  );
}

function Day({ day, isToday, rows, now, early }: { day: number; isToday: boolean; rows: (MarketRow & { day: number })[]; now: number; early: boolean }) {
  const byTicker = new Map<string, typeof rows>();
  for (const r of rows) byTicker.set(r.market.ticker, [...(byTicker.get(r.market.ticker) ?? []), r]);
  const first = rows[0]!.market;
  return (
    <>
      <p className="lede">
        {isToday ? `Today's contracts, ${dayWords(day)}.` : `${early ? '' : 'No markets today. '}These are from the last trading day with markets, ${dayWords(day)}.`}
        {now < first.mintOpen && isToday ? ` Minting opens at ${formatEt(first.mintOpen)}.` : ''}
      </p>
      {[...byTicker].map(([ticker, list]) => (
        <section key={ticker} className="card" aria-labelledby={`stock-${ticker}`}>
          <h2 id={`stock-${ticker}`}>{ticker}</h2>
          <p className="muted">{`${list.length} contract${list.length === 1 ? '' : 's'} ${isToday ? 'today' : 'that day'}`}</p>
          <ul className="contracts" aria-labelledby={`stock-${ticker}`}>
            {list.map((r) => (
              <li key={r.market.address}>
                <Contract row={r} state={marketState(r.market, now)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Contract({ row, state }: { row: MarketRow; state: MarketState }) {
  const { market, levels } = row;
  const strike = formatDollars(market.strikeCents, { dropZeroCents: true });
  const chance = chanceText(levels);
  const pair = pricePair(chance);
  // Whole values with their units for a screen reader (D84): "Yes 65 cents, No 35 cents, 65 percent chance".
  const spoken = chance.yes === null ? chance.text : `Yes ${chance.yes} cents, No ${chance.no} cents, ${chance.yes} percent chance`;
  return (
    <Link className="contract" to={`/trade?market=${market.slug}`} aria-label={`${market.ticker} ${strike} or above. ${spoken}. ${state.label}`}>
      <strong>{`${market.ticker} ${strike} or above`}</strong>
      <span className="mono">{pair ? `${pair} · ${chance.text}` : chance.text}</span>
      <span className={`pill state-${state.kind}`}>{state.label}</span>
    </Link>
  );
}
