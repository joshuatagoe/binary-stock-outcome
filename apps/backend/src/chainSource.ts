// A `ChainSource` (chainReader.ts) over a Solana node's JSON-RPC, through Kit. This is the only file that knows the node's reply
// shapes: it asks for `jsonParsed` transactions, where the program's own event calls show as inner instructions with their
// base58 data and the logs carry emit!'s "Program data" lines.
import type { ChainSource, RawTx, SignatureInfo } from './chainReader.ts';

// The two calls it makes, loosely typed: Kit's own types are branded (Address, Signature) and a test passes a plain object.
export interface RpcLike {
  getSignaturesForAddress(address: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
  getTransaction(signature: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
  /** Only for a node that does not give a transaction's place itself (Surfpool, older Agave). */
  getBlock?(slot: never, config: never): { send(options?: { abortSignal?: AbortSignal }): Promise<unknown> };
}

type Commitment = 'confirmed' | 'finalized';

interface SignatureReply { signature: string; slot: number | bigint; err: unknown }
interface TransactionReply {
  slot: number | bigint;
  /** The transaction's place in its block, from the node (Agave 2.x and later). */
  transactionIndex?: number | bigint | null;
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

  // A node that does not return transactionIndex still lists a block's signatures in block order, so a signature's place is its position in
  // that list. One call per slot serves every transaction of the slot; only the newest few slots are kept.
  const blocks = new Map<bigint, Promise<string[]>>();
  function blockSignatures(slot: bigint): Promise<string[]> {
    let found = blocks.get(slot);
    if (!found) {
      const config = { transactionDetails: 'signatures', rewards: false, maxSupportedTransactionVersion: 0, commitment };
      found = (rpc.getBlock!(slot as never, config as never).send(signal()) as Promise<{ signatures: string[] } | null>).then((b) => b?.signatures ?? []);
      found.catch(() => blocks.delete(slot)); // a failed read is asked again, not remembered
      blocks.set(slot, found);
      if (blocks.size > 8) blocks.delete(blocks.keys().next().value!);
    }
    return found;
  }
  async function positionOf(reply: TransactionReply, signature: string): Promise<number | null> {
    if (reply.transactionIndex !== null && reply.transactionIndex !== undefined) return Number(reply.transactionIndex);
    if (!rpc.getBlock) return null;
    const at = (await blockSignatures(BigInt(reply.slot))).indexOf(signature);
    return at < 0 ? null : at;
  }

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
        index: await positionOf(reply, signature),
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
