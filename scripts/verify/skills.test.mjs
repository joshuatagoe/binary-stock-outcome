// Each skill's .cursor/skills source and .claude/skills copy are identical (AGENTS.md, Skills).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkSkillMirror } from './skills.mjs';

let root;
const put = (path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'skills-'));
  put('.cursor/skills/grill/SKILL.md', '# Grill\n');
  put('.claude/skills/grill/SKILL.md', '# Grill\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test('identical copies pass', () => {
  assert.deepEqual(checkSkillMirror(root), []);
});

test('a copy that differs fails', () => {
  put('.claude/skills/grill/SKILL.md', '# Grill, edited only here\n');
  assert.match(checkSkillMirror(root)[0] ?? '', /grill\/SKILL\.md/);
});

test('a skill with no .claude copy fails', () => {
  put('.cursor/skills/new/SKILL.md', '# New\n');
  assert.match(checkSkillMirror(root)[0] ?? '', /new/);
});

test('a skill that exists only in .claude fails', () => {
  put('.claude/skills/stray/SKILL.md', '# Stray\n');
  assert.match(checkSkillMirror(root)[0] ?? '', /stray/);
});

test('an extra file on one side fails', () => {
  put('.cursor/skills/grill/notes.md', 'extra\n');
  assert.match(checkSkillMirror(root)[0] ?? '', /notes\.md/);
});
