// export-key.mjs prints a secret key only to a terminal, so a pipe, a file or an agent's tool gets nothing.
// The tests point HOME at a fresh folder holding a throwaway key, so a broken guard can't print a real one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'export-key.mjs');

function run(...args) {
  const home = mkdtempSync(join(tmpdir(), 'export-key-'));
  mkdirSync(join(home, '.config', 'solana'), { recursive: true });
  writeFileSync(join(home, '.config', 'solana', 'meridian-admin.json'), JSON.stringify(Array.from({ length: 64 }, (_, i) => i + 1)));
  return spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: 'utf8' });
}

test('it refuses to print a key into a pipe', () => {
  const r = run('admin');
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /terminal/);
});

test('an unknown key name is refused', () => {
  const r = run('bot');
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /admin\|upgrade\|operator\|program/);
});
