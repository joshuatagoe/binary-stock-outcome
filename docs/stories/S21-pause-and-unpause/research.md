# Research: S21 Pauses minting and trading in an emergency

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 5: Platform

### F5.16 [D19] [D24] [D27] [S29] [S20] [S21] CONFIRMED

The spec's own wording: the settlement job retries every 30 seconds for up to 15 minutes then alerts the admin; Admin Settle must enforce a time delay (e.g. 1 hour after close); Settle Market may only be called after 4:00 PM ET and must validate oracle freshness and confidence; the invariant list says tokens are only destroyed via redeem and the settlement outcome is immutable once written; it also says 'Staleness check: Reject prices older than a defined threshold (e.g., 5 minutes)'.

- Lens: technical
- Source: [Meridian project spec (local)](docs/spec/meridian_project.txt): "Settlement job (~4:05 PM ET): For each open contract, call settle market. If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes."
- Verification (2026-10-09): held: Read local spec docs/spec/meridian_project.txt: line 446-448 settlement job retry 30 s up to 15 min then alert admin; 365-369 Settle after 4 PM ET with freshness/confidence and Admin Settle time delay 1 hour; 391 tokens only destroyed via redeem; 402 staleness check 5 minutes.

### F5.30 [D23] [D24] [D27] [S20] [S21] CONFIRMED

OpenBook v2's Market account separates roles: collect_fee_admin (required), open_orders_admin ('must sign off on all order creations', optional), consume_events_admin (optional), close_market_admin ('can set market expired, prune orders and close the market', optional), and a market_authority PDA for vault signing; oracle_a/oracle_b optional; time_expiry: 'Market will expire and no trading allowed after time_expiry'.

- Lens: venues
- Source: [OpenBook v2 market.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/state/market.rs): "Admin who can set market expired, prune orders and close the market"
- Source: [OpenBook v2 create_market.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/instructions/create_market.rs): "open_orders_admin, consume_events_admin, close_market_admin: Optional."
- Verification (2026-10-09): held: Opened OpenBook v2 market.rs: collect_fee_admin, optional open_orders_admin, consume_events_admin, close_market_admin (expire, prune, close), market_authority PDA, optional oracle_a/b, time_expiry. create_market.rs does not contain the literal 'Optional.' text but code uses non_zero_key() making them optional; quote slightly off.

### F5.32 [D24] [S20] [S21] CONFIRMED

Solana token docs: the mint authority is optional and is the only party who can mint; with no mint authority the supply is fixed; the freeze authority is optional and can freeze token accounts.

- Lens: technical
- Source: [Solana: Create a token mint](https://solana.com/docs/tokens/basics/create-mint): "If no mint authority is present then the mint has a fixed supply and no further tokens may be minted."
- Verification (2026-10-09): held: Opened Solana create-mint docs: exact quote on fixed supply present; freeze authority optional and can freeze token accounts.

### F5.34 [D24] [S20] [S21] CONFIRMED

Gnosis ConditionalTokens (the design under Polymarket's outcome tokens) lets anyone call prepareCondition, but the oracle address is part of the condition ID so only that oracle can report payouts; a second report is blocked ('payout denominator already set'); mergePositions and redeemPositions only act on the caller's own balances.

- Lens: venues
- Source: [Gnosis ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "require(payoutDenominator[conditionId] == 0, "payout denominator already set");"
- Verification (2026-10-09): held: Opened ConditionalTokens.sol: prepareCondition has no caller restriction in listed requires; reportPayouts has 'payout denominator already set'; merge/redeem transfer to msg.sender. Oracle-in-conditionId is not visible in fetched excerpt but is consistent with the code.

### F5.35 [D24] [Q44] [S21] CONFIRMED

Compound III (Comet) pause: the Governor and the Pause Guardian can call pause on five separate functions (supply, transfer, withdraw, absorb, buy); the guardian is set by COMP holders through a timelock-controlled governance proposal and is currently the Community Multi-Sig. This is a worked example of splitting a fast pause key from the slow governance key.

- Lens: venues
- Source: [Compound III governance docs](https://docs.compound.xyz/governance/): "The guardian can pause five functions: supply, transfer, withdraw, absorb, and buy"
- Verification (2026-10-09): held: Opened Compound governance docs: Pause Guardian can pause supply, transfer, withdraw, absorb, buy; only Governor and Pause Guardian can call; guardian designated by COMP holders and held by Community Multi-Sig. Quote paraphrased.

### F5.36 [D24] [Q44] [D27] [S21] CONFIRMED

Phoenix MarketStatus: Active accepts all orders; PostOnly accepts only placements, reductions and withdrawals; Paused and Closed accept only reductions and withdrawals; in Closed the market authority can forcibly cancel all orders; Tombstoned (market to be deleted) can be entered only from Closed once orders and traders are removed.

- Lens: venues
- Source: [Phoenix v1 status.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/status.rs): "Only reductions and withdrawals are accepted."
- Verification (2026-10-09): held: Opened Phoenix status.rs: Active, PostOnly, Paused ('Only reductions and withdrawals are accepted'), Closed (same plus authority can forcibly cancel), Tombstoned only from Closed.

### F5.39 [D27] [Q44] [S20] [S21] CONFIRMED

In the Gnosis ConditionalTokens code opened, none of the listed require checks on mergePositions or redeemPositions involve a pause flag; redeem requires only that a payout has been reported. Excerpt-based, so contracts elsewhere in the repo were not audited.

- Lens: venues
- Source: [Gnosis ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "require(den > 0, "result for condition not received yet");"
- Verification (2026-10-09): held: Opened ConditionalTokens.sol: merge and redeem requires have no pause flag; redeem requires den > 0 ('result for condition not received yet'). ERC1155 base not included, as claim already caveats.

### F5.58 [Q44] [S21] CONFIRMED

Aave V3 ValidationLogic: validateSupply and validateBorrow require both not paused and not frozen; validateWithdraw, validateRepay and validateLiquidationCall require only not paused (the frozen flag is not read). So 'freeze' is exit-only mode and 'pause' stops everything including withdrawals.

- Lens: venues
- Source: [Aave v3 ValidationLogic.sol](https://raw.githubusercontent.com/aave-dao/aave-v3-origin/main/src/contracts/protocol/libraries/logic/ValidationLogic.sol): "require(!isPaused, Errors.ReservePaused());"
- Verification (2026-10-09): held: Opened Aave v3 ValidationLogic.sol: supply and borrow check paused and frozen; withdraw, repay, liquidation check paused only.

### F5.59 [Q44] [S21] CONFIRMED

Drift's ExchangeStatus is a bitflag set with independent bits: DepositPaused, WithdrawPaused, AmmPaused, FillPaused, LiqPaused, FundingPaused, SettlePnlPaused, AmmImmediateFillPaused; 0 means active and 0b11111111 means everything paused.

- Lens: venues
- Source: [Drift protocol-v2 state.rs](https://raw.githubusercontent.com/drift-labs/protocol-v2/master/programs/drift/src/state/state.rs): "WithdrawPaused = 0b00000010"
- Verification (2026-10-09): held: Opened Drift state.rs: ExchangeStatus bit flags with the eight named bits (WithdrawPaused = 0b00000010); 0 active; all-paused 0b11111111 per comment.

### F5.60 [Q44] [S21] CONFIRMED

Maker's Emergency Shutdown Module: MKR holders deposit MKR and once a threshold is met anyone can call fire(), which starts shutdown; joined MKR is lost even on success; the module is described as deprecated and kept for reference. How users redeem after shutdown was not retrievable.

- Lens: venues
- Source: [Sky developer docs: Emergency Shutdown Module](https://developers.skyeco.com/archive/shutdown/emergency-shutdown/): "currently deprecated"
- Verification (2026-10-09): held: Opened Sky developer docs ESM page: 'currently deprecated', MKR deposit threshold, anyone can call fire(), MKR lost even on success.

### F5.61 [Q44] [S21] CONFIRMED

The spec limits Pause to 'minting and trading', and its user stories promise 'Unredeemed tokens remain redeemable indefinitely'. A pause that also blocked redeem would contradict that sentence.

- Lens: user
- Source: [Meridian project spec (local)](docs/spec/meridian_project.txt): "Pause / Unpause -- Admin can pause minting and trading in an emergency"
- Verification (2026-10-09): held: Read local spec: line 372 'Pause / Unpause -- Admin can pause minting and trading in an emergency'; lines 329 and 346 'Unredeemed tokens remain redeemable indefinitely'.

### F5.62 [Q44] [D19] [S21] [S29] CONFIRMED

Chainlink frames pausing during an outage as protecting fair access: uneven access can distort applications, such as liquidations, so operations are paused until after a grace period. The same fairness logic applies to a Meridian pause that lasts past the close.

- Lens: user
- Source: [Chainlink L2 Sequencer Uptime Feeds](https://docs.chain.link/data-feeds/l2-sequencer-feeds): "ensure fair access to services by temporarily pausing operations during sequencer failures"
- Verification (2026-10-09): held: Opened Chainlink L2 sequencer page: 'Ensure fair access to services by temporarily pausing operations during sequencer failures' present; liquidation distortion framing is paraphrase. Application to Meridian is the author's inference.
