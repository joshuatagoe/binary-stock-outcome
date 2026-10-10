// Section 5: on-chain account sizes and their rent deposits, from the byte layouts in ARCHITECTURE.md §5.
// Rent-exempt minimum = (bytes + 128) * 6960 lamports (F3.11). Estimates: D50 measures real sizes at M0.
const rent = (b) => (b + 128) * 6960, sol = (l) => l / 1e9, f = (x) => x.toFixed(4);
const DISC = 8;                                              // Anchor's account discriminator
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
// Config: keys, pause, USDC mint, accepted receivers (D80), up to 8 tickers with pinned feeds, enforced thresholds.
const config = { DISC, admin: 32, pendingAdmin: 32, operator: 32, usdcMint: 32, receivers: 2 * 32, paused: 1,
  tickers: 8 * (8 + 32 + 1 + 7), thresholds: 2 * 4 + 4 * 6, bump: 1, reserved: 64 };
// Market: identity, stored times, linked accounts, the owed counter (D64), state, settlement, proposal.
const market = { DISC, ticker: 8, day: 4, strikeCents: 8, mintOpen: 8, open: 8, close: 8, links: 4 * 32, owed: 8,
  state: 4, settle: 8 + 8 + 4 + 8, proposal: 1 + 8 + 8 + 8 + 32, createdSlot: 8, bumps: 4, reserved: 64 };
// Recorded close, one per stock per day (D105).
const record = { DISC, ticker: 8, day: 4, price: 8, conf: 8, expo: 4, publishTime: 8, priceAccount: 32, recordedSlot: 8,
  recorder: 32, frozen: 1, bump: 1, reserved: 32 };
// Order book, zero-copy: one order = seq u64, sender's id u64, qty u32, trader index u16, price u8, pad u8 = 24 bytes;
// one trader = owner 32, free USDC u64, free Yes u64, open orders u16, pad 6 = 56 bytes.
const book = (orders, traders) => DISC + 64 + 2 * orders * 24 + traders * 56;
const MINT_T22 = 202, TOKEN_ACC = 165, TOKEN22_ACC = 170;    // AR.02; 170 assumes a few bytes of Token-2022 account extension
const META_EXT = 4 + 32 + 32 + (4 + 24) + (4 + 4) + (4 + 40) + 4 + (4 + 64);   // optional token-metadata + pointer extensions

const permanentPerMarket = rent(sum(market)) + 2 * rent(MINT_T22) + rent(TOKEN_ACC);
console.log(`config ${sum(config)} B, ${f(sol(rent(sum(config))))} SOL once`);
console.log(`market ${sum(market)} B; recorded close ${sum(record)} B, ${f(sol(rent(sum(record))))} SOL per stock per day`);
console.log(`kept for good per market (market + Yes and No mints + vault): ${f(sol(permanentPerMarket))} SOL (D50 + D94 estimate was 0.0097)`);
for (const [o, t] of [[32, 32], [64, 64], [128, 128]]) {
  const b = book(o, t), back = rent(b) + rent(TOKEN_ACC) + rent(TOKEN22_ACC);
  console.log(`book ${o} orders/side, ${t} traders: ${b} B; returned after settlement: ${f(sol(back))} SOL per market, ${f(sol(back * 46))} SOL a day at 46 markets`);
}
const perDayPermanent = 46 * permanentPerMarket + 7 * rent(sum(record));
console.log(`kept for good per day at 46 markets, with records: ${f(sol(perDayPermanent))} SOL; per 21 trading days ${f(sol(perDayPermanent * 21))}`);
console.log(`optional token names in wallets: +${META_EXT} B per mint, +${f(sol(2 * META_EXT * 6960))} SOL per market, +${f(sol(46 * 2 * META_EXT * 6960))} SOL a day kept for good`);
console.log(`a trader's own accounts per market: Yes and No, ${f(sol(2 * rent(TOKEN22_ACC)))} SOL, returned when closed (D94)`);
// Chosen (D107, D108): a 64/64 book and named tokens.
const named = rent(sum(market)) + 2 * rent(MINT_T22 + META_EXT) + rent(TOKEN_ACC);
console.log(`chosen: named mint ${MINT_T22 + META_EXT} B, ${f(sol(rent(MINT_T22 + META_EXT)))} SOL each; kept for good per market ${f(sol(named))} SOL; per day at 46 markets with 7 records ${f(sol(46 * named + 7 * rent(sum(record))))} SOL`);
