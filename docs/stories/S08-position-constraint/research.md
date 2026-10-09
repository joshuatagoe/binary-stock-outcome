# Research: S8 Is stopped from holding Yes and No on one strike, and shown how to exit first

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.14 [D21] [D9] [S4] [S8] CONFIRMED

In Phoenix, Limit and PostOnly orders require a trader seat, but IOC/FOK swaps do not; the market authority can request seats on a trader's behalf and change seat status (so a permissioned-seat design is possible but swaps still skip the seat). Orders that take liquidity are rejected when market status disallows crossing.

- Lens: technical
- Source: [Phoenix new_order.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/processor/new_order.rs): "Swaps (IOC/FOK) don't need a seat ... Limit and Post-Only orders ... require a seat, or the transaction fails with "Missing seat for market maker"."
- Source: [Phoenix instruction.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/instruction.rs): "RequestSeatAuthorized (105) ... ChangeSeatStatus (104): The market_authority signer must sign to change seat status."
- Verification (2026-10-09): held: new_order.rs: swaps (IOC/FOK) need no seat. Limit and post-only fail with 'Missing seat for market maker'. Orders that take liquidity are rejected unless market status allows crossing. instruction.rs: market_authority signs ChangeSeatStatus (104) and RequestSeatAuthorized (105).

### F2.22 [D9] [S8] UNCONFIRMED

A Token-2022 transfer hook runs custom logic on every transfer but runs with reduced privileges (no sender signature, accounts read-only, extra accounts declared up front, Anchor needs a fallback), so it is a heavy tool for a cross-token holding rule. Ordinary balance checks in a program only see the accounts passed to the instruction. That a user can move tokens to another wallet to avoid a balance check is an inference from tokens being transferable, not from a source I opened.

- Lens: technical
- Source: [Solana docs - Token Extensions: Transfer Hook](https://solana.com/docs/tokens/extensions/transfer-hook): "execute custom instruction logic on every token transfer ... all accounts from the initial transfer are converted to read-only accounts."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.23 [D9] [Q31] [Q5] [Q6] [S8] [S7] [S27] CONFIRMED

Venues do not forbid holding both sides. Kalshi nets Yes and No bought in one market; Polymarket lets a wallet hold Yes and No (splitting creates both; holding both is a listed use) and offers merge to turn equal amounts back into collateral.

- Lens: venues
- Source: [Kalshi - Collateral return](https://news.kalshi.com/p/collateral-return): "On Kalshi, netting always happens when you buy both Yes and No in a single market."
- Source: [Positions & Tokens - Polymarket Documentation](https://docs.polymarket.com/concepts/positions-tokens): "Splitting 1 pUSD creates 1 Yes position and 1 No position. ... Merging requires equal amounts of Yes and No positions."
- Verification (2026-10-09): held: The Kalshi news post says 'On Kalshi, netting always happens when you buy both Yes and No in a single market.' The Polymarket positions page says splitting creates 1 Yes and 1 No, merging needs equal amounts, and 'Obtain both sides of a market' is a listed use.

### F2.39 [Q6] [D9] [S27] [S8] CONFIRMED

In Manifest, ordinary resting orders lock tokens on the market; only 'global' orders leave tokens in the wallet. So a Buy No limit order's Yes sell sits in the book while the wallet holds the No. Kalshi blocks closing a position until its resting order is cancelled; Polymarket cancels only the unfilled remainder of a partial fill.

- Lens: user
- Source: [CKS-Systems/manifest README](https://raw.githubusercontent.com/CKS-Systems/manifest/main/README.md): "A global order is an order that does not lock the tokens to support the order on the market."
- Source: [Kalshi Help - Closing or Modifying a Position](https://help.kalshi.com/en/articles/15357641-closing-or-modifying-a-position): "you cannot partially or fully close that position until the resting order is cancelled"
- Source: [Polymarket - Orders](https://docs.polymarket.com/developers/CLOB/orders/orders): "For a partially filled order, cancellation removes only its unfilled remainder"
- Verification (2026-10-09): held: The Manifest README defines a global order as one that does not lock the tokens on the market. The Kalshi help page says you cannot partially or fully close that position until the resting order is cancelled. The Polymarket orders page says cancellation removes only the unfilled remainder. Ordinary resting orders locking tokens on the market is inferred from the global-order contrast and market.rs balance handling.

### F2.41 [Q31] [S8] CONFIRMED

Kalshi describes buying Yes and selling No as equivalent ('no inherent difference'), and closes positions through an explicit Close action on the position; it does not describe a one-step 'flip' in the pages I opened.

- Lens: user
- Source: [Kalshi Help - Buying Yes vs Selling No](https://help.kalshi.com/trading/buying-yes-vs-selling-no): "there's no inherent difference between buying a Yes contract and selling a No contract."
- Source: [Kalshi Help - Closing or Modifying a Position](https://help.kalshi.com/en/articles/15357641-closing-or-modifying-a-position): "select the open position, and choose Close"
- Verification (2026-10-09): held: The Kalshi page says 'there's no inherent difference between buying a Yes contract and selling a No contract'. The closing page says to select the position and choose Close, and does not mention flipping.
