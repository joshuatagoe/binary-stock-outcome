// Tests for the PreToolUse hook that refuses `git commit` on main (P15).
// Run: node --test .claude/hooks/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'no-commit-on-main.mjs');
let repo;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'hook-test-'));
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'root');
  git(repo, 'branch', 'lane/program');
  git(repo, 'worktree', 'add', '-q', join(repo, 'wt'), 'lane/program');
});

after(() => rmSync(repo, { recursive: true, force: true }));

function run(command, { tool = 'Bash', cwd = repo } = {}) {
  const input = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { command }, cwd });
  const r = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8' });
  return { code: r.status, stderr: r.stderr };
}

test('blocks a commit on main', () => {
  const r = run('git commit -m "x"');
  assert.equal(r.code, 2);
  assert.match(r.stderr, /main/);
});

test('blocks a commit on main from PowerShell', () => {
  assert.equal(run('git commit -m x', { tool: 'PowerShell' }).code, 2);
});

test('blocks a commit on main after other commands in the same line', () => {
  assert.equal(run('git add -A && git commit -m x').code, 2);
});

test('blocks git -C <main checkout> commit, even from inside a worktree', () => {
  assert.equal(run(`git -C "${repo}" commit -m x`, { cwd: join(repo, 'wt') }).code, 2);
});

test('blocks cd <main checkout> && git commit', () => {
  assert.equal(run(`cd "${repo}" && git commit -m x`, { cwd: join(repo, 'wt') }).code, 2);
});

test('allows a commit on a lane branch', () => {
  assert.equal(run('git commit -m x', { cwd: join(repo, 'wt') }).code, 0);
});

test('allows git -C <worktree> commit from the main checkout', () => {
  assert.equal(run(`git -C wt commit -m x`).code, 0);
});

test('ignores commands that only mention commit', () => {
  assert.equal(run('git log --oneline -3').code, 0);
  assert.equal(run('echo "git commit later"').code, 0);
  assert.equal(run('git status').code, 0);
});

test('ignores other tools and malformed input', () => {
  const input = JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' }, cwd: repo });
  assert.equal(spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' }).status, 0);
});
