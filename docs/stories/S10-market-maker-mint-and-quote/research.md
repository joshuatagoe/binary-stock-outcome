# Research: S10 Deposits $1 per pair and quotes Yes on the book

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.58 [Q18] [Q21] [D16] [S9] [S10] CONFIRMED

Public devnet RPC limits per IP: 100 requests per 10 s, 40 per 10 s for a single RPC method, 40 concurrent connections, 40 new connections per 10 s, 100 MB per 30 s. The page does not say whether connection limits cover WebSocket.

- Lens: technical
- Source: [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters): "Maximum number of requests per 10 seconds per IP: 100 ... for a single RPC: 40 ... Maximum concurrent connections per IP: 40"
- Verification (2026-10-09): held: Opened solana.com/docs/references/clusters. Devnet limits 100/10s, 40 single method, 40 concurrent connections, 40 connection rate, 100 MB per 30s all listed. Page does not mention WebSocket, as claimed.

### F2.60 [Q18] [Q21] [S9] [S10] CONFIRMED

Helius's Free plan allows 10 RPC requests/s, 1 sendTransaction/s, and 5 concurrent WebSocket connections (LaserStream connections up to 1,000 subscriptions each; LaserStream is not available on Free, devnet LaserStream starts at Developer). A keyed RPC used by browsers would share these caps across all viewers.

- Lens: technical
- Source: [Helius rate limits](https://www.helius.dev/docs/billing/rate-limits): "RPC: 10 requests/s. sendTransaction: 1/sec ... 5 concurrent connections"
- Verification (2026-10-09): held: Opened Helius rate-limits. Free: 10 RPC req/s, sendTransaction 1/sec, 5 concurrent connections (listed in the LaserStream WebSocket table as Standard type; no separate standard-WebSocket figure), 1,000 subscriptions per connection, LaserStream not on Free, devnet first at Developer. Minor ambiguity over which connection type the 5 applies to.

### F2.70 [Q4] [Q29] [Q41] [D14] [S26] [S4] [S9] [S10] CONFIRMED

Kalshi market lifecycle: initialized ('Created but not yet open for trading', active when open_time passes), active, inactive (paused), closed ('Past close_time. No new orders accepted. Awaiting determination.'), determined, finalized. At close, 'Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels'; once close_time passes all order operations including cancellations are rejected with MARKET_INACTIVE; resting orders are also cancelled when an inactive market is reactivated.

- Lens: venues
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels."
- Verification (2026-10-09): held: Opened Kalshi market lifecycle. All six statuses with matching descriptions, resting orders cancelled shortly after close, MARKET_INACTIVE for all order operations incl. cancellations after close, resting orders cancelled on reactivation.

### F2.77 [Q4] [Q29] [S26] [S10] UNCONFIRMED

The Solana Clock's unix_timestamp is documented only as 'the approximate real world time of the current slot'. In the validator code, it is the stake-weighted median of vote timestamps, clamped to between 25% fast and 150% slow relative to the PoH estimate since epoch start; time never goes backward. No absolute error in seconds is documented.

- Lens: technical
- Source: [solana_clock::Clock](https://docs.rs/solana-clock/latest/solana_clock/struct.Clock.html): "The approximate real world time of the current slot."
- Source: [agave stake_weighted_timestamp.rs](https://raw.githubusercontent.com/anza-xyz/agave/master/runtime/src/stake_weighted_timestamp.rs): "MAX_ALLOWABLE_DRIFT_PERCENTAGE_FAST: u32 = 25 ... MAX_ALLOWABLE_DRIFT_PERCENTAGE_SLOW_V2: u32 = 150"
- Verification (2026-10-09): downgraded from CONFIRMED: docs.rs Clock quote verbatim confirmed. agave stake_weighted_timestamp.rs: constants 25 and 150, stake-weighted median, clamp relative to PoH confirmed. But that file has no check against previous timestamps, so 'time never goes backward' is not supported by the cited source (may be enforced elsewhere in the bank).

### F2.91 [D25] [Q21] [S10] [S11] [S5] UNCONFIRMED

Polymarket's market-maker guide: makers post bids and asks on both sides; buy orders use available collateral while sell orders need the outcome tokens; makers split collateral into complete sets, merge sets to free capital and redeem winners; tooling highlighted is API-side (batch orders, GTC/GTD with post-only, market data stream, order updates, cancel-all as a kill switch; fetch open orders and trades after reconnecting). The page does not separate maker tooling from retail tooling.

- Lens: venues
- Source: [Polymarket market makers overview](https://docs.polymarket.com/market-makers/overview): "Buy orders use available pUSD, while sell orders require the corresponding outcome tokens."
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Polymarket market makers overview. Buy/sell collateral quote, split/merge/redeem, batch, GTC/GTD post-only, stream, cancel-all kill switch, refetch open orders after reconnect all confirmed. But the claim that it does not separate maker from retail tooling is contradicted: page says it is for traders providing liquidity from their own account and routes products serving users to a separate Builder Program.

### F2.92 [Q21] [D25] [S10] CONFIRMED

Polymarket Liquidity Rewards: orders score by closeness to the midpoint and size; the order book is sampled once per minute (up to 1,440 samples per UTC day); rewards are paid to maker addresses daily at midnight UTC; rewards under $1 are not paid; the page does not name a funding source for the standing program.

- Lens: venues
- Source: [Polymarket liquidity rewards](https://docs.polymarket.com/market-makers/liquidity-rewards): "paid directly to maker addresses daily at midnight UTC"
- Verification (2026-10-09): held: Opened Polymarket liquidity rewards. Scoring by midpoint closeness and size, sampled once per minute up to 1,440 per epoch, paid daily at midnight UTC, $1 minimum, no funding source named. Page also notes the program has ended.

### F2.93 [Q21] [D25] [S10] [S11] UNCONFIRMED

Kalshi's API rate-limit tiers: Basic 100 write tokens/s (about 10 orders/s), rising by trading-volume share through Advanced (30/s), Expert (60/s) up to Prestige (960/s); writes cover orders, amends and cancels, so requote churn draws from the write bucket; batches are billed per order; 429s carry no retry headers.

- Lens: venues
- Source: [Kalshi rate limits and tiers](https://docs.kalshi.com/getting_started/rate_limits.md): "Requote and cancel churn draws from the Write bucket"
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Kalshi rate limits. Basic 100 write tokens/s (10 orders/s), Advanced 300 tokens (30 orders/s), Expert 600 (60), Prestige 9,600 (960 orders/s); writes cover orders, amends, cancels; batches billed per order; 429 has no Retry-After headers. But the quoted sentence 'Requote and cancel churn draws from the Write bucket' does not appear (page never says 'requote'), and the claim mixes tokens and orders/s.

### F2.96 [D25] [S10] CONFIRMED

Polymarket's split, merge and redeem documentation is written for developers (SDKs, raw API or Solidity, each needing a configured wallet and API key); merge with 'max' combines the smaller of the wallet's YES and NO balances; redeem has no deadline. The page names no intended audience.

- Lens: venues
- Source: [Polymarket manage positions](https://docs.polymarket.com/trading/positions/manage): "There is no redemption deadline."
- Verification (2026-10-09): held: Opened Polymarket manage positions. 'There is no redemption deadline'; merge 'max' uses the smaller of YES/NO balances; content implies developer audience (SDK, raw calldata, Solidity), no audience named.

### F2.97 [Q21] [S10] SECONDARY

Kalshi has used a mix of an in-house team, a designated market maker (SIG) and an affiliate (Kalshi Trading), and filed with the CFTC a liquidity-incentive pool scored by size and distance from the best price, snapshot per second; designated and affiliated makers are not eligible for rewards. A class-action complaint alleges the affiliate trades against consumers; Kalshi says it gets no preferential access. Search results found nothing on how new markets are seeded.

- Lens: venues
- Source: [Kalshi's new liquidity incentives (Substack)](https://ufoholdings.substack.com/p/kalshis-new-liquidity-incentives): "Designated Market Makers (SIG) and Affiliated Market Makers (Kalshi Trading) are not eligible for rewards."
- Source: [Kalshi Co-Founder Says In-House Trading Arm 'Not Profitable'](https://finance.yahoo.com/news/kalshi-co-founder-says-house-174507266.html): "in-house trading arm"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F2.98 [Q21] [S10] CONFIRMED

Circle's testnet faucet gives 20 USDC per request, limited to once every 2 hours per address and per blockchain; the page does not list networks, so Solana Devnet support is unconfirmed here.

- Lens: technical
- Source: [Circle Faucet](https://faucet.circle.com/): "Developers can request 20 USDC on testnet every 2 hours, per address, and per blockchain."
- Verification (2026-10-09): held: Opened faucet.circle.com. Quote verbatim; no specific networks named on the page, so Solana Devnet unconfirmed, as claimed.

### F2.99 [Q21] [S10] CONFIRMED

The Solana faucet allows a maximum of 2 requests every 8 hours (higher with a GitHub login); devnet tokens 'are not real' and devnet 'may be subject to ledger resets'.

- Lens: technical
- Source: [Solana Faucet](https://faucet.solana.com/): "Maximum of 2 requests every 8 hours."
- Source: [Solana clusters](https://solana.com/docs/core/clusters): "Devnet may be subject to ledger resets."
- Verification (2026-10-09): held: faucet.solana.com: 'Maximum of 2 requests every 8 hours', GitHub login unlocks higher limit. solana.com/docs/core/clusters: 'Devnet may be subject to ledger resets' and 'Devnet tokens are not real'.

### F2.100 [Q21] [Q18] [S10] [S9] UNCONFIRMED

Derivations from sourced limits, not sourced themselves: (a) 49 books x ($100 minted + $45 bid collateral) is about $7,100, which at 20 USDC per 2-hour faucet request is about 355 requests, roughly 30 days; (b) a 49-market requote at one transaction per market is at least 12 s under the public-devnet 40-per-method cap, realistically about 20 s after blockhash and confirmation calls share the 100-per-10-s cap, and about 49 s on Helius's free 1 send/s; (c) 49 accountSubscribe calls in a burst would exceed the 40-per-method figure if subscribes count against it (unknown). Whether the program accepts a self-minted test USDC is unknown.

- Lens: technical
- Source: [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters): "Maximum number of requests per 10 seconds per IP for a single RPC: 40"
- Source: [Circle Faucet](https://faucet.circle.com/): "20 USDC on testnet every 2 hours"
- Source: [Helius rate limits](https://www.helius.dev/docs/billing/rate-limits): "sendTransaction: 1/sec"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.101 [Q29] [S10] CONFIRMED

The Gnosis Conditional Tokens contract (which Polymarket's outcome tokens are built on) does not check for resolution in splitPosition or mergePositions: its requires cover partition validity, that the condition was prepared, and collateral transfer, so splitting a pair is possible after resolution. Polymarket says redeem has no deadline. This shows a precedent for not closing pair creation, not a safety endorsement.

- Lens: venues
- Source: [ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "require(outcomeSlotCount > 0, "condition not prepared yet");"
- Source: [Polymarket manage positions](https://docs.polymarket.com/trading/positions/manage): "There is no redemption deadline."
- Verification (2026-10-09): held: Opened ConditionalTokens.sol. splitPosition and mergePositions require partition validity, 'condition not prepared yet', collateral transfer; neither checks payoutDenominator (only redeemPositions does). Polymarket 'no redemption deadline' confirmed on manage-positions page.

### F2.102 [Q29] [Q4] [S10] [S26] UNCONFIRMED

Derivation, not sourced: minting a pair is value-neutral ($1 in, a Yes plus No worth $1 out). Danger arises only if trading stays open after the close price is known: anyone could mint a pair and sell the losing token into a stale bid. The Buy No path in the spec also needs a mint, so closing mint earlier than trading would break Buy No while a Yes book is open.

- Lens: technical
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "Past `close_time`. No new orders accepted. Awaiting determination."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.103 [Q29] [Q41] [Q4] [D25] [S4] [S5] [S10] [S26] CONFIRMED

Spec wording that these items turn on: '9:00 AM ET: Markets visible on frontend, minting enabled', '9:30 AM ET: US market open, live trading begins', '4:00 PM ET: US market close', '~4:05 PM ET: Automation service ... settles'; Mint Pair is 'Any user'; Settle 'Can only be called after 4:00 PM ET'; admin can 'pause minting and trading'; 'The user doesn't need to understand that Buy No is actually a mint-and-sell-Yes operation'. The spec never says when minting stops or what happens to resting orders at 4:00.

- Lens: technical
- Source: [Meridian spec (local)](file:///C:/Users/joshu/OneDrive/Documents/Gauntlet/binary-stock-outcome/docs/spec/meridian_project.txt): "9:00 AM ET: Markets visible on frontend, minting enabled"
- Verification (2026-10-09): held: Grepped local docs/spec/meridian_project.txt. Lines 341-345 hold the 9:00/9:30/4:00/~4:05 schedule; line 360 'Mint Pair -- Any user'; line 365 settle 'Can only be called after 4:00 PM ET'; line 372 admin can pause minting and trading; line 203 Buy No sentence. Grep found no statement of when minting stops or resting-order handling at 4:00.

### F2.105 [Q21] [S10] [S4] UNCONFIRMED

Inference, not sourced: with no first quotes a new market's book is empty, so a first-time trader's market order has nothing to hit (Polymarket's API shows a 0.5 placeholder for an empty untraded book) and the contract card shows no meaningful Yes/No price or implied probability. The user need is an explicit 'no quotes yet' state and a limit-order path.

- Lens: user
- Source: [Polymarket order book](https://docs.polymarket.com/trading/orderbook): "When a token has never traded and its order book is empty, the API returns the "0.5" placeholder."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
