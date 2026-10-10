// Section 3, item 1 (D15): the default worst price on a Market order.
// Proposed rule: the price of the last book level needed to fill the whole quantity, moved 1 cent against the trader.
// Books from USERS.md. Prices in cents; totals in USDC.
const usd = (c) => (c / 100).toFixed(2);
function capBuyYes(asks, qty) {          // asks: [[price, size], ...] best first
  let left = qty;
  for (const [p, s] of asks) { left -= s; if (left <= 0) return Math.min(p + 1, 99); }
  return null;                           // the book can't fill it: the ticket says so and offers a limit order
}
function floorSellYes(bids, qty) {       // bids best first
  let left = qty;
  for (const [p, s] of bids) { left -= s; if (left <= 0) return Math.max(p - 1, 1); }
  return null;
}
const book1016 = { asks: [[65, 10], [66, 5]], bids: [[64, 5]] };          // F4
const book1100 = { asks: [[66, 5]], bids: [[65, 10]] };                   // F5: bot 5 + Dave 5 at 65c
const cases = [
  ['F4 Alice Buy Yes 10 at 10:16', () => { const c = capBuyYes(book1016.asks, 10); return `pay at most ${c}c, total at most ${usd(c * 10)} (USERS: 66c, 6.60)`; }],
  ['Alice Buy Yes 15 at 10:16', () => { const c = capBuyYes(book1016.asks, 15); return `pay at most ${c}c, total at most ${usd(c * 15)}`; }],
  ['Alice Buy Yes 20 at 10:16', () => { const c = capBuyYes(book1016.asks, 20); return c === null ? 'book holds only 15: the ticket offers a limit order instead' : `${c}c`; }],
  ['F5 Bob Buy No 10 at 11:00', () => { const f = floorSellYes(book1100.bids, 10); return `sells Yes at no less than ${f}c, so No costs at most ${100 - f}c, total at most ${usd((100 - f) * 10)} (USERS: 3.60)`; }],
  ['F7 Alice Sell Yes 10, best bid 80c', () => { const f = floorSellYes([[80, 10]], 10); return `receives at least ${f}c each, ${usd(f * 10)} in all`; }],
  ['F7 Bob Sell No 10, best ask 80c', () => { const c = capBuyYes([[80, 10]], 10); return `buys Yes at no more than ${c}c, so receives at least ${100 - c}c per No, ${usd((100 - c) * 10)} in all`; }],
];
for (const [name, f] of cases) console.log(`${name}: ${f()}`);
