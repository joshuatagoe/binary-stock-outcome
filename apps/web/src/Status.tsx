// The status line under a button that sends something (D13, ARCHITECTURE.md §7): the tracker's states in plain words, a
// polite live region for progress and results, and an alert for what blocks the action. The ticket and Cancel order both use it.
import type { RefObject } from 'react';
import type { TrackerState } from './tracker.ts';

export function Status({
  tracked,
  result,
  statusRef,
  name,
  retry,
  canRetry,
}: {
  tracked: TrackerState;
  result: string | null;
  statusRef: RefObject<HTMLDivElement | null>;
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
