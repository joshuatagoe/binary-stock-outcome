// The backend's smoke test (D132): after a deploy, /api/health answers 200 for the commit just deployed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeHealth } from './backend.mjs';

const SHA = '5b897c12db71e8dee195d2994430e7636c0fe8ec';
const body = {
  role: 'primary',
  commit: SHA,
  last_pass_at: '2026-10-11T18:46:18.009Z',
  chain: { slot: 509997097, seen_at: '2026-10-11T18:46:18.000Z' },
  database: { answers: true, migrations: { applied: ['0001_heartbeats_alerts'], current: true } },
};

test('a healthy primary at the deployed commit passes', () => {
  assert.deepEqual(judgeHealth(200, body, SHA), []);
});

test('the old build still serving fails, naming both commits', () => {
  const problems = judgeHealth(200, { ...body, commit: 'e4b663a18136800ef46ae094b22f2971b2bbc0a0' }, SHA);
  assert.match(problems[0] ?? '', /e4b663a.*5b897c1/);
});

test('a 503, a quiet database or pending migrations fail', () => {
  assert.equal(judgeHealth(503, body, SHA).length, 1);
  assert.match(judgeHealth(200, { ...body, database: { answers: false, migrations: null } }, SHA)[0] ?? '', /database/);
  const pending = { ...body, database: { answers: true, migrations: { applied: [], current: false } } };
  assert.match(judgeHealth(200, pending, SHA)[0] ?? '', /migrations/);
});

test('the primary must be the primary', () => {
  assert.match(judgeHealth(200, { ...body, role: 'standby' }, SHA)[0] ?? '', /standby/);
});
