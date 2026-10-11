// The committed client in clients/ts/src/generated matches what Codama generates from clients/idl (C4).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(root, join(e.parentPath, e.name)).replaceAll('\\', '/'));
}

const text = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');

// committed: the folder in the repo; fresh: a new generation of it.
export function compareTrees(committed, fresh) {
  const a = new Set(files(committed));
  const b = new Set(files(fresh));
  const problems = [];
  for (const f of b) {
    if (!a.has(f)) problems.push(`${f} is generated but not committed; run npm run client`);
    else if (text(join(committed, f)) !== text(join(fresh, f))) problems.push(`${f} is stale; run npm run client`);
  }
  for (const f of a) if (!b.has(f)) problems.push(`${f} is committed but no longer generated; run npm run client`);
  return problems;
}
