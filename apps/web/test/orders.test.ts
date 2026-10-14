// The trader's own open orders and positions, read from a book and the wallet's tokens, and the words for them
// (USERS.md F6, F13; D39, D99, D142). Pure, so every word is checked here.
import { getBookDecoder } from '@meridian/client';
import { address } from '@solana/kit';
import { describe, expect, it } from 'vitest';
import {
  describeCancelled,
  describeOrder,
  headerLine,
  heldWords,
  lockedUsdc,
  lockedYes,
  ownBalance,
  ownOrders,
  nextEmptyReads,
  positionWords,
  returnStatus,
  worthIfSold,
  type OpenOrder,
} from '../src/orders.ts';
import { bookBytes, CREATOR, OTHER_OWNER } from './fixtures/chain.ts';

const ME = CREATOR;
const MARKET = address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q');
const decode = (bytes: Uint8Array) => getBookDecoder().decode(bytes);
const usdc = (dollars: number) => BigInt(Math.round(dollars * 1_000_000));

const bid = (price: number, open: number, over: Partial<OpenOrder> = {}): OpenOrder => ({ orderId: 7n, side: 'Buy', priceCents: price, open, paired: false, ...over });
const offer = (price: number, open: number, over: Partial<OpenOrder> = {}): OpenOrder => ({ orderId: 8n, side: 'Sell', priceCents: price, open, paired: false, ...over });
const pairedOffer = (price: number, open: number): OpenOrder => offer(price, open, { orderId: 9n, paired: true });

describe('finding the wallet’s own orders in a book', () => {
  // Trader 0 is the wallet, 1 is the bot, 2 is Dave.
  const book = decode(
    bookBytes(
      MARKET,
      [[60, 10, 0, 4242n], [59, 4, 1]],
      [[80, 5, 0, 4243n], [67, 6, 0, 4244n, 1], [66, 5, 2]],
      ME,
      [{ owner: ME, freeUsdc: 3_600_000n, freeYes: 2n, freeNo: 1n, openOrders: 3 }, { owner: OTHER_OWNER }, { owner: address('11111111111111111111111111111111') }],
    ),
  );

  it('lists the wallet’s orders only, with their side, price, open count and whether they are paired offers', () => {
    expect(ownOrders(book, ME)).toEqual([
      { orderId: 4242n, side: 'Buy', priceCents: 60, open: 10, paired: false },
      { orderId: 4243n, side: 'Sell', priceCents: 80, open: 5, paired: false },
      { orderId: 4244n, side: 'Sell', priceCents: 67, open: 6, paired: true },
    ]);
  });

  it('is empty for a wallet with no orders in the book, and each wallet sees only its own', () => {
    expect(ownOrders(book, address('5ZiE3vAkrdXBgyFL7KqG3RoEtbnvKPtDXoFzFrEU3jmq'))).toEqual([]);
    expect(ownOrders(book, OTHER_OWNER)).toEqual([{ orderId: 1002n, side: 'Buy', priceCents: 59, open: 4, paired: false }]);
    expect(ownOrders(book, ME).map((o) => o.orderId)).not.toContain(1002n);
  });

  it('reads what waits in the book for Return to owner (D99)', () => {
    expect(ownBalance(book, ME)).toEqual({ usdc: 3_600_000n, yes: 2n, no: 1n });
    expect(ownBalance(book, address('5ZiE3vAkrdXBgyFL7KqG3RoEtbnvKPtDXoFzFrEU3jmq'))).toEqual({ usdc: 0n, yes: 0n, no: 0n });
  });
});

describe('what the orders lock (F6, D142)', () => {
  it('a bid locks its price times its open count in USDC: 10 at 60¢ is 6.00', () => {
    expect(lockedUsdc([bid(60, 10)])).toBe(usdc(6));
  });
  it('a plain offer locks Yes, not USDC', () => {
    expect(lockedUsdc([offer(80, 5)])).toBe(0n);
    expect(lockedYes([offer(80, 5)])).toBe(5n);
  });
  it('a paired offer locks 1.00 USDC a pair, and its Yes are not yours to sell', () => {
    expect(lockedUsdc([pairedOffer(67, 6)])).toBe(usdc(6));
    expect(lockedYes([pairedOffer(67, 6)])).toBe(0n);
  });
  it('adds them up', () => {
    expect(lockedUsdc([bid(60, 6), pairedOffer(67, 6), offer(80, 5)])).toBe(usdc(3.6 + 6));
  });
});

describe('the Portfolio’s header line (F6)', () => {
  it('USERS.md’s words: "USDC 14.00 available · 6.00 in orders"', () => {
    expect(headerLine(usdc(14), usdc(6), 0n)).toBe('USDC 14.00 available · 6.00 in orders');
  });
  it('says so when money is on its way from the book to the wallet (D99)', () => {
    expect(headerLine(usdc(14), usdc(6), usdc(3.6))).toBe('USDC 14.00 available · 6.00 in orders · 3.60 on its way to your wallet');
  });
  it('shows 0.00 in orders when there are none', () => {
    expect(headerLine(usdc(20), 0n, 0n)).toBe('USDC 20.00 available · 0.00 in orders');
  });
});

describe('an open order row (F6)', () => {
  it('Carol’s bid, as placed: "Buy 10 Yes at 60¢ · 0 filled · 10 open · 6.00 USDC locked"', () => {
    const d = describeOrder(bid(60, 10), 10);
    expect([d.headline, d.detail].join(' · ')).toBe('Buy 10 Yes at 60¢ · 0 filled · 10 open · 6.00 USDC locked');
  });
  it('after 4 fill: "4 filled · 6 open · 3.60 USDC locked"', () => {
    expect(describeOrder(bid(60, 6), 10).detail).toBe('4 filled · 6 open · 3.60 USDC locked');
  });
  it('a sell offer locks Yes', () => {
    const d = describeOrder(offer(80, 5), 5);
    expect([d.headline, d.detail].join(' · ')).toBe('Sell 5 Yes at 80¢ · 0 filled · 5 open · 5 Yes locked');
  });
  it('Bob’s Buy No limit is a pending order, in D39’s words', () => {
    const d = describeOrder(pairedOffer(67, 10), 10);
    expect(d.headline).toBe('Buying 10 No: selling 10 Yes at 67¢. If all fill, you hold 10 No at 33¢.');
    expect(d.detail).toBe('0 filled · 10 left · 10.00 USDC locked as 10 pairs');
  });
  it('after 4 sell, the pending row shows 6 left', () => {
    const d = describeOrder(pairedOffer(67, 6), 10);
    expect(d.headline).toBe('Buying 10 No: selling 10 Yes at 67¢. If all fill, you hold 10 No at 33¢.');
    expect(d.detail).toBe('4 filled · 6 left · 6.00 USDC locked as 6 pairs');
  });
  it('a single pair is "1 pair"', () => {
    expect(describeOrder(pairedOffer(67, 1), 1).detail).toBe('0 filled · 1 left · 1.00 USDC locked as 1 pair');
  });
  it('when the size it was placed at is not known, it claims no filled count and no size', () => {
    const b = describeOrder(bid(60, 6), null);
    expect([b.headline, b.detail].join(' · ')).toBe('Buy Yes at 60¢ · 6 open · 3.60 USDC locked');
    const p = describeOrder(pairedOffer(67, 6), null);
    expect(p.headline).toBe('Buying No: 6 left, selling their Yes at 67¢. If all fill, you hold 6 more No at 33¢.');
    expect(p.detail).toBe('6 left · 6.00 USDC locked as 6 pairs');
  });
  it('a stored size smaller than what is open cannot be right, so it is ignored', () => {
    expect(describeOrder(bid(60, 6), 4).detail).toBe('6 open · 3.60 USDC locked');
  });
  it('names its Cancel button for the order (F6’s accessibility need)', () => {
    expect(describeOrder(bid(60, 10), 10).cancelName).toBe('Cancel order: buy 10 Yes at 60 cents');
    expect(describeOrder(offer(80, 5), 5).cancelName).toBe('Cancel order: sell 5 Yes at 80 cents');
    expect(describeOrder(pairedOffer(67, 6), 10).cancelName).toBe('Cancel order: buy 10 No at 33 cents, 6 left');
  });
});

describe('a position’s "worth if sold now" is what the trader would get, not the midpoint (F13)', () => {
  const book = { asks: [[72, 5], [75, 10]], bids: [[70, 4], [68, 10]] } as const;
  it('Yes: sold into the bids, best first: 10 Yes get 4 at 70¢ and 6 at 68¢ = 6.88', () => {
    expect(worthIfSold('Yes', 10, book)).toEqual({ units: usdc(6.88), sellable: 10 });
  });
  it('No: sold by buying Yes from the asks and closing the pairs: 5 at 28¢ (72) and 5 at 25¢ (75) = 2.65', () => {
    expect(worthIfSold('No', 10, book)).toEqual({ units: usdc(2.65), sellable: 10 });
  });
  it('counts only what the book can take, and says how many that is', () => {
    expect(worthIfSold('Yes', 20, { asks: [], bids: [[70, 4]] })).toEqual({ units: usdc(2.8), sellable: 4 });
  });
  it('is nothing for an empty side', () => {
    expect(worthIfSold('Yes', 5, { asks: [], bids: [] })).toEqual({ units: 0n, sellable: 0 });
  });
});

describe('a position row (F13)', () => {
  const book = { asks: [[72, 5]], bids: [[70, 10]] } as const;
  it('"10 Yes · worth 7.00 if sold now · pays 10.00 if Yes wins"', () => {
    expect(positionWords({ side: 'Yes', quantity: 10, pending: 0, inOrders: 0, book })).toBe('10 Yes · worth 7.00 if sold now · pays 10.00 if Yes wins');
  });
  it('a No pays 10.00 if No wins', () => {
    expect(positionWords({ side: 'No', quantity: 5, pending: 0, inOrders: 0, book })).toBe('5 No · worth 1.40 if sold now · pays 5.00 if No wins');
  });
  it('says when only some can be sold now', () => {
    expect(positionWords({ side: 'Yes', quantity: 14, pending: 0, inOrders: 0, book })).toBe(
      '14 Yes · worth 7.00 if sold now (only 10 of 14 have buyers) · pays 14.00 if Yes wins',
    );
  });
  it('says when none can', () => {
    expect(positionWords({ side: 'Yes', quantity: 3, pending: 0, inOrders: 0, book: { asks: [], bids: [] } })).toBe(
      '3 Yes · can’t be sold now: nobody is buying · pays 3.00 if Yes wins',
    );
    expect(positionWords({ side: 'No', quantity: 3, pending: 0, inOrders: 0, book: { asks: [], bids: [] } })).toBe(
      '3 No · can’t be sold now: nobody is selling Yes · pays 3.00 if No wins',
    );
  });
  it('says how many are still on their way from the book (D99) and how many sit in an open order', () => {
    expect(positionWords({ side: 'Yes', quantity: 10, pending: 4, inOrders: 2, book })).toBe(
      '10 Yes (4 on their way to your wallet; 2 more in an open order) · worth 7.00 if sold now · pays 10.00 if Yes wins',
    );
  });
});

describe('what is held, for a market that cannot sell it now', () => {
  it('names the quantity and where some of it is', () => {
    expect(heldWords({ side: 'Yes', quantity: 10, pending: 0, inOrders: 0 })).toBe('10 Yes');
    expect(heldWords({ side: 'No', quantity: 6, pending: 6, inOrders: 0 })).toBe('6 No (6 on their way to your wallet)');
  });
});

describe('the done words for a cancel (F6, D143)', () => {
  it('a bid: "Order cancelled · 3.60 USDC returned"', () => {
    expect(describeCancelled({ cancels: [{ side: 'Buy', priceCents: 60, quantity: 6 }], pairsClosed: 0n, pairsUsdc: 0n })).toBe('Order cancelled · 3.60 USDC returned');
  });
  it('a plain offer returns its Yes', () => {
    expect(describeCancelled({ cancels: [{ side: 'Sell', priceCents: 80, quantity: 5 }], pairsClosed: 0n, pairsUsdc: 0n })).toBe('Order cancelled · 5 Yes returned');
  });
  it('a paired offer closes its pairs: "Order cancelled · 6 pairs closed · 6.00 USDC returned"', () => {
    expect(describeCancelled({ cancels: [{ side: 'Sell', priceCents: 67, quantity: 6 }], pairsClosed: 6n, pairsUsdc: usdc(6) })).toBe(
      'Order cancelled · 6 pairs closed · 6.00 USDC returned',
    );
  });
  it('one pair is "1 pair closed"', () => {
    expect(describeCancelled({ cancels: [{ side: 'Sell', priceCents: 67, quantity: 1 }], pairsClosed: 1n, pairsUsdc: usdc(1) })).toBe(
      'Order cancelled · 1 pair closed · 1.00 USDC returned',
    );
  });
  it('without the transaction’s events it says what it knows and promises no amount', () => {
    expect(describeCancelled(null)).toBe('Order cancelled. What it held is back in your balance on this market and will go to your wallet.');
    expect(describeCancelled({ cancels: [], pairsClosed: 0n, pairsUsdc: 0n })).toBe('Order cancelled. What it held is back in your balance on this market and will go to your wallet.');
  });
});

describe('"on its way to your wallet" until Return to owner lands (D99)', () => {
  const zero = { usdc: 0n, yes: 0n, no: 0n };

  it('counts reads of the book that found the wallet’s balance empty, one after another', () => {
    expect(nextEmptyReads(0, zero)).toBe(1);
    expect(nextEmptyReads(1, zero)).toBe(2);
  });

  it('starts again when the book still holds something (USDC, Yes or No), or the balance is not known', () => {
    expect(nextEmptyReads(1, { usdc: usdc(3.6), yes: 0n, no: 0n })).toBe(0);
    expect(nextEmptyReads(1, { usdc: 0n, yes: 2n, no: 0n })).toBe(0);
    expect(nextEmptyReads(1, { usdc: 0n, yes: 0n, no: 1n })).toBe(0);
    expect(nextEmptyReads(1, null)).toBe(0);
  });

  it('is on its way until two reads in a row found it empty: one read can come from a node that has not seen the cancel yet', () => {
    expect(returnStatus(0)).toBe('on-its-way');
    expect(returnStatus(1)).toBe('on-its-way');
    expect(returnStatus(2)).toBe('returned');
    expect(returnStatus(5)).toBe('returned');
  });
});
