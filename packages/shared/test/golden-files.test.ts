import { describe, expect, it } from 'vitest';
import { centsToUsdcUnits } from '../src/index.ts';
import { golden } from './golden.ts';

// The golden files must be right themselves: the dollar rules of D2/D64/D137 and the money-flow.mjs results hold in every state they freeze.
const U = 1_000_000;
const people = ['Alice', 'Bob', 'Carol', 'Dave', 'bot'];

function checkState(s: any) {
  const lockedUsdc = s.book.bids.reduce((t: number, o: any) => t + o.quantity * Number(centsToUsdcUnits(o.priceCents)), 0);
  const lockedYes = s.book.asks.reduce((t: number, o: any) => t + o.quantity, 0);
  const freeUsdc = Object.values<any>(s.book.freeBalances).reduce((t, f) => t + f.usdc, 0);
  const freeYes = Object.values<any>(s.book.freeBalances).reduce((t, f) => t + f.yes, 0);
  return { lockedUsdc, lockedYes, freeUsdc, freeYes };
}

describe('morning.json', () => {
  const g = golden('morning');

  it('keeps the $1 rules after every step', () => {
    for (const s of g.steps) {
      const a = s.after;
      const { lockedUsdc, lockedYes, freeUsdc, freeYes } = checkState(a);
      const w = Object.values<any>(a.wallets);
      expect(a.vaultUsdc, s.id).toBe(a.pairsOutstanding * U);
      expect(a.owedUsdc, s.id).toBe(a.pairsOutstanding * U);
      expect(w.reduce((t, x) => t + x.no, 0), `${s.id} No supply`).toBe(a.pairsOutstanding);
      expect(w.reduce((t, x) => t + x.yes, 0) + lockedYes + freeYes, `${s.id} Yes supply`).toBe(a.pairsOutstanding);
      expect(a.book.bookUsdc, `${s.id} book USDC`).toBe(lockedUsdc + freeUsdc);
      expect(a.book.bookYes, `${s.id} book Yes`).toBe(lockedYes + freeYes);
      expect(w.reduce((t, x) => t + x.usdc, 0) + a.vaultUsdc + a.book.bookUsdc, `${s.id} USDC`).toBe(people.length * g.startingUsdcPerWallet);
    }
  });

  it('is the section 3 table through 10:16 and the section 5 book', () => {
    const byId = Object.fromEntries(g.steps.map((s: any) => [s.id, s.after]));
    expect(byId['dave-mint'].vaultUsdc).toBe(10 * U);
    expect(byId['bot-quotes'].vaultUsdc).toBe(15 * U);
    expect(byId['carol-bid'].vaultUsdc).toBe(15 * U);
    expect(byId['alice-buy'].vaultUsdc).toBe(15 * U);
    expect(byId['carol-bid'].wallets.Carol.usdc).toBe(14 * U);
    expect(byId['dave-offer'].book.asks).toEqual([
      { owner: 'Dave', priceCents: 65, quantity: 10 },
      { owner: 'bot', priceCents: 66, quantity: 5 },
    ]);
    expect(byId['dave-offer'].book.bids).toEqual([
      { owner: 'bot', priceCents: 64, quantity: 5 },
      { owner: 'Carol', priceCents: 60, quantity: 10 },
    ]);
    expect(byId['alice-buy'].wallets.Alice).toEqual({ usdc: 20 * U - 6_500_000, yes: 10, no: 0 });
    expect(byId['alice-buy'].book.freeBalances).toEqual({ Dave: { usdc: 6_500_000, yes: 0 } });
    expect(byId['alice-buy'].book.asks).toEqual([{ owner: 'bot', priceCents: 66, quantity: 5 }]);
  });
});

describe('self-trade.json', () => {
  const g = golden('self-trade');

  it('moves no money in or out of the trio of Dave, the bot and the book', () => {
    const total = (s: any) => s.wallets.Dave.usdc + s.wallets.bot.usdc + s.book.bookUsdc + s.vaultUsdc;
    expect(total(g.after)).toBe(total(g.before));
    expect(g.before.wallets.Dave.yes + g.before.wallets.bot.yes + g.before.book.bookYes).toBe(15);
    expect(g.after.wallets.Dave.yes + g.after.wallets.bot.yes + g.after.book.bookYes).toBe(15);
  });

  it('costs 3.30, not the 3.25 he would have paid himself, and the cancel comes first', () => {
    expect(g.paidUsdc).toBe(5 * Number(centsToUsdcUnits(66)));
    expect(g.wouldHavePaidHimselfUsdc).toBe(5 * Number(centsToUsdcUnits(65)));
    expect(g.before.wallets.Dave.usdc - g.after.wallets.Dave.usdc).toBe(g.paidUsdc);
    expect(g.events.map((e: any) => e.kind)).toEqual(['OrderCancelled', 'Fill']);
    expect(g.events[0].reason).toBe('SelfTrade');
    expect(g.after.wallets.Dave.yes - g.before.wallets.Dave.yes).toBe(10 + 5);
  });
});

describe('returns.json', () => {
  const g = golden('returns');

  it('a refunded bid returns price times quantity; a refunded offer returns its Yes', () => {
    for (const r of g.refunds) {
      if (r.order.side === 'Buy') {
        expect(r.lockedUsdc, r.id).toBe(r.order.quantity * Number(centsToUsdcUnits(r.order.priceCents)));
        expect(r.returnedUsdc, r.id).toBe(r.lockedUsdc);
      } else if (r.closedPairs) {
        expect(r.returnedUsdc, r.id).toBe(r.closedPairs * U);
      } else {
        expect(r.returnedYes, r.id).toBe(r.order.quantity);
      }
    }
  });

  it('Return to owner empties the book balance into the wallet and a repeat changes nothing', () => {
    for (const r of g.returnToOwner) {
      expect(r.after.bookFree).toEqual({ usdc: 0, yes: 0 });
      expect(r.after.wallet.usdc, r.id).toBe(r.before.wallet.usdc + r.before.bookFree.usdc);
      expect(r.after.wallet.yes, r.id).toBe(r.before.wallet.yes + r.before.bookFree.yes);
    }
  });

  it('Dave\'s return is the 6.50 the morning left in his book entry', () => {
    const m = golden('morning').steps.at(-1).after;
    const d = g.returnToOwner[0];
    expect(d.before.bookFree).toEqual(m.book.freeBalances.Dave);
    expect(d.before.wallet.usdc).toBe(m.wallets.Dave.usdc);
  });
});
