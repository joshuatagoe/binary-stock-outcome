// Portfolio (F6, F13): the wallet's open orders and its positions, read straight from Solana (the wallet's token accounts and each
// market's book), so the money here stays right while our backend is down (§7, D16). Out of scope for now, and said on the page:
// each position's entry price and profit or loss, the Awaiting result and Settled sections, and History (they need the backend or M3).
import { formatDollars } from '@meridian/shared';
import type { Address } from '@solana/kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useChainConfig } from '../chain-config.tsx';
import { marketState, type MarketView } from '../markets.ts';
import { CHAIN } from '../network.ts';
import { useNow } from '../now.ts';
import { OpenOrders } from '../OpenOrders.tsx';
import { headerLine, heldWords, lockedUsdc, lockedYes, positionWords, type BookBalance } from '../orders.ts';
import { chainRpc } from '../read-config.ts';
import { readPortfolio, type Portfolio as PortfolioData, type PortfolioRow } from '../read-portfolio.ts';
import { useWallet } from '../wallet.tsx';

const REFRESH_MS = 10_000;
const Chain = CHAIN.name[0]!.toUpperCase() + CHAIN.name.slice(1);

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: PortfolioData };

const marketName = (m: MarketView) => `${m.ticker} ${formatDollars(m.strikeCents, { dropZeroCents: true })} or above`;

export function Portfolio() {
  const wallet = useWallet();
  const { config, reload } = useChainConfig();
  const owner = wallet.address;
  const usdcMint = config.kind === 'ready' ? config.usdcMint : null;
  const paused = config.kind === 'ready' && config.paused;
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // How many times the books have been read: a cancel's money has left the book once it has been read empty (D99).
  const [reads, setReads] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const readNow = useRef<() => void>(() => {});
  const now = useNow(5000);

  useEffect(() => {
    if (!owner || !usdcMint) return;
    const controller = new AbortController();
    const read = (first: boolean) =>
      readPortfolio(chainRpc, owner, usdcMint, controller.signal).then(
        (data) => {
          if (controller.signal.aborted) return;
          setLoad({ kind: 'ready', data });
          setReads((n) => n + 1);
        },
        (error) => {
          if (controller.signal.aborted) return;
          console.error(`Reading the portfolio from ${CHAIN.name} failed:`, error);
          // A refresh that fails keeps what is on screen; only the first read has nothing to keep.
          if (first) setLoad({ kind: 'error' });
        },
      );
    readNow.current = () => void read(false);
    setLoad({ kind: 'loading' });
    void read(true);
    const timer = setInterval(() => void read(false), REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [owner, usdcMint, attempt]);

  const retry = useCallback(() => {
    heading.current?.focus();
    setAttempt((n) => n + 1);
  }, []);
  const onChanged = useCallback(() => readNow.current(), []);

  const data = load.kind === 'ready' ? load.data : null;
  const balances = useMemo(() => new Map<Address, BookBalance>((data?.rows ?? []).map((r) => [r.market.address, r.bookBalance])), [data]);
  const balanceOf = useCallback((market: Address): BookBalance | null => (data ? (balances.get(market) ?? { usdc: 0n, yes: 0n, no: 0n }) : null), [data, balances]);

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>
        Portfolio
      </h1>
      <p role="status" className={owner && load.kind === 'loading' ? undefined : 'sr-only'}>
        {owner && load.kind === 'loading' && !(config.kind === 'error' || config.kind === 'missing') ? `Reading your orders and positions from ${CHAIN.name}…` : ''}
      </p>
      {!owner ? (
        <section className="card" aria-labelledby="connect-heading">
          <h2 id="connect-heading">No wallet connected</h2>
          <p>Connect your wallet to see your open orders and positions. They are read from Solana for the wallet you connect.</p>
          <button type="button" onClick={() => wallet.setPanelOpen(true)}>
            Connect wallet
          </button>
        </section>
      ) : config.kind === 'error' || config.kind === 'missing' ? (
        <div role="alert" className="notice danger">
          <p>{`${Chain} didn't answer with the settings this page needs, so your orders and positions can't be shown right now. This page only reads until it does.`}</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      ) : load.kind === 'error' ? (
        <div role="alert" className="notice danger">
          <p>{`${Chain} didn't answer, so your orders and positions can't be shown right now. This page only reads until it does.`}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : data ? (
        <Ready data={data} reads={reads} balanceOf={balanceOf} onChanged={onChanged} now={now} paused={paused} />
      ) : null}
    </>
  );
}

function Ready({
  data,
  reads,
  balanceOf,
  onChanged,
  now,
  paused,
}: {
  data: PortfolioData;
  reads: number;
  balanceOf: (market: Address) => BookBalance | null;
  onChanged: () => void;
  now: number;
  paused: boolean;
}) {
  const allOrders = data.rows.flatMap((r) => r.orders);
  const onItsWay = data.rows.reduce((n, r) => n + r.bookBalance.usdc, 0n);
  const groups = data.rows.filter((r) => r.orders.length > 0).map((r) => ({ market: r.market, orders: r.orders }));
  const positions = data.rows.flatMap((r) => positionRows(r, now, paused));

  return (
    <>
      <p className="lede mono">{headerLine(data.usdc, lockedUsdc(allOrders), onItsWay)}</p>
      {paused && (
        <p role="note" className="notice warn">
          Trading is paused by the admin. You can still cancel orders, close pairs and redeem.
        </p>
      )}
      <section className="card" aria-labelledby="orders-heading">
        <h2 id="orders-heading">Open orders</h2>
        <OpenOrders
          groups={groups}
          reads={reads}
          balanceOf={balanceOf}
          onChanged={onChanged}
          showMarket
          emptyWords="You have no open orders. A limit order that does not fill at once rests here, and you can cancel it."
        />
      </section>
      <section className="card" aria-labelledby="positions-heading">
        <h2 id="positions-heading">Positions</h2>
        {positions.length === 0 ? (
          <p>
            You hold no positions. <Link to="/markets">Browse the markets</Link> to buy Yes or No.
          </p>
        ) : (
          <ul className="rows">
            {positions.map((p) => (
              <li key={p.key} className="order">
                <p>
                  <Link to={`/trade?market=${p.market.slug}`}>{marketName(p.market)}</Link>
                </p>
                <p className="mono">{p.words}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Each position’s entry price and profit or loss, History, and the Awaiting result and Settled sections are not here yet. A position in a market that has ended
          shows the market’s state instead of a price.
        </p>
      </section>
    </>
  );
}

type PositionRow = { key: string; market: MarketView; words: string };

/** One row for the wallet's Yes and one for its No on a market: what it holds, with what waits in the book counted in (D99). */
function positionRows(row: PortfolioRow, now: number, paused: boolean): PositionRow[] {
  const state = marketState(row.market, now);
  const sellable = state.tradable && !paused;
  const out: PositionRow[] = [];
  for (const side of ['Yes', 'No'] as const) {
    const wallet = side === 'Yes' ? row.yes : row.no;
    const pending = side === 'Yes' ? row.bookBalance.yes : row.bookBalance.no;
    const quantity = Number(wallet + pending);
    if (quantity <= 0) continue;
    const parts = { side, quantity, pending: Number(pending), inOrders: side === 'Yes' ? Number(lockedYes(row.orders)) : 0 };
    const words = sellable ? positionWords({ ...parts, book: row.levels }) : `${heldWords(parts)} · ${paused && state.tradable ? 'trading is paused by the admin' : state.label}`;
    out.push({ key: `${row.market.address}:${side}`, market: row.market, words });
  }
  return out;
}
