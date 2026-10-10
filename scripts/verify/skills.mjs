// Each skill's source in .cursor/skills and its copy in .claude/skills are identical (AGENTS.md, Skills).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE = '.cursor/skills';
const COPY = '.claude/skills';

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)).replaceAll('\\', '/'));
}

export function checkSkillMirror(root) {
  const source = new Set(filesUnder(join(root, SOURCE)));
  const copy = new Set(filesUnder(join(root, COPY)));
  const problems = [];
  for (const file of source) {
    if (!copy.has(file)) problems.push(`${SOURCE}/${file} has no copy in ${COPY}/`);
    else if (!readFileSync(join(root, SOURCE, file)).equals(readFileSync(join(root, COPY, file)))) {
      problems.push(`${COPY}/${file} differs from ${SOURCE}/${file}; edit the .cursor source, then copy it`);
    }
  }
  for (const file of copy) {
    if (!source.has(file)) problems.push(`${COPY}/${file} has no source in ${SOURCE}/`);
  }
  return problems;
}
