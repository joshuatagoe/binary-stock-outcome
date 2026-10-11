// The website's smoke test (M0, D132): the deployed page is the commit just deployed, sends exactly the headers
// of apps/web/public/_headers (P17, P27), shows the stocks it read from devnet in a real browser, and logged no
// errors, such as a Content-Security-Policy refusal. CI runs it after the Pages deploy, with Playwright's
// Chromium installed:
//   node scripts/smoke/website.mjs https://meridian-devnet.pages.dev <commit>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// expectedHeaders: lower-case names to values, as in public/_headers.
export function judgeWebsite({ status, headers, commit, stocks, errors }, expected, expectedHeaders) {
  const problems = [];
  if (status !== 200) problems.push(`the page answered ${status}`);
  if (commit !== expected) problems.push(`the page is commit ${commit}; the deployed one is ${expected}`);
  for (const [name, value] of Object.entries(expectedHeaders)) {
    if (headers[name] !== value) problems.push(`${name} is ${headers[name] ?? 'missing'}; public/_headers says ${value}`);
  }
  if (stocks.length !== 7) problems.push(`the page shows ${stocks.length} stocks, not 7`);
  for (const e of errors) problems.push(`the page logged an error: ${e}`);
  return problems;
}

// The headers Cloudflare Pages is told to send: each indented "Name: value" line of public/_headers.
export function readHeadersFile(text) {
  const headers = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (m) headers[m[1].toLowerCase()] = m[2].trim();
  }
  return headers;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, commit] = process.argv.slice(2);
  if (!base || !/^[0-9a-f]{40}$/.test(commit ?? '')) {
    console.error('usage: node scripts/smoke/website.mjs <base URL> <40-character commit>');
    process.exit(2);
  }
  const web = join(import.meta.dirname, '..', '..', 'apps', 'web');
  // Playwright is the website's test dependency (D116).
  const { chromium } = createRequire(join(web, 'package.json'))('playwright-core');
  const expectedHeaders = readHeadersFile(readFileSync(join(web, 'public', '_headers'), 'utf8'));
  const browser = await chromium.launch();
  let problems = ['not tried'];
  // A new deploy can take a minute to reach every edge, so a page from the old commit is retried.
  for (let attempt = 1; attempt <= 12 && problems.length; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 10_000));
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      const res = await page.goto(base, { waitUntil: 'load' });
      const list = page.getByRole('list', { name: 'Stocks' }).getByRole('listitem');
      await list.first().waitFor({ timeout: 20_000 }).catch(() => {});
      problems = judgeWebsite(
        {
          status: res?.status(),
          headers: res?.headers() ?? {},
          commit: await page.locator('meta[name="meridian-commit"]').getAttribute('content'),
          stocks: await list.locator('.mono').allTextContents(),
          errors,
        },
        commit,
        expectedHeaders,
      );
    } catch (error) {
      problems = [`no page: ${error.message}`];
    }
    await page.close();
    console.log(`attempt ${attempt}: ${problems.length ? problems.join('; ') : 'ok'}`);
  }
  await browser.close();
  process.exit(problems.length ? 1 : 0);
}
