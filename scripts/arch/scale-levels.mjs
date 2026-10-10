// Section 1: turn market data into trades per day and per second at three levels. Sources: research of 2026-10-10
// (Kalshi API and DeFi Rate, opened by the research agent); ASSUME marks inputs no source gave.
const day = 6.5 * 3600;
// Kalshi, all categories, Sep 10 - Oct 9 2026 (DeFi Rate): $68.7B face value, 381.0M trades -> contracts per trade.
const contractsPerTrade = 68.7e9 / 381.0e6;
// Busiest-hour share: one Kalshi strike on 2026-10-09 traded 363,932 of 797,377 contracts in 15:00-16:00 ET.
const lastHourShare = 363932 / 797377;
const PEAK_SECOND_X = 10; // ASSUME the busiest second runs at 10x the busiest hour's average rate
function level(name, contractsPerDay, busiestMarketContracts, markets) {
  const trades = contractsPerDay / contractsPerTrade, mTrades = busiestMarketContracts / contractsPerTrade;
  const hourRate = (mTrades * lastHourShare) / 3600;
  console.log(`${name}: ${Math.round(contractsPerDay).toLocaleString()} contracts/day = ${Math.round(trades).toLocaleString()} trades/day over ${markets} markets (${(trades / day).toFixed(2)}/s on average); busiest market ${Math.round(mTrades).toLocaleString()} trades/day, ${hourRate.toFixed(2)}/s in its busiest hour, ~${(hourRate * PEAK_SECOND_X).toFixed(1)}/s at peak`);
}
console.log(`contracts per trade (Kalshi average): ${contractsPerTrade.toFixed(0)}; last-hour share (one strike): ${(100 * lastHourShare).toFixed(1)}%`);
// L2, the market leader for this product: Kalshi's S&P 500 above/below event closing 4:00 PM ET on 2026-10-09:
// 1,893,297 contracts across the 52 markets the agent could read (more exist), busiest strike 797,377. Scaled to our 7 stocks.
level('L2 one Kalshi-size event', 1893297, 797377, 52);
level('L2 x 7 stocks', 7 * 1893297, 797377, 7 * 52);
// Whole channel: Kalshi Finance $877M face over 30 days + Polymarket Finance $29M (DeFi Rate), per calendar day.
level('Channel (all daily finance)', (877e6 + 29e6) / 30, 797377, 'all');
// L1 for comparison (scale-demo.mjs): at most 1,000 user transactions a day across 46 markets.
console.log(`L1 devnet demo: <= 1,000 user tx/day, 0.083/s in the busiest hour (scale-demo.mjs)`);
console.log(`ceiling per market (ceiling.mjs): 448-1,794 taker tx/s at the conservative 12M CU account cap`);
