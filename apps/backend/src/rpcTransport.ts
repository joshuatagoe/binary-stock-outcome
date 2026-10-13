// The send queue's `Transport` (sendQueue.ts) over a Solana node's JSON-RPC, through Kit. It reads at `confirmed`, as the queue's
// callers do, so a transaction counts as landed when a majority has voted on its block.
import type { Transport, TxStatus } from './sendQueue.ts';

// The calls it makes, loosely typed like chainSource.ts: Kit's own types are branded and a test passes a plain object.
export interface TransportRpc {
  sendTransaction(wire: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
  getSignatureStatuses(signatures: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
  getBlockHeight(config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
}

interface StatusReply { err: unknown; confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null }

export function rpcTransport(rpc: TransportRpc, options: { timeoutMs?: number } = {}): Transport {
  const { timeoutMs = 15_000 } = options;
  const signal = () => ({ abortSignal: AbortSignal.timeout(timeoutMs) });
  return {
    async send(wire) {
      // The node's own pre-flight check stays on: a transaction that cannot work is refused here and costs no fee.
      return (await rpc.sendTransaction(wire as never, { encoding: 'base64', preflightCommitment: 'confirmed' } as never).send(signal())) as string;
    },

    async statuses(signatures): Promise<TxStatus[]> {
      const reply = (await rpc.getSignatureStatuses(signatures as never, { searchTransactionHistory: true } as never).send(signal())) as { value: (StatusReply | null)[] };
      return reply.value.map((status): TxStatus => {
        if (!status) return { state: 'not_found' };
        if (status.err !== null && status.err !== undefined) return { state: 'failed', error: status.err };
        // A transaction only `processed` can still be dropped with its fork: not landed yet.
        return status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized' ? { state: 'confirmed' } : { state: 'not_found' };
      });
    },

    async blockHeight() {
      return BigInt((await rpc.getBlockHeight({ commitment: 'confirmed' } as never).send(signal())) as bigint | number);
    },
  };
}
