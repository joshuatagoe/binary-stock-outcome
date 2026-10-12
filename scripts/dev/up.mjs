// make dev (D74): the whole system on this computer, on a local chain that needs no faucet, no price source and
// no SOL (ARCHITECTURE.md §11's local column). At M0 it is the skeleton: the program and its Config on
// Surfpool's local chain, the backend, and the website labelled Local demo. Ctrl+C stops everything.
//   make dev        or  npm run dev                starts everything and keeps it running
//   make dev-check  or  npm run dev -- --check     starts everything, checks that each part answers, and stops
// On Windows, npm run dev runs the Solana tools (Anchor, solana-keygen, Surfpool) inside WSL and the Node parts
// on Windows, where npm installed them (P11). Each run starts a new chain and a new local store in .local/,
// which git ignores; the local keys in .local/keys are made once and are worth nothing outside that chain.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chunks, needsBuild, wslArgs } from './local.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const LOCAL = join(ROOT, '.local');
const WEB = join(ROOT, 'apps', 'web');
const WINDOWS = process.platform === 'win32';
const CHECK = process.argv.includes('--check');
const RPC = 'http://127.0.0.1:8899';
const WS = 'ws://127.0.0.1:8900';
const BACKEND = 'http://127.0.0.1:8080';
const WEBSITE = 'http://127.0.0.1:5173';
const PORTS = { chain: 8899, "chain's websocket": 8900, backend: 8080, website: 5173 };
// The website's own Vite, at its pin: the root folder may hold another copy that Vitest brought in.
const VITE = dirname(createRequire(join(WEB, 'package.json')).resolve('vite/package.json'));
const PROGRAM = readFileSync(join(ROOT, 'Anchor.toml'), 'utf8').match(/\[programs\.localnet\]\s*meridian\s*=\s*"(\w+)"/)[1];
const NAMES = ['upgrade', 'admin', 'operator'];

// A bash command for the Solana tools, from the repository's root.
const linuxRoot = WINDOWS ? execFileSync('wsl', ['-e', 'wslpath', '-a', ROOT], { encoding: 'utf8' }).trim() : ROOT;
const linux = (command) => (WINDOWS ? ['wsl', wslArgs(linuxRoot, command)] : ['bash', ['-lc', command]]);

const children = [];
let stopping = false;

// Starts a process with each line of its output labelled by name. keep holds on to the output, for a process that
// ends; quiet prints it only if the process fails.
function launch(name, [file, args], { env = {}, cwd = ROOT, quiet = false, keep = false } = {}) {
  const child = spawn(file, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const lines = [];
  let stdout = '';
  for (const stream of [child.stdout, child.stderr]) {
    let partial = '';
    const print = (line) => {
      if (keep) lines.push(line);
      if (!quiet && line.trim()) console.log(`[${name}] ${line}`);
    };
    stream.setEncoding('utf8');
    stream.on('data', (text) => {
      if (keep && stream === child.stdout) stdout += text;
      const parts = (partial + text).split(/\r?\n/);
      partial = parts.pop();
      parts.forEach(print);
    });
    stream.on('end', () => partial && print(partial));
  }
  child.done = new Promise((done) => {
    child.on('error', (error) => done({ code: error.code, stdout, lines: [String(error)] }));
    child.on('close', (code) => done({ code, stdout, lines }));
  });
  return child;
}

// Runs a process to the end and returns what it printed.
async function step(name, command, options = {}) {
  const { code, stdout, lines } = await launch(name, command, { ...options, keep: true }).done;
  if (code === 0) return stdout;
  if (options.quiet) for (const line of lines) console.log(`[${name}] ${line}`);
  const missing = lines.some((l) => /command not found/.test(l));
  throw new Error(`${name} failed (exit ${code})${missing ? '; install the pinned tools with bash scripts/toolchain/install.sh' : ''}`);
}

// Starts a process that runs until Ctrl+C; if it stops by itself, everything stops.
function serve(name, command, options) {
  const child = launch(name, command, options);
  children.push(child);
  child.done.then(({ code }) => {
    if (stopping) return;
    console.error(`make dev: ${name} stopped by itself (exit ${code})`);
    void stop(1);
  });
}

// Asks each part to stop, then forces any still running after 5 seconds: Surfpool ignores a SIGTERM that arrives in
// about its first 0.3 s and keeps running (M0.14).
async function stop(code) {
  if (stopping) return;
  stopping = true;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const closed = Promise.all(children.map((c) => c.done));
  for (const child of children) child.kill();
  if (!(await Promise.race([closed.then(() => true), wait(5000).then(() => false)]))) {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await Promise.race([closed, wait(2000)]);
  }
  process.exit(code);
}

// Each probe of a part gives up after 5 seconds, so a part that accepts and goes quiet can't stretch a wait.
const probe = () => AbortSignal.timeout(5_000);

// Waits until check() returns something truthy, trying again every quarter second.
async function until(what, check, secs) {
  const deadline = Date.now() + secs * 1000;
  let last;
  while (Date.now() < deadline && !stopping) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${what} didn't happen within ${secs} s${last ? ` (${last.message})` : ''}`);
}

async function rpc(method, params = []) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: probe(),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

const inUse = (port) =>
  new Promise((answer) => {
    const socket = connect(port, '127.0.0.1');
    socket.once('connect', () => (socket.destroy(), answer(true)));
    socket.once('error', () => answer(false));
  });

// The program's own files: a change to any of them after the last build means building again.
function sourceTimes() {
  const files = ['Cargo.toml', 'Cargo.lock', 'Anchor.toml', 'rust-toolchain.toml'].map((f) => join(ROOT, f));
  const src = join(ROOT, 'programs', 'meridian');
  for (const f of readdirSync(src, { recursive: true })) {
    if (!String(f).startsWith('tests')) files.push(join(src, String(f)));
  }
  return files.filter((f) => existsSync(f) && statSync(f).isFile()).map((f) => statSync(f).mtimeMs);
}

const timings = [];
async function phase(name, fn) {
  const start = Date.now();
  const result = await fn();
  timings.push(`${name} ${((Date.now() - start) / 1000).toFixed(1)} s`);
  return result;
}

async function main() {
  const start = Date.now();
  for (const [name, port] of Object.entries(PORTS)) {
    if (await inUse(port)) throw new Error(`port ${port}, for the ${name}, is in use; stop whatever runs there first`);
  }
  // npm installs compiled parts for the system it runs on, so the website starts only where npm ci ran: a Windows
  // checkout's packages fail inside WSL (P11). Vite's bundler is one such part.
  try {
    await import(pathToFileURL(createRequire(join(VITE, 'package.json')).resolve('rolldown')).href);
  } catch {
    throw new Error("the website's packages were installed for another system: Vite's bundler has no compiled part for this one. Run make dev where npm ci ran (on Windows: npm run dev), or run npm ci here.");
  }
  mkdirSync(LOCAL, { recursive: true });

  const so = join(LOCAL, 'meridian.so');
  await phase('build', async () => {
    if (!needsBuild(existsSync(so) ? statSync(so).mtimeMs : null, sourceTimes())) return;
    // Anchor would refuse a build whose key file doesn't match the program's address; the program's key isn't
    // needed here, so --ignore-keys. The build lands in CARGO_TARGET_DIR (scripts/program/env.sh). In a new build
    // folder Anchor makes a random program key in deploy/; it is removed again, so that scripts/program/build.sh
    // can still put the real one there (D92).
    await step('build', linux([
      'set -e; source scripts/program/env.sh; t="${CARGO_TARGET_DIR:-target}"; k="$t/deploy/meridian-keypair.json"',
      '[ -f "$k" ] && had=1 || had=0',
      'anchor build --ignore-keys || { [ "$had" = 1 ] || rm -f "$k"; exit 1; }',
      '[ "$had" = 1 ] || rm -f "$k"',
      'cp "$t/deploy/meridian.so" .local/meridian.so',
    ].join('; ')));
  });

  const keys = await phase('keys', async () => {
    const out = await step(
      'keys',
      linux(`set -e; mkdir -p .local/keys; for n in ${NAMES.join(' ')}; do f=.local/keys/meridian-$n.json; [ -f "$f" ] || solana-keygen new --silent --no-bip39-passphrase --outfile "$f" >/dev/null; p=$(solana-keygen pubkey "$f"); echo "key $n $p"; done`),
      { quiet: true },
    );
    return Object.fromEntries([...out.matchAll(/^key (\w+) (\w+)$/gm)].map((m) => [m[1], m[2]]));
  });
  for (const name of NAMES) if (!keys[name]) throw new Error(`no local ${name} key`);

  await phase('chain', async () => {
    for (const suffix of ['', '-shm', '-wal']) rmSync(join(LOCAL, `meridian.db${suffix}`), { force: true });
    const airdrops = NAMES.map((n) => `--airdrop-keypair-path .local/keys/meridian-${n}.json`).join(' ');
    serve('chain', linux(`exec surfpool start --offline --no-deploy --no-tui --no-studio --port 8899 --ws-port 8900 ${airdrops} --log-path .local/surfpool`));
    await until('the local chain answering', async () => (await rpc('getSlot')) >= 0, 60);
    await until('the local keys getting SOL', async () => (await rpc('getBalance', [keys.upgrade])).value > 0, 30);
  });

  await phase('program', async () => {
    // Surfpool writes the program straight into the chain, with the local upgrade key as its upgrade authority,
    // so no deploy and no program key are needed (M0.14).
    for (const { offset, hex } of chunks(readFileSync(so), 64 * 1024)) {
      await rpc('surfnet_writeProgram', [PROGRAM, hex, offset, keys.upgrade]);
    }
    const { value } = await rpc('getAccountInfo', [PROGRAM, { encoding: 'base64' }]);
    if (!value?.executable) throw new Error(`the program at ${PROGRAM} isn't executable after loading`);
  });

  await phase('config', () =>
    step('config', [process.execPath, ['scripts/devnet/init-config.ts']], {
      env: { MERIDIAN_NETWORK: 'local', MERIDIAN_KEYS: join(LOCAL, 'keys'), SOLANA_RPC_URL: RPC, SOLANA_WS_URL: WS },
    }),
  );

  await phase('backend', async () => {
    serve('backend', [process.execPath, ['apps/backend/src/main.ts']], {
      env: { MERIDIAN_NETWORK: 'local', DATABASE_PATH: join(LOCAL, 'meridian.db'), PORT: '8080' },
    });
    await until('the backend reading the chain', async () => {
      const res = await fetch(`${BACKEND}/api/health`, { signal: probe() });
      return res.ok && (await res.json()).chain?.slot != null;
    }, 60);
  });

  await phase('website', async () => {
    serve('website', [process.execPath, [join(VITE, 'bin', 'vite.js'), '--mode', 'localnet', '--host', '127.0.0.1', '--port', '5173', '--strictPort']], {
      cwd: WEB,
    });
    await until('the website answering', async () => (await fetch(WEBSITE, { signal: probe() })).ok, 60);
    // The page reads the chain from the browser, so the chain must accept the website's origin.
    const res = await fetch(RPC, {
      method: 'OPTIONS',
      headers: { Origin: WEBSITE, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      signal: probe(),
    });
    const allowed = res.headers.get('access-control-allow-origin');
    if (allowed !== '*' && allowed !== WEBSITE) throw new Error(`the local chain doesn't let ${WEBSITE} read it (${allowed})`);
    const network = await (await fetch(`${WEBSITE}/src/network.ts`, { signal: probe() })).text();
    if (!/"MODE":\s*"localnet"/.test(network)) throw new Error('the website is not in its local mode');
  });

  console.log(`
make dev: ready in ${((Date.now() - start) / 1000).toFixed(1)} s (${timings.join(', ')})
  website  ${WEBSITE}  (Local demo)
  backend  ${BACKEND}/api/health
  chain    ${RPC}
  program  ${PROGRAM}
${CHECK ? 'Every part answered; stopping (--check).' : 'Ctrl+C stops everything.'}`);
  if (CHECK) await stop(0);
}

// Ctrl+C, a closed terminal, or a kill: everything stops. A wait cut short by stopping is not an error.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => void stop(0));
main().catch((error) => {
  if (!stopping) console.error(`make dev: ${error.message}`);
  void stop(1);
});
