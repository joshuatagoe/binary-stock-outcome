// Portfolio and Cancel order (M5-c; USERS.md F6, F13; D39, D68, D99, D143): the wallet's open orders and positions read from the
// chain, Cancel order through the tracker from Portfolio and from Trade, and a Buy No limit order as a pending order. Against replayed
// accounts (P27) and a fake Wallet Standard wallet.
import AxeBuilder from '@axe-core/playwright';
import { RedeemMode, Side } from '@meridian/client';
import { expect, test, type Page } from '@playwright/test';
import { bookBytes, chainMarket, CREATOR, F4_ASKS, F4_BIDS, OTHER_OWNER, type BookTrader, type ChainMarket, type Resting } from '../test/fixtures/chain.ts';
import { ownerCancelEvent, pairsMintedEvent, redeemedEvent, type EventInstruction } from '../test/fixtures/events.ts';
import { addFakeWallet, f4Scenario, fakeNetwork, signedCount, TRADER, type Scenario } from './support.ts';

const axe = (page: Page) => new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] });
const ME = TRADER as string;
const TEN_SIXTEEN = new Date('2026-10-08T14:16:00Z');
const META_680 = '/trade?market=META-680-2026-10-08';
const events = (...instructions: EventInstruction[]) => [{ index: 0, instructions }];

const who = (credit: Partial<Pick<BookTrader, 'freeUsdc' | 'freeYes' | 'freeNo'>> = {}): BookTrader[] => [
  { owner: TRADER, ...credit },
  { owner: OTHER_OWNER },
  { owner: OTHER_OWNER },
];

/** META $680 at 10:16 with the F4 book and the wallet's own orders added: Carol's bid and, optionally, a Buy No limit's paired offer. */
async function book(own: { bids?: Resting[]; asks?: Resting[]; credit?: Partial<Pick<BookTrader, 'freeUsdc' | 'freeYes' | 'freeNo'>> } = {}) {
  return chainMarket({ strikeDollars: 680 }, [...F4_BIDS, ...(own.bids ?? [])], [...F4_ASKS, ...(own.asks ?? [])], who(own.credit));
}
/** The same market after the chain changed: the book is replaced as the program would leave it. */
function rebook(m: ChainMarket, own: { bids?: Resting[]; asks?: Resting[]; credit?: Partial<Pick<BookTrader, 'freeUsdc' | 'freeYes' | 'freeNo'>> } = {}) {
  m.book = bookBytes(m.address, [...F4_BIDS, ...(own.bids ?? [])], [...F4_ASKS, ...(own.asks ?? [])], CREATOR, who(own.credit));
}

/** The size an order was placed at, as the site remembered it when it placed the order from this browser. */
async function remember(page: Page, m: ChainMarket, orderId: number, size: number) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key!, value!), ['meridian-placed', JSON.stringify([[`${ME}:${m.address}:${orderId}`, size]])]);
}

async function connect(page: Page) {
  await page.getByRole('button', { name: 'Connect wallet' }).first().click();
  await page.getByRole('button', { name: 'Connect Fake Wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Connected' })).toBeVisible();
  await page.getByRole('button', { name: 'Wallet' }).click(); // closes the panel
}

async function openPage(page: Page, scenario: Scenario, url: string, options: { wallet?: boolean; install?: boolean } = {}) {
  const errors = await fakeNetwork(page, scenario);
  await addFakeWallet(page);
  if (options.install) await page.clock.install({ time: TEN_SIXTEEN });
  else await page.clock.setFixedTime(TEN_SIXTEEN);
  await page.goto(url);
  if (options.wallet !== false) await connect(page);
  return errors;
}

const status = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text });
const cancelButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const ticketButton = (page: Page, name: string) => page.locator('form').getByRole('button', { name, exact: true });
const pick = (page: Page, name: string) => page.getByRole('radio', { name, exact: true }).check();

async function tabTo(page: Page, target: ReturnType<Page['locator']>) {
  for (let i = 0; i < 60; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('The control cannot be reached with Tab');
}

const reads = (scenario: Scenario) => scenario.calls.filter((c) => c === 'getProgramAccounts').length;

test.describe('Portfolio with no wallet and with nothing in it', () => {
  test('without a wallet it says so and offers Connect wallet; connecting shows an empty Portfolio in plain words', async ({ page }) => {
    const scenario = await f4Scenario();
    const errors = await openPage(page, scenario, '/portfolio', { wallet: false });
    await expect(page.getByRole('heading', { name: 'Portfolio', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No wallet connected' })).toBeVisible();
    await expect(page.getByText('Connect your wallet to see your open orders and positions.')).toBeVisible();
    expect(scenario.calls).not.toContain('getMultipleAccounts');
    await connect(page);
    await expect(page.getByText('USDC 20.00 available · 0.00 in orders')).toBeVisible();
    await expect(page.getByText('You have no open orders. A limit order that does not fill at once rests here, and you can cancel it.')).toBeVisible();
    await expect(page.getByText('You hold no positions.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse the markets' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('is reachable from the main navigation', async ({ page }) => {
    await openPage(page, await f4Scenario(), '/markets', { wallet: false });
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Portfolio' }).click();
    await expect(page.getByRole('heading', { name: 'Portfolio', level: 1 })).toBeVisible();
  });

  test('devnet down: says so in plain words, and Try again reads again once it is back', async ({ page }) => {
    const scenario = await f4Scenario({ devnet: 'down' });
    await openPage(page, scenario, '/portfolio');
    await expect(page.getByRole('alert')).toContainText("didn't answer");
    await expect(page.getByText('USDC 20.00 available')).toHaveCount(0);
    scenario.devnet = 'up';
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('USDC 20.00 available · 0.00 in orders')).toBeVisible();
  });
});

test.describe('the orders and positions of F6 and F13', () => {
  test('Carol’s bid after 4 fill: the header, the row, its Cancel button’s name, and the 4 Yes in Positions', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    await remember(page, m, 4242, 10);
    const scenario = await f4Scenario({ markets: [m], usdc: 14_000_000n, holdings: { [m.address]: { yes: 4n } } });
    const errors = await openPage(page, scenario, '/portfolio');
    await expect(page.getByText('USDC 14.00 available · 3.60 in orders', { exact: true })).toBeVisible();
    await expect(page.getByText('Buy 10 Yes at 60¢')).toBeVisible();
    await expect(page.getByText('4 filled · 6 open · 3.60 USDC locked', { exact: true })).toBeVisible();
    await expect(cancelButton(page, 'Cancel order: buy 10 Yes at 60 cents, 6 open')).toBeVisible();
    // "Worth if sold now" is what the 64¢ bid would pay, not a midpoint: 4 x 64¢.
    await expect(page.getByText('4 Yes · worth 2.56 if sold now · pays 4.00 if Yes wins', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'META $680 or above' }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('without the size the order was placed at (another browser), the row claims no filled count', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    const scenario = await f4Scenario({ markets: [m], usdc: 14_000_000n });
    await openPage(page, scenario, '/portfolio');
    await expect(page.getByText('Buy Yes at 60¢')).toBeVisible();
    await expect(page.getByText('6 open · 3.60 USDC locked', { exact: true })).toBeVisible();
    await expect(page.getByText(/filled/)).toHaveCount(0);
  });

  test('Bob’s Buy No limit is a pending order, not a position (D39); the 4 that sold are a position', async ({ page }) => {
    const m = await book({ asks: [[67, 6, 0, 4244n, 1]] });
    await remember(page, m, 4244, 10);
    const scenario = await f4Scenario({ markets: [m], usdc: 20_000_000n, holdings: { [m.address]: { no: 4n } } });
    await openPage(page, scenario, '/portfolio');
    await expect(page.getByText('USDC 20.00 available · 6.00 in orders', { exact: true })).toBeVisible();
    await expect(page.getByText('Buying 10 No: selling 10 Yes at 67¢. If all fill, you hold 10 No at 33¢.')).toBeVisible();
    await expect(page.getByText('4 filled · 6 left · 6.00 USDC locked as 6 pairs', { exact: true })).toBeVisible();
    await expect(cancelButton(page, 'Cancel order: buy 10 No at 33 cents, 6 left')).toBeVisible();
    // 4 No sell by buying Yes from the asks at 65¢ and closing the pairs: 4 x 35¢.
    await expect(page.getByText('4 No · worth 1.40 if sold now · pays 4.00 if No wins', { exact: true })).toBeVisible();
  });

  test('a fill whose money still waits in the book is counted as on its way to the wallet (D99)', async ({ page }) => {
    const m = await book({ credit: { freeUsdc: 2_680_000n, freeYes: 4n } });
    const scenario = await f4Scenario({ markets: [m], usdc: 14_000_000n });
    await openPage(page, scenario, '/portfolio');
    await expect(page.getByText('USDC 14.00 available · 0.00 in orders · 2.68 on its way to your wallet', { exact: true })).toBeVisible();
    await expect(page.getByText('4 Yes (4 on their way to your wallet) · worth 2.56 if sold now · pays 4.00 if Yes wins', { exact: true })).toBeVisible();
  });

  test('a position in a market that has ended shows the market’s state, not a price (Awaiting result and Settled come later)', async ({ page }) => {
    const m = await chainMarket({ strikeDollars: 680, status: 'Settled', outcome: 'Yes' }, F4_BIDS, F4_ASKS, who());
    const scenario = await f4Scenario({ markets: [m], holdings: { [m.address]: { yes: 10n } } });
    await openPage(page, scenario, '/portfolio');
    await expect(page.getByText('10 Yes · Yes wins', { exact: true })).toBeVisible();
    await expect(page.getByText(/worth/)).toHaveCount(0);
  });
});

test.describe('Cancel order (F6)', () => {
  test('Carol cancels her bid: checked on devnet, signed, sent, and said from the landed transaction, with the money on its way (D99)', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    await remember(page, m, 4242, 10);
    const scenario = await f4Scenario({
      markets: [m],
      usdc: 14_000_000n,
      innerInstructions: events(ownerCancelEvent(ME, Side.Buy, 60, 6, 4242)),
      onFinalized: () => rebook(m, { credit: { freeUsdc: 3_600_000n } }),
    });
    const errors = await openPage(page, scenario, '/portfolio');
    await cancelButton(page, 'Cancel order: buy 10 Yes at 60 cents, 6 open').click();
    await expect(status(page, 'Order cancelled · 3.60 USDC returned · on its way to your wallet')).toBeVisible();
    expect(scenario.simulated).toHaveLength(1);
    expect(scenario.sent).toHaveLength(1);
    expect(await signedCount(page)).toBe(1);
    expect(scenario.calls.indexOf('simulateTransaction')).toBeLessThan(scenario.calls.indexOf('sendTransaction'));
    // The order is gone from Open orders, the money is in neither "available" nor "in orders" yet, and the page says where it is.
    await expect(cancelButton(page, 'Cancel order: buy 10 Yes at 60 cents, 6 open')).toHaveCount(0);
    await expect(page.getByText('USDC 14.00 available · 0.00 in orders · 3.60 on its way to your wallet', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View the transaction' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('"on its way to your wallet" goes only after the book has been read empty twice: Return to owner landed', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    const scenario = await f4Scenario({
      markets: [m],
      usdc: 14_000_000n,
      innerInstructions: events(ownerCancelEvent(ME, Side.Buy, 60, 6, 4242)),
      onFinalized: () => rebook(m, { credit: { freeUsdc: 3_600_000n } }),
    });
    await openPage(page, scenario, '/portfolio', { install: true });
    await cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents').click();
    await expect(status(page, 'Order cancelled · 3.60 USDC returned · on its way to your wallet')).toBeVisible();
    // About 30 seconds later the backend's Return to owner pays the wallet: the book is empty and the wallet has the money.
    rebook(m);
    scenario.usdc = 17_600_000n;
    let seen = reads(scenario);
    await page.clock.fastForward(10_000);
    await expect.poll(() => reads(scenario)).toBeGreaterThan(seen);
    // One empty read could be a node that is behind: still on its way.
    await expect(status(page, 'Order cancelled · 3.60 USDC returned · on its way to your wallet')).toBeVisible();
    seen = reads(scenario);
    await page.clock.fastForward(10_000);
    await expect.poll(() => reads(scenario)).toBeGreaterThan(seen);
    await expect(status(page, /^Order cancelled · 3\.60 USDC returned(?! · on its way)/)).toBeVisible();
    await expect(page.getByText('USDC 17.60 available · 0.00 in orders', { exact: true })).toBeVisible();
  });

  test('Bob cancels what is left of his Buy No limit: the unsold pairs close and the 6.00 comes back (D142, D143)', async ({ page }) => {
    const m = await book({ asks: [[67, 6, 0, 4244n, 1]] });
    await remember(page, m, 4244, 10);
    const scenario = await f4Scenario({
      markets: [m],
      holdings: { [m.address]: { no: 4n } },
      innerInstructions: events(ownerCancelEvent(ME, Side.Sell, 67, 6, 4244), redeemedEvent(ME, 6, RedeemMode.Pairs)),
      onFinalized: () => rebook(m, { credit: { freeUsdc: 6_000_000n } }),
    });
    await openPage(page, scenario, '/portfolio');
    await cancelButton(page, 'Cancel order: buy 10 No at 33 cents, 6 left').click();
    await expect(status(page, 'Order cancelled · 6 pairs closed · 6.00 USDC returned · on its way to your wallet')).toBeVisible();
    // The 4 No that sold stay a position.
    await expect(page.getByText(/^4 No · worth/)).toBeVisible();
  });

  test('works while trading is paused (D68)', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    const scenario = await f4Scenario({
      markets: [m],
      paused: true,
      innerInstructions: events(ownerCancelEvent(ME, Side.Buy, 60, 6, 4242)),
      onFinalized: () => rebook(m, { credit: { freeUsdc: 3_600_000n } }),
    });
    await openPage(page, scenario, '/portfolio');
    await expect(page.getByText('Trading is paused by the admin. You can still cancel orders, close pairs and redeem.')).toBeVisible();
    await expect(cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents')).toBeEnabled();
    await cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents').click();
    await expect(status(page, 'Order cancelled · 3.60 USDC returned')).toBeVisible();
    expect(await signedCount(page)).toBe(1);
  });

  test('an order that filled before the cancel arrived: nothing is signed, and the words say it is no longer open', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    const scenario = await f4Scenario({ markets: [m], simulation: { InstructionError: [0, { Custom: 6031 }] } });
    await openPage(page, scenario, '/portfolio');
    await cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents').click();
    await expect(page.getByRole('alert')).toContainText(
      'That order is no longer open: it was filled or cancelled before this cancel arrived. Nothing was changed; your balances and positions show what happened.',
    );
    expect(await signedCount(page)).toBe(0);
    expect(scenario.sent).toHaveLength(0);
  });

  test('a closed wallet window sends nothing and leaves the order open', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    const scenario = await f4Scenario({ markets: [m] });
    await openPage(page, scenario, '/portfolio');
    await page.evaluate(() => ((window as unknown as { __fakeWallet: { mode: string } }).__fakeWallet.mode = 'close'));
    await cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents').click();
    await expect(status(page, "Nothing was sent. If your wallet said the network doesn't match")).toBeVisible();
    expect(scenario.sent).toHaveLength(0);
    await expect(cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents')).toBeEnabled();
  });

  test('by keyboard alone: Tab to a Cancel order button, Enter, and focus lands on the message', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    const scenario = await f4Scenario({
      markets: [m],
      innerInstructions: events(ownerCancelEvent(ME, Side.Buy, 60, 6, 4242)),
      onFinalized: () => rebook(m, { credit: { freeUsdc: 3_600_000n } }),
    });
    await openPage(page, scenario, '/portfolio');
    await expect(cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents')).toBeVisible();
    await tabTo(page, cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents'));
    await page.keyboard.press('Enter');
    await expect(status(page, 'Order cancelled · 3.60 USDC returned')).toBeVisible();
    const focused = await page.evaluate(() => ({ cls: document.activeElement?.className, text: document.activeElement?.textContent }));
    expect(focused.cls).toContain('order-messages');
    expect(focused.text).toContain('Order cancelled · 3.60 USDC returned');
  });

  test('two orders have two Cancel buttons, each named for its order', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]], asks: [[80, 5, 0, 4243n]] });
    await openPage(page, await f4Scenario({ markets: [m] }), '/portfolio');
    await expect(cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents')).toBeVisible();
    await expect(cancelButton(page, 'Cancel order: sell 5 Yes at 80 cents')).toBeVisible();
    await expect(page.getByText('5 Yes locked')).toBeVisible();
  });
});

test.describe('on the Trade page', () => {
  test('Buy No · Limit: the ticket, the pending order, and Cancel order from Trade', async ({ page }) => {
    const m = await book();
    const scenario = await f4Scenario({
      markets: [m],
      after: { usdc: 10_000_000n, yes: 0n, no: 0n },
      innerInstructions: events(pairsMintedEvent(ME, 10)),
      onFinalized: () => rebook(m, { asks: [[67, 10, 0, 4242n, 1]] }),
    });
    const errors = await openPage(page, scenario, META_680);
    await pick(page, 'Buy No');
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('33');
    await expect(
      page.getByText('You offer to buy 10 No at 33¢ each by selling their Yes at 67¢. Whatever is not bought at once rests on the book, and up to 10.00 USDC is locked as pairs until it sells or you cancel.'),
    ).toBeVisible();
    await expect(page.getByText('You pay at most 3.30 USDC once it has sold.')).toBeVisible();
    await ticketButton(page, 'Buy No').click();
    await expect(status(page, 'Order placed · Buy 10 No at 33¢ · selling 10 Yes at 67¢ · 10.00 USDC locked')).toBeVisible();
    expect(await signedCount(page)).toBe(1);
    // It is a pending order with the "if filled" line (D39), not a position.
    await expect(page.getByText('Buying 10 No: selling 10 Yes at 67¢. If all fill, you hold 10 No at 33¢.')).toBeVisible();
    await expect(page.getByText('0 filled · 10 left · 10.00 USDC locked as 10 pairs', { exact: true })).toBeVisible();

    // Cancel from Trade closes the 10 unsold pairs.
    scenario.after = null;
    scenario.innerInstructions = events(ownerCancelEvent(ME, Side.Sell, 67, 10, 4242), redeemedEvent(ME, 10, RedeemMode.Pairs));
    scenario.onFinalized = () => rebook(m, { credit: { freeUsdc: 10_000_000n } });
    await cancelButton(page, 'Cancel order: buy 10 No at 33 cents').click();
    await expect(status(page, 'Order cancelled · 10 pairs closed · 10.00 USDC returned · on its way to your wallet')).toBeVisible();
    await expect(page.getByText('You have no open orders on this market.')).toBeVisible();
    expect(await signedCount(page)).toBe(2);
    expect(errors).toEqual([]);
  });

  test('Buy No · Limit on a full book is refused whole before the wallet opens (D138, D143)', async ({ page }) => {
    const scenario = await f4Scenario({ simulation: { InstructionError: [2, { Custom: 6009 }] } });
    await openPage(page, scenario, META_680);
    await pick(page, 'Buy No');
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('33');
    await ticketButton(page, 'Buy No').click();
    await expect(page.getByRole('alert')).toContainText("This market's order book is full.");
    expect(await signedCount(page)).toBe(0);
    expect(scenario.sent).toHaveLength(0);
  });

  test('Buy No · Limit: not enough USDC to lock the pairs disables the button with the words', async ({ page }) => {
    const scenario = await f4Scenario({ usdc: 5_000_000n });
    await openPage(page, scenario, META_680);
    await pick(page, 'Buy No');
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('33');
    await expect(page.getByText('You need up to 10.00 USDC; you have 5.00.')).toBeVisible();
    await expect(ticketButton(page, 'Buy No')).toBeDisabled();
  });

  test('a limit price typed for Yes is not carried over to Buy No, where it would mean 100 minus it', async ({ page }) => {
    await openPage(page, await f4Scenario(), META_680);
    await pick(page, 'Limit');
    await page.getByLabel('Pay at most (cents each)').fill('60');
    await pick(page, 'Buy No');
    await expect(page.getByLabel('Pay at most (cents each)')).toHaveValue('');
    await expect(ticketButton(page, 'Buy No')).toBeDisabled();
    await expect(page.getByText('Enter a price from 1¢ to 99¢.')).toBeVisible();
    // Between the two Yes buttons the price keeps its meaning, so it stays.
    await pick(page, 'Buy Yes');
    await page.getByLabel('Pay at most (cents each)').fill('60');
    await pick(page, 'Sell Yes');
    await expect(page.getByLabel('Receive at least (cents each)')).toHaveValue('60');
  });

  test('Sell No has no Limit choice: it never rests (D38)', async ({ page }) => {
    await openPage(page, await f4Scenario(), META_680);
    await pick(page, 'Sell No');
    await expect(page.getByRole('radio', { name: 'Limit', exact: true })).toHaveCount(0);
    await pick(page, 'Buy No');
    await expect(page.getByRole('radio', { name: 'Limit', exact: true })).toBeVisible();
  });

  test('selling Yes that sit in an open order says where they are (F6)', async ({ page }) => {
    const m = await book({ asks: [[80, 4, 0, 4243n]] });
    const scenario = await f4Scenario({ markets: [m], yes: 0n });
    await openPage(page, scenario, META_680);
    await pick(page, 'Sell Yes');
    await page.getByLabel('Quantity').fill('4');
    await expect(page.getByText('4 of your Yes are in an open order. Cancel it to sell them.', { exact: true })).toBeVisible();
    await expect(ticketButton(page, 'Sell Yes')).toBeDisabled();
    // The same on a Sell Yes limit.
    await pick(page, 'Limit');
    await page.getByLabel('Receive at least (cents each)').fill('70');
    await expect(page.getByText('4 of your Yes are in an open order. Cancel it to sell them.', { exact: true })).toBeVisible();
  });

  test('with 6 Yes in the wallet and 4 in an order, selling 10 says both', async ({ page }) => {
    // Another wallet's 60¢ bid is deep enough to take 10, so only the holdings stop the sale.
    const m = await book({ bids: [[60, 10, 1]], asks: [[80, 4, 0, 4243n]] });
    await openPage(page, await f4Scenario({ markets: [m], yes: 6n }), META_680);
    await pick(page, 'Sell Yes');
    await expect(page.getByText('You hold 6 Yes; you can sell at most 6. 4 of your Yes are in an open order. Cancel it to sell them.')).toBeVisible();
  });

  test('without a wallet there is no list of orders, and the other wallets’ orders are never shown as yours', async ({ page }) => {
    const m = await book({ bids: [[60, 6, 0, 4242n]] });
    await openPage(page, await f4Scenario({ markets: [m] }), META_680, { wallet: false });
    await expect(page.getByRole('heading', { name: 'Your open orders' })).toHaveCount(0);
    await connect(page);
    await expect(page.getByRole('heading', { name: 'Your open orders' })).toBeVisible();
    // The bot's and Dave's orders in the same book are not listed: only the 60¢ bid is the wallet's.
    await expect(cancelButton(page, 'Cancel order: buy 6 Yes at 60 cents')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cancel order/ })).toHaveCount(1);
  });
});

// 200% zoom on a 1280 x 800 window is a 640 x 400 CSS pixel page (D116).
const SIZES = [
  ['320 px', { width: 320, height: 800 }],
  ['200% zoom', { width: 640, height: 400 }],
] as const;

for (const [label, size] of SIZES) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`Portfolio with orders, positions and a cancel message has no accessibility violations at ${label}, ${scheme}`, async ({ page }) => {
      const m = await book({ bids: [[60, 6, 0, 4242n]], asks: [[67, 6, 0, 4244n, 1]], credit: {} });
      await remember(page, m, 4242, 10);
      const scenario = await f4Scenario({
        markets: [m],
        usdc: 14_000_000n,
        holdings: { [m.address]: { yes: 4n, no: 2n } },
        innerInstructions: events(ownerCancelEvent(ME, Side.Buy, 60, 6, 4242)),
        onFinalized: () => rebook(m, { asks: [[67, 6, 0, 4244n, 1]], credit: { freeUsdc: 3_600_000n } }),
      });
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(size);
      await openPage(page, scenario, '/portfolio');
      await expect(page.getByText('Buying No: 6 left, selling their Yes at 67¢.', { exact: false })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
      expect((await axe(page).analyze()).violations).toEqual([]);
      await cancelButton(page, 'Cancel order: buy 10 Yes at 60 cents, 6 open').click();
      await expect(status(page, 'Order cancelled · 3.60 USDC returned')).toBeVisible();
      expect((await axe(page).analyze()).violations).toEqual([]);
    });

    test(`Trade with a Buy No limit pending has no accessibility violations at ${label}, ${scheme}`, async ({ page }) => {
      const m = await book({ asks: [[67, 10, 0, 4242n, 1]] });
      await remember(page, m, 4242, 10);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(size);
      await openPage(page, await f4Scenario({ markets: [m] }), META_680);
      await pick(page, 'Buy No');
      await pick(page, 'Limit');
      await page.getByLabel('Pay at most (cents each)').fill('33');
      await expect(page.getByText('Buying 10 No: selling 10 Yes at 67¢. If all fill, you hold 10 No at 33¢.')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
}

test.describe('the header nav', () => {
  const box = async (page: Page, name: string) => (await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).boundingBox())!;

  test('Markets and Portfolio are as far apart as the brand and Markets (1280 px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPage(page, await f4Scenario(), '/markets', { wallet: false });
    const brand = (await page.getByRole('link', { name: 'Meridian', exact: true }).boundingBox())!;
    const markets = await box(page, 'Markets');
    const portfolio = await box(page, 'Portfolio');
    const brandGap = markets.x - (brand.x + brand.width);
    const navGap = portfolio.x - (markets.x + markets.width);
    expect(navGap).toBeGreaterThanOrEqual(brandGap - 1);
    expect(navGap).toBeGreaterThanOrEqual(16);
  });

  test('at 320 px the links wrap cleanly with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openPage(page, await f4Scenario(), '/markets', { wallet: false });
    const markets = await box(page, 'Markets');
    const portfolio = await box(page, 'Portfolio');
    const sameRow = Math.abs(markets.y - portfolio.y) < 4;
    expect(sameRow ? portfolio.x - (markets.x + markets.width) : 16).toBeGreaterThanOrEqual(16);
    expect(portfolio.x + portfolio.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});
