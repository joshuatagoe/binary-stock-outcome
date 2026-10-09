# Research: S11 Sees exposure, fills and P&L across markets

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.91 [D25] [Q21] [S10] [S11] [S5] UNCONFIRMED

Polymarket's market-maker guide: makers post bids and asks on both sides; buy orders use available collateral while sell orders need the outcome tokens; makers split collateral into complete sets, merge sets to free capital and redeem winners; tooling highlighted is API-side (batch orders, GTC/GTD with post-only, market data stream, order updates, cancel-all as a kill switch; fetch open orders and trades after reconnecting). The page does not separate maker tooling from retail tooling.

- Lens: venues
- Source: [Polymarket market makers overview](https://docs.polymarket.com/market-makers/overview): "Buy orders use available pUSD, while sell orders require the corresponding outcome tokens."
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Polymarket market makers overview. Buy/sell collateral quote, split/merge/redeem, batch, GTC/GTD post-only, stream, cancel-all kill switch, refetch open orders after reconnect all confirmed. But the claim that it does not separate maker from retail tooling is contradicted: page says it is for traders providing liquidity from their own account and routes products serving users to a separate Builder Program.

### F2.93 [Q21] [D25] [S10] [S11] UNCONFIRMED

Kalshi's API rate-limit tiers: Basic 100 write tokens/s (about 10 orders/s), rising by trading-volume share through Advanced (30/s), Expert (60/s) up to Prestige (960/s); writes cover orders, amends and cancels, so requote churn draws from the write bucket; batches are billed per order; 429s carry no retry headers.

- Lens: venues
- Source: [Kalshi rate limits and tiers](https://docs.kalshi.com/getting_started/rate_limits.md): "Requote and cancel churn draws from the Write bucket"
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Kalshi rate limits. Basic 100 write tokens/s (10 orders/s), Advanced 300 tokens (30 orders/s), Expert 600 (60), Prestige 9,600 (960 orders/s); writes cover orders, amends, cancels; batches billed per order; 429 has no Retry-After headers. But the quoted sentence 'Requote and cancel churn draws from the Write bucket' does not appear (page never says 'requote'), and the claim mixes tokens and orders/s.

### F2.94 [D25] [S11] CONFIRMED

Kalshi's position record, a ready field list for an exposure/fills/P&L view: position (negative means NO, positive YES), market_exposure ('cost of the aggregate market position'), realized_pnl ('locked in profit and loss'), fees_paid, total_traded.

- Lens: venues
- Source: [Kalshi Get Positions](https://docs.kalshi.com/api-reference/portfolio/get-positions.md): "Negative means NO contracts and positive means YES contracts."
- Verification (2026-10-09): held: Opened Kalshi Get Positions. position (negative NO, positive YES), market_exposure 'Cost of the aggregate market position', realized_pnl 'Locked in profit and loss', fees_paid, total_traded present (API names carry _fp/_dollars suffixes).
