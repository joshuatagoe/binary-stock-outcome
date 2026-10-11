// The committed client must match a fresh generation from the committed IDL (C4).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { compareTrees } from './client.mjs';

let dir, committed, fresh;
const put = (root, path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'client-'));
  committed = join(dir, 'committed');
  fresh = join(dir, 'fresh');
  for (const root of [committed, fresh]) put(root, 'accounts/config.ts', 'export const a = 1;\n');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('identical trees pass', () => {
  assert.deepEqual(compareTrees(committed, fresh), []);
});

test('a file that differs fails, naming it', () => {
  put(fresh, 'accounts/config.ts', 'export const a = 2;\n');
  assert.match(compareTrees(committed, fresh)[0] ?? '', /accounts\/config\.ts/);
});

test('a file only in the fresh generation fails', () => {
  put(fresh, 'events/new.ts', 'x');
  assert.match(compareTrees(committed, fresh)[0] ?? '', /events\/new\.ts/);
});

test('a committed file the generator no longer makes fails', () => {
  put(committed, 'old.ts', 'x');
  assert.match(compareTrees(committed, fresh)[0] ?? '', /old\.ts/);
});

test('line endings alone do not count as a difference', () => {
  put(committed, 'accounts/config.ts', 'export const a = 1;\r\n');
  assert.deepEqual(compareTrees(committed, fresh), []);
});
