// Reads the program's transactions into the event store once and prints what it found (M4-a, D62). The same catch-up the
// backend will run at start-up; here it is a command, to check the reader against a real chain. Locally:
//   MERIDIAN_NETWORK=local SOLANA_RPC_URL=http://127.0.0.1:8899 DATABASE_PATH=.local/events.db node apps/backend/src/cli/catch-up.ts
// SOLANA_RPC_URL overrides config/<network>.json's public RPC. Run it again and it reads nothing new.
import { PROGRAM_ADDRESS } from '@meridian/shared';
import { createSolanaRpc } from '@solana/kit';
import { createChainReader } from '../chainReader.ts';
import { rpcChainSource, type RpcLike } from '../chainSource.ts';
import { databasePath, loadConfig } from '../config.ts';
import { migrate, openDatabase } from '../db.ts';

const config = loadConfig(process.env.MERIDIAN_NETWORK ?? 'devnet');
const db = openDatabase(databasePath());
migrate(db);

const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? config.rpc.public) as unknown as RpcLike;
const reader = createChainReader({
  db,
  source: rpcChainSource(rpc, PROGRAM_ADDRESS),
  program: PROGRAM_ADDRESS,
  onProgress: (p) => console.log(`page ${p.page}: ${p.transactions} transactions, ${p.events} new events`),
});
const result = await reader.catchUp();
const total = db.prepare('SELECT COUNT(*) FROM events').pluck().get();
db.close();
console.log(`Caught up on ${config.network}: ${result.transactions} transactions read, ${result.events} new events, ${total} stored in all.`);
