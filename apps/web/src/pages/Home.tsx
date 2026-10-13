// The landing page at M0: what Meridian is, and the live settings read from devnet, or from the local chain under
// make dev (M0 slice e, D74).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import type { ConfigPanel, Link } from '../describe-config.ts';
import { CHAIN } from '../network.ts';
import { ConfigMissing, chainRpc, readConfig } from '../read-config.ts';

const Chain = CHAIN.name[0].toUpperCase() + CHAIN.name.slice(1);

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'missing' } | { kind: 'ready'; panel: ConfigPanel };

export function Home() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  // Try again disappears while loading, so focus moves to the section's heading instead of falling to the page.
  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    readConfig(chainRpc, controller.signal).then(
      (panel) => setState({ kind: 'ready', panel }),
      (error) => {
        if (controller.signal.aborted) return;
        console.error(`Reading Config from ${CHAIN.name} failed:`, error);
        setState({ kind: error instanceof ConfigMissing ? 'missing' : 'error' });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  return (
    <>
      <h1>Meridian</h1>
      <p className="lede">
        Binary stock-outcome contracts on Solana devnet. Each market asks one question about one trading day, such as
        “Will META close at or above $680 today?” A Yes token pays 1.00 USDC if it does, and a No token pays 1.00 USDC
        if it doesn't.
      </p>
      <section className="card" aria-labelledby="live-heading">
        <h2 id="live-heading" ref={heading} tabIndex={-1}>
          {CHAIN.heading}
        </h2>
        {/* Always on the page, so screen readers announce each change (§7, Accessibility). */}
        <p role="status" className={state.kind === 'loading' ? undefined : 'sr-only'}>
          {state.kind === 'loading' && `Reading the settings from ${CHAIN.name}…`}
          {state.kind === 'ready' && `Read the settings from ${CHAIN.name}.`}
        </p>
        {state.kind === 'error' && (
          <Problem retry={retry}>{`${Chain} didn't answer, so the live settings can't be shown right now. This page only reads.`}</Problem>
        )}
        {state.kind === 'missing' && (
          <Problem retry={retry}>{`${Chain} answered, but Meridian's settings aren't there. ${CHAIN.missing}`}</Problem>
        )}
        {state.kind === 'ready' && <Settings panel={state.panel} />}
      </section>
      <p>
        <RouterLink to="/markets">Browse markets</RouterLink>. No wallet is needed to look; connect one to trade.
      </p>
    </>
  );
}

function Problem({ children, retry }: { children: string; retry: () => void }) {
  return (
    <div role="alert" className="notice danger">
      <p>{children}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

function Settings({ panel }: { panel: ConfigPanel }) {
  return (
    <>
      <p>
        Trading: <strong className={panel.trading === 'Open' ? 'pill open' : 'pill danger'}>{panel.trading}</strong>
      </p>
      <h3 id="stocks-heading">Stocks</h3>
      <ul className="stocks" aria-labelledby="stocks-heading">
        {panel.stocks.map((s) => (
          <li key={s.symbol}>
            <span className="mono">{s.symbol}</span> <span className="muted">{s.status}</span>
          </li>
        ))}
      </ul>
      <dl className="addresses">
        <Address term="Program" link={panel.program} />
        <Address term="Settings account (Config)" link={panel.config} />
        <Address term={CHAIN.usdc} link={panel.usdcMint} />
      </dl>
    </>
  );
}

function Address({ term, link }: { term: string; link: Link }) {
  return (
    <>
      <dt>{term}</dt>
      <dd>
        {link.url ? (
          <a className="mono" href={link.url}>
            {link.address}
          </a>
        ) : (
          <span className="mono">{link.address}</span>
        )}
      </dd>
    </>
  );
}
