// Section 3: the running example's day on "META $680 or above", every money movement in USDC base units
// (6 decimals) and whole tokens, checking the D2/D64 rules after each step. Prices in cents (A4).
// Where a maker's proceeds and refunds land is left open here (item 3, D37); this tracks ownership only.
const U = 1_000_000n, usdc = (cents) => (BigInt(cents) * U) / 100n, fmt = (u) => (Number(u) / 1e6).toFixed(2);
const people = ['Alice', 'Bob', 'Carol', 'Dave', 'bot'];
const w = Object.fromEntries(people.map((p) => [p, { usdc: usdc(2000), yes: 0, no: 0 }]));   // everyone starts with 20.00 USDC
const book = { bids: [], asks: [] };   // resting orders: { who, price, qty } in arrival order (price-time priority)
let vault = 0n, pairs = 0, settled = null, seq = 0;
const lockedUsdc = () => book.bids.reduce((s, o) => s + BigInt(o.qty) * usdc(o.price), 0n);
const lockedYes = () => book.asks.reduce((s, o) => s + o.qty, 0);
const totalUsdc0 = 5n * usdc(2000);
function check(step) {
  const yesSupply = people.reduce((s, p) => s + w[p].yes, 0) + lockedYes();
  const noSupply = people.reduce((s, p) => s + w[p].no, 0);
  const owed = settled === null ? BigInt(pairs) * U : BigInt(settled === 'Yes' ? yesSupply : noSupply) * U;
  const usdcAll = people.reduce((s, p) => s + w[p].usdc, 0n) + vault + lockedUsdc();
  const ok = vault >= owed && (settled !== null || (yesSupply === pairs && noSupply === pairs)) && usdcAll === totalUsdc0;
  console.log(`${String(++seq).padStart(2)} ${step.padEnd(58)} vault ${fmt(vault).padStart(6)} owed ${fmt(owed).padStart(6)} pairs ${String(pairs).padStart(2)} | locked ${fmt(lockedUsdc())} USDC, ${lockedYes()} Yes | ${ok ? 'ok' : 'BROKEN'}`);
  if (!ok) process.exit(1);
}
const mint = (p, n) => { w[p].usdc -= BigInt(n) * U; vault += BigInt(n) * U; w[p].yes += n; w[p].no += n; pairs += n; };
const closePairs = (p, n) => { w[p].yes -= n; w[p].no -= n; vault -= BigInt(n) * U; w[p].usdc += BigInt(n) * U; pairs -= n; };
const bid = (p, price, qty) => { w[p].usdc -= BigInt(qty) * usdc(price); book.bids.push({ who: p, price, qty }); };
const ask = (p, price, qty) => { w[p].yes -= qty; book.asks.push({ who: p, price, qty }); };
const cancel = (side, p) => { for (const o of book[side].filter((o) => o.who === p)) { if (side === 'bids') w[p].usdc += BigInt(o.qty) * usdc(o.price); else w[p].yes += o.qty; o.qty = 0; } book[side] = book[side].filter((o) => o.qty); };
// Taker buys Yes up to `cap` cents: fills resting asks at their own price (D42), best price first, then oldest (price-time).
function buyYes(p, qty, cap) {
  let got = 0, paid = 0n;
  for (const o of [...book.asks].sort((a, b) => a.price - b.price)) {
    if (got === qty || o.price > cap) break;
    if (o.who === p) { cancel('asks', p); continue; }   // D90: a self-trade cancels the resting order
    const n = Math.min(qty - got, o.qty), cost = BigInt(n) * usdc(o.price);
    w[p].usdc -= cost; w[o.who].usdc += cost; w[p].yes += n; o.qty -= n; got += n; paid += cost;
  }
  book.asks = book.asks.filter((o) => o.qty);
  return { got, paid };
}
// Taker sells Yes down to `floor` cents into resting bids (the bids' locked USDC pays the taker).
function sellYes(p, qty, floor) {
  let sold = 0, got = 0n;
  for (const o of [...book.bids].sort((a, b) => b.price - a.price)) {
    if (sold === qty || o.price < floor) break;
    if (o.who === p) { cancel('bids', p); continue; }
    const n = Math.min(qty - sold, o.qty), pay = BigInt(n) * usdc(o.price);
    w[p].yes -= n; w[o.who].yes += n; w[p].usdc += pay; o.qty -= n; sold += n; got += pay;
  }
  book.bids = book.bids.filter((o) => o.qty);
  return { sold, got };
}
// Buy No (D5): mint only as many pairs as can be sold, sell their Yes, keep the No; one instruction.
function buyNo(p, qty, worstNoCents) {
  const floor = 100 - worstNoCents, fillable = Math.min(qty, book.bids.filter((o) => o.price >= floor && o.who !== p).reduce((s, o) => s + o.qty, 0));
  mint(p, fillable); const r = sellYes(p, fillable, floor);
  return { got: r.sold, net: BigInt(r.sold) * U - r.got };
}

check('start: 5 wallets x 20.00 USDC');
mint('Dave', 10); check('9:10 Dave mints 10 pairs (F15)');
mint('bot', 5); ask('bot', 66, 5); bid('bot', 64, 5); check('9:30 bot mints 5, offers 5 Yes at 66c, bids 5 at 64c (D41)');
bid('Carol', 60, 10); check('10:00 Carol bids 10 Yes at 60c, locks 6.00 (F6)');
ask('Dave', 65, 10); check('10:16 Dave offers 10 Yes at 65c (F4)');
const a = buyYes('Alice', 10, 66); check(`10:16 Alice Buy Yes 10, at most 66c: ${a.got} for ${fmt(a.paid)} (F4)`);
cancel('bids', 'bot'); bid('bot', 65, 5); bid('Dave', 65, 5); check('10:59 bot re-bids 5 at 65c; Dave bids 5 at 65c (F5, F15)');
const b = buyNo('Bob', 10, 36); check(`11:00 Bob Buy No 10, at most 36c: ${b.got} No for ${fmt(b.net)} (F5)`);
closePairs('Dave', 5); check('11:30 Dave closes 5 pairs, gets 5.00 back (F15)');
cancel('bids', 'Carol'); check('2:00 PM Carol cancels, 6.00 returned (F6)');
cancel('asks', 'bot'); cancel('bids', 'bot'); check('4:00 PM close sweep refunds every resting order (D37)');
settled = 'Yes'; check('~4:02 META closed $684.00: Yes wins (D1)');
for (const p of people) { const n = w[p].yes; w[p].yes = 0; vault -= BigInt(n) * U; w[p].usdc += BigInt(n) * U; w[p].no = 0; }
check('redeem: every Yes for 1.00, every No burned (D94)');
for (const p of people) console.log(`   ${p.padEnd(5)} ends with ${fmt(w[p].usdc)} USDC: ${w[p].usdc >= usdc(2000) ? '+' : ''}${fmt(w[p].usdc - usdc(2000))}`);
const net = people.reduce((s, p) => s + w[p].usdc - usdc(2000), 0n);
console.log(`   sum of gains and losses: ${fmt(net)} (no fees, A1); vault left ${fmt(vault)}`);
