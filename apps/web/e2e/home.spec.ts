// The M0 page: the shell, and Config read from devnet in the browser (ARCHITECTURE.md §7, M0 slice e).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const recorded = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'test', 'fixtures', 'config-account.json'), 'utf8'));
const STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];

type Devnet = { mode: 'up' | 'down' | 'empty' };

// Answers the site's JSON-RPC calls to devnet with the recorded Config, a failure, or no account; answers Google
// Fonts with nothing. Returns the page's console errors, which include any Content-Security-Policy refusal.
async function fakeNetwork(page: Page, devnet: Devnet = { mode: 'up' }) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://api.devnet.solana.com/**', async (route) => {
    if (devnet.mode === 'down') return route.fulfill({ status: 503, body: 'Service Unavailable' });
    const { id, method } = route.request().postDataJSON();
    if (method !== 'getAccountInfo') return route.fulfill({ status: 400, body: `unexpected ${method}` });
    const value = devnet.mode === 'empty' ? null : recorded.value;
    return route.fulfill({ json: { jsonrpc: '2.0', id, result: { context: recorded.context, value } } });
  });
  return errors;
}

const stocks = (page: Page) => page.getByRole('list', { name: 'Stocks' }).getByRole('listitem');

// axe is typed against the playwright-core 1.57.0 that the diagram tool pins (@zenuml/core), while the tests run
// 1.63.0. axe only injects its script through the page, so this cast covers types alone.
const axe = (page: Page) => new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] });

test('shows the play-money banner and the stocks read from Config on devnet', async ({ page }) => {
  const errors = await fakeNetwork(page);
  await page.goto('/');
  await expect(page.getByText("Solana devnet · USDC here is Circle's test token, no real value")).toBeVisible();
  await expect(stocks(page)).toHaveCount(7);
  for (const [i, symbol] of STOCKS.entries()) {
    await expect(stocks(page).nth(i)).toContainText(symbol);
    await expect(stocks(page).nth(i)).toContainText('Open for new markets');
  }
  await expect(page.getByText('Trading: Open')).toBeVisible();
  await expect(page.getByRole('link', { name: /kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly/ })).toHaveAttribute(
    'href',
    'https://explorer.solana.com/address/kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly?cluster=devnet',
  );
  expect(errors).toEqual([]);
});

test("says devnet didn't answer, and Try again reads Config again", async ({ page }) => {
  const devnet: Devnet = { mode: 'down' };
  await fakeNetwork(page, devnet);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText("Solana devnet didn't answer");
  devnet.mode = 'up';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(stocks(page)).toHaveCount(7);
});

test("says Config isn't on devnet when devnet answers without it, as after a reset", async ({ page }) => {
  await fakeNetwork(page, { mode: 'empty' });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText("Meridian's settings aren't there");
});

test('Try again works by keyboard alone, and keeps focus on the section', async ({ page }) => {
  const devnet: Devnet = { mode: 'down' };
  await fakeNetwork(page, devnet);
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  devnet.mode = 'up';
  for (let i = 0; i < 10 && !(await page.getByRole('button', { name: 'Try again' }).evaluate((b) => b === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  await expect(stocks(page)).toHaveCount(7);
  await expect(page.getByRole('heading', { name: 'Live on devnet' })).toBeFocused();
});

test('has no accessibility violations in light or dark, and reflows at 320 px', async ({ page }) => {
  await fakeNetwork(page);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await expect(stocks(page)).toHaveCount(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const { violations } = await axe(page).analyze();
    expect(violations.map((v) => `${colorScheme} ${v.id}: ${v.help}`)).toEqual([]);
  }
});

test('an unknown address says so and links home', async ({ page }) => {
  await fakeNetwork(page);
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to the home page' }).click();
  await expect(page).toHaveURL('/');
});

test('the wallet test is local only: the built site has no such page', async ({ page }) => {
  await fakeNetwork(page);
  await page.goto('/wallet-test');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('the wallet test page renders on the dev server', async ({ page }) => {
  await fakeNetwork(page);
  await page.goto('/wallet-test');
  await expect(page.getByRole('heading', { name: 'Wallet test (M0)' })).toBeVisible();
  await expect(page.getByText('No wallet found')).toBeVisible();
});

test('the build carries its commit (D132) and is served with the headers of public/_headers (P17)', async ({ page }) => {
  await fakeNetwork(page);
  const res = await page.goto('/');
  await expect(page.locator('meta[name="meridian-commit"]')).toHaveAttribute('content', 'e2e-test-commit');
  expect(res?.headers()['x-robots-tag']).toBe('noindex');
  expect(res?.headers()['content-security-policy']).toContain('connect-src');
});
