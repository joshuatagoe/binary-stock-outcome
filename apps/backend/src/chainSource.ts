// A `ChainSource` (chainReader.ts) over a Solana node's JSON-RPC, through Kit. This is the only file that knows the node's reply
// shapes: it asks for `jsonParsed` transactions, where the program's own event calls show as inner instructions with their
// base58 data and the logs carry emit!'s "Program data" lines.
import type { ChainSource, RawTx, SignatureInfo } from './chainReader.ts';

// The two calls it makes, loosely typed: Kit's own types are branded (Address, Signature) and a test passes a plain object.
export interface RpcLike {
  getSignaturesForAddress(address: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
  getTransaction(signature: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
}

type Commitment = 'confirmed' | 'finalized';

interface SignatureReply { signature: string; slot: number | bigint; err: unknown }
interface TransactionReply {
  slot: number | bigint;
  blockTime: number | bigint | null;
  meta: {
    err: unknown;
    logMessages?: string[] | null;
    innerInstructions?: { index: number; instructions: { programId?: string; data?: unknown }[] }[] | null;
  } | null;
}

export interface RpcSourceOptions {
  /** `confirmed` shows an event in about a second; `finalized` waits about 13 s and cannot be rolled back. Default `confirmed`. */
  commitment?: Commitment;
  /** Each call gives up after this long. Default 15 s. */
  timeoutMs?: number;
}

export function rpcChainSource(rpc: RpcLike, program: string, options: RpcSourceOptions = {}): ChainSource {
  const { commitment = 'confirmed', timeoutMs = 15_000 } = options;
  const signal = () => ({ abortSignal: AbortSignal.timeout(timeoutMs) });

  return {
    async getSignatures({ before, until, limit }): Promise<SignatureInfo[]> {
      const config = { limit, commitment, ...(before ? { before } : {}), ...(until ? { until } : {}) };
      const replies = (await rpc.getSignaturesForAddress(program as never, config as never).send(signal())) as SignatureReply[];
      return replies.map((r) => ({ signature: r.signature, slot: BigInt(r.slot), failed: r.err !== null && r.err !== undefined }));
    },

    async getTransaction(signature): Promise<RawTx | null> {
      const config = { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment };
      const reply = (await rpc.getTransaction(signature as never, config as never).send(signal())) as TransactionReply | null;
      if (!reply?.meta) return null;
      return {
        signature,
        slot: BigInt(reply.slot),
        blockTime: reply.blockTime === null || reply.blockTime === undefined ? null : Number(reply.blockTime),
        failed: reply.meta.err !== null && reply.meta.err !== undefined,
        logs: reply.meta.logMessages ?? [],
        inner: (reply.meta.innerInstructions ?? []).map((group) => ({
          index: group.index,
          // A parsed instruction (system program, token program) has no raw data; only the raw ones can be our event calls.
          instructions: group.instructions.flatMap((ix) =>
            typeof ix.programId === 'string' && typeof ix.data === 'string' ? [{ programId: ix.programId, data: ix.data }] : [],
          ),
        })),
      };
    },
  };
}
