// Verify reads a Playwright run's JSON report: the test count for the README, and each failure by name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPlaywrightReport } from './playwright.mjs';

const spec = (title, ok) => ({ title, ok, tests: [{ projectName: 'built' }] });
const report = (specs, stats) =>
  JSON.stringify({ suites: [{ title: 'home.spec.ts', specs: [], suites: [{ title: 'page', specs }] }], errors: [], stats });

test('a passing run gives its count and no problems', () => {
  const r = report([spec('shows the stocks', true)], { expected: 6, unexpected: 0, flaky: 0, skipped: 0 });
  assert.deepEqual(readPlaywrightReport({ status: 0, report: r, stderr: '' }), { count: 6, problems: [] });
});

test('a failing test is named, with its file', () => {
  const r = report([spec('shows the stocks', true), spec('has no violations', false)], { expected: 5, unexpected: 1, flaky: 0, skipped: 0 });
  assert.deepEqual(readPlaywrightReport({ status: 1, report: r, stderr: '' }).problems, ['failed: home.spec.ts › page › has no violations']);
});

test('a run that never started, such as a missing browser, fails with the end of what was printed', () => {
  const { count, problems } = readPlaywrightReport({ status: 1, report: '', stderr: "Executable doesn't exist; run npx playwright install" });
  assert.ok(Number.isNaN(count));
  assert.match(problems[0], /playwright install/);
});
