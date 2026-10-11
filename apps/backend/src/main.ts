// Starts the backend: opens and migrates the store, runs the check every 30 seconds, and serves the API
// (ARCHITECTURE.md §2, §6). On Fly.io, Litestream starts this and replicates the store to R2 (P17).
// Locally: node --env-file=.env apps/backend/src/main.ts
import { createSolanaRpc } from '@solana/kit';
import pino from 'pino';
import { createApp, type Role } from './app.ts';
import { createChecker } from './checker.ts';
import { databasePath, loadConfig } from './config.ts';
import { migrate, openDatabase } from './db.ts';
import { listen } from './server.ts';

const env = process.env;
const role = (env.MERIDIAN_ROLE ?? 'primary') as Role;
if (role !== 'primary' && role !== 'standby') throw new Error(`MERIDIAN_ROLE must be primary or standby; it is "${role}"`);
const commit = env.GIT_COMMIT ?? 'unknown';
const log = pino({ base: { role, commit } });
const config = loadConfig(env.MERIDIAN_NETWORK ?? 'devnet');

const db = openDatabase(databasePath(env));
log.info({ step: 'migrate', applied: migrate(db) }, 'store ready');

const rpc = createSolanaRpc(config.rpc.public);
const checker = createChecker({
  db,
  getSlot: (abortSignal) => rpc.getSlot({ commitment: 'confirmed' }).send({ abortSignal }),
  getGenesisHash: (abortSignal) => rpc.getGenesisHash().send({ abortSignal }),
  provider: 'public',
  heartbeatEverySecs: config.heartbeatEverySecs,
  onError: (error) => log.warn({ step: 'check', outcome: 'rpc error', err: error }, 'chain read failed'),
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
