// Verify reads a Vitest run's JSON report: the test count for the README, and each failure by name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readVitestReport } from './vitest.mjs';

const report = (files) => JSON.stringify({ numTotalTests: files.flatMap((f) => f.assertionResults).length, testResults: files });
const passed = { name: '/a.test.ts', status: 'passed', message: '', assertionResults: [{ fullName: 'a works', status: 'passed' }] };

test('a passing run gives its count and no problems', () => {
  assert.deepEqual(readVitestReport({ status: 0, stdout: report([passed]), stderr: '' }), { count: 1, problems: [] });
});

test('a failing test is named', () => {
  const failing = { name: '/b.test.ts', status: 'failed', message: '', assertionResults: [{ fullName: 'b refuses', status: 'failed' }] };
  assert.deepEqual(readVitestReport({ status: 1, stdout: report([passed, failing]), stderr: '' }).problems, ['failed: b refuses']);
});

test('a file that fails to load is named, with its message', () => {
  const broken = { name: '/c.test.ts', status: 'failed', message: "Cannot find module '../src/c.ts'\nstack", assertionResults: [] };
  assert.deepEqual(readVitestReport({ status: 1, stdout: report([broken]), stderr: '' }).problems, [
    "failed to load: /c.test.ts: Cannot find module '../src/c.ts'",
  ]);
});

test('output that is not a report fails with the end of what was printed', () => {
  const { count, problems } = readVitestReport({ status: 1, stdout: 'not json', stderr: 'Error: config broken' });
  assert.ok(Number.isNaN(count));
  assert.match(problems[0], /config broken/);
});
