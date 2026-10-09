# Research: S26 Has an order still open at 4:00 cancelled and refunded, and is told so

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.09 [D21] [Q28] [S4] [S26] CONFIRMED

Manifest order expiry is a u32 slot number (last_valid_slot), not a clock time; reversible orders cannot expire; expired resting orders are removed when matching reaches them. Taker fills happen at the maker's resting price.

- Lens: technical
- Source: [Manifest resting_order.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/state/resting_order.rs): "last_valid_slot is a u32. ... Reverse orders cannot have expiration."
- Source: [Manifest market.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/state/market.rs): "The loop sets matched_price from maker_order.get_price() ... remove_and_update_balances"
- Verification (2026-10-09): held: resting_order.rs: last_valid_slot is u32 and 'Reverse orders cannot have expiration'. market.rs: matched_price comes from maker_order.get_price(), and expired makers are removed via remove_and_update_balances as matching reaches them.

### F2.12 [D21] [S4] [S9] [S26] CONFIRMED

Phoenix has market-level controls: ChangeMarketStatus must be signed by the market_authority; statuses Active, PostOnly, Paused (reductions and withdrawals only) and Closed (market authority can forcibly cancel all orders); authority can be handed to a successor (so it could be a program PDA).

- Lens: technical
- Source: [Phoenix status.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/status.rs): "Closed: Reductions and withdrawals only. The market authority can forcibly cancel all orders."
- Source: [Phoenix instruction.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/instruction.rs): "ChangeMarketStatus (103): The market_authority signer must sign to change market status."
- Verification (2026-10-09): held: status.rs has Active, PostOnly, Paused (reductions and withdrawals only) and Closed ('The market authority can forcibly cancel all orders'). instruction.rs says market_authority must sign ChangeMarketStatus (103). NameSuccessor (102) and ClaimAuthority (101) show hand-over to a successor.

### F2.13 [D21] [D15] [S4] [S26] CONFIRMED

Phoenix order packets (PostOnly, Limit, ImmediateOrCancel) all carry last_valid_slot and last_valid_unix_timestamp_in_seconds; IOC also carries min_base_lots_to_fill and min_quote_lots_to_fill (a minimum-fill floor); Limit and IOC have self_trade_behavior.

- Lens: technical
- Source: [Phoenix order_packet.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/state/order_schema/order_packet.rs): "last_valid_unix_timestamp_in_seconds: Yes (PostOnly, Limit, ImmediateOrCancel); min_base_lots_to_fill / min_quote_lots_to_fill: ImmediateOrCancel only"
- Verification (2026-10-09): held: order_packet.rs: PostOnly, Limit and IOC all have last_valid_slot and last_valid_unix_timestamp_in_seconds. min_base_lots_to_fill and min_quote_lots_to_fill are IOC only. self_trade_behavior is on Limit and IOC, not PostOnly.

### F2.15 [D21] [S4] [S9] [S26] UNCONFIRMED

OpenBook v2 looks dormant: default branch master last pushed 2024-07-15 (last commit 2024-06-23), GPL, deployed v1.7 on mainnet, devnet and testnet. It has close_market, set_market_expired, prune_orders, settle_funds_expired (close_market_admin), consume_events (needed to process fills), maker/taker fee parameters and time_expiry.

- Lens: venues
- Source: [openbook-dex/openbook-v2 repo metadata (GitHub API)](https://api.github.com/repos/openbook-dex/openbook-v2): "default_branch: master; pushed_at: 2024-07-15T22:16:49Z; archived: false"
- Source: [OpenBook v2 lib.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/lib.rs): "create_market takes name, oracle_config, quote_lot_size, base_lot_size, maker_fee, taker_fee, and time_expiry ... close_market_admin: close_market, set_market_expired, prune_orders, settle_funds_expired"
- Source: [openbook-dex/openbook-v2](https://github.com/openbook-dex/openbook-v2): "v1.7 on mainnet, devnet, and testnet (program ID opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb)"
- Verification (2026-10-09): downgraded from CONFIRMED: The API confirms default_branch master, pushed_at 2024-07-15T22:16:49Z, archived false. lib.rs confirms create_market params (name, oracle_config, lot sizes, maker_fee, taker_fee, time_expiry), close_market, set_market_expired, prune_orders, settle_funds_expired (all close_market_admin), consume_events and sweep_fees. The README confirms v1.7 on mainnet, devnet and testnet. Two problems: the repo README says 'majority MIT, some parts GPL' and the API license is NOASSERTION, so plain 'GPL' is imprecise (only the Manifest README calls it GPL). The 2024-06-23 last-commit date was not visible on the page.

### F2.69 [D14] [Q4] [S9] [S26] CONFIRMED

Kalshi's exchange status separates exchange_active (false if the core exchange takes no state changes) from trading_active (true during trading hours, false outside them), plus an estimated resume time during maintenance; the exchange schedule gives standard hours and maintenance windows and says 'Outside of these times trading will be unavailable.'

- Lens: venues
- Source: [Kalshi Get Exchange Status](https://docs.kalshi.com/api-reference/exchange/get-exchange-status.md): "False if the core Kalshi exchange is no longer taking any state changes at all."
- Source: [Kalshi Get Exchange Schedule](https://docs.kalshi.com/api-reference/exchange/get-exchange-schedule.md): "Outside of these times trading will be unavailable."
- Verification (2026-10-09): held: Opened Kalshi exchange status and schedule. exchange_active quote matches, trading_active true during trading hours, estimated resume time for maintenance; schedule says 'Outside of these times trading will be unavailable.'

### F2.70 [Q4] [Q29] [Q41] [D14] [S26] [S4] [S9] [S10] CONFIRMED

Kalshi market lifecycle: initialized ('Created but not yet open for trading', active when open_time passes), active, inactive (paused), closed ('Past close_time. No new orders accepted. Awaiting determination.'), determined, finalized. At close, 'Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels'; once close_time passes all order operations including cancellations are rejected with MARKET_INACTIVE; resting orders are also cancelled when an inactive market is reactivated.

- Lens: venues
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels."
- Verification (2026-10-09): held: Opened Kalshi market lifecycle. All six statuses with matching descriptions, resting orders cancelled shortly after close, MARKET_INACTIVE for all order operations incl. cancellations after close, resting orders cancelled on reactivation.

### F2.71 [Q4] [D14] [S26] [S9] CONFIRMED

Kalshi pauses: during a scheduled trading pause (Thursday 3:00 to 5:00 AM ET) only cancelling is allowed; during an exchange pause nothing is allowed. Resting orders stay on the book unless the per-order CancelOrderOnPause flag is set (default false).

- Lens: venues
- Source: [Kalshi Maintenance and Pauses](https://docs.kalshi.com/getting_started/maintenance_and_pauses.md): "Order remains resting on the book and resumes when activity reopens"
- Verification (2026-10-09): held: Opened Kalshi maintenance and pauses. Thursday 3-5 AM ET pause is cancel-only, exchange pause blocks all, resting orders remain unless CancelOrderOnPause set, default false.

### F2.73 [Q4] [S26] CONFIRMED

Polymarket documents that cancelling a partially filled order removes only the unfilled remainder 'including when the market resolves' and does not undo settled fills; orders with expiration 0 are GTC. The page does not describe what happens to open orders when a market closes.

- Lens: venues
- Source: [Polymarket orders overview](https://docs.polymarket.com/trading/orders/overview): "including when the market resolves"
- Verification (2026-10-09): held: Opened Polymarket orders overview. Cancel removes only unfilled remainder 'including when the market resolves'; expiration 0 is GTC; page does not say what happens to open orders at close.

### F2.74 [Q4] [Q41] [S26] [S4] CONFIRMED

Phoenix (repository called Phoenix Legacy) has a MarketStatus enum: Active (crossing permitted), PostOnly (only places, reductions and withdrawals), Paused (reductions and withdrawals), Closed (reductions and withdrawals, and the market authority can forcibly cancel all orders), Tombstoned. This fits a pre-open post-only window and a hard close, but it is unconfirmed whether a time-driven flip needs an admin transaction.

- Lens: technical
- Source: [phoenix-v1 status.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/status.rs): "PostOnly: Only places, reductions and withdrawals are accepted."
- Source: [Ellipsis-Labs/phoenix-v1 README](https://github.com/Ellipsis-Labs/phoenix-v1): "Phoenix Legacy is an on-chain orderbook that operates without a crank."
- Verification (2026-10-09): held: Opened phoenix-v1 status.rs and repo README. Enum Uninitialized, Active, PostOnly ('Only places, reductions and withdrawals'), Paused (reductions allowed per code), Closed (authority can forcibly cancel), Tombstoned. README says 'operates without a crank'. Time-driven flip left unconfirmed in claim.

### F2.75 [Q4] [Q41] [S26] [S4] CONFIRMED

Phoenix order packets (PostOnly, Limit, ImmediateOrCancel) carry optional last_valid_slot and last_valid_unix_timestamp_in_seconds ('the order will be invalid after the specified ...'); a PostOnly order is never matched on entry; IOC orders have minimum-fill fields (slippage protection).

- Lens: technical
- Source: [phoenix-v1 order_packet.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/state/order_schema/order_packet.rs): "If this is set, the order will be invalid after the specified unix timestamp"
- Verification (2026-10-09): held: Opened order_packet.rs. last_valid_slot and last_valid_unix_timestamp_in_seconds on PostOnly/Limit/IOC; PostOnly never matched against existing limit orders; IOC has min_base_lots_to_fill and min_quote_lots_to_fill.

### F2.76 [Q4] [S26] CONFIRMED

Manifest's resting orders store a u32 last_valid_slot (sentinel for no expiry; expired when last_valid_slot is below the current slot), so expiry is slot-based only; its README lists a market creation rent of .007 SOL versus 2 SOL for OpenBook and 3+ SOL for Phoenix, and does not mention expiry or a status/pause control.

- Lens: technical
- Source: [manifest resting_order.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/state/resting_order.rs): "self.last_valid_slot != NO_EXPIRATION_LAST_VALID_SLOT && self.last_valid_slot < current_slot"
- Source: [Manifest README](https://raw.githubusercontent.com/CKS-Systems/manifest/main/README.md): "No more expensive rent to start a market."
- Verification (2026-10-09): held: Opened Manifest resting_order.rs: u32 last_valid_slot, NO_EXPIRATION sentinel, exact expiry expression. README: .007 SOL vs 2 SOL OpenBook vs 3+ SOL Phoenix, 'No more expensive rent to start a market'; no expiry/status/pause mention.

### F2.77 [Q4] [Q29] [S26] [S10] UNCONFIRMED

The Solana Clock's unix_timestamp is documented only as 'the approximate real world time of the current slot'. In the validator code, it is the stake-weighted median of vote timestamps, clamped to between 25% fast and 150% slow relative to the PoH estimate since epoch start; time never goes backward. No absolute error in seconds is documented.

- Lens: technical
- Source: [solana_clock::Clock](https://docs.rs/solana-clock/latest/solana_clock/struct.Clock.html): "The approximate real world time of the current slot."
- Source: [agave stake_weighted_timestamp.rs](https://raw.githubusercontent.com/anza-xyz/agave/master/runtime/src/stake_weighted_timestamp.rs): "MAX_ALLOWABLE_DRIFT_PERCENTAGE_FAST: u32 = 25 ... MAX_ALLOWABLE_DRIFT_PERCENTAGE_SLOW_V2: u32 = 150"
- Verification (2026-10-09): downgraded from CONFIRMED: docs.rs Clock quote verbatim confirmed. agave stake_weighted_timestamp.rs: constants 25 and 150, stake-weighted median, clamp relative to PoH confirmed. But that file has no check against previous timestamps, so 'time never goes backward' is not supported by the cited source (may be enforced elsewhere in the bank).

### F2.78 [Q4] [S26] UNCONFIRMED

Solana's own documents disagree on how the timestamp is aggregated: the getBlockTime RPC page and the original validator-timestamp-oracle design say stake-weighted mean (and aim to drift 'not more than an hour or so'), while the bank-timestamp-correction proposal and the code say median. Treat the aggregation method and any accuracy figure as unconfirmed.

- Lens: technical
- Source: [getBlockTime (Solana RPC)](https://solana.com/docs/rpc/http/getblocktime): "stake-weighted mean of those vote timestamps"
- Source: [Validator Timestamp Oracle](https://docs.anza.xyz/implemented-proposals/validator-timestamp-oracle): "should not drift more than an hour or so before resolving to real-world (oracle) data"
- Source: [Bank Timestamp Correction](https://docs.anza.xyz/implemented-proposals/bank-timestamp-correction): "stake-weighted median rather than a stake-weighted mean"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.79 [Q4] [S26] SECONDARY

Nasdaq's time-in-force rule (4703) lets participants end an order at the end of Market Hours or System Hours or a chosen time, and an order with an expire time beyond the current day is cancelled at the end of that day (from a search snippet of the SEC rule filing; the rulebook page itself returned 403 and the SEC PDF was unreadable).

- Lens: venues
- Source: [SEC Nasdaq filing 34-104442 (Rule 4703 time in force)](https://www.sec.gov/files/rules/sro/nasdaq/2025/34-104442.pdf): "an Order specifying an expire time beyond the current trading day will be cancelled at the end of the current trading day"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F2.80 [Q4] [S26] SECONDARY

NYSE's closing auction includes unexecuted buy and sell orders resting on the book at the end of Core Trading Hours (plus auction-only orders such as MOC and LOC), so resting orders are not simply cancelled at 4:00 PM on that venue (from search snippets of SEC filings, not opened).

- Lens: venues
- Source: [SEC NYSE filing 34-93037 (closing auction)](https://www.sec.gov/rules/sro/nyse/2021/34-93037.pdf): "unexecuted buy and sell orders resting on the Exchange Book at the end of Core Trading Hours"
- Verification (2026-10-09): not rechecked (SECONDARY)

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

### F2.104 [D14] [Q4] [Q41] [S4] [S9] [S26] UNCONFIRMED

A trader needs to be told which of several different situations they are in (market not yet open, trading closed, order cancelled at close, feed lagging, chain down) because each calls for a different action (wait, nothing, re-place, refresh, do not sign). Kalshi separates these as distinct states and publishes cancellation updates to users; the principle matches NN/g visibility of system status. This is a design inference from those sources, not a measured user need.

- Lens: user
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "cancellation updates are published on the usual user channels"
- Source: [Visibility of System Status (NN/g)](https://www.nngroup.com/articles/visibility-system-status/): "keep users informed about what is going on"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
