// M4-c's live run: the close-time jobs and the event order, against a local chain running the current program.
// Skipped unless MERIDIAN_TEST_RPC names the chain (P16: no test talks to devnet). From a fresh chain:
//   node apps/backend/test/live/local-chain.ts start      (MERIDIAN_PROGRAM_SO = the built program, a WSL path)
//   MERIDIAN_TEST_RPC=http://127.0.0.1:8909 npm run test -w apps/backend -- closeJobs.live
//   node apps/backend/test/live/local-chain.ts stop
// It takes about ten minutes, most of it waiting for a market to close in real time. Two markets are made, each with 36 resting orders
// (so the sweep takes two calls), a paired offer, and a trader whose USDC account is closed:
//   - market B closes first, in real time. Its sweep is killed after one call, and the real backend process (main.ts) finishes it.
//   - market A closes after Surfpool's clock is moved forward (surfnet_timeTravel), and the repeatable check does all of it.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as client from '@meridian/client';
import { PROGRAM_ADDRESS, marketAccounts } from '@meridian/shared';
import { createKeyPairSignerFromBytes, createSolanaRpc, getBase58Encoder, type Address } from '@solana/kit';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createChainReader } from '../../src/chainReader.ts';
import { rpcChainSource, type RpcLike } from '../../src/chainSource.ts';
import { createChecker } from '../../src/checker.ts';
import { createCloseChain, type CloseRpc } from '../../src/closeChain.ts';
import { createCloseJobs } from '../../src/closeJobs.ts';
import { migrate, openDatabase } from '../../src/db.ts';
import { EVENTS_IN_ORDER } from '../../src/eventStore.ts';
import { rpcTransport, type TransportRpc } from '../../src/rpcTransport.ts';
import { createSendQueue } from '../../src/sendQueue.ts';
import { runCloseScenario, type CloseScenario } from './closeScenario.ts';
import { rpcCall, sleep, USDC_MINT } from './lifecycle.ts';

const url = process.env.MERIDIAN_TEST_RPC;
const keys = process.env.MERIDIAN_TEST_KEYS ?? resolve(import.meta.dirname, '..', '..', '..', '..', '.local', 'keys');
const root = resolve(import.meta.dirname, '..', '..', '..', '..');

const rpc = url ? (createSolanaRpc(url) as any) : undefined;
const b58 = getBase58Encoder();
const equal = (a: Uint8Array, b: Uint8Array) => a.length >= b.length && b.every((v, i) => a[i] === v);

/** Every transaction that touched `address`, with the program instructions it carried, named by their discriminators. */
async function transactionsOf(address: string) {
  const sigs = (await rpcCall(url!, 'getSignaturesForAddress', [address, { limit: 1000, commitment: 'confirmed' }])) as { signature: string; err: unknown; slot: number }[];
  const names: [string, Uint8Array][] = [
    ['sweep', new Uint8Array(client.getSweepDiscriminatorBytes())],
    ['return', new Uint8Array(client.getReturnToOwnerDiscriminatorBytes())],
  ];
  const out: { signature: string; failed: boolean; slot: number; kinds: string[] }[] = [];
  for (const s of sigs) {
    const tx = await rpcCall(url!, 'getTransaction', [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
    const keysOf: string[] = [...tx.transaction.message.accountKeys, ...(tx.meta.loadedAddresses?.writable ?? []), ...(tx.meta.loadedAddresses?.readonly ?? [])];
    const kinds = tx.transaction.message.instructions
      .filter((ix: any) => keysOf[ix.programIdIndex] === PROGRAM_ADDRESS)
      .flatMap((ix: any) => names.filter(([, d]) => equal(new Uint8Array(b58.encode(ix.data)), d)).map(([n]) => n));
    out.push({ signature: s.signature, failed: s.err !== null, slot: s.slot, kinds });
  }
  return out;
}

const tokenAmount = async (account: string) => {
  try {
    return BigInt((await rpcCall(url!, 'getTokenAccountBalance', [account, { commitment: 'confirmed' }])).value.amount);
  } catch {
    return null; // no such account
  }
};
const ataOfOwner = async (owner: string, mint: string, program: string) => (await import('../../src/closeChain.ts')).ataOf(owner as Address, mint as Address, program as Address);

describe.skipIf(!url)('the close-time jobs on a local chain', () => {
  let a: CloseScenario;
  let b: CloseScenario;
  let operator: Awaited<ReturnType<typeof createKeyPairSignerFromBytes>>;
  const children: ReturnType<typeof spawn>[] = [];
  const dbPath = join(mkdtempSync(join(tmpdir(), 'meridian-live-close-')), 'meridian.db');
  let offsetMs = 0; // how far the backend's clock is told to be ahead of the machine's, after the chain's clock is moved

  const queue = () => createSendQueue({ transport: rpcTransport(rpc as TransportRpc), pollMs: 300 });
  const closeChain = () => createCloseChain({ rpc: rpc as CloseRpc, queue: queue(), operator });
  const source = () => rpcChainSource(rpc as unknown as RpcLike, PROGRAM_ADDRESS);
  const withDb = <T>(f: (db: ReturnType<typeof openDatabase>) => Promise<T> | T) => async () => {
    const db = openDatabase(dbPath);
    migrate(db);
    try {
      return await f(db);
    } finally {
      db.close();
    }
  };
  const chainTime = async () => Number(await rpc.getBlockTime(await rpc.getSlot().send()).send());
  const sweepCount = async (s: CloseScenario) => {
    const { book } = await marketAccounts(s.market);
    return (await transactionsOf(book)).filter((t) => t.kinds.includes('sweep'));
  };

  beforeAll(async () => {
    operator = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(keys, 'meridian-operator.json'), 'utf8'))));
    // B first, with the earlier close; A after it, with a later one.
    b = await runCloseScenario(url!, keys, { ticker: 'GOOGL', closeInSecs: 600 });
    a = await runCloseScenario(url!, keys, { ticker: 'MSFT', closeInSecs: 3600 });
    expect(await chainTime(), 'the scenarios took longer than market B’s 600 s').toBeLessThan(b.closeAt - 20);
  }, 900_000);
  afterAll(() => void children.forEach((c) => c.kill('SIGKILL')));

  it('stores every event of those transactions, and puts two transactions of one slot in block order, not signature order', withDb(async (db) => {
    await createChainReader({ db, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    const rows = db.prepare(`SELECT signature, slot, tx_index FROM events ORDER BY ${EVENTS_IN_ORDER}`).all() as { signature: string; slot: number; tx_index: number }[];
    const bySlot = new Map<number, string[]>();
    for (const r of rows) {
      const list = bySlot.get(r.slot) ?? [];
      if (!list.includes(r.signature)) list.push(r.signature);
      bySlot.set(r.slot, list);
    }
    const shared = [...bySlot].filter(([, sigs]) => sigs.length >= 2);
    expect(shared.length, 'no slot holds two of the program’s transactions; the burst did not share a slot').toBeGreaterThan(0);
    let bySignatureWouldDiffer = 0;
    for (const [slot, stored] of shared) {
      // The block itself is the witness: its transaction list is in the order they ran.
      const block = (await rpcCall(url!, 'getBlock', [slot, { transactionDetails: 'signatures', rewards: false, maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])).signatures as string[];
      expect(stored, `slot ${slot}`).toEqual(block.filter((s) => stored.includes(s)));
      for (const r of rows.filter((x) => x.slot === slot)) expect(r.tx_index, `slot ${slot}`).toBe(block.indexOf(r.signature));
      if (JSON.stringify(stored) !== JSON.stringify([...stored].sort())) bySignatureWouldDiffer++;
    }
    console.info(`live run: ${shared.length} slots hold 2 or more of the program's transactions (${shared.reduce((n, [, s]) => n + s.length, 0)} transactions); ${bySignatureWouldDiffer} of them would be misordered by signature; the burst of ${b.burst.length + a.burst.length} bids sharing slots: ${new Set([...b.burst, ...a.burst]).size}`);
    expect(bySignatureWouldDiffer, 'no slot where signature order differs from block order: this run cannot tell them apart').toBeGreaterThan(0);
  }), 120_000);

  it('sends nothing before the close', withDb(async (db) => {
    await createChainReader({ db, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    const before = { a: await sweepCount(a), b: await sweepCount(b) };
    const jobs = createCloseJobs({ db, chain: closeChain(), now: () => new Date(Date.now() + offsetMs) });
    expect(await chainTime()).toBeLessThan(b.closeAt - 5);
    await jobs.run();
    expect(await sweepCount(a)).toEqual(before.a);
    expect(await sweepCount(b)).toEqual(before.b);
    expect(before.a).toHaveLength(0);
    expect((await closeChain().readBook(b.market))!.orders).toBe(b.resting);
  }), 120_000);

  it('market B: a kill after the first sweep call, then the real backend finishes it, with no call repeated', withDb(async (db) => {
    while ((await chainTime()) < b.closeAt - 5 + 2) await sleep(1000); // real time, until its orders close
    const real = closeChain();
    let calls = 0;
    const dying = { ...real, sweep: async (m: string) => (calls++ >= 1 ? Promise.reject(new Error('killed')) : real.sweep(m)) };
    const jobs = createCloseJobs({ db, chain: dying, now: () => new Date() });
    await expect(jobs.run()).rejects.toThrow(/killed/);
    expect((await sweepCount(b)).length).toBe(1);
    expect((await real.readBook(b.market))!.orders).toBe(b.resting - 28);
    db.close(); // the process is gone

    const child = spawn(process.execPath, ['apps/backend/src/main.ts'], {
      cwd: root,
      env: { ...process.env, MERIDIAN_NETWORK: 'local', SOLANA_RPC_URL: url, DATABASE_PATH: dbPath, PORT: '0', OPERATOR_SECRET_KEY: readFileSync(join(keys, 'meridian-operator.json'), 'utf8') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    let output = '';
    child.stdout!.on('data', (d) => (output += d));
    child.stderr!.on('data', (d) => (output += d));
    const deadline = Date.now() + 180_000;
    for (;;) {
      const book = await real.readBook(b.market);
      if (book && book.orders === 0 && book.balances.length === 0) break;
      if (Date.now() > deadline) throw new Error(`the backend did not finish market B in time:\n${output}`);
      await sleep(1000);
    }
    child.kill('SIGKILL');
    await new Promise((r) => child.once('exit', r));
    expect(output).not.toMatch(/"level":50/); // no error-level log line

    // One call before the kill and one after: not three, and none failed.
    const sweeps = await sweepCount(b);
    expect(sweeps.map((s) => s.failed)).toEqual([false, false]);
    const { book } = await marketAccounts(b.market);
    const returns = (await transactionsOf(book)).filter((t) => t.kinds.includes('return'));
    expect(returns).toHaveLength(4); // one per owner owed: Alice, Bob, Carol, Dave
    expect(returns.every((r) => !r.failed)).toBe(true);
  }), 600_000);

  it('market A: after the chain’s clock is moved past the close, the repeatable check sweeps, returns and re-creates the closed account', withDb(async (db) => {
    const target = a.closeAt + 30;
    await rpcCall(url!, 'surfnet_timeTravel', [{ absoluteTimestamp: target * 1000 }]);
    for (let i = 0; i < 40 && (await chainTime()) < target; i++) await sleep(500);
    expect(await chainTime()).toBeGreaterThanOrEqual(target);
    offsetMs = target * 1000 - Date.now();

    const reader = createChainReader({ db, source: source(), program: PROGRAM_ADDRESS });
    const jobs = createCloseJobs({ db, chain: closeChain(), now: () => new Date(Date.now() + offsetMs) });
    const errors: unknown[] = [];
    const checker = createChecker({
      db, provider: 'live', heartbeatEverySecs: 60,
      getSlot: async (signal) => rpc.getSlot({ commitment: 'confirmed' }).send({ abortSignal: signal }),
      getGenesisHash: async (signal) => rpc.getGenesisHash().send({ abortSignal: signal }),
      readChain: () => reader.catchUp(), closeJobs: () => jobs.run(), onError: (e) => errors.push(e),
    });
    await checker.pass();
    expect(errors).toEqual([]);

    // Everything is swept and returned, from the chain's own state.
    const chain = closeChain();
    expect(await chain.readBook(a.market)).toEqual({ orders: 0, balances: [] });
    const accounts = await marketAccounts(a.market);
    for (const account of [accounts.bookUsdc, accounts.bookYes, accounts.bookNo]) expect(await tokenAmount(account)).toBe(0n);

    // Each trader has exactly what they started with, less what the pairs cost them: nothing is left in the book, nothing lost.
    const balanceOf = async (who: Address) => ({
      usdc: await tokenAmount(await ataOfOwner(who, USDC_MINT, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')),
      yes: await tokenAmount(await ataOfOwner(who, accounts.yesMint, 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')),
      no: await tokenAmount(await ataOfOwner(who, accounts.noMint, 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')),
    });
    expect(await balanceOf(a.traders.alice)).toEqual({ usdc: 80_000_000n, yes: 20n, no: 20n }); // 20 pairs minted, every offer and bid cancelled
    expect(await balanceOf(a.traders.bob)).toEqual({ usdc: 90_000_000n, yes: 10n, no: 10n });
    expect(await balanceOf(a.traders.dave)).toEqual({ usdc: 100_000_000n, yes: 0n, no: 0n }); // his paired offer closed its pairs at 1.00 each
    expect(await balanceOf(a.traders.carol)).toEqual({ usdc: 1_200_000n, yes: 0n, no: 0n }); // her account was closed; the backend made it again

    // Two sweep calls (28 + 8) and one return per owner, none failed.
    const sweeps = await sweepCount(a);
    expect(sweeps.map((s) => s.failed)).toEqual([false, false]);
    const returns = (await transactionsOf(accounts.book)).filter((t) => t.kinds.includes('return'));
    expect(returns).toHaveLength(4);
    expect(returns.every((r) => !r.failed)).toBe(true);

    // A second pass finds nothing to do and sends nothing.
    const programTxs = async () => (await rpcCall(url!, 'getSignaturesForAddress', [PROGRAM_ADDRESS, { limit: 1000, commitment: 'confirmed' }])).length;
    const count = await programTxs();
    await checker.pass();
    expect(await programTxs()).toBe(count);
    expect(errors).toEqual([]);
  }), 300_000);

  it('stores the sweep and the returns as events, in the order they happened', async () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-live-order-')), 'meridian.db'));
    migrate(db);
    await createChainReader({ db, source: source(), program: PROGRAM_ADDRESS }).catchUp();
    for (const s of [a, b]) {
      const rows = db.prepare(`SELECT kind, wallet, data, signature, slot, tx_index FROM events WHERE market = ? ORDER BY ${EVENTS_IN_ORDER}`).all(s.market) as { kind: string; wallet: string; data: string; signature: string }[];
      const kinds = rows.map((r) => r.kind);
      const swept = rows.filter((r) => r.kind === 'OrderCancelled' && JSON.parse(r.data).reason === 'Sweep');
      expect(swept).toHaveLength(s.resting); // every order, once
      expect(new Set(swept.map((r) => `${JSON.parse(r.data).owner}/${JSON.parse(r.data).orderId}`)).size).toBe(s.resting);
      expect(new Set(swept.map((r) => r.signature)).size).toBe(2);
      const sweepSignatures = new Set(swept.map((r) => r.signature));
      expect(rows.filter((r) => r.kind === 'Redeemed' && sweepSignatures.has(r.signature))).toHaveLength(1); // the paired offer's pairs
      // Offers first (the first call takes the 4 offers, then bids from the worst price).
      expect(swept.slice(0, 4).map((r) => JSON.parse(r.data).side)).toEqual(['Sell', 'Sell', 'Sell', 'Sell']);
      expect(swept.slice(4).every((r) => JSON.parse(r.data).side === 'Buy')).toBe(true);
      // Every sweep cancel comes before every return, and the four returns are four owners.
      const lastSweep = kinds.map((k, i) => (k === 'OrderCancelled' && JSON.parse(rows[i]!.data).reason === 'Sweep' ? i : -1)).reduce((m, i) => Math.max(m, i), -1);
      const returned = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.kind === 'BalanceReturned');
      expect(returned).toHaveLength(4);
      expect(returned.every(({ i }) => i > lastSweep)).toBe(true);
      expect(new Set(returned.map(({ r }) => JSON.parse(r.data).owner)).size).toBe(4);
    }
    console.info(`live run: events stored for market A and B: ${(db.prepare('SELECT COUNT(*) FROM events').pluck().get() as number)} in all`);
    db.close();
  }, 120_000);
});
