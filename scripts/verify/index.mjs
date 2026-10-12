// npm run verify: the one check command, the same on the laptop and in CI (ARCHITECTURE.md §10, D129).
// It checks the files the next commit would hold: tracked files plus new ones git doesn't ignore.
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCitations } from './citations.mjs';
import { checkSecrets } from './secrets.mjs';
import { checkSkillMirror } from './skills.mjs';
import { checkReadmeCounts } from './readme-counts.mjs';
import { checkDiagrams } from '../arch/check-diagrams.mjs';
import { readPins, checkPinsAgree } from '../toolchain/check.mjs';
import { compareTrees } from './client.mjs';
import { readVitestReport } from './vitest.mjs';
import { readPlaywrightReport } from './playwright.mjs';
import { generateClient, PACKAGE, GENERATED } from '../client/generate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAX_BYTES = 5 * 1024 * 1024;

// Test suites whose counts the README may state, by name.
const SUITES = {
  hooks: '.claude/hooks/*.test.mjs',
  verify: 'scripts/verify/*.test.mjs',
  toolchain: 'scripts/toolchain/*.test.mjs',
  keys: 'scripts/keys/*.test.mjs',
  smoke: 'scripts/smoke/*.test.mjs',
  dev: 'scripts/dev/*.test.mjs',
};

// Vitest suites (ARCHITECTURE.md §9), by name and folder.
const VITEST_SUITES = {
  shared: 'packages/shared',
  backend: 'apps/backend',
  web: 'apps/web',
};

// Playwright suites (D116), by name and folder. Their browser comes from `npx playwright install chromium`.
const PLAYWRIGHT_SUITES = {
  'web-e2e': 'apps/web',
};

function repoTexts() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT });
  const texts = new Map();
  for (const path of out.toString('utf8').split('\0').filter(Boolean)) {
    const full = join(ROOT, path);
    if (!existsSync(full) || statSync(full).size > MAX_BYTES) continue;
    const bytes = readFileSync(full);
    if (bytes.includes(0)) continue; // binary
    texts.set(path, bytes.toString('utf8'));
  }
  return texts;
}

function runSuite(glob) {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', glob], { cwd: ROOT, encoding: 'utf8' });
  const count = Number(r.stdout.match(/^# tests (\d+)$/m)?.[1] ?? NaN);
  const failed = [...r.stdout.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map((m) => m[1]);
  const problems = r.status === 0 ? [] : failed.length ? failed.map((t) => `failed: ${t}`) : [(r.stderr || r.stdout).slice(-800)];
  return { count, problems };
}

const results = [];
function step(name, fn) {
  const start = Date.now();
  let problems, note = '';
  try { ({ problems, note = '' } = fn()); } catch (e) { problems = [String(e.stack || e)]; }
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${name}${note ? ` (${note})` : ''}  ${secs}s`);
  for (const p of problems) console.log(`        ${p.replaceAll('\n', '\n        ')}`);
  results.push({ name, problems });
}

step('Node version matches .nvmrc', () => {
  const pinned = readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim();
  const running = process.version.slice(1);
  return { problems: running === pinned ? [] : [`running Node ${running}; .nvmrc pins ${pinned}`], note: running };
});

step('pins: rust-toolchain.toml, .nvmrc, Cargo.toml, Anchor.toml, the build image and the backend image agree with scripts/toolchain/pins.sh', () => {
  const read = (path) => readFileSync(join(ROOT, path), 'utf8');
  return {
    problems: checkPinsAgree(readPins(read('scripts/toolchain/pins.sh')), {
      rustToolchain: read('rust-toolchain.toml'), nvmrc: read('.nvmrc'), cargoToml: read('Cargo.toml'), anchorToml: read('Anchor.toml'),
      dockerfile: read('apps/backend/Dockerfile'),
    }),
  };
});

const counts = {};
for (const [suite, glob] of Object.entries(SUITES)) {
  step(`tests: ${suite}`, () => {
    const { count, problems } = runSuite(glob);
    counts[suite] = count;
    return { problems, note: `${count} tests` };
  });
}
for (const [suite, dir] of Object.entries(VITEST_SUITES)) {
  step(`tests: ${suite}`, () => {
    // Vitest writes its JSON report to a file, so it goes to a temporary folder.
    const vitest = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
    const out = mkdtempSync(join(tmpdir(), 'vitest-'));
    const r = spawnSync(process.execPath, [vitest, 'run', '--reporter=json', `--outputFile=${join(out, 'report.json')}`], { cwd: join(ROOT, dir), encoding: 'utf8' });
    const report = existsSync(join(out, 'report.json')) ? readFileSync(join(out, 'report.json'), 'utf8') : '';
    rmSync(out, { recursive: true, force: true });
    const { count, problems } = readVitestReport({ status: r.status, stdout: report, stderr: r.stderr || r.stdout });
    counts[suite] = count;
    return { problems, note: `${count} tests` };
  });
}
for (const [suite, dir] of Object.entries(PLAYWRIGHT_SUITES)) {
  step(`tests: ${suite}`, () => {
    const out = mkdtempSync(join(tmpdir(), 'playwright-'));
    const file = join(out, 'report.json');
    const cli = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
    const r = spawnSync(process.execPath, [cli, 'test', '--reporter=json'], {
      cwd: join(ROOT, dir), encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: file },
    });
    const report = existsSync(file) ? readFileSync(file, 'utf8') : '';
    rmSync(out, { recursive: true, force: true });
    const { count, problems } = readPlaywrightReport({ status: r.status, report, stderr: r.stderr || r.stdout });
    counts[suite] = count;
    return { problems, note: `${count} tests` };
  });
}

const texts = repoTexts();
const markdown = new Map([...texts].filter(([path]) => path.endsWith('.md')));

step('citations: every D, P and finding ID cited exists', () => {
  const allow = JSON.parse(readFileSync(join(ROOT, 'scripts/verify/citations-allow.json'), 'utf8'));
  return { problems: checkCitations(markdown, allow), note: `${markdown.size} Markdown files` };
});

step('skills: .cursor and .claude copies match', () => ({ problems: checkSkillMirror(ROOT) }));

step('secrets: no key files or tokens', () => ({ problems: checkSecrets(texts), note: `${texts.size} files` }));

// The generator is asynchronous, so it runs here and its output is compared inside the step.
const clientDir = mkdtempSync(join(tmpdir(), 'client-'));
let clientError = null;
try { await generateClient(clientDir); } catch (e) { clientError = e; }
step('client: clients/ts matches a fresh generation from clients/idl', () => {
  if (clientError) throw clientError;
  return { problems: compareTrees(join(PACKAGE, GENERATED), join(clientDir, GENERATED)) };
});
rmSync(clientDir, { recursive: true, force: true });

// Every TypeScript project in the repository, by its tsconfig folder.
for (const project of ['clients/ts', 'packages/shared', 'scripts/devnet', 'apps/backend', 'apps/web']) {
  step(`typecheck: ${project}`, () => {
    const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
    const r = spawnSync(process.execPath, [tsc, '-p', project], { cwd: ROOT, encoding: 'utf8' });
    return { problems: r.status === 0 ? [] : [(r.stdout || r.stderr).trim()] };
  });
}

step('README: stated test counts match this run', () => ({
  problems: checkReadmeCounts(texts.get('README.md') ?? null, counts),
}));

for (const [path, text] of markdown) {
  if (!text.includes('```mermaid')) continue;
  step(`diagrams: ${path}`, () => {
    const { count, failed, lines } = checkDiagrams(text);
    return { problems: failed ? lines.filter((l) => l.includes('FAILED')) : [], note: `${count} diagrams` };
  });
}

const failed = results.filter((r) => r.problems.length);
console.log(failed.length ? `\nverify FAILED: ${failed.map((r) => r.name).join('; ')}` : `\nverify passed: ${results.length} checks`);
process.exit(failed.length ? 1 : 0);
