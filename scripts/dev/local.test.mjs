// make dev's helpers (D74): loading the program in chunks, deciding when to rebuild, and running from Windows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunks, needsBuild, wslArgs } from './local.mjs';

test('the program is sent in chunks that cover every byte, as plain hex', () => {
  const bytes = Buffer.from(Array.from({ length: 10 }, (_, i) => i));
  const parts = chunks(bytes, 4);
  assert.deepEqual(parts.map((p) => p.offset), [0, 4, 8]);
  assert.equal(parts.map((p) => p.hex).join(''), bytes.toString('hex'));
  assert.ok(parts.every((p) => !p.hex.startsWith('0x')), 'Surfpool refuses a 0x prefix');
});

test('it rebuilds when the program is missing or older than any of its sources', () => {
  assert.equal(needsBuild(null, [100]), true);
  assert.equal(needsBuild(200, [100, 150]), false);
  assert.equal(needsBuild(200, [100, 250]), true);
});

test('on Windows the Solana tools run inside WSL, from the same folder', () => {
  assert.deepEqual(wslArgs("/mnt/c/dev/it's here", 'exec surfpool start --offline'), [
    '-e',
    'bash',
    '-lc',
    "cd '/mnt/c/dev/it'\\''s here' && exec surfpool start --offline",
  ]);
});
