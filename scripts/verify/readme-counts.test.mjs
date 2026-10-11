// Every test count the README states matches a fresh count (the OpenEMR report's lesson, D129).
// A count is written as <!-- count:SUITE -->N<!-- /count -->; any other "N tests" in the README fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReadmeCounts } from './readme-counts.mjs';

const marked = (n) => `The hook has <!-- count:hooks -->${n}<!-- /count --> tests.`;

test('a marked count that matches passes', () => {
  assert.deepEqual(checkReadmeCounts(marked(9), { hooks: 9 }), []);
});

test('a stale count fails, naming both numbers', () => {
  const problems = checkReadmeCounts(marked(9), { hooks: 10 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /hooks.*9.*10/);
});

test('a count for a suite verify did not run fails', () => {
  assert.equal(checkReadmeCounts('<!-- count:program -->40<!-- /count -->', {}).length, 1);
});

test('an unmarked test count fails', () => {
  assert.equal(checkReadmeCounts('We have 12 tests.', {}).length, 1);
  assert.equal(checkReadmeCounts('1 test passes.', {}).length, 1);
});

test('a suite verify runs without a count in the README fails', () => {
  const problems = checkReadmeCounts(marked(9), { hooks: 9, keys: 2 });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /keys/);
});

test('no README means nothing to check', () => {
  assert.deepEqual(checkReadmeCounts(null, { hooks: 9 }), []);
});
