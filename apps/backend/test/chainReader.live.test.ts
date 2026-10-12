// The reader against a real node. Skipped unless MERIDIAN_TEST_RPC names one (a local Surfpool with the program loaded, as make dev
// starts; no test talks to devnet, P16). Reads only. Run it with:
//   MERIDIAN_TEST_RPC=http://127.0.0.1:8899 npm run test -w apps/backend -- chainReader.live
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROGRAM_ADDRESS } from '@meridian/shared';
import { createSolanaRpc } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import { createChainReader } from '../src/chainReader.ts';
import { rpcChainSource, type RpcLike } from '../src/chainSource.ts';
import { migrate, openDatabase } from '../src/db.ts';

const url = process.env.MERIDIAN_TEST_RPC;

describe.skipIf(!url)('against a real node', () => {
  it('stores every event of the program’s transactions, valid and once, and a second pass finds nothing new', async () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-live-')), 'meridian.db'));
    migrate(db);
    const source = rpcChainSource(createSolanaRpc(url!) as unknown as RpcLike, PROGRAM_ADDRESS);
    const reader = createChainReader({ db, source, program: PROGRAM_ADDRESS });
    const first = await reader.catchUp();
    const rows = db.prepare('SELECT data FROM events').pluck().all() as string[];
    expect(rows).toHaveLength(first.events);
    expect(rows.every((d) => typeof JSON.parse(d).kind === 'string')).toBe(true);
    expect(await reader.catchUp()).toMatchObject({ transactions: 0, events: 0 });
  }, 120_000);
});
