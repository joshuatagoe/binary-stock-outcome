// The node adapter, against a real transaction of our program recorded from devnet (Initialize Config, 2026-10-12): its reply
// as `getTransaction` with `jsonParsed` gave it, and the signature list. No test talks to devnet; the files are read from disk.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROGRAM_ADDRESS, isMeridianEvent } from '@meridian/shared';
import { describe, expect, it } from 'vitest';
import { extractEvents } from '../src/chainEvents.ts';
import { createChainReader } from '../src/chainReader.ts';
import { rpcChainSource, type RpcLike } from '../src/chainSource.ts';
import { migrate, openDatabase } from '../src/db.ts';

const fixture = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')).result;
const INIT = '3AFeheSrpGXa3WKAi9tKhrbEhjwot9kyNnyEk7FeFkZH7uY3Au3xE9VRBmLZJx1AdW34PD4b5JGF5hESExgrEZWy';

// A node that answers from recorded replies and remembers what it was asked.
function node(overrides: { transaction?: unknown; signatures?: unknown } = {}) {
  const asked: { method: string; args: unknown[] }[] = [];
  const rpc: RpcLike = {
    getSignaturesForAddress: (...args) => ({ send: async () => (asked.push({ method: 'sigs', args }), overrides.signatures ?? fixture('devnet-signatures.json')) }),
    getTransaction: (...args) => ({ send: async () => (asked.push({ method: 'tx', args }), 'transaction' in overrides ? overrides.transaction : fixture('devnet-initialize-config.json')) }),
  } as RpcLike;
  return { rpc, asked };
}

describe('rpcChainSource', () => {
  it('reads our program’s real Initialize Config transaction and finds its ConfigInitialized event in the logs', async () => {
    const tx = (await rpcChainSource(node().rpc, PROGRAM_ADDRESS).getTransaction(INIT))!;
    expect(tx).toMatchObject({ signature: INIT, slot: 509_925_181n, blockTime: 1_791_727_191, failed: false });
    const events = extractEvents(tx, PROGRAM_ADDRESS);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ ixIndex: 0, eventIndex: 0, event: { kind: 'ConfigInitialized', tickers: 7 } });
    expect(isMeridianEvent(events[0]!.event)).toBe(true);
  });

  it('reads the transaction’s place in its block (transactionIndex), which the node gives with the transaction', async () => {
    const source = rpcChainSource(node().rpc, PROGRAM_ADDRESS);
    expect((await source.getTransaction(INIT))!.index).toBe(9);
    const reply = fixture('devnet-initialize-config.json');
    delete reply.transactionIndex;
    expect((await rpcChainSource(node({ transaction: reply }).rpc, PROGRAM_ADDRESS).getTransaction(INIT))!.index).toBeNull();
  });

  it('asks the block for the place when the node does not give it with the transaction (Surfpool, older nodes), once per slot', async () => {
    const reply = fixture('devnet-initialize-config.json');
    delete reply.transactionIndex;
    const blocks: unknown[] = [];
    const rpc = {
      ...node({ transaction: reply }).rpc,
      getBlock: (slot: unknown, config: unknown) => ({ send: async () => (blocks.push([slot, config]), { signatures: ['other', 'another', INIT, 'last'] }) }),
    } as unknown as RpcLike;
    const source = rpcChainSource(rpc, PROGRAM_ADDRESS);
    expect((await source.getTransaction(INIT))!.index).toBe(2);
    expect((await source.getTransaction(INIT))!.index).toBe(2);
    expect(blocks).toEqual([[509_925_181n, { transactionDetails: 'signatures', rewards: false, maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]]);
  });

  it('gives no place when the block does not list the transaction', async () => {
    const reply = fixture('devnet-initialize-config.json');
    delete reply.transactionIndex;
    const rpc = { ...node({ transaction: reply }).rpc, getBlock: () => ({ send: async () => ({ signatures: ['other'] }) }) } as unknown as RpcLike;
    expect((await rpcChainSource(rpc, PROGRAM_ADDRESS).getTransaction(INIT))!.index).toBeNull();
  });

  it('drops parsed inner instructions (the system program’s createAccount) and keeps raw ones', async () => {
    const tx = (await rpcChainSource(node().rpc, PROGRAM_ADDRESS).getTransaction(INIT))!;
    expect(tx.inner).toEqual([{ index: 0, instructions: [] }]);
    const withRaw = fixture('devnet-initialize-config.json');
    withRaw.meta.innerInstructions[0].instructions.push({ programId: PROGRAM_ADDRESS, data: '3Bxs4h24hBtQy9rw', accounts: [], stackHeight: 2 });
    const tx2 = (await rpcChainSource(node({ transaction: withRaw }).rpc, PROGRAM_ADDRESS).getTransaction(INIT))!;
    expect(tx2.inner[0]!.instructions).toEqual([{ programId: PROGRAM_ADDRESS, data: '3Bxs4h24hBtQy9rw' }]);
  });

  it('accepts the numbers as Kit returns them: bigint slots and block times', async () => {
    const reply = fixture('devnet-initialize-config.json');
    reply.slot = BigInt(reply.slot);
    reply.blockTime = BigInt(reply.blockTime);
    const tx = (await rpcChainSource(node({ transaction: reply }).rpc, PROGRAM_ADDRESS).getTransaction(INIT))!;
    expect(tx.slot).toBe(509_925_181n);
    expect(tx.blockTime).toBe(1_791_727_191);
  });

  it('marks a failed transaction as failed', async () => {
    const reply = fixture('devnet-initialize-config.json');
    reply.meta.err = { InstructionError: [0, { Custom: 6001 }] };
    const tx = (await rpcChainSource(node({ transaction: reply }).rpc, PROGRAM_ADDRESS).getTransaction(INIT))!;
    expect(tx.failed).toBe(true);
    expect(extractEvents(tx, PROGRAM_ADDRESS)).toEqual([]);
  });

  it('returns null for a transaction the node does not have', async () => {
    expect(await rpcChainSource(node({ transaction: null }).rpc, PROGRAM_ADDRESS).getTransaction(INIT)).toBeNull();
  });

  it('lists signatures newest first with slot and failure, and passes before, until and limit on', async () => {
    const { rpc, asked } = node();
    const list = await rpcChainSource(rpc, PROGRAM_ADDRESS).getSignatures({ before: 'b', until: 'u', limit: 50 });
    expect(list.map((s) => [s.signature.slice(0, 6), s.slot, s.failed])).toEqual([['3AFehe', 509_925_181n, false], ['67AMBY', 509_924_280n, false]]);
    expect(asked[0]!.args[0]).toBe(PROGRAM_ADDRESS);
    expect(asked[0]!.args[1]).toMatchObject({ before: 'b', until: 'u', limit: 50, commitment: 'confirmed' });
  });

  it('leaves out before and until when there are none', async () => {
    const { rpc, asked } = node();
    await rpcChainSource(rpc, PROGRAM_ADDRESS, { commitment: 'finalized' }).getSignatures({ limit: 10 });
    expect(asked[0]!.args[1]).toEqual({ limit: 10, commitment: 'finalized' });
  });

  it('feeds the reader end to end from the recorded replies', async () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-src-')), 'meridian.db'));
    migrate(db);
    const sigs = fixture('devnet-signatures.json') as { signature: string }[];
    const rpc = {
      getSignaturesForAddress: (_a: unknown, c: { until?: string; before?: string }) => ({
        send: async () => (c.until || c.before ? [] : sigs),
      }),
      getTransaction: (s: string) => ({
        // The second recorded transaction is the program's deployment; it has no events, and only the first is on file in full.
        send: async () => (s === INIT ? fixture('devnet-initialize-config.json') : { slot: 1, transactionIndex: 3, blockTime: null, meta: { err: null, logMessages: [], innerInstructions: [] } }),
      }),
    } as unknown as RpcLike;
    const result = await createChainReader({ db, source: rpcChainSource(rpc, PROGRAM_ADDRESS), program: PROGRAM_ADDRESS }).catchUp();
    expect(result).toMatchObject({ transactions: 2, events: 1 });
    expect(db.prepare("SELECT kind, wallet FROM events").all()).toEqual([{ kind: 'ConfigInitialized', wallet: expect.any(String) }]);
  });
});
