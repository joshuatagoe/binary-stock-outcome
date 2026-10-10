// The push script runs verify first and pushes to origin and gitlab only if it passes (ARCHITECTURE.md §10).
// The remotes here are bare repositories in a temporary folder; nothing leaves the machine.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pushBranch, syncMain } from '../push.mjs';

let dir, repo;
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
const commit = (msg) => git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', msg);
const remoteSha = (remote, branch) =>
  git(dir, 'ls-remote', join(dir, `${remote}.git`), `refs/heads/${branch}`).split(/\s/)[0] || null;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'push-test-'));
  for (const remote of ['origin', 'gitlab']) git(dir, 'init', '-q', '--bare', '-b', 'main', `${remote}.git`);
  repo = join(dir, 'work');
  git(dir, 'init', '-q', '-b', 'main', repo);
  commit('root');
  for (const remote of ['origin', 'gitlab']) {
    git(repo, 'remote', 'add', remote, join(dir, `${remote}.git`));
    git(repo, 'push', '-q', remote, 'main');
  }
  git(repo, 'switch', '-q', '-c', 'm0/slice');
  commit('work');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('when verify fails, nothing is pushed', () => {
  const result = pushBranch({ cwd: repo, verify: () => false });
  assert.equal(result.ok, false);
  assert.equal(remoteSha('origin', 'm0/slice'), null);
  assert.equal(remoteSha('gitlab', 'm0/slice'), null);
});

test('when verify passes, the branch reaches both remotes', () => {
  const result = pushBranch({ cwd: repo, verify: () => true });
  assert.equal(result.ok, true);
  const head = git(repo, 'rev-parse', 'HEAD');
  assert.equal(remoteSha('origin', 'm0/slice'), head);
  assert.equal(remoteSha('gitlab', 'm0/slice'), head);
});

test('main is refused before verify runs', () => {
  git(repo, 'switch', '-q', 'main');
  let ran = false;
  const result = pushBranch({ cwd: repo, verify: () => (ran = true) });
  assert.equal(result.ok, false);
  assert.equal(ran, false);
});

test('uncommitted changes are refused, since verify would check files the push leaves out', () => {
  writeFileSync(join(repo, 'loose.txt'), 'not committed');
  const result = pushBranch({ cwd: repo, verify: () => true });
  assert.equal(result.ok, false);
  assert.equal(remoteSha('origin', 'm0/slice'), null);
});

test('after a merge on GitHub, syncMain copies origin main to gitlab', () => {
  git(repo, 'push', '-q', 'origin', 'm0/slice:main');
  const merged = remoteSha('origin', 'main');
  assert.notEqual(remoteSha('gitlab', 'main'), merged);
  const result = syncMain({ cwd: repo });
  assert.equal(result.ok, true);
  assert.equal(remoteSha('gitlab', 'main'), merged);
});
