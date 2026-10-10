// Checks that each tool in WSL is at its pin in scripts/toolchain/pins.sh. Run it in WSL:
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/toolchain/check.mjs"
// `npm run verify` imports checkPinsAgree() to keep rust-toolchain.toml and .nvmrc in step with the pins.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Each tool: its pin's name, the command that prints its version, and where the version sits in the output.
const TOOLS = [
  { pin: 'RUST', cmd: 'rustc', args: ['--version'], version: /^rustc (\S+)/ },
  { pin: 'AGAVE', cmd: 'solana', args: ['--version'], version: /^solana-cli (\S+)/ },
  { pin: 'ANCHOR', cmd: 'anchor', args: ['--version'], version: /^anchor-cli (\S+)/ },
  { pin: 'SURFPOOL', cmd: 'surfpool', args: ['--version'], version: /^surfpool (\S+)/ },
  { pin: 'SOLANA_VERIFY', cmd: 'solana-verify', args: ['--version'], version: /^solana-verify (\S+)/ },
  { pin: 'LITESTREAM', cmd: 'litestream', args: ['version'], version: /^v?(\d+\.\d+\.\d+)/ },
  { pin: 'NODE', cmd: 'node', args: ['--version'], version: /^v(\S+)/ },
];

export function readPins(text) {
  const pins = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(\S+)\s*$/);
    if (m) pins[m[1]] = m[2];
  }
  return pins;
}

// run(cmd, args) returns the command's output, or throws if it can't run.
export function checkToolchain(pins, run) {
  const problems = [];
  for (const { pin, cmd, args, version } of TOOLS) {
    let output;
    try { output = run(cmd, args).trim(); } catch { problems.push(`${cmd} is not installed (pin ${pins[pin]})`); continue; }
    const found = output.match(version)?.[1];
    if (found !== pins[pin]) problems.push(`${cmd} is ${found ?? `unreadable ("${output}")`}; the pin is ${pins[pin]}`);
  }
  return problems;
}

export function checkPinsAgree(pins, { rustToolchain, nvmrc }) {
  const problems = [];
  const channel = rustToolchain.match(/^\s*channel\s*=\s*"([^"]+)"/m)?.[1];
  if (channel !== pins.RUST) problems.push(`rust-toolchain.toml says ${channel}; pins.sh says ${pins.RUST}`);
  if (nvmrc.trim() !== pins.NODE) problems.push(`.nvmrc says ${nvmrc.trim()}; pins.sh says ${pins.NODE}`);
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pins = readPins(readFileSync(join(ROOT, 'scripts/toolchain/pins.sh'), 'utf8'));
  const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const problems = checkToolchain(pins, run);
  for (const { pin, cmd } of TOOLS) {
    const bad = problems.find((p) => p.startsWith(`${cmd} `));
    console.log(`${bad ? 'FAIL' : 'ok  '}  ${cmd.padEnd(14)} ${bad ?? pins[pin]}`);
  }
  process.exit(problems.length ? 1 : 0);
}
