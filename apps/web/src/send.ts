// The tracker's steps against the real chain (D115): the site simulates on devnet before the wallet opens, the wallet
// only signs (signTransactionMessageWithSigners), and the site sends through its own devnet connection, so a wallet
// left on Mainnet can't misroute an order. No websocket: the site polls for the answer over plain HTTPS, which the
// Content-Security-Policy already allows.
import {
  compileTransaction,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
  type Rpc,
  type Signature,
  type SolanaRpcApi,
} from '@solana/kit';
import type { TradeAction } from '@meridian/shared';
import { SimulationFailed } from './failures.ts';
import type { Steps, TxStatus } from './tracker.ts';
import type { Lifetime } from './trade-tx.ts';

type Message = Parameters<typeof compileTransaction>[0];

/** The wallet must hand back the transaction the site built: another blockhash would move the deadline the site watches. */
export function assertSameBlockhash(signed: { lifetimeConstraint?: { blockhash?: string } }, built: string) {
  if (signed.lifetimeConstraint?.blockhash !== built) {
    throw new Error('the wallet changed the transaction, so it was not sent');
  }
}

export const MAY_STILL_LAND_AFTER_MS = 4000;
export const POLL_MS = 800;

export function liveSteps(options: {
  rpc: Rpc<SolanaRpcApi>;
  action: TradeAction;
  /** Builds the transaction around a fresh blockhash. */
  build: (lifetime: Lifetime) => Promise<Message>;
}): Steps {
  const { rpc } = options;
  let message: Message;
  let lastValidBlockHeight = 0n;
  let tradeIndex: number | undefined;
  let builtBlockhash = '';
  return {
    action: options.action,
    get tradeIndex() {
      return tradeIndex;
    },
    mayStillLandAfterMs: MAY_STILL_LAND_AFTER_MS,
    pollMs: POLL_MS,
    get lastValidBlockHeight() {
      return lastValidBlockHeight;
    },
    async simulate() {
      const { value: lifetime } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
      lastValidBlockHeight = lifetime.lastValidBlockHeight;
      builtBlockhash = lifetime.blockhash;
      message = await options.build(lifetime);
      tradeIndex = message.instructions.length - 1;
      const wire = getBase64EncodedWireTransaction(compileTransaction(message));
      const { value } = await rpc
        .simulateTransaction(wire, { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' })
        .send();
      if (value.err) throw new SimulationFailed(value.err);
    },
    async sign() {
      const signed = await signTransactionMessageWithSigners(message);
      assertSameBlockhash(signed as never, builtBlockhash);
      return signed;
    },
    signatureOf: (signed) => getSignatureFromTransaction(signed as Parameters<typeof getSignatureFromTransaction>[0]),
    async send(signed) {
      const tx = signed as Parameters<typeof getBase64EncodedWireTransaction>[0];
      await rpc.sendTransaction(getBase64EncodedWireTransaction(tx), { encoding: 'base64', skipPreflight: true }).send();
    },
    // A failed read throws; the tracker never takes it for "no such transaction".
    async status(signature): Promise<TxStatus> {
      const { value } = await rpc.getSignatureStatuses([signature as Signature], { searchTransactionHistory: true }).send();
      const s = value[0];
      if (!s) return 'none';
      if (s.err) return { err: s.err };
      return s.confirmationStatus === 'finalized' ? 'finalized' : 'pending';
    },
    blockHeight: () => rpc.getBlockHeight({ commitment: 'confirmed' }).send(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
