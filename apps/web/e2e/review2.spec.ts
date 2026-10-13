// The second review's findings, in the browser: Try again is the same order through the same checks (B), the done words come
// from the landed transaction (C, D90), and order IDs follow the ticket (D101).
import { CancelReason, getOrderCancelledEventEncoder, Side } from '@meridian/client';
import { expect, test, type Page } from '@playwright/test';
import { getBase58Decoder } from '@solana/kit';
import { EVENT_IX_TAG } from '../src/landed.ts';
import { addFakeWallet, f4Scenario, fakeNetwork, TRADER, type Scenario } from './support.ts';

const TEN_SIXTEEN = new Date('2026-10-08T14:16:00Z');

async function open(page: Page, scenario: Scenario) {
  await fakeNetwork(page, scenario);
  await addFakeWallet(page);
  await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto('/trade?market=META-680-2026-10-08');
  await page.getByRole('button', { name: 'Connect wallet' }).first().click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Connected' })).toBeVisible();
  await page.getByRole('button', { name: 'Wallet' }).click();
}
const button = (page: Page, name: string) => page.locator('form').getByRole('button', { name, exact: true });

// The order ID, as the 8 little-endian bytes it takes in the transaction.
const hasOrderId = (base64: string, id: bigint) => {
  const le = Buffer.alloc(8);
  le.writeBigUInt64LE(id);
  return Buffer.from(base64, 'base64').includes(le);
};

test('the same order retried after an expiry keeps its ID; a changed ticket gets a new one (D101)', async ({ page }) => {
  const scenario = await f4Scenario({ statuses: ['none'], blockHeight: 200n, after: { usdc: 13_500_000n, yes: 10n, no: 0n } });
  await open(page, scenario);
  await button(page, 'Buy Yes').click();
  await expect(page.getByRole('alert')).toContainText('expired');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => scenario.sent.length).toBe(2);
  expect(hasOrderId(scenario.sent[0]!, 4242n)).toBe(true);
  expect(hasOrderId(scenario.sent[1]!, 4242n)).toBe(true);
  await expect(page.getByRole('alert')).toContainText('expired');
  // The ticket changes: that is a new order, and Try again is no longer offered for the old one.
  await page.getByLabel('Quantity').fill('5');
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await expect(page.getByText('Your ticket has changed since this order. Press Buy Yes to place it as a new order.')).toBeVisible();
  scenario.statuses = ['finalized'];
  scenario.blockHeight = 100n;
  await button(page, 'Buy Yes').click();
  await expect.poll(() => scenario.sent.length).toBe(3);
  expect(hasOrderId(scenario.sent[2]!, 4243n)).toBe(true);
  expect(hasOrderId(scenario.sent[2]!, 4242n)).toBe(false);
});

test('Try again goes through the large-order confirm like the first press (B)', async ({ page }) => {
  const scenario = await f4Scenario({ usdc: 500_000_000n, statuses: ['none'], blockHeight: 200n });
  await open(page, scenario);
  await page.getByRole('radio', { name: 'Limit', exact: true }).check();
  await page.getByLabel('Quantity').fill('200');
  await page.getByLabel('Pay at most (cents each)').fill('60');
  await button(page, 'Buy Yes').click();
  const group = page.getByRole('group', { name: 'Confirm large order' });
  await group.getByRole('button', { name: 'Buy Yes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('expired');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(group).toBeVisible();
  expect(scenario.sent).toHaveLength(1);
});

test('an order that landed as 6010 is "already placed", and Try again is not offered', async ({ page }) => {
  const scenario = await f4Scenario({ statuses: [{ err: { InstructionError: [2, { Custom: 6010 }] } }] });
  await open(page, scenario);
  await button(page, 'Buy Yes').click();
  await expect(page.getByRole('alert')).toContainText('This order was already placed.');
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});

test('D90: a buy that met only the trader’s own offer says so in USERS.md’s words, from the landed transaction’s events', async ({ page }) => {
  const payload = getOrderCancelledEventEncoder().encode({
    market: TRADER,
    owner: TRADER,
    orderId: 9,
    side: Side.Sell,
    price: 65,
    quantity: 10,
    reason: CancelReason.SelfTrade,
  } as never);
  const data = new Uint8Array(EVENT_IX_TAG.length + payload.length);
  data.set(EVENT_IX_TAG);
  data.set(payload, EVENT_IX_TAG.length);
  const scenario = await f4Scenario({
    after: { usdc: 20_000_000n, yes: 0n, no: 0n },
    innerInstructions: [{ index: 2, instructions: [{ programIdIndex: 1, accounts: [], data: getBase58Decoder().decode(data) }] }],
  });
  await open(page, scenario);
  await button(page, 'Buy Yes').click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Your offer of 10 Yes at 65¢ was cancelled: your own order would have traded with it.' }),
  ).toBeVisible();
});

test('another transfer into the wallet right after the order does not change what the order is said to have done', async ({ page }) => {
  const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n } });
  scenario.onFinalized = () => {
    scenario.usdc += 5_000_000n; // an unrelated deposit
  };
  await open(page, scenario);
  await button(page, 'Buy Yes').click();
  await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes at 65¢ · 6.50 USDC' })).toBeVisible();
});
