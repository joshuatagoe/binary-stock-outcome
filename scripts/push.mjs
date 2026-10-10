// npm run push: run verify, then push the current branch to origin (GitHub) and gitlab, one explicit command each.
// npm run push -- --sync-main: after a pull request merges on GitHub, copy origin's main to gitlab.
// Merges happen only on GitHub, where main is protected (D128); gitlab mirrors it.
// Claude Code asks the user before running this script (P14), and AGENTS.md needs their OK for every push.
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REMOTES = ['origin', 'gitlab'];
const PROTECTED = ['main', 'master'];
const VERIFY = join(dirname(fileURLToPath(import.meta.url)), 'verify', 'index.mjs');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

const runVerify = (cwd) => spawnSync(process.execPath, [VERIFY], { cwd, stdio: 'inherit' }).status === 0;

export function pushBranch({ cwd = process.cwd(), verify = runVerify } = {}) {
  const branch = git(cwd, 'branch', '--show-current');
  if (!branch) return { ok: false, lines: ['Not on a branch; nothing pushed.'] };
  if (PROTECTED.includes(branch)) {
    return { ok: false, lines: [`${branch} is protected: push a branch and merge it through a pull request on GitHub.`] };
  }
  if (git(cwd, 'status', '--porcelain')) {
    return { ok: false, lines: ['Uncommitted changes: verify would check files this push leaves out. Commit or stash them first.'] };
  }
  if (!verify(cwd)) return { ok: false, lines: ['verify failed; nothing pushed.'] };

  const lines = [];
  for (const remote of REMOTES) {
    try {
      git(cwd, 'push', ...(remote === 'origin' ? ['--set-upstream'] : []), remote, branch);
      lines.push(`pushed ${branch} to ${remote}`);
    } catch (e) {
      lines.push(`push to ${remote} failed: ${String(e.stderr || e.message).trim()}`);
      return { ok: false, lines };
    }
  }
  return { ok: true, lines };
}

export function syncMain({ cwd = process.cwd() } = {}) {
  try {
    git(cwd, 'fetch', 'origin', 'main');
    const sha = git(cwd, 'rev-parse', 'refs/remotes/origin/main');
    // No force: if gitlab's main has anything origin's lacks, git refuses and a person looks.
    git(cwd, 'push', 'gitlab', `${sha}:refs/heads/main`);
    return { ok: true, lines: [`gitlab main is now ${sha.slice(0, 7)}, the same as origin main`] };
  } catch (e) {
    return { ok: false, lines: [`sync failed: ${String(e.stderr || e.message).trim()}`] };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = process.argv.includes('--sync-main') ? syncMain() : pushBranch();
  for (const line of result.lines) console.log(line);
  process.exit(result.ok ? 0 : 1);
}
