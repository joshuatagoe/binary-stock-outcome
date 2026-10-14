// The wallet's open orders with a Cancel order button on each (F6), on Portfolio and on Trade. Cancel goes through the transaction
// tracker like every order (D13). A cancel credits the owner's balance inside the book, and Return to owner pays it to the wallet
// about 30 seconds later (D99), so the done message says "on its way to your wallet" until the book has been read empty.
// Cancel works while trading is paused (D68), so nothing here looks at the pause flag.
import { formatDollars } from '@meridian/shared';
import type { Address } from '@solana/kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { attempts, useAttempt } from './attempts.ts';
import { useChainConfig } from './chain-config.tsx';
import type { MarketView } from './markets.ts';
import { describeCancelled, describeOrder, nextEmptyReads, returnStatus, type BookBalance, type OpenOrder } from './orders.ts';
import { placed } from './placed.ts';
import { chainRpc } from './read-config.ts';
import { readCancelled } from './read-markets.ts';
import { liveSteps } from './send.ts';
import { Status } from './Status.tsx';
import { isLive } from './tracker.ts';
import { buildCancel } from './trade-tx.ts';
import { useWallet } from './wallet.tsx';

export type OrderGroup = { market: MarketView; orders: OpenOrder[] };

type Finished = { id: number; text: string; market: Address; /** Reads of the book in a row that found the wallet's balance there empty since this cancel landed. */ empty: number; signature?: string };

const marketName = (m: MarketView) => `${m.ticker} ${formatDollars(m.strikeCents, { dropZeroCents: true })} or above`;
const cancelKey = (market: Address, orderId: bigint) => `cancel:${market}:${orderId}`;

export function OpenOrders({
  groups,
  reads,
  balanceOf,
  onChanged,
  showMarket,
  emptyWords,
}: {
  groups: OrderGroup[];
  /** How many times the book has been read, so a cancel can tell when its money has left the book. */
  reads: number;
  /** What the book holds for the wallet on a market, or null when that is not known. */
  balanceOf: (market: Address) => BookBalance | null;
  onChanged: () => void;
  showMarket: boolean;
  emptyWords: string;
}) {
  const wallet = useWallet();
  const [finished, setFinished] = useState<Finished[]>([]);
  const status = useRef<HTMLDivElement>(null);
  const next = useRef(1);

  // Each read of the book either finds the wallet's balance there or finds it empty (D99).
  const latest = useRef(balanceOf);
  latest.current = balanceOf;
  useEffect(() => {
    setFinished((list) => (list.length === 0 ? list : list.map((f) => ({ ...f, empty: nextEmptyReads(f.empty, latest.current(f.market)) }))));
  }, [reads]);

  const onFinished = useCallback((market: Address, text: string, signature?: string) => {
    setFinished((list) => [...list, { id: next.current++, text, market, empty: 0, signature }].slice(-5));
    // The Cancel button that was pressed is gone with its row, so focus moves to the message (the status line, §7).
    queueMicrotask(() => status.current?.focus());
  }, []);

  const rows = groups.flatMap((g) => g.orders.map((order) => ({ market: g.market, order })));
  const owner = wallet.address;

  return (
    <div>
      <div ref={status} tabIndex={-1} className="order-messages">
        <div role="status" aria-live="polite">
          {finished.length > 0 && (
            <ul className="rows">
              {finished.map((f) => {
                const pending = returnStatus(f.empty) === 'on-its-way';
                // The fallback words already say where the money is going.
                const text = pending && f.text.startsWith('Order cancelled ·') ? `${f.text} · on its way to your wallet` : f.text;
                return (
                  <li key={f.id} className="notice ok">
                    {text}
                    {f.signature && (
                      <>
                        {' '}
                        <a href={`https://explorer.solana.com/tx/${f.signature}?cluster=devnet`}>View the transaction</a>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <p>{emptyWords}</p>
      ) : (
        <ul className="rows">
          {rows.map(({ market, order }) => (
            <OrderRow
              key={`${market.address}:${order.orderId}`}
              market={market}
              order={order}
              owner={owner}
              showMarket={showMarket}
              onFinished={onFinished}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({
  market,
  order,
  owner,
  showMarket,
  onFinished,
  onChanged,
}: {
  market: MarketView;
  order: OpenOrder;
  owner: Address | null;
  showMarket: boolean;
  onFinished: (market: Address, text: string, signature?: string) => void;
  onChanged: () => void;
}) {
  const wallet = useWallet();
  const { config } = useChainConfig();
  const usdcMint = config.kind === 'ready' ? config.usdcMint : null;
  const key = cancelKey(market.address, order.orderId);
  const { state: tracked } = useAttempt(key);
  const status = useRef<HTMLDivElement>(null);
  const words = describeOrder(order, owner ? placed.sizeOf(owner, market.address, order.orderId) : null);
  const live = isLive(tracked);

  // Focus stays on the status line through an attempt (§7): the button that was pressed disables itself.
  useEffect(() => {
    if (tracked.kind !== 'idle' && tracked.kind !== 'done') status.current?.focus();
  }, [tracked.kind]);

  const cancel = async () => {
    if (!wallet.signer || !usdcMint || !owner || attempts.isLive(key)) return;
    const signer = wallet.signer;
    const steps = liveSteps({
      rpc: chainRpc,
      action: 'cancel',
      build: (lifetime) => buildCancel({ owner: signer, market: market.address, usdcMint, orderId: order.orderId, lifetime }),
    });
    const final = await attempts.run(key, {
      steps,
      meta: { cancel: String(order.orderId) },
      owner,
      // The words come from the landed transaction's own events: what the order still held when it was cancelled.
      finalize: async (f) => (f.kind === 'done' ? describeCancelled(await readCancelled(chainRpc, f.signature, owner)) : null),
    });
    wallet.refreshFunds();
    onChanged();
    if (final.kind === 'done') onFinished(market.address, attempts.get(key).result ?? describeCancelled(null), final.signature);
  };

  // A cancel that landed is shown by the message above, not by a row that is about to go.
  if (tracked.kind === 'done') return null;

  return (
    <li className="order">
      <p>
        <strong>{words.headline}</strong>
        {showMarket && (
          <>
            {' on '}
            <Link to={`/trade?market=${market.slug}`}>{marketName(market)}</Link>
          </>
        )}
      </p>
      <p className="mono">{words.detail}</p>
      <button type="button" aria-label={words.cancelName} disabled={live || !wallet.signer || !usdcMint} onClick={() => void cancel()}>
        Cancel order
      </button>
      <Status tracked={tracked} result={null} statusRef={status} name="Cancel order" canRetry retry={() => void cancel()} />
    </li>
  );
}
