// Level 3: Solana's ceiling for one market. Every trade writes that market's book account, so trades in one market
// share the per-writable-account compute cap per block. Inputs: research of 2026-10-10 (Solana limits) and AR.01 (measured slots).
const ACCOUNT_CAP = { conservative: 12_000_000, agaveMaster: 24_000_000 };   // CU per writable account per block (sources conflict)
const BLOCK_CAP = 100_000_000;                                              // CU per block, mainnet since 2026-07-29 (SIMD-0286)
const TX_MAX = 1_400_000;                                                   // CU per transaction
const BLOCKS_PER_S = { nominal: 1000 / 200, measuredMainnet: 1000 / 223 };  // 200 ms slots (solana.com), 218-229 ms measured (AR.01)
// ASSUME the CU cost of one taker transaction with one fill: classic SPL TransferChecked is 6,200 CU (SIMD-0266);
// a fill moves USDC and Yes (2 transfers) plus matching and Anchor overhead. Range until the M1 spike measures it.
const TAKER_CU = [30_000, 60_000, 120_000];
for (const [capName, cap] of Object.entries(ACCOUNT_CAP))
  for (const cu of TAKER_CU) {
    const perBlock = Math.floor(cap / cu);
    console.log(`cap ${capName} ${cap / 1e6}M, taker tx ${cu / 1000}k CU: ${perBlock} taker tx per block per market = ${Math.round(perBlock * BLOCKS_PER_S.measuredMainnet)}/s (measured slots) to ${Math.round(perBlock * BLOCKS_PER_S.nominal)}/s (200 ms)`);
  }
console.log(`whole block at 60k CU: ${Math.floor(BLOCK_CAP / 60_000)} taker tx per block, shared by all of Solana`);
console.log(`one transaction may use at most ${TX_MAX / 1e6}M CU, so a batch re-quote of 7 books is bounded by ${TX_MAX / 1e6}M CU`);
