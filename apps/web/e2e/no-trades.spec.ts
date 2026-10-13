// Buy No and Sell No through the transaction tracker (M5-b; USERS.md F5 and F7, D143): the done words come from the landed
// transaction's own balances and events, and the negative cases stop before the wallet opens. Against replayed accounts (P27)
// and a fake Wallet Standard wallet.
import AxeBuilder from '@axe-core/playwright';
import { Side } from '@meridian/client';
import { expect, test, type Page } from '@playwright/test';
import { chainMarket, F4_ASKS } from '../test/fixtures/chain.ts';
import { fillEvent, pairsMintedEvent, redeemedEvent, selfTradeEvent } from '../test/fixtures/events.ts';
import { addFakeWallet, f4Scenario, fakeNetwork, signedCount, TRADER, type Scenario } from './support.ts';

const axe = (page: Page) => new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] });
const META_680 = '/trade?market=META-680-2026-10-08';
const TEN_SIXTEEN = new Date('2026-10-08T14:16:00Z');
const AFTER_CLOSE = new Date('2026-10-08T20:30:00Z');
const me = TRADER as string;
// The F4 book: Yes asks 65c x 10 and 66c x 5; Yes bids 64c x 5 only. `deepBids` adds a second bid of 60c x 10, for orders of more than 5.
const deepBids = async () => ({ markets: [await chainMarket({ strikeDollars: 680 }, [[64, 5, 1], [60, 10, 1]], F4_ASKS)] });

async function open(page: Page, scenario: Scenario, time = TEN_SIXTEEN) {
  const errors = await fakeNetwork(page, scenario);
  await addFakeWallet(page);
  await page.clock.setFixedTime(time);
  await page.goto(META_680);
  await page.getByRole('button', { name: 'Connect wallet' }).first().click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Connected' })).toBeVisible();
  await page.getByRole('button', { name: 'Wallet' }).click();
  return errors;
}
const ticketButton = (page: Page, name: string) => page.locator('form').getByRole('button', { name, exact: true });
const pick = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();
const events = (...instructions: ReturnType<typeof fillEvent>[]) => [{ index: 2, instructions }];
const done = (page: Page, text: string) => expect(page.getByRole('status').filter({ hasText: text })).toBeVisible();

test.describe('Buy No (F5)', () => {
  test('is checked on devnet, signed, sent and reported from the landed transaction: Bought 5 No at 36¢ · 1.80 USDC', async ({ page }) => {
    const scenario = await f4Scenario({
      after: { usdc: 18_200_000n, yes: 0n, no: 5n },
      innerInstructions: events(pairsMintedEvent(me, 5), fillEvent(me, 64, 5)),
    });
    const errors = await open(page, scenario);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5');
    await expect(page.getByText('You pay 1.80 USDC for 5 No. If META closes below $680, you get 5.00, a profit of 3.20. Otherwise you lose 1.80.')).toBeVisible();
    await expect(page.getByText('You pay at most 1.85 USDC.')).toBeVisible();
    await ticketButton(page, 'Buy No').click();
    await done(page, 'Bought 5 No at 36¢ · 1.80 USDC');
    expect(scenario.simulated).toHaveLength(1);
    expect(scenario.sent).toHaveLength(1);
    expect(await signedCount(page)).toBe(1);
    expect(scenario.calls.indexOf('simulateTransaction')).toBeLessThan(scenario.calls.indexOf('sendTransaction'));
    await expect(page.getByText('You hold 0 Yes and 5 No on META $680 or above. USDC in your wallet: 18.20.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a partial fill says how many were not bought, and why', async ({ page }) => {
    const scenario = await f4Scenario({
      ...(await deepBids()),
      after: { usdc: 18_200_000n, yes: 0n, no: 5n },
      innerInstructions: events(pairsMintedEvent(me, 5), fillEvent(me, 64, 5)),
    });
    await open(page, scenario);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('10');
    await ticketButton(page, 'Buy No').click();
    await done(page, "Bought 5 of 10 No at 36¢ · 1.80 USDC. The other 5 weren't bought: not enough buyers of Yes at 59¢ or more.");
  });

  test('a self-trade: the trader’s own bid is cancelled and refunded, and the refund is not taken for a cheaper No', async ({ page }) => {
    // 5 sold to the 64c bid; the trader's own 60c bid for 5 was cancelled and refunded 3.00.
    // The wallet: -5.00 for the pairs, +3.20 from the fill, +3.00 refund.
    const scenario = await f4Scenario({
      ...(await deepBids()),
      after: { usdc: 21_200_000n, yes: 0n, no: 5n },
      innerInstructions: events(pairsMintedEvent(me, 5), fillEvent(me, 64, 5), selfTradeEvent(me, Side.Buy, 60, 5)),
    });
    await open(page, scenario);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('10');
    await ticketButton(page, 'Buy No').click();
    await done(
      page,
      "Your bid of 5 Yes at 60¢ was cancelled: your own order would have traded with it. Bought 5 of 10 No at 36¢ · 1.80 USDC. The other 5 weren't bought: not enough buyers of Yes at 59¢ or more.",
    );
  });

  test('events that disagree with the wallet are not turned into money', async ({ page }) => {
    const scenario = await f4Scenario({
      after: { usdc: 18_200_000n, yes: 0n, no: 4n },
      innerInstructions: events(pairsMintedEvent(me, 5), fillEvent(me, 64, 5)),
    });
    await open(page, scenario);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5');
    await ticketButton(page, 'Buy No').click();
    await done(page, 'Your order landed. Your balances and Open orders show what filled and what rests.');
  });

  test('not enough USDC for the net price: the button is disabled with the words from F4, before any wallet window', async ({ page }) => {
    const scenario = await f4Scenario({ usdc: 1_000_000n });
    await open(page, scenario);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5');
    await expect(page.getByText(/^You need up to 1\.85 USDC; you have 1\.00\.$/)).toBeVisible();
    await expect(ticketButton(page, 'Buy No')).toBeDisabled();
    expect(scenario.simulated).toHaveLength(0);
  });

  test('a quantity beyond what the book wants says how many are wanted', async ({ page }) => {
    await open(page, await f4Scenario());
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('20');
    await expect(page.getByText('Only 5 Yes are wanted right now, so this order can’t fill in full. Lower the quantity, or place a limit order.')).toBeVisible();
    await expect(ticketButton(page, 'Buy No')).toBeDisabled();
  });

  test('orders closed: disabled with the status words, and nothing is checked on devnet', async ({ page }) => {
    const scenario = await f4Scenario();
    await open(page, scenario, AFTER_CLOSE);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5');
    await expect(ticketButton(page, 'Buy No')).toBeDisabled();
    await expect(page.getByText('Trading ended · result expected by about 4:05 PM ET').first()).toBeVisible();
    expect(scenario.simulated).toHaveLength(0);
  });

  test('the close passes in flight: devnet’s answer says nothing was bought, and only the fee was charged', async ({ page }) => {
    const scenario = await f4Scenario({ statuses: [{ err: { InstructionError: [2, { Custom: 6022 }] } }] });
    await open(page, scenario);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5');
    await ticketButton(page, 'Buy No').click();
    await expect(page.getByRole('alert')).toContainText('Trading ended before your order reached the network. Nothing was bought; only the network fee was charged.');
  });
});

test.describe('Sell No (F7)', () => {
  test('is checked on devnet, signed, sent and reported from the landed transaction: Sold 10 No at 35¢ · received 3.50 USDC', async ({ page }) => {
    const scenario = await f4Scenario({
      no: 10n,
      after: { usdc: 23_500_000n, yes: 0n, no: 0n },
      innerInstructions: events(fillEvent(me, 65, 10, Side.Buy), redeemedEvent(me, 10)),
    });
    const errors = await open(page, scenario);
    await pick(page, 'Sell No');
    await expect(page.getByText('You sell 10 No for 3.50 USDC.')).toBeVisible();
    await expect(page.getByText('You receive at least 3.40 USDC.')).toBeVisible();
    await ticketButton(page, 'Sell No').click();
    await done(page, 'Sold 10 No at 35¢ · received 3.50 USDC');
    expect(scenario.simulated).toHaveLength(1);
    expect(scenario.sent).toHaveLength(1);
    expect(scenario.calls.indexOf('simulateTransaction')).toBeLessThan(scenario.calls.indexOf('sendTransaction'));
    expect(errors).toEqual([]);
  });

  test('needs no USDC: a wallet with only No can sell them', async ({ page }) => {
    const scenario = await f4Scenario({ usdc: 0n, no: 10n });
    await open(page, scenario);
    await pick(page, 'Sell No');
    await expect(ticketButton(page, 'Sell No')).toBeEnabled();
  });

  test('a partial fill says how many were not sold, and why', async ({ page }) => {
    const scenario = await f4Scenario({
      no: 10n,
      after: { usdc: 21_750_000n, yes: 0n, no: 5n },
      innerInstructions: events(fillEvent(me, 65, 5, Side.Buy), redeemedEvent(me, 5)),
    });
    await open(page, scenario);
    await pick(page, 'Sell No');
    await ticketButton(page, 'Sell No').click();
    await done(page, "Sold 5 of 10 No at 35¢ · received 1.75 USDC. The other 5 weren't sold: not enough sellers of Yes at 66¢ or less.");
  });

  test('a self-trade: the trader’s own offer is cancelled, its Yes comes back, and neither is counted as a sale', async ({ page }) => {
    // 5 closed against another seller's 65c offer; the trader's own 66c offer for 5 was cancelled and its 5 Yes returned.
    const scenario = await f4Scenario({
      no: 10n,
      after: { usdc: 21_750_000n, yes: 5n, no: 5n },
      innerInstructions: events(fillEvent(me, 65, 5, Side.Buy), selfTradeEvent(me, Side.Sell, 66, 5), redeemedEvent(me, 5)),
    });
    await open(page, scenario);
    await pick(page, 'Sell No');
    await ticketButton(page, 'Sell No').click();
    await done(
      page,
      "Your offer of 5 Yes at 66¢ was cancelled: your own order would have traded with it. Sold 5 of 10 No at 35¢ · received 1.75 USDC. The other 5 weren't sold: not enough sellers of Yes at 66¢ or less.",
    );
  });

  test('without enough No: the button is disabled with what is held, before any wallet window', async ({ page }) => {
    const scenario = await f4Scenario({ no: 3n });
    await open(page, scenario);
    await pick(page, 'Sell No');
    await expect(page.getByText('You hold 3 No; you can sell at most 3.')).toBeVisible();
    await expect(ticketButton(page, 'Sell No')).toBeDisabled();
    expect(scenario.simulated).toHaveLength(0);
  });

  test('holding no No at all says so', async ({ page }) => {
    await open(page, await f4Scenario());
    await pick(page, 'Sell No');
    await expect(page.getByText('You hold no No to sell.')).toBeVisible();
    await expect(ticketButton(page, 'Sell No')).toBeDisabled();
  });

  test('a quantity beyond what the book offers says how many are offered', async ({ page }) => {
    await open(page, await f4Scenario({ no: 20n }));
    await pick(page, 'Sell No');
    await page.getByLabel('Quantity').fill('20');
    await expect(page.getByText('Only 15 Yes are offered right now, so this order can’t fill in full. Lower the quantity, or place a limit order.')).toBeVisible();
    await expect(ticketButton(page, 'Sell No')).toBeDisabled();
  });

  test('if devnet still says the wallet is short, the words name the token and nothing was sent', async ({ page }) => {
    const scenario = await f4Scenario({ no: 10n, simulation: { InstructionError: [2, { Custom: 1 }] } });
    await open(page, scenario);
    await pick(page, 'Sell No');
    await ticketButton(page, 'Sell No').click();
    await expect(page.getByRole('alert')).toContainText("Your wallet doesn't hold enough No to sell. Nothing was sent.");
    expect(scenario.sent).toHaveLength(0);
    expect(await signedCount(page)).toBe(0);
  });

  test('orders closed: disabled with the status words', async ({ page }) => {
    await open(page, await f4Scenario({ no: 10n }), AFTER_CLOSE);
    await pick(page, 'Sell No');
    await expect(ticketButton(page, 'Sell No')).toBeDisabled();
    await expect(page.getByText('Trading ended · result expected by about 4:05 PM ET').first()).toBeVisible();
  });
});

test('the four buttons are reached and used by keyboard alone, and the result takes focus', async ({ page }) => {
  const scenario = await f4Scenario({
    no: 10n,
    after: { usdc: 23_500_000n, yes: 0n, no: 0n },
    innerInstructions: events(fillEvent(me, 65, 10, Side.Buy), redeemedEvent(me, 10)),
  });
  await open(page, scenario);
  await page.getByRole('radio', { name: 'Buy Yes', exact: true }).focus();
  for (const name of ['Sell Yes', 'Buy No', 'Sell No']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
  }
  await page.keyboard.press('Tab'); // the quantity
  await expect(page.getByLabel('Quantity')).toBeFocused();
  await page.keyboard.press('Enter');
  await done(page, 'Sold 10 No at 35¢ · received 3.50 USDC');
  await expect(page.locator('.status-line')).toBeFocused();
});

for (const [name, size] of [
  ['320 px', { width: 320, height: 800 }],
  ['200% zoom', { width: 640, height: 400 }],
] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`Trade with Sell No in use has no accessibility violations at ${name}, ${scheme}, and does not scroll sideways`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(size);
      const scenario = await f4Scenario({
        no: 3n, // short of 10, so the "You hold 3 No" notice shows too
        after: { usdc: 21_050_000n, yes: 0n, no: 0n },
        innerInstructions: events(fillEvent(me, 65, 3, Side.Buy), redeemedEvent(me, 3)),
      });
      await open(page, scenario);
      await pick(page, 'Sell No');
      await expect(page.getByText('You hold 3 No; you can sell at most 3.')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
      expect((await axe(page).analyze()).violations).toEqual([]);
      // And after a result.
      await page.getByLabel('Quantity').fill('3');
      await ticketButton(page, 'Sell No').click();
      await done(page, 'Sold 3 No at 35¢ · received 1.05 USDC');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
}

for (const scheme of ['light', 'dark'] as const) {
  test(`Buy No in use has no accessibility violations at 320 px, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page, await f4Scenario({ usdc: 1_000_000n }));
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5');
    await expect(page.getByText(/^You need up to 1\.85 USDC; you have 1\.00\.$/)).toBeVisible();
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
}
