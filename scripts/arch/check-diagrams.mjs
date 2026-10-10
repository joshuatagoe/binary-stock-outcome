// Renders every ```mermaid block in a Markdown file with mermaid-cli; exits 1 if any fails.
// Usage: node scripts/arch/check-diagrams.mjs docs/ARCHITECTURE.md
// `npm run verify` imports checkDiagrams() for every tracked Markdown file that has a diagram.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The pinned devDependency (package.json), so the lockfile fixes mermaid-cli and everything it pulls in.
const MMDC = join(ROOT, 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'cli.js');

export const mermaidBlocks = (markdown) =>
  [...markdown.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) => m[1]);

// A semicolon ends a Mermaid statement, so one inside a label renders as stray nodes without any error.
export const semicolonLines = (src) =>
  src.split(/\r?\n/).filter((l) => l.includes(';') && !/^\s*%%/.test(l));

const label = (src) => src.split(/\r?\n/)[src.startsWith('---') ? 4 : 0].trim();

// Returns one line per diagram, and how many failed.
export function checkDiagrams(markdown) {
  const blocks = mermaidBlocks(markdown);
  const dir = mkdtempSync(join(tmpdir(), 'mmd-'));
  const lines = [];
  let failed = 0;
  // GitHub's Ubuntu runners block Chrome's sandbox, and these diagrams are our own text.
  const puppeteer = [];
  if (process.env.CI) {
    writeFileSync(join(dir, 'puppeteer.json'), JSON.stringify({ args: ['--no-sandbox'] }));
    puppeteer.push('-p', join(dir, 'puppeteer.json'));
  }
  try {
    blocks.forEach((src, i) => {
      const semi = semicolonLines(src);
      if (semi.length) { failed++; lines.push(`diagram ${i + 1}: FAILED, semicolon in: ${semi[0].trim()}`); return; }
      const input = join(dir, `d${i + 1}.mmd`);
      writeFileSync(input, src);
      try {
        execFileSync(process.execPath, [MMDC, '-q', '-i', input, '-o', join(dir, `d${i + 1}.svg`), ...puppeteer], { stdio: 'pipe' });
        lines.push(`diagram ${i + 1}: ok (${label(src)})`);
      } catch (e) {
        failed++;
        lines.push(`diagram ${i + 1}: FAILED\n${String(e.stderr || e.message).slice(0, 800)}`);
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return { count: blocks.length, failed, lines };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? 'docs/ARCHITECTURE.md';
  const { count, failed, lines } = checkDiagrams(readFileSync(file, 'utf8'));
  for (const line of lines) console.log(line);
  console.log(`${count} diagrams, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
