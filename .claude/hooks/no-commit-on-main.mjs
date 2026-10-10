// PreToolUse hook (P15): refuse `git commit` while the target checkout is on main or master.
// D128 builds every slice on a branch, and parallel agents share the main checkout's history.
// Reads the hook's JSON from stdin; exit 2 blocks the call and shows stderr to Claude.
// Limits: a commit hidden inside `bash -c "…"` or a script is not seen. The ask rule on
// `git commit` in .claude/settings.json still prompts for those.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROTECTED = new Set(['main', 'master']);
const CD = new Set(['cd', 'chdir', 'pushd', 'set-location', 'sl']);

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

// Splits a command line into segments of tokens, honouring quotes.
// Separators: && || ; | & and newlines.
function segments(line) {
  const out = [];
  let seg = [];
  let tok = '';
  let has = false;
  let quote = null;
  const endTok = () => {
    if (has) seg.push(tok);
    tok = '';
    has = false;
  };
  const endSeg = () => {
    endTok();
    if (seg.length) out.push(seg);
    seg = [];
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else tok += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      has = true;
    } else if (c === ' ' || c === '\t') {
      endTok();
    } else if (c === '\n' || c === ';') {
      endSeg();
    } else if (c === '&' || c === '|') {
      if (line[i + 1] === c) i++;
      endSeg();
    } else {
      tok += c;
      has = true;
    }
  }
  endSeg();
  return out;
}

// Git Bash paths like /c/Users/... mean C:/Users/... on Windows.
function toPath(base, p) {
  const msys = /^\/([a-zA-Z])(\/|$)/.exec(p);
  if (process.platform === 'win32' && msys) p = `${msys[1]}:/${p.slice(3)}`;
  return resolve(base, p);
}

function isGit(t) {
  return /(^|[\\/])git(\.exe)?$/i.test(t);
}

// Returns the directory each `git commit` in the line would run in.
function commitDirs(line, cwd) {
  const dirs = [];
  let dir = cwd;
  for (let seg of segments(line)) {
    if (seg[0] === '&') seg = seg.slice(1);
    if (!seg.length) continue;
    const head = seg[0].toLowerCase();
    if (CD.has(head)) {
      const target = seg.slice(1).find((t) => !t.startsWith('-'));
      if (target) dir = toPath(dir, target);
      continue;
    }
    if (!isGit(seg[0])) continue;
    let gitDir = dir;
    let i = 1;
    while (i < seg.length && seg[i].startsWith('-')) {
      const opt = seg[i];
      if (opt === '-C') {
        if (seg[i + 1] !== undefined) gitDir = toPath(gitDir, seg[i + 1]);
        i += 2;
      } else if (opt === '-c' || opt === '--git-dir' || opt === '--work-tree' || opt === '--namespace') {
        i += 2;
      } else {
        i += 1;
      }
    }
    if (seg[i] === 'commit') dirs.push(gitDir);
  }
  return dirs;
}

function branchOf(dir) {
  const r = spawnSync('git', ['-C', dir, 'symbolic-ref', '--short', '-q', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

const input = readStdin();
if (!input || !['Bash', 'PowerShell'].includes(input.tool_name)) process.exit(0);
const command = input.tool_input?.command;
if (typeof command !== 'string') process.exit(0);

for (const dir of commitDirs(command, input.cwd || process.cwd())) {
  const branch = branchOf(dir);
  if (branch && PROTECTED.has(branch)) {
    process.stderr.write(
      `Refused: this would commit on ${branch} in ${dir}. ` +
        'Every slice is built on a branch (D128, P15). Create one first: git switch -c <branch>.\n',
    );
    process.exit(2);
  }
}
process.exit(0);
