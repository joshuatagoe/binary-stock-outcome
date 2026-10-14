// A local chain for the backend's live checks (M4-b), on its own ports so it never meets `make dev` (8899, 8900). The same steps as
// scripts/dev/up.mjs: Surfpool in WSL, the built program written in at its devnet address (surfnet_writeProgram), then Initialize
// Config from scripts/devnet/init-config.ts. Nothing here edits those scripts. Run from the repository's root, on Windows:
//   node apps/backend/test/live/local-chain.ts start   # ports 8909 (RPC) and 8910 (websocket); needs .local/meridian.so
//   node apps/backend/test/live/local-chain.ts stop
// Environment: MERIDIAN_TEST_RPC_PORT (default 8909); MERIDIAN_PROGRAM_SO, a WSL path to the built program
// (default /home/joshu/.cache/meridian-target/backend-m4c/deploy/meridian.so), is copied to .local/meridian.so.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');
const LOCAL = join(ROOT, '.local');
const PORT = Number(process.env.MERIDIAN_TEST_RPC_PORT ?? 8909);
const WS_PORT = PORT + 1;
const RPC = `http://127.0.0.1:${PORT}`;
const NAMES = ['upgrade', 'admin', 'operator'];

const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
const linuxRoot = execFileSync('wsl', ['-e', 'wslpath', '-a', ROOT], { encoding: 'utf8' }).trim();
const linux = (command: string) =>
  execFileSync('wsl', ['-e', 'bash', '-lc', `cd ${quote(linuxRoot)} && ${command}`], { encoding: 'utf8' });

async function rpc(method: string, params: unknown[] = []) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json()) as { error?: { message: string }; result: any };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function until(what: string, check: () => Promise<unknown>, secs: number) {
  const deadline = Date.now() + secs * 1000;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      last = error;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${what} didn't happen within ${secs} s${last ? ` (${(last as Error).message})` : ''}`);
}

function stop() {
  // Surfpool ignores a SIGTERM in about its first 0.3 s (M0.14), so ask, wait, then force.
  // [s] keeps the pattern from matching the shell that runs pkill, whose own command line contains it.
  const mine = quote(`[s]urfpool start .*--port ${PORT} `);
  linux(`pkill -f ${mine} || true; sleep 2; pkill -9 -f ${mine} || true`);
  console.log(`stopped the local chain on port ${PORT}`);
}

async function start() {
  mkdirSync(LOCAL, { recursive: true });
  const so = process.env.MERIDIAN_PROGRAM_SO ?? '/home/joshu/.cache/meridian-target/backend-m4c/deploy/meridian.so';
  linux(`cp ${quote(so)} .local/meridian.so`);
  const program = readFileSync(join(ROOT, 'Anchor.toml'), 'utf8').match(/\[programs\.localnet\]\s*meridian\s*=\s*"(\w+)"/)![1]!;
  const out = linux(
    `set -e; mkdir -p .local/keys; for n in ${NAMES.join(' ')}; do f=.local/keys/meridian-$n.json; [ -f "$f" ] || solana-keygen new --silent --no-bip39-passphrase --outfile "$f" >/dev/null; p=$(solana-keygen pubkey "$f"); echo "key $n $p"; done`,
  );
  const keys = Object.fromEntries([...out.matchAll(/^key (\w+) (\w+)$/gm)].map((m) => [m[1]!, m[2]!]));

  stop();
  const airdrops = NAMES.map((n) => `--airdrop-keypair-path .local/keys/meridian-${n}.json`).join(' ');
  // setsid and a short wait: wsl ends the session when the command returns, which would take a plain background job with it.
  linux(
    `{ setsid nohup surfpool start --offline --no-deploy --no-tui --no-studio --port ${PORT} --ws-port ${WS_PORT} ${airdrops} --log-path .local/surfpool-${PORT} > .local/surfpool-${PORT}.out 2>&1 < /dev/null & }; sleep 3`,
  );
  await until('the local chain answering', async () => (await rpc('getSlot')) >= 0, 60);
  await until('the local keys getting SOL', async () => (await rpc('getBalance', [keys.upgrade])).value > 0, 30);

  const bytes = readFileSync(join(LOCAL, 'meridian.so'));
  for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
    await rpc('surfnet_writeProgram', [program, bytes.subarray(offset, offset + 64 * 1024).toString('hex'), offset, keys.upgrade]);
  }
  const { value } = await rpc('getAccountInfo', [program, { encoding: 'base64' }]);
  if (!value?.executable) throw new Error(`the program at ${program} isn't executable after loading`);

  const init = spawnSync(process.execPath, ['scripts/devnet/init-config.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, MERIDIAN_NETWORK: 'local', MERIDIAN_KEYS: join(LOCAL, 'keys'), SOLANA_RPC_URL: RPC, SOLANA_WS_URL: `ws://127.0.0.1:${WS_PORT}` },
  });
  if (init.status !== 0) throw new Error(`Initialize Config failed: ${init.stderr || init.stdout}`);
  console.log(init.stdout.trim());
  console.log(`local chain ready: MERIDIAN_TEST_RPC=${RPC} MERIDIAN_TEST_WS=ws://127.0.0.1:${WS_PORT} (program ${program}, keys in ${existsSync(join(LOCAL, 'keys')) ? '.local/keys' : '?'})`);
}

const command = process.argv[2];
if (command === 'start') await start();
else if (command === 'stop') stop();
else throw new Error('usage: node apps/backend/test/live/local-chain.ts start|stop');
