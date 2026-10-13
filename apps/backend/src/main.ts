// Starts the backend: opens and migrates the store, runs the check every 30 seconds, and serves the API
// (ARCHITECTURE.md §2, §6). On Fly.io, Litestream starts this and replicates the store to R2 (P17).
// Locally: node --env-file=.env apps/backend/src/main.ts
import { PROGRAM_ADDRESS } from '@meridian/shared';
import { createSolanaRpc } from '@solana/kit';
import pino from 'pino';
import { createApp, type Role } from './app.ts';
import { createChainReader } from './chainReader.ts';
import { rpcChainSource, type RpcLike } from './chainSource.ts';
import { createCloseChain, type CloseRpc } from './closeChain.ts';
import { createCloseJobs } from './closeJobs.ts';
import { createChecker } from './checker.ts';
import { databasePath, loadConfig, operatorSigner } from './config.ts';
import { migrate, openDatabase } from './db.ts';
import { rpcTransport, type TransportRpc } from './rpcTransport.ts';
import { createSendQueue } from './sendQueue.ts';
import { listen } from './server.ts';

const env = process.env;
const role = (env.MERIDIAN_ROLE ?? 'primary') as Role;
if (role !== 'primary' && role !== 'standby') throw new Error(`MERIDIAN_ROLE must be primary or standby; it is "${role}"`);
const commit = env.GIT_COMMIT ?? 'unknown';
const log = pino({ base: { role, commit } });
const config = loadConfig(env.MERIDIAN_NETWORK ?? 'devnet');

const db = openDatabase(databasePath(env));
log.info({ step: 'migrate', applied: migrate(db) }, 'store ready');

// SOLANA_RPC_URL points the backend at another node, such as a local chain on its own ports.
const rpc = createSolanaRpc(env.SOLANA_RPC_URL || config.rpc.public);

// The chain reader (D62) runs as a job of every pass. It stores the program's events and keeps its place in the store.
const reader = createChainReader({
  db,
  source: rpcChainSource(rpc as unknown as RpcLike, PROGRAM_ADDRESS),
  program: PROGRAM_ADDRESS,
  onProgress: (p) => log.info({ step: 'reader', outcome: 'page', ...p }, 'chain reader stored a page'),
});
// The close-time jobs (D37, D97): after a market's orders close, sweep its book and return every balance. They send transactions
// signed with the operator key, so they run only on the primary and only when OPERATOR_SECRET_KEY is set.
const operator = role === 'primary' ? await operatorSigner(env) : null;
if (role === 'primary' && !operator) log.warn({ step: 'close', outcome: 'off' }, 'OPERATOR_SECRET_KEY is not set: closed markets will not be swept or returned by this backend');
const closeJobs = operator
  ? createCloseJobs({
      db,
      chain: createCloseChain({ rpc: rpc as unknown as CloseRpc, queue: createSendQueue({ transport: rpcTransport(rpc as unknown as TransportRpc), onEvent: (e) => log.info({ step: 'send', ...e }, 'send queue') }), operator }),
      onStep: (s) => log.info({ ...s, action: s.step, step: 'close' }, 'close job'),
    })
  : null;

const checker = createChecker({
  db,
  getSlot: (abortSignal) => rpc.getSlot({ commitment: 'confirmed' }).send({ abortSignal }),
  getGenesisHash: (abortSignal) => rpc.getGenesisHash().send({ abortSignal }),
  provider: 'public',
  heartbeatEverySecs: config.heartbeatEverySecs,
  readChain: async () => {
    const { transactions, events } = await reader.catchUp();
    if (transactions > 0) log.info({ step: 'reader', outcome: 'caught up', transactions, events }, 'chain reader caught up');
  },
  closeJobs: closeJobs
    ? async () => {
        const summary = await closeJobs.run();
        if (summary.sweeps + summary.returns + summary.finished > 0) log.info({ step: 'close', outcome: 'pass', ...summary }, 'close jobs ran');
      }
    : undefined,
  // The reader's failures are errors, not warnings: it has stopped at its place and needs a person (an event it cannot read, a reset).
  onError: (error, job) =>
    job === 'reader'
      ? log.error({ step: 'reader', outcome: 'stopped', err: error }, 'chain reader stopped; it keeps its place and tries again next pass')
      : job === 'close'
        ? log.error({ step: 'close', outcome: 'failed', err: error }, 'close jobs failed; the next pass looks at the chain again and sends what is still missing')
      : log.warn({ step: 'check', outcome: 'rpc error', err: error }, 'chain read failed'),
});

// The API is up before the first pass, so a quiet devnet can't hold the health check that Fly waits for.
const server = await listen(createApp({ db, role, commit, progress: checker.progress }), Number(env.PORT ?? 8080));
log.info({ step: 'listen', port: server.port, network: config.network }, 'serving');

// The next pass is scheduled when one finishes, so passes can't pile up; each read gives up after 10 seconds.
let timer: NodeJS.Timeout;
const loop = async () => {
  await checker.pass();
  timer = setTimeout(loop, config.checkEverySecs * 1000);
};
void loop();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    clearTimeout(timer);
    await server.close();
    db.close();
    log.info({ step: 'stop', signal }, 'stopped');
    process.exit(0);
  });
}
