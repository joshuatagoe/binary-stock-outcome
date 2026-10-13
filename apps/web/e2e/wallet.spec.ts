// Wallet connection and the devnet guide (D115, F2), with USERS.md's words (D136).
import { expect, test } from '@playwright/test';
import { addFakeWallet, f4Scenario, fakeNetwork, setWalletMode, TRADER } from './support.ts';

const SHORT = `${TRADER.slice(0, 4)}…${TRADER.slice(-4)}`;
const open = async (page: import('@playwright/test').Page, extra: Parameters<typeof f4Scenario>[0] = {}) => {
  const scenario = await f4Scenario(extra);
  await fakeNetwork(page, scenario);
  return scenario;
};

test('no wallet installed: says so, and what to do', async ({ page }) => {
  await open(page);
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.getByText('No Solana wallet found. Install one (for example Phantom), then reload this page.')).toBeVisible();
});

test('connects a wallet from the list, and the header shows the address, SOL and USDC (F2)', async ({ page }) => {
  await open(page);
  await addFakeWallet(page);
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Fake Wallet is connected' })).toBeVisible();
  await expect(page.locator('.wallet-bar')).toContainText(`${SHORT} · 0.50 SOL · 20.00 USDC`);
  // Focus lands on the panel's heading when the list of wallets goes away, not on the page.
  await expect(page.getByRole('heading', { name: 'Connected' })).toBeFocused();
});

test('first connect: the devnet guide shows how to switch the wallet, and Done keeps it away on this browser', async ({ page }) => {
  await open(page);
  await addFakeWallet(page);
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  const guide = page.getByRole('region', { name: 'Set your wallet to Solana Devnet' });
  await expect(guide).toContainText('In Solflare: Settings, then Network, then Devnet. In Phantom: turn on Testnet Mode in its developer settings.');
  await guide.getByRole('button', { name: 'Done' }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  // The wallet may reconnect by itself; if it does not, connect it again.
  await page.locator('.wallet-bar button').click();
  const list = page.getByRole('button', { name: 'Connect Fake Wallet' });
  if (await list.isVisible()) await list.click();
  await expect(page.getByRole('status').filter({ hasText: 'Fake Wallet is connected' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Set your wallet to Solana Devnet' })).toHaveCount(0);
});

test('a closed connect pop-up (4001) says nothing was sent and to switch to Devnet (D136)', async ({ page }) => {
  await open(page);
  await addFakeWallet(page, 'sign');
  await page.goto('/markets');
  await setWalletMode(page, 'refuse-connect');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('alert')).toContainText("Nothing was sent. If your wallet said the network doesn't match, switch it to Solana Devnet and try again.");
  await expect(page.getByRole('button', { name: 'Connect Fake Wallet' })).toBeEnabled();
});

test('a wallet with no SOL and no USDC is told where the faucets are', async ({ page }) => {
  await open(page, { sol: 0n, usdc: 0n });
  await addFakeWallet(page);
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByText("You need a little devnet SOL for network fees, about 0.01 SOL. It's free at faucet.solana.com: choose Devnet and paste your address.")).toBeVisible();
  await expect(page.getByText('Get test USDC at faucet.circle.com: choose Solana Devnet and paste your address. It gives 20 USDC every 2 hours. This USDC has no value.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open faucet' }).first()).toHaveAttribute('href', 'https://faucet.solana.com');
});

test('low SOL while connected: how much, and what orders need', async ({ page }) => {
  await open(page, { sol: 300_000n });
  await addFakeWallet(page);
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByText('You have 0.0003 SOL. Orders need about 0.003 SOL for fees and deposits.', { exact: false })).toBeVisible();
});

test('disconnect puts the header back', async ({ page }) => {
  await open(page);
  await addFakeWallet(page);
  await page.goto('/markets');
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByRole('button', { name: 'Connect wallet' }).first()).toBeVisible();
});

test('Escape closes the panel and returns focus to its button', async ({ page }) => {
  await open(page);
  await addFakeWallet(page);
  await page.goto('/markets');
  const opener = page.getByRole('button', { name: 'Connect wallet' });
  await opener.click();
  await expect(page.getByRole('heading', { name: 'Connect wallet', level: 2 })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Connect wallet', level: 2 })).toBeHidden();
  await expect(opener).toBeFocused();
});

// Found at M5-a's close-out: the open panel sat inside the header's centred row, so it pushed Connect above the nav links.
test('the open wallet panel opens below the header row: Connect stays level with the brand and the nav links (desktop)', async ({ page }) => {
  await open(page);
  await addFakeWallet(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/markets');
  const level = async () => {
    const box = async (locator: ReturnType<typeof page.locator>) => (await locator.boundingBox())!;
    const nav = await box(page.getByRole('link', { name: 'Markets', exact: true }).first());
    const brand = await box(page.getByRole('link', { name: 'Meridian', exact: true }));
    const button = await box(page.locator('.wallet-bar button'));
    expect(Math.abs(button.y + button.height / 2 - (nav.y + nav.height / 2))).toBeLessThan(8);
    expect(Math.abs(brand.y + brand.height / 2 - (nav.y + nav.height / 2))).toBeLessThan(8);
    return button;
  };
  const closed = await level();
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.locator('#wallet-panel')).toBeVisible();
  const open_ = await level();
  expect(Math.abs(open_.y - closed.y)).toBeLessThan(2);
  expect((await page.locator('#wallet-panel').boundingBox())!.y).toBeGreaterThan(open_.y + open_.height - 1);
  // Connected, with the devnet guide and the funds notes showing, it is the same.
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Connected' })).toBeVisible();
  const connected = await level();
  expect(Math.abs(connected.y - closed.y)).toBeLessThan(2);
});
