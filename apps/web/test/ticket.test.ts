// The ticket's numbers: checked against packages/golden's worst prices (D15) and USERS.md's worked words (F4, F5, F7).
import { golden } from '../../../packages/shared/test/golden.ts';
import { describe, expect, it } from 'vitest';
import { actionName, largeOrderConfirm, sameOrder, planLimit, planTicket, TRADE_ACTIONS, walkBook } from '../src/ticket.ts';

const g = golden('worst-prices');
const f4 = { asks: [[65, 10], [66, 5]], bids: [[64, 5]] } as const;
const strike = { ticker: 'META', strikeCents: 68000 };
const usdc = (dollars: number) => BigInt(Math.round(dollars * 1_000_000));

describe('the ticket takes its worst price from packages/golden (D15)', () => {
  for (const c of g.cases) {
    it(`${c.id}: ${c.about}`, () => {
      const t = planTicket({ action: c.action, book: g.books[c.book], quantity: c.quantity, usdc: null, ...strike });
      if (c.worstYesCents === null) {
        // The golden file says the book cannot fill it: the ticket says why, as "empty" or "not enough".
        expect(t).toMatchObject({ ok: false });
        expect(['empty-book', 'not-enough-on-the-book']).toContain((t as { reason: string }).reason);
      } else {
        expect(t).toMatchObject({ ok: true, worstYesCents: c.worstYesCents, traderCents: c.traderCents, totalCents: c.totalCents });
      }
    });
  }
});

describe('what each instruction is sent as its price', () => {
  it('sends Place order and Sell No the worst Yes price, and Buy No the most it pays per No (BuyNoArgs.price)', () => {
    const book = { asks: [[65, 10], [66, 5]], bids: [[65, 5], [65, 5]] } as const;
    expect(planTicket({ action: 'buyYes', book, quantity: 10, usdc: null, ...strike })).toMatchObject({ sendPriceCents: 66 });
    expect(planTicket({ action: 'sellYes', book, quantity: 10, usdc: null, ...strike })).toMatchObject({ sendPriceCents: 64 });
    expect(planTicket({ action: 'buyNo', book, quantity: 10, usdc: null, ...strike })).toMatchObject({ sendPriceCents: 36 });
    expect(planTicket({ action: 'sellNo', book, quantity: 10, usdc: null, ...strike })).toMatchObject({ sendPriceCents: 66 });
  });
});

describe('walking the book for what the trader really pays', () => {
  it('takes the best prices first and stops at the quantity', () => {
    expect(walkBook(f4.asks, 10)).toEqual({ filled: 10, cents: 650 });
    expect(walkBook(f4.asks, 15)).toEqual({ filled: 15, cents: 980 });
  });
  it('fills only what is there', () => {
    expect(walkBook(f4.asks, 20)).toEqual({ filled: 15, cents: 980 });
    expect(walkBook([], 3)).toEqual({ filled: 0, cents: 0 });
  });
});

describe('the words on the ticket', () => {
  it("F4: Alice's Buy Yes of 10 pays 6.50, at most 6.60, and says what she gets and loses", () => {
    const t = planTicket({ action: 'buyYes', book: f4, quantity: 10, usdc: usdc(20), ...strike });
    expect(t).toMatchObject({
      ok: true,
      payoff:
        'You pay 6.50 USDC for 10 Yes. If META closes at or above $680 at 4:00 PM ET (Pyth price), you get 10.00, a profit of 3.50. Otherwise you lose 6.50.',
      limitLine: 'You pay at most 6.60 USDC.',
    });
  });

  it("F5: Bob's Buy No of 10 into bids of 65¢ pays 3.50, at most 3.60", () => {
    const book = { asks: [[66, 5]], bids: [[65, 10]] } as const;
    const t = planTicket({ action: 'buyNo', book, quantity: 10, usdc: usdc(20), ...strike });
    expect(t).toMatchObject({
      ok: true,
      payoff: 'You pay 3.50 USDC for 10 No. If META closes below $680, you get 10.00, a profit of 6.50. Otherwise you lose 3.50.',
      limitLine: 'You pay at most 3.60 USDC.',
    });
  });

  it('F7: Sell Yes of 10 into a bid of 80¢ receives 8.00, at least 7.90', () => {
    const t = planTicket({ action: 'sellYes', book: { asks: [], bids: [[80, 10]] }, quantity: 10, usdc: null, ...strike });
    expect(t).toMatchObject({ ok: true, payoff: 'You sell 10 Yes for 8.00 USDC.', limitLine: 'You receive at least 7.90 USDC.' });
  });

  it('F7: Sell No of 10 into an ask of 80¢ receives 2.00, at least 1.90', () => {
    const t = planTicket({ action: 'sellNo', book: { asks: [[80, 10]], bids: [] }, quantity: 10, usdc: null, ...strike });
    expect(t).toMatchObject({ ok: true, payoff: 'You sell 10 No for 2.00 USDC.', limitLine: 'You receive at least 1.90 USDC.' });
  });
});

describe('negative cases', () => {
  it('not enough USDC: the buy is blocked with the words from F4', () => {
    const t = planTicket({ action: 'buyYes', book: f4, quantity: 10, usdc: usdc(4), ...strike });
    expect(t).toMatchObject({ ok: true, blocked: 'You need up to 6.60 USDC; you have 4.00.' });
  });

  it('exactly enough USDC is enough', () => {
    const t = planTicket({ action: 'buyYes', book: f4, quantity: 10, usdc: usdc(6.6), ...strike });
    expect(t).toMatchObject({ ok: true, blocked: null });
  });

  it('a sell needs no USDC', () => {
    const t = planTicket({ action: 'sellYes', book: f4, quantity: 5, usdc: 0n, ...strike });
    expect(t).toMatchObject({ ok: true, blocked: null });
  });

  it('Sell No without enough No: blocked with what is held, before any wallet window (F7)', () => {
    const book = { asks: [[80, 10]], bids: [] } as const;
    expect(planTicket({ action: 'sellNo', book, quantity: 10, usdc: null, held: 4n, ...strike })).toMatchObject({ ok: true, blocked: 'You hold 4 No; you can sell at most 4.' });
    expect(planTicket({ action: 'sellNo', book, quantity: 10, usdc: null, held: 0n, ...strike })).toMatchObject({ blocked: 'You hold no No to sell.' });
    expect(planTicket({ action: 'sellNo', book, quantity: 10, usdc: null, held: 10n, ...strike })).toMatchObject({ blocked: null });
  });

  it('Sell Yes without enough Yes is blocked the same way', () => {
    expect(planTicket({ action: 'sellYes', book: f4, quantity: 5, usdc: null, held: 3n, ...strike })).toMatchObject({ blocked: 'You hold 3 Yes; you can sell at most 3.' });
  });

  it('an unknown holding does not block a sell (the devnet simulation decides)', () => {
    expect(planTicket({ action: 'sellNo', book: { asks: [[80, 10]], bids: [] }, quantity: 10, usdc: null, held: null, ...strike })).toMatchObject({ blocked: null });
  });

  it('Buy No without enough USDC for the net price: blocked at the most it can cost (F5)', () => {
    const book = { asks: [[66, 5]], bids: [[65, 10]] } as const;
    expect(planTicket({ action: 'buyNo', book, quantity: 10, usdc: usdc(3.59), ...strike })).toMatchObject({ blocked: 'You need up to 3.60 USDC; you have 3.59.' });
    expect(planTicket({ action: 'buyNo', book, quantity: 10, usdc: usdc(3.6), ...strike })).toMatchObject({ blocked: null });
  });

  it('an unknown balance does not block (the devnet simulation decides)', () => {
    expect(planTicket({ action: 'buyYes', book: f4, quantity: 10, usdc: null, ...strike })).toMatchObject({ blocked: null });
  });

  it('an empty book: no market order, and the words say why', () => {
    for (const action of TRADE_ACTIONS) {
      const t = planTicket({ action, book: { asks: [], bids: [] }, quantity: 1, usdc: usdc(20), ...strike });
      expect(t).toMatchObject({ ok: false, reason: 'empty-book' });
      expect((t as { message: string }).message).toMatch(/No quotes yet/);
    }
  });

  it('more than the book holds: offers a limit order instead', () => {
    const t = planTicket({ action: 'buyYes', book: f4, quantity: 20, usdc: usdc(20), ...strike });
    expect(t).toMatchObject({ ok: false, reason: 'not-enough-on-the-book' });
    expect((t as { message: string }).message).toBe('Only 15 Yes are offered right now, so this order can’t fill in full. Lower the quantity, or place a limit order.');
  });

  it('a quantity that is not a whole number above zero', () => {
    for (const q of [0, -1, 1.5, Number.NaN]) {
      expect(planTicket({ action: 'buyYes', book: f4, quantity: q, usdc: null, ...strike })).toMatchObject({ ok: false, reason: 'bad-quantity' });
    }
  });

  it('keeps the button name through the flow (one verb per action)', () => {
    expect(TRADE_ACTIONS.map(actionName)).toEqual(['Buy Yes', 'Sell Yes', 'Buy No', 'Sell No']);
  });
});

describe('a limit order (F6): the trader names the price, and the order rests what it cannot fill', () => {
  const usdc = (dollars: number) => BigInt(Math.round(dollars * 1_000_000));

  it('Buy Yes 10 at 60¢ locks 6.00 USDC', () => {
    expect(planLimit({ action: 'buyYes', quantity: 10, priceCents: 60, usdc: usdc(20) })).toEqual({
      ok: true,
      sendPriceCents: 60,
      payoff: 'You offer to buy 10 Yes at 60¢ each. Whatever is not bought at once rests on the book, and 6.00 USDC is locked until it fills or you cancel.',
      limitLine: 'You pay at most 6.00 USDC.',
      blocked: null,
    });
  });

  it('Sell Yes 10 at 70¢ offers 10 Yes', () => {
    expect(planLimit({ action: 'sellYes', quantity: 10, priceCents: 70, usdc: null })).toMatchObject({
      ok: true,
      sendPriceCents: 70,
      payoff: 'You offer to sell 10 Yes at 70¢ each. Whatever is not sold at once rests on the book until it fills or you cancel.',
      limitLine: 'You receive at least 7.00 USDC.',
    });
  });

  it('is blocked when the wallet cannot lock the money', () => {
    expect(planLimit({ action: 'buyYes', quantity: 10, priceCents: 60, usdc: usdc(4) })).toMatchObject({
      blocked: 'You need up to 6.00 USDC; you have 4.00.',
    });
  });

  it('refuses a price outside 1¢ to 99¢ or a quantity that is not whole', () => {
    for (const priceCents of [0, 100, 60.5, Number.NaN]) {
      expect(planLimit({ action: 'buyYes', quantity: 10, priceCents, usdc: null })).toMatchObject({ ok: false, message: 'Enter a price from 1¢ to 99¢.' });
    }
    expect(planLimit({ action: 'buyYes', quantity: 0, priceCents: 60, usdc: null })).toMatchObject({ ok: false });
  });

  it('is not for Sell No, which never rests (D38)', () => {
    expect(planLimit({ action: 'sellNo', quantity: 1, priceCents: 40, usdc: null })).toMatchObject({ ok: false });
  });
});

describe('a Buy No limit order (F6, D39): the trader names the No price, and the rest is offered as paired Yes', () => {
  const usdc = (dollars: number) => BigInt(Math.round(dollars * 1_000_000));
  const noBids = { bids: [] as const };

  it('Buy No 10 at 33¢ sends 33 as the price, offers the matching Yes at 67¢ and says up to 10.00 USDC is locked as pairs', () => {
    expect(planLimit({ action: 'buyNo', quantity: 10, priceCents: 33, usdc: usdc(20), book: noBids })).toEqual({
      ok: true,
      sendPriceCents: 33,
      totalCents: 1000,
      payoff:
        'You offer to buy 10 No at 33¢ each by selling their Yes at 67¢. Whatever is not bought at once rests on the book, and up to 10.00 USDC is locked as pairs until it sells or you cancel.',
      limitLine: 'You pay at most 3.30 USDC once it has sold.',
      blocked: null,
    });
  });

  it('is blocked when the wallet cannot lock a pair for each No that would rest: 5.00 against 10.00', () => {
    expect(planLimit({ action: 'buyNo', quantity: 10, priceCents: 33, usdc: usdc(5), book: noBids })).toMatchObject({
      blocked: 'You need up to 10.00 USDC; you have 5.00.',
    });
  });

  it('needs only the net price for the part the bids take at once (D143): bids at 67¢ take all 10 for 3.30', () => {
    const book = { bids: [[67, 10]] } as const;
    expect(planLimit({ action: 'buyNo', quantity: 10, priceCents: 33, usdc: usdc(5), book })).toMatchObject({ blocked: null });
    expect(planLimit({ action: 'buyNo', quantity: 10, priceCents: 33, usdc: usdc(3.29), book })).toMatchObject({ blocked: 'You need up to 3.30 USDC; you have 3.29.' });
  });

  it('a part-filled book: 4 sell at 67¢ for 1.32 and 6 rest as pairs for 6.00', () => {
    const book = { bids: [[67, 4], [60, 9]] } as const;
    expect(planLimit({ action: 'buyNo', quantity: 10, priceCents: 33, usdc: usdc(7.31), book })).toMatchObject({ blocked: 'You need up to 7.32 USDC; you have 7.31.' });
    expect(planLimit({ action: 'buyNo', quantity: 10, priceCents: 33, usdc: usdc(7.32), book })).toMatchObject({ blocked: null });
  });

  it('refuses a No price outside 1¢ to 99¢ and a quantity that is not whole', () => {
    for (const priceCents of [0, 100, 33.5]) {
      expect(planLimit({ action: 'buyNo', quantity: 10, priceCents, usdc: null, book: noBids })).toMatchObject({ ok: false, message: 'Enter a price from 1¢ to 99¢.' });
    }
    expect(planLimit({ action: 'buyNo', quantity: 0, priceCents: 33, usdc: null, book: noBids })).toMatchObject({ ok: false });
  });
});

describe('selling Yes that sits in an open order (F6)', () => {
  const strike = { ticker: 'META', strikeCents: 68000 };
  const book = { asks: [[65, 10]], bids: [[64, 10]] } as const;
  const words = '4 of your Yes are in an open order. Cancel it to sell them.';

  it('a Sell Yes with no Yes in the wallet says where they are', () => {
    expect(planTicket({ action: 'sellYes', book, quantity: 4, usdc: null, held: 0n, inOrders: 4n, ...strike })).toMatchObject({ blocked: words });
  });

  it('a Sell Yes for more than the wallet holds says what can be sold, then where the rest are', () => {
    const t = planTicket({ action: 'sellYes', book, quantity: 10, usdc: null, held: 6n, inOrders: 4n, ...strike });
    expect(t).toMatchObject({ blocked: `You hold 6 Yes; you can sell at most 6. ${words}` });
  });

  it('is not blocked when the wallet holds enough, whatever sits in orders', () => {
    expect(planTicket({ action: 'sellYes', book, quantity: 4, usdc: null, held: 6n, inOrders: 4n, ...strike })).toMatchObject({ blocked: null });
  });

  it('keeps the old words when nothing sits in an order', () => {
    expect(planTicket({ action: 'sellYes', book, quantity: 5, usdc: null, held: 3n, inOrders: 0n, ...strike })).toMatchObject({ blocked: 'You hold 3 Yes; you can sell at most 3.' });
    expect(planTicket({ action: 'sellYes', book, quantity: 5, usdc: null, held: 0n, ...strike })).toMatchObject({ blocked: 'You hold no Yes to sell.' });
  });

  it('a Sell Yes limit says it too', () => {
    expect(planLimit({ action: 'sellYes', quantity: 4, priceCents: 70, usdc: null, held: 0n, inOrders: 4n })).toMatchObject({ blocked: words });
  });

  it('a Sell Yes limit with an unknown holding is not blocked (the devnet simulation decides)', () => {
    expect(planLimit({ action: 'sellYes', quantity: 4, priceCents: 70, usdc: null, held: null, inOrders: 0n })).toMatchObject({ blocked: null });
  });
});

describe('the large-order confirm (D88, USERS.md F4)', () => {
  it('USERS.md’s example, word for word', () => {
    expect(largeOrderConfirm({ action: 'buyYes', quantity: 200, totalCents: 13200, offered: 5, priceCents: 66 })).toBe(
      'Buy 200 Yes for up to 132.00 USDC? Only 5 are offered at 66¢ or less right now, so most of this order may not fill.',
    );
  });
  it('says so plainly when nothing at all is offered at that price', () => {
    expect(largeOrderConfirm({ action: 'buyYes', quantity: 200, totalCents: 12000, offered: 0, priceCents: 60 })).toBe(
      'Buy 200 Yes for up to 120.00 USDC? Nothing is offered at 60¢ or less right now, so most of this order may not fill.',
    );
  });
  it('drops the "only" line when the book can fill it', () => {
    expect(largeOrderConfirm({ action: 'buyYes', quantity: 200, totalCents: 13200, offered: 200, priceCents: 66 })).toBe('Buy 200 Yes for up to 132.00 USDC?');
  });
  it('is for orders that could cost MORE than 100.00 USDC: exactly 100.00 and sells are not asked', () => {
    expect(largeOrderConfirm({ action: 'buyYes', quantity: 100, totalCents: 10000, offered: 100, priceCents: 100 })).toBeNull();
    expect(largeOrderConfirm({ action: 'buyYes', quantity: 100, totalCents: 10001, offered: 100, priceCents: 99 })).not.toBeNull();
    expect(largeOrderConfirm({ action: 'sellYes', quantity: 500, totalCents: 40000, offered: 500, priceCents: 80 })).toBeNull();
  });
  it('Buy No is asked too, with its own word', () => {
    expect(largeOrderConfirm({ action: 'buyNo', quantity: 300, totalCents: 10800, offered: undefined, priceCents: 36 })).toBe('Buy 300 No for up to 108.00 USDC?');
  });
});

describe('Try again is for the order that expired, not whatever the ticket says now (B)', () => {
  const meta = { action: 'buyYes', quantity: 10, kind: 'Market', sendPriceCents: 66 } as const;
  it('is the same order when the action, quantity and type match', () => {
    expect(sameOrder(meta, { action: 'buyYes', quantity: 10, mode: 'Market', limitCents: Number.NaN })).toBe(true);
  });
  it('is another order when the quantity, the action or the type changed', () => {
    expect(sameOrder(meta, { action: 'buyYes', quantity: 11, mode: 'Market', limitCents: Number.NaN })).toBe(false);
    expect(sameOrder(meta, { action: 'sellYes', quantity: 10, mode: 'Market', limitCents: Number.NaN })).toBe(false);
    expect(sameOrder(meta, { action: 'buyYes', quantity: 10, mode: 'Limit', limitCents: 60 })).toBe(false);
  });
  it('a limit order is the same only at the same price', () => {
    const limit = { ...meta, kind: 'Limit', sendPriceCents: 60 } as const;
    expect(sameOrder(limit, { action: 'buyYes', quantity: 10, mode: 'Limit', limitCents: 60 })).toBe(true);
    expect(sameOrder(limit, { action: 'buyYes', quantity: 10, mode: 'Limit', limitCents: 61 })).toBe(false);
  });
  it('no saved order means nothing to retry', () => {
    expect(sameOrder(null, { action: 'buyYes', quantity: 10, mode: 'Market', limitCents: Number.NaN })).toBe(false);
  });
});
