// Every Mermaid diagram renders and none has a semicolon (AI_USAGE 11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { semicolonLines, checkDiagrams } from '../arch/check-diagrams.mjs';

const md = (...diagrams) => diagrams.map((d) => '```mermaid\n' + d + '\n```\n').join('\n');

test('a semicolon in a label is caught, one in a comment is not', () => {
  assert.equal(semicolonLines('flowchart LR\n  A["buy; sell"] --> B').length, 1);
  assert.equal(semicolonLines('flowchart LR\n  %% a comment; fine\n  A --> B').length, 0);
});

test('a valid diagram renders and a broken one fails', () => {
  const result = checkDiagrams(md('flowchart LR\n  A --> B', 'flowchart LR\n  A --> B -->'));
  assert.equal(result.count, 2);
  assert.equal(result.failed, 1);
  assert.match(result.lines[1], /FAILED/);
});
