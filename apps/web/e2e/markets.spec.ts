// Markets (F3): today's contracts per stock with prices from the book, read from the chain (replayed accounts, P27).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addFakeWallet, f4Scenario, fakeNetwork } from './support.ts';

const axe = (page: Page) => new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] });

// 10:16 AM ET on the day of the fixtures' markets.
const TEN_SIXTEEN = new Date('2026-10-08T14:16:00Z');

test('lists the day’s contracts per stock, with the prices read from each book', async ({ page }) => {
  const errors = await fakeNetwork(page, await f4Scenario());
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/markets');
  await expect(page.getByRole('heading', { name: 'META', level: 2 })).toBeVisible();
  const meta680 = page.getByRole('link', { name: /META \$680 or above/ });
  await expect(meta680).toContainText('Yes 65¢ · No 35¢ · 65% chance');
  await expect(meta680).toContainText('Closes in 5 h 44 min');
  await expect(meta680).toHaveAttribute('aria-label', /Yes 65 cents, No 35 cents, 65 percent chance/);
  await expect(page.getByRole('link', { name: /AAPL \$270 or above/ })).toContainText('Yes 43¢ · No 57¢ · 43% chance');
  await expect(page.getByText("Today's contracts, Thursday, October 8, 2026.")).toBeVisible();
  expect(errors).toEqual([]);
});

test('an empty book says "No quotes yet", never 0¢', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/markets');
  const meta690 = page.getByRole('link', { name: /META \$690 or above/ });
  await expect(meta690).toContainText('No quotes yet');
  await expect(meta690).not.toContainText('0¢');
});

test('choosing a contract opens Trade at the address that names its market (D72)', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/markets');
  await page.getByRole('link', { name: /META \$680 or above/ }).click();
  await expect(page).toHaveURL(/\/trade\?market=META-680-2026-10-08$/);
  await expect(page.getByRole('heading', { name: 'META $680 or above', level: 1 })).toBeVisible();
});

test('before 9:00 AM ET the page says when the contracts appear, even with yesterday’s left over (F3)', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await page.clock.setFixedTime(new Date('2026-10-12T11:00:00Z')); // 7:00 AM ET
  await page.goto('/markets');
  await expect(page.getByText("Today's contracts appear at 9:00 AM ET.")).toBeVisible();
});

test('before the open, a card says when it opens', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await page.clock.setFixedTime(new Date('2026-10-08T13:10:00Z'));
  await page.goto('/markets');
  await expect(page.getByRole('link', { name: /META \$680 or above/ })).toContainText('Opens 9:30 AM ET');
});

test('on a day with no markets it shows the last trading day that had some, and says so', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await page.clock.setFixedTime(new Date('2026-10-12T14:00:00Z'));
  await page.goto('/markets');
  await expect(page.getByText(/No markets today\. These are from the last trading day with markets, Thursday, October 8, 2026\./)).toBeVisible();
});

test('a chain with no markets says so and when they appear (devnet runs M0’s program until M3)', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario({ markets: [] }));
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/markets');
  await expect(page.getByRole('heading', { name: 'No markets yet' })).toBeVisible();
  await expect(page.getByText("Today's contracts appear at 9:00 AM ET on trading days.")).toBeVisible();
});

test('paused: Markets carries the admin’s words (Trade has its own test)', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario({ paused: true }));
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/markets');
  await expect(page.getByRole('note').filter({ hasText: 'Trading is paused by the admin. You can still cancel orders, close pairs and redeem.' })).toBeVisible();
});

test("devnet not answering says so, and Try again reads the markets again", async ({ page }) => {
  const scenario = await f4Scenario({ devnet: 'down' });
  await fakeNetwork(page, scenario);
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/markets');
  await expect(page.getByRole('alert')).toContainText("Solana devnet didn't answer");
  scenario.devnet = 'up';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: /META \$680 or above/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Markets', level: 1 })).toBeFocused();
});

test('the shell: the network banner, the wallet header and a way to Markets are on the page', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await page.goto('/markets');
  await expect(page.getByText("Solana devnet · USDC here is Circle's test token, no real value")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Markets' })).toBeVisible();
});

// 200% zoom on a 1280 x 800 window is a 640 x 400 CSS pixel page (D116).
for (const [name, viewport] of [
  ['320 px', { width: 320, height: 800 }],
  ['200% zoom', { width: 640, height: 400 }],
] as const) {
  test(`has no accessibility violations and no sideways scroll at ${name}, in light and dark`, async ({ page }) => {
    await fakeNetwork(page, await f4Scenario());
    await page.clock.setFixedTime(TEN_SIXTEEN);
    await page.setViewportSize(viewport);
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto('/markets');
      await expect(page.getByRole('link', { name: /META \$680 or above/ })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const { violations } = await axe(page).analyze();
      expect(violations.map((v) => `${colorScheme} ${v.id}: ${v.help}`)).toEqual([]);
    }
  });
}

test('the connect panel is clean for axe too, with a wallet listed', async ({ page }) => {
  await fakeNetwork(page, await f4Scenario());
  await addFakeWallet(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.getByRole('button', { name: 'Connect Fake Wallet' })).toBeVisible();
  const { violations } = await axe(page).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
