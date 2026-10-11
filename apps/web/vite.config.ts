// The website is plain files with no server (D23, ARCHITECTURE.md §9).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// index.html's <meta name="meridian-commit"> carries the build's commit, so the smoke test can tell a new
// deploy from an old one (D132). CI sets GIT_COMMIT.
process.env.VITE_COMMIT ??= process.env.GIT_COMMIT ?? 'unknown';

// The headers Cloudflare Pages sends, from public/_headers, so `vite preview` and the browser tests run under
// the real Content-Security-Policy before anything deploys (P27).
export function pagesHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (m) headers[m[1]] = m[2].trim();
  }
  return headers;
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The generated client reads process.env["NODE_ENV"] (M0.04), which a browser lacks. The build replaced it,
  // but the dev server didn't, and the page crashed with "process is not defined" (M0.10). Only NODE_ENV is
  // exposed. Tests run in Node and keep the real process.env.
  define: mode === 'test' ? {} : { 'process.env': JSON.stringify({ NODE_ENV: mode === 'production' ? 'production' : 'development' }) },
  preview: { headers: pagesHeaders(readFileSync(join(import.meta.dirname, 'public', '_headers'), 'utf8')) },
  test: { include: ['test/**/*.test.ts'] },
}));
