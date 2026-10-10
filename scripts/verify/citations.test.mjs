// Every D and P number cited must be a row in DECISIONS.md, and every finding ID must have its heading.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCitations } from './citations.mjs';

const DECISIONS = `# Decisions

## Decision log

| # | From | Decision |
|---|---|---|
| D1 | Q1 | One |
| D2 | Q2 | Two |

## Process decisions

| # | Decision |
|---|---|
| P1 | Process one |
`;

const ANSWERS = `
## Answers given before the question round

| D9 | An answer row refers to a decision; it doesn't define one |
`;

const docs = (extra = {}) => new Map([
  ['docs/DECISIONS.md', DECISIONS],
  ['docs/research/r.md', '### AR.01 A finding\n\n### F2.05 [D1] CONFIRMED\n'],
  ...Object.entries(extra),
]);

test('defined decisions, process decisions and findings pass', () => {
  assert.deepEqual(checkCitations(docs({ 'docs/a.md': 'D1, D2 and P1 (AR.01; F2.05). See also D2.' })), []);
});

test('an undefined decision number fails, naming the file', () => {
  const problems = checkCitations(docs({ 'docs/a.md': 'As D140 says, nothing.' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /D140/);
  assert.match(problems[0], /docs\/a\.md/);
});

test('a citation that ends a sentence still counts', () => {
  assert.match(checkCitations(docs({ 'docs/a.md': 'Logged as D140.' }))[0] ?? '', /D140/);
});

test('an undefined process number fails', () => {
  assert.match(checkCitations(docs({ 'docs/a.md': 'Per P20.' }))[0] ?? '', /P20/);
});

test('a row outside the two decision tables does not define an ID', () => {
  const problems = checkCitations(docs({ 'docs/DECISIONS.md': DECISIONS + ANSWERS, 'docs/a.md': 'See D9.' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /D9/);
});

test('a finding with no heading fails', () => {
  const problems = checkCitations(docs({ 'docs/a.md': 'AR.16 and F3.02 say so.' }));
  assert.equal(problems.length, 2);
});

test('milestone measurement IDs (M0.01) are findings too', () => {
  assert.equal(checkCitations(docs({ 'docs/a.md': 'Measured in M0.02.' })).length, 1);
  assert.deepEqual(checkCitations(docs({ 'docs/r2.md': '### M0.02 [P1] CONFIRMED\n', 'docs/a.md': 'Measured in M0.02.' })), []);
});

test('an allowed ID passes', () => {
  assert.deepEqual(
    checkCitations(docs({ 'docs/a.md': 'The report has no F5.07.' }), { 'F5.07': 'The G5 report skipped it.' }),
    [],
  );
});

test('text that only looks like an ID is ignored', () => {
  assert.deepEqual(checkCitations(docs({ 'docs/a.md': 'P&L at p95, XD12, D12x, v1.D2, 3P1.' })), []);
});
