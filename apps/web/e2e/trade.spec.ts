// Trade (F4 to F7): the book, the ticket for the four buttons, and the tracker's states, against replayed accounts (P27)
// and a fake Wallet Standard wallet. Negative cases: wrong network, a closed wallet window (4001), not enough USDC, an
// empty book, orders closed.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { bookBytes, chainMarket, F4_ASKS } from '../test/fixtures/chain.ts';
import { addFakeWallet, f4Scenario, fakeNetwork, setWalletMode, signedCount, TRADER, type Scenario } from './support.ts';

const axe = (page: Page) => new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] });

const TEN_SIXTEEN = new Date('2026-10-08T14:16:00Z');
const AFTER_CLOSE = new Date('2026-10-08T20:30:00Z'); // 4:30 PM ET
const META_680 = '/trade?market=META-680-2026-10-08';
const META_690 = '/trade?market=META-690-2026-10-08';

async function open(page: Page, scenario: Scenario, url = META_680, time = TEN_SIXTEEN) {
  const errors = await fakeNetwork(page, scenario);
  await addFakeWallet(page);
  await page.clock.setFixedTime(time);
  await page.goto(url);
  return errors;
}

async function connect(page: Page) {
  await page.getByRole('button', { name: 'Connect wallet' }).first().click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Connected' })).toBeVisible();
  await page.getByRole('button', { name: 'Wallet' }).click(); // closes the panel
}

const ticketButton = (page: Page, name: string) => page.locator('form').getByRole('button', { name, exact: true });
// Moves focus with the Tab key alone, to prove a control can be reached that way.
async function tabTo(page: Page, target: ReturnType<Page['locator']>) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('The control cannot be reached with Tab');
}
const pick = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();

test.describe('the book and the prices', () => {
  test('shows the four prices and both sides of the book with their words (F4)', async ({ page }) => {
    const errors = await open(page, await f4Scenario());
    await expect(page.getByRole('heading', { name: 'META $680 or above', level: 1 })).toBeVisible();
    await expect(page.getByText('Closes in 5 h 44 min')).toBeVisible();
    const prices = page.getByRole('list').filter({ hasText: 'Buy Yes 65¢' });
    await expect(prices).toContainText('Sell Yes 64¢');
    await expect(prices).toContainText('Buy No 36¢');
    await expect(prices).toContainText('Sell No 35¢');
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(1 + 3); // header, two asks, one bid
    await expect(rows.nth(1)).toContainText('Ask66¢5');
    await expect(rows.nth(2)).toContainText('Ask65¢10');
    await expect(rows.nth(3)).toContainText('Bid64¢5');
    expect(errors).toEqual([]);
  });

  test('an empty book says "No quotes yet" everywhere, and the market order cannot be sent', async ({ page }) => {
    await open(page, await f4Scenario(), META_690);
    await expect(page.getByText('No quotes yet.').first()).toBeVisible();
    await expect(page.getByText('Buy Yes: no quotes yet')).toBeVisible();
    await expect(page.getByText('No quotes yet: nobody is selling Yes right now. Place a limit order to start the book.')).toBeVisible();
    await connect(page);
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
    // A limit order is the way in, and it can be sent.
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('60');
    await expect(page.getByText('You offer to buy 10 Yes at 60¢ each.')).toBeVisible();
    await expect(ticketButton(page, 'Buy Yes')).toBeEnabled();
  });

  test('a market that is not on the chain says so and links to Markets', async ({ page }) => {
    await open(page, await f4Scenario(), '/trade?market=META-999-2026-10-08');
    await expect(page.getByRole('alert')).toContainText('There is no META $999 or above market on Solana devnet for Thursday, October 8, 2026');
    await expect(page.getByRole('link', { name: 'Browse the markets' })).toBeVisible();
  });

  test('an address that is not a market says so', async ({ page }) => {
    await open(page, await f4Scenario(), '/trade?market=nonsense');
    await expect(page.getByRole('heading', { name: 'Market not found' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('isn\'t a market address');
  });
});

test.describe('the ticket', () => {
  test('F4: Buy Yes of 10 reads the payoff and the most she pays, from packages/shared’s worst price', async ({ page }) => {
    await open(page, await f4Scenario());
    await expect(
      page.getByText('You pay 6.50 USDC for 10 Yes. If META closes at or above $680 at 4:00 PM ET (Pyth price), you get 10.00, a profit of 3.50. Otherwise you lose 6.50.'),
    ).toBeVisible();
    await expect(page.getByText('You pay at most 6.60 USDC.')).toBeVisible();
  });

  test('more than the book holds: says how many are offered and points to a limit order', async ({ page }) => {
    await open(page, await f4Scenario());
    await page.getByLabel('Quantity').fill('20');
    await expect(page.getByText('Only 15 Yes are offered right now, so this order can’t fill in full. Lower the quantity, or place a limit order.')).toBeVisible();
  });

  test('the four actions are one radio group, moved by the arrow keys', async ({ page }) => {
    await open(page, await f4Scenario());
    await page.getByRole('radio', { name: 'Buy Yes', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Sell Yes', exact: true })).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Buy No', exact: true })).toBeChecked();
    // The F4 book has bids for only 5 Yes, so 10 No can't fill.
    await expect(page.getByText('Only 5 Yes are wanted right now')).toBeVisible();
  });

  test('Buy No and Sell No say the program does not accept them yet, and refuse after the devnet check, with nothing sent', async ({ page }) => {
    // Devnet answers the program's NotImplemented (6015, P31).
    const scenario = await f4Scenario({ simulation: { InstructionError: [2, { Custom: 6015 }] } });
    await open(page, scenario);
    await connect(page);
    await pick(page, 'Buy No');
    await page.getByLabel('Quantity').fill('5'); // the F4 book wants 5 Yes
    await expect(page.getByRole('note').filter({ hasText: "Buy No isn't switched on in the program yet." })).toBeVisible();
    await ticketButton(page, 'Buy No').click();
    await expect(page.getByRole('alert')).toContainText("Buy No isn't switched on yet: the program accepts it in a later release. Nothing was sent.");
    expect(scenario.sent).toHaveLength(0);
    expect(await signedCount(page)).toBe(0);
    await pick(page, 'Sell No');
    await page.getByLabel('Quantity').fill('5');
    await ticketButton(page, 'Sell No').click();
    await expect(page.getByRole('alert')).toContainText("Sell No isn't switched on yet");
  });

  test('without a wallet the button asks to connect, and opens the wallet panel', async ({ page }) => {
    await open(page, await f4Scenario());
    await page.locator('form').getByRole('button', { name: 'Connect wallet' }).click();
    await expect(page.getByRole('heading', { name: 'Connect wallet', level: 2 })).toBeVisible();
  });
});

test.describe('buying and selling Yes through the tracker (D13)', () => {
  test('F4: Buy Yes is checked on devnet, signed by the wallet, sent by the site, and reported as it happened', async ({ page }) => {
    const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n } });
    const errors = await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes at 65¢ · 6.50 USDC' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View the transaction' })).toHaveAttribute('href', /explorer\.solana\.com\/tx\/.*cluster=devnet/);
    expect(scenario.simulated).toHaveLength(1);
    expect(scenario.sent).toHaveLength(1);
    expect(await signedCount(page)).toBe(1);
    // The simulation came first, then the wallet, then the site's own send (D115).
    expect(scenario.calls.indexOf('simulateTransaction')).toBeLessThan(scenario.calls.indexOf('sendTransaction'));
    await expect(page.getByText('You hold 10 Yes and 0 No on META $680 or above. USDC in your wallet: 13.50.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('F4: a buy that filled in part says how many were not bought', async ({ page }) => {
    const scenario = await f4Scenario({ after: { usdc: 16_700_000n, yes: 5n, no: 0n } });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('status').filter({ hasText: "Bought 5 of 10 Yes at 66¢ · 3.30 USDC. The other 5 weren't bought: nobody was selling at 66¢ or less." })).toBeVisible();
  });

  test('F7: Sell Yes of 5 into the bid of 64¢', async ({ page }) => {
    const scenario = await f4Scenario({ yes: 5n, after: { usdc: 23_200_000n, yes: 0n, no: 0n } });
    await open(page, scenario);
    await connect(page);
    await pick(page, 'Sell Yes');
    await page.getByLabel('Quantity').fill('5');
    await ticketButton(page, 'Sell Yes').click();
    await expect(page.getByRole('status').filter({ hasText: 'Sold 5 Yes at 64¢ · received 3.20 USDC' })).toBeVisible();
  });

  test('the ticket works by keyboard alone: Tab to the quantity, press Enter, and focus returns to the status line', async ({ page }) => {
    const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n } });
    await open(page, scenario);
    await connect(page);
    await tabTo(page, page.getByRole('radio', { name: 'Buy Yes', exact: true }));
    await tabTo(page, page.getByLabel('Quantity'));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible();
    await expect(page.locator('.status-line')).toBeFocused();
  });

  test('sent but not yet answered shows "Sent, may still land", never a failure, then done when it lands', async ({ page }) => {
    test.setTimeout(30_000);
    const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n }, statuses: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'finalized'] });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByText('Sent, may still land.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible({ timeout: 15_000 });
  });

  test('an order that expires before it lands says nothing was spent, and Try again sends a new one', async ({ page }) => {
    test.setTimeout(30_000);
    const scenario = await f4Scenario({ statuses: ['none'], blockHeight: 200n, after: { usdc: 13_500_000n, yes: 10n, no: 0n } });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText('Your order expired before it reached the network. Nothing was spent.');
    expect(scenario.sent).toHaveLength(1);
    scenario.statuses = ['finalized'];
    scenario.blockHeight = 100n;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible();
    expect(scenario.sent).toHaveLength(2);
  });
});

test.describe('negative cases', () => {
  test('a closed wallet window (code 4001): nothing was sent, in D136’s words', async ({ page }) => {
    const scenario = await f4Scenario();
    await open(page, scenario);
    await connect(page);
    await setWalletMode(page, 'close');
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('status').filter({ hasText: "Nothing was sent. If your wallet said the network doesn't match, switch it to Solana Devnet and try again." })).toBeVisible();
    expect(scenario.sent).toHaveLength(0);
    // The button works again, and the attempt that follows goes through.
    await setWalletMode(page, 'sign');
    scenario.after = { usdc: 13_500_000n, yes: 10n, no: 0n };
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible();
  });

  test('the wallet refuses a transaction that passed on devnet (-32003): it seems to be on Mainnet', async ({ page }) => {
    const scenario = await f4Scenario();
    await open(page, scenario);
    await connect(page);
    await setWalletMode(page, 'mainnet');
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText('Your wallet seems to be on Mainnet. Switch it to Solana Devnet, then try again.');
    expect(scenario.simulated).toHaveLength(1);
    expect(scenario.sent).toHaveLength(0);
  });

  test('not enough USDC: the button is disabled with the words from F4, before any wallet window', async ({ page }) => {
    const scenario = await f4Scenario({ usdc: 4_000_000n });
    await open(page, scenario);
    await connect(page);
    await expect(page.getByText('You need up to 6.60 USDC; you have 4.00.')).toBeVisible();
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
    // Selling needs no USDC.
    await pick(page, 'Sell Yes');
    await page.getByLabel('Quantity').fill('5'); // the F4 book bids for 5
    await expect(ticketButton(page, 'Sell Yes')).toBeEnabled();
    // Nothing was simulated or signed: the button never fired.
    expect(scenario.simulated).toHaveLength(0);
    expect(await signedCount(page)).toBe(0);
  });

  test('orders closed (after 4:00 PM): the book stays, the buttons do not, and the words say when the result comes', async ({ page }) => {
    await open(page, await f4Scenario(), META_680, AFTER_CLOSE);
    await connect(page);
    await expect(page.getByText('Trading ended · result expected by about 4:05 PM ET').first()).toBeVisible();
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('before 9:30 the buttons are disabled with "Opens 9:30 AM ET"', async ({ page }) => {
    await open(page, await f4Scenario(), META_680, new Date('2026-10-08T13:10:00Z'));
    await connect(page);
    await expect(page.getByText('Opens 9:30 AM ET').first()).toBeVisible();
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
  });

  test('the close passes while the order is in flight: devnet’s answer is shown in USERS.md’s words', async ({ page }) => {
    // The simulation passed at the moment of the check; the order landed after the close and the program refused it.
    const scenario = await f4Scenario({ statuses: [{ err: { InstructionError: [2, { Custom: 6022 }] } }] });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText(
      'Trading ended before your order reached the network. Nothing was bought; only the network fee was charged.',
    );
  });

  test('the program says orders are closed in the devnet check: nothing was sent', async ({ page }) => {
    const scenario = await f4Scenario({ simulation: { InstructionError: [2, { Custom: 6022 }] } });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText('Trading has ended, so nothing was bought and nothing was sent.');
    expect(scenario.sent).toHaveLength(0);
    expect(await signedCount(page)).toBe(0);
  });

  test('paused: the ticket says so and cannot send', async ({ page }) => {
    await open(page, await f4Scenario({ paused: true }));
    await connect(page);
    await expect(page.getByText('Trading is paused by the admin. You can still cancel orders, close pairs and redeem.').first()).toBeVisible();
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
  });

  test('a market read that fails says so and offers Try again', async ({ page }) => {
    const scenario = await f4Scenario({ devnet: 'down' });
    await open(page, scenario);
    await expect(page.getByRole('alert')).toContainText("Solana devnet didn't answer");
    scenario.devnet = 'up';
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Ticket' })).toBeVisible();
  });
});

for (const [name, viewport] of [
  ['320 px', { width: 320, height: 800 }],
  ['200% zoom', { width: 640, height: 400 }],
] as const) {
  test(`Trade has no accessibility violations and no sideways scroll beyond the book at ${name}`, async ({ page }) => {
    await open(page, await f4Scenario({ yes: 3n }));
    await page.setViewportSize(viewport);
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto(META_680);
      await expect(page.getByRole('heading', { name: 'Ticket' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const { violations } = await axe(page).analyze();
      expect(violations.map((v) => `${colorScheme} ${v.id}: ${v.help}`)).toEqual([]);
    }
  });
}

test('Trade is clean for axe with a wallet connected, a result on screen and an error on screen (320 px)', async ({ page }) => {
  const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n }, simulation: null });
  await open(page, scenario);
  await page.setViewportSize({ width: 320, height: 800 });
  await connect(page);
  await ticketButton(page, 'Buy Yes').click();
  await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible();
  let { violations } = await axe(page).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  await setWalletMode(page, 'mainnet');
  await ticketButton(page, 'Buy Yes').click();
  await expect(page.getByRole('alert')).toBeVisible();
  ({ violations } = await axe(page).analyze());
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test.describe('review fixes', () => {
  test('a send that errors does not end the attempt: the site keeps watching the signature and offers no second order', async ({ page }) => {
    test.setTimeout(30_000);
    // The site's send gets an error back, but the transaction lands and finalizes.
    const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n }, statuses: ['none', 'none', 'finalized'] });
    scenario.landedBefore = { usdc: 20_000_000n, yes: 0n, no: 0n }; // the fake never sees the send
    await open(page, scenario);
    await page.route('https://api.devnet.solana.com/**', (route) => {
      if (route.request().postDataJSON().method === 'sendTransaction') return route.fulfill({ status: 500, body: 'oops' });
      return route.fallback();
    });
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('leaving the page during "may still land" and coming back finds the attempt, and the button stays off', async ({ page }) => {
    test.setTimeout(30_000);
    const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n }, statuses: [...Array(10).fill('none'), 'finalized'] });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByText('Sent, may still land.')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Markets' }).click();
    await page.getByRole('link', { name: /META \$680 or above/ }).click();
    await expect(page.getByText('Sent, may still land.')).toBeVisible();
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible({ timeout: 15_000 });
    expect(scenario.sent).toHaveLength(1);
  });

  test('a reload during "may still land" resumes watching the saved signature, with no second order', async ({ page }) => {
    test.setTimeout(40_000);
    const scenario = await f4Scenario({ after: { usdc: 13_500_000n, yes: 10n, no: 0n }, statuses: [...Array(10).fill('none'), 'finalized'] });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByText('Sent, may still land.')).toBeVisible({ timeout: 15_000 });
    await page.reload();
    // The wallet reconnects by itself, or is connected again; the saved attempt is picked up once it is.
    await page.locator('.wallet-bar button').click();
    const list = page.getByRole('button', { name: 'Connect Fake Wallet' });
    if (await list.isVisible()) await list.click();
    await expect(page.getByRole('status').filter({ hasText: 'Bought 10 Yes' })).toBeVisible({ timeout: 25_000 });
    expect(scenario.sent).toHaveLength(1);
  });

  test('a limit order that rests is worded from the book: Order placed · Buy 10 Yes at 60¢ · 6.00 USDC locked (F6)', async ({ page }) => {
    const scenario = await f4Scenario({ after: { usdc: 14_000_000n, yes: 0n, no: 0n } });
    const m = scenario.markets[0]!;
    // When the order lands, the book holds it, owned by the trader, under the ID the page chose.
    scenario.onFinalized = () => {
      m.book = bookBytes(m.address, [[60, 10, 0, 4242n]], F4_ASKS, TRADER);
    };
    await open(page, scenario);
    await connect(page);
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('60');
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('status').filter({ hasText: 'Order placed · Buy 10 Yes at 60¢ · 6.00 USDC locked' })).toBeVisible();
    expect(scenario.sent).toHaveLength(1);
  });

  test('a limit order that fills in part says what filled and what rests', async ({ page }) => {
    // 4 filled at 60¢ (2.40) and 6 rest (3.60 locked).
    const scenario = await f4Scenario({ after: { usdc: 14_000_000n, yes: 4n, no: 0n } });
    const m = scenario.markets[0]!;
    scenario.onFinalized = () => {
      m.book = bookBytes(m.address, [[60, 6, 0, 4242n]], F4_ASKS, TRADER);
    };
    await open(page, scenario);
    await connect(page);
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('60');
    await ticketButton(page, 'Buy Yes').click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Bought 4 of 10 Yes at 60¢ · 2.40 USDC. 6 are resting on the book · 3.60 USDC locked.' }),
    ).toBeVisible();
  });

  test('a large order asks first (D88), Back changes nothing, and the same verb confirms', async ({ page }) => {
    const scenario = await f4Scenario({ usdc: 500_000_000n, after: { usdc: 380_000_000n, yes: 0n, no: 0n } });
    await open(page, scenario);
    await connect(page);
    await pick(page, 'Limit');
    await page.getByLabel('Quantity').fill('200');
    await page.getByLabel('Pay at most (cents each)').fill('60');
    await ticketButton(page, 'Buy Yes').click();
    const group = page.getByRole('group', { name: 'Confirm large order' });
    await expect(group).toContainText('Buy 200 Yes for up to 120.00 USDC? Nothing is offered at 60¢ or less right now, so most of this order may not fill.');
    expect(scenario.simulated).toHaveLength(0);
    await group.getByRole('button', { name: 'Back' }).click();
    await expect(group).toHaveCount(0);
    await expect(page.getByLabel('Quantity')).toBeFocused();
    await ticketButton(page, 'Buy Yes').click();
    await group.getByRole('button', { name: 'Buy Yes', exact: true }).click();
    await expect.poll(() => scenario.sent.length).toBe(1);
  });

  test('a re-sent order ID (6010) is "already placed", not a failure to retry', async ({ page }) => {
    const scenario = await f4Scenario({ simulation: { InstructionError: [2, { Custom: 6010 }] } });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText('This order was already placed. The book and your balances show what happened to it.');
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  });

  test('USDC trouble in an account-opening instruction is not called "not enough USDC"', async ({ page }) => {
    const scenario = await f4Scenario({ simulation: { InstructionError: [0, { Custom: 1 }] } });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText('Devnet refused this order');
  });

  test('a settled market shows its status words as USERS.md writes them, not folded into a sentence', async ({ page }) => {
    const scenario = await f4Scenario();
    scenario.markets.push(await chainMarket({ strikeDollars: 700, status: 'Settled', outcome: 'Yes' }, [], []));
    await open(page, scenario, '/trade?market=META-700-2026-10-08', new Date('2026-10-08T21:30:00Z'));
    await connect(page);
    await expect(page.locator('#ticket-reason')).toHaveText('Yes wins');
  });

  test('a strike too large for any market is "not found", not a page stuck on "Reading…"', async ({ page }) => {
    await open(page, await f4Scenario(), '/trade?market=META-99999999999999999999-2026-10-08');
    await expect(page.getByRole('heading', { name: 'Market not found' })).toBeVisible();
  });

  test('the pause flag is re-read on the book’s poll: pausing while the page is open turns the ticket off', async ({ page }) => {
    test.setTimeout(30_000);
    const scenario = await f4Scenario();
    await open(page, scenario);
    await connect(page);
    await expect(ticketButton(page, 'Buy Yes')).toBeEnabled();
    scenario.paused = true;
    await expect(page.getByText('Trading is paused by the admin.').first()).toBeVisible({ timeout: 15_000 });
    await expect(ticketButton(page, 'Buy Yes')).toBeDisabled();
  });

  test('during and after an attempt, focus is on the status line, not the body, even as the pressed button goes away', async ({ page }) => {
    const scenario = await f4Scenario({ statuses: ['none'], blockHeight: 200n });
    await open(page, scenario);
    await connect(page);
    await ticketButton(page, 'Buy Yes').click();
    await expect(page.getByRole('alert')).toContainText('expired');
    await expect(page.locator('.status-line')).toBeFocused();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('.status-line')).toBeFocused();
  });
});
