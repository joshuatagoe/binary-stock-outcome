// Section 6, item 6 (D66): how many markets one "Redeem all" transaction can redeem, by transaction format.
// Limits (AR.08): legacy and v0 transactions 1,232 bytes; v1 4,096 bytes; at most 64 accounts locked per transaction.
// Accounts: shared = wallet, wallet's USDC account, token program, Token-2022, event authority, our program (6);
// per market = market, vault, Yes mint, No mint, wallet's Yes account, wallet's No account (6).
const SHARED = 6, PER_MARKET = 6, KEY = 32, LOCK_LIMIT = 64;
const OVERHEAD = 64 + 3 + 32 + 8;          // one signature, header, blockhash, length prefixes (approximate)
const IX = 1 + 1 + PER_MARKET + 1 + 10;    // program index, account count, account indexes, data length, data (mode + qty)
const byLocks = Math.floor((LOCK_LIMIT - SHARED) / PER_MARKET);
const fit = (limit, perMarketInlineKeys, tableOverhead = 0) => {
  let n = 0;
  while (OVERHEAD + tableOverhead + SHARED * KEY + (n + 1) * (perMarketInlineKeys * KEY + IX + (PER_MARKET - perMarketInlineKeys)) <= limit) n++;
  return Math.min(n, byLocks);
};
console.log(`account-lock limit alone allows ${byLocks} markets`);
console.log(`legacy, every key inline (1,232 B): ${fit(1232, PER_MARKET)} markets`);
console.log(`v0 with a lookup table holding each market's 4 fixed accounts (1,232 B): ${fit(1232, 2, 34)} markets`);
console.log(`v1, every key inline (4,096 B): ${fit(4096, PER_MARKET)} markets`);
console.log(`Alice's three-market example (USERS F12) fits one transaction in every format`);
