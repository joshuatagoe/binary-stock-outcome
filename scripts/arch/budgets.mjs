// Section 8: the bot's daily SOL and USDC needs, and the low-balance alert levels that follow (D32, D50, items 26).
// Inputs: accounts.mjs (deposits), scale-demo.mjs and requotes.mjs (transaction counts), D41 (5 contracts a side).
const MARKETS = 46, LAMPORTS = 1e9, FEE = 5000;                       // 5,000 lamports per signature
const keptPerDay = 0.6137;                                            // accounts.mjs: kept for good per day, 46 markets, 7 records, named mints
const backPerDay = 0.0518 * MARKETS;                                  // accounts.mjs: book deposits, returned after settlement
const txPerDay = 92 + 7 + 46 + 14 + 202 + 46 /* close book */ + 46 /* returns, ASSUME one per market */ + 1 /* lookup table */;
const feesPerDay = (txPerDay * FEE) / LAMPORTS;
const solPerDay = keptPerDay + feesPerDay;
console.log(`bot transactions a day: about ${txPerDay}; fees ${feesPerDay.toFixed(4)} SOL`);
console.log(`SOL spent for good per day: ${solPerDay.toFixed(3)}; SOL out and back per day (books): ${backPerDay.toFixed(2)}`);
const solAlert = backPerDay + 2 * solPerDay;                          // enough for today's books plus two days of permanent spend
console.log(`SOL alert level: below ${solAlert.toFixed(2)} SOL (one day of book deposits plus two days of spend)`);
// USDC to quote 5 a side on every market (D41): an offer needs 5 Yes, minted for 5.00; a bid locks 5 x its price, at most 0.99.
// D32's 'at most 388 to 458' is this worst case at 39 to 46 markets; an average bid near 0.50 needs less.
const worstPerMarket = 5.00 + 5 * 0.99, typicalPerMarket = 5.00 + 5 * 0.50;
console.log(`USDC to quote every market: at most ${(worstPerMarket * MARKETS).toFixed(2)} (D32: 388 to 458), typically ${(typicalPerMarket * MARKETS).toFixed(2)}`);
console.log(`USDC alert level: below ${(worstPerMarket * MARKETS).toFixed(0)}; Circle's faucet (20 every 2 hours, D32) needs ${Math.ceil((worstPerMarket * MARKETS) / 20)} claims from zero`);
// Second RPC provider (D75): monthly use against a free tier. Alchemy's compute-unit costs per call (research 2026-10-10):
// getSlot 20, getBlockHeight 20, getGenesisHash 10, getTransaction 40. ASSUME the halt detector reads the slot every 15 s,
// the heartbeat log reads height, genesis hash and restart slot once a minute, and the provider also re-reads every program
// transaction once as a cross-check (L1: about 1,361 a day, rpc-budget.mjs).
const perMonth = (perDay) => perDay * 30;
const haltCU = perMonth((86400 / 15) * 20), logCU = perMonth(1440 * (20 + 10 + 20)), readCU = perMonth(1361 * 40);
const total = haltCU + logCU + readCU;
console.log(`second provider, Alchemy units a month: halt detector ${(haltCU / 1e6).toFixed(2)}M + heartbeat log ${(logCU / 1e6).toFixed(2)}M + cross-check reads ${(readCU / 1e6).toFixed(2)}M = ${(total / 1e6).toFixed(2)}M of the free 30M`);
const reqPerMonth = perMonth(86400 / 15 + 1440 * 3 + 1361);
console.log(`the same as requests: ${(reqPerMonth / 1e6).toFixed(2)}M a month (Chainstack free: 3M; Helius free: 1M credits)`);
