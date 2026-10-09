# Research: S27 Sees a Buy No limit order as pending, not a position; cancelling it returns $1 per pair

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.23 [D9] [Q31] [Q5] [Q6] [S8] [S7] [S27] CONFIRMED

Venues do not forbid holding both sides. Kalshi nets Yes and No bought in one market; Polymarket lets a wallet hold Yes and No (splitting creates both; holding both is a listed use) and offers merge to turn equal amounts back into collateral.

- Lens: venues
- Source: [Kalshi - Collateral return](https://news.kalshi.com/p/collateral-return): "On Kalshi, netting always happens when you buy both Yes and No in a single market."
- Source: [Positions & Tokens - Polymarket Documentation](https://docs.polymarket.com/concepts/positions-tokens): "Splitting 1 pUSD creates 1 Yes position and 1 No position. ... Merging requires equal amounts of Yes and No positions."
- Verification (2026-10-09): held: The Kalshi news post says 'On Kalshi, netting always happens when you buy both Yes and No in a single market.' The Polymarket positions page says splitting creates 1 Yes and 1 No, merging needs equal amounts, and 'Obtain both sides of a market' is a listed use.

### F2.36 [Q5] [D5] [D9] [Q6] [Q31] [S7] [S27] CONFIRMED

In Gnosis's ConditionalTokens, mergePositions never reads the payout state (works before or after resolution) and returns collateral for a full set, while redeemPositions requires a reported result ('result for condition not received yet'). This is the standard pattern for pre-settlement pair burns.

- Lens: technical
- Source: [gnosis/conditional-tokens-contracts ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "require(den > 0, "result for condition not received yet");"
- Verification (2026-10-09): held: ConditionalTokens.sol: mergePositions never reads payoutDenominator, so it works before resolution. redeemPositions has require(den > 0, 'result for condition not received yet'). mergePositions transfers collateral on a full-set merge. The 'standard pattern' phrase is the author's own characterisation.

### F2.37 [Q5] [Q31] [S7] [S27] UNCONFIRMED

Polymarket documents merge: 'Every 1 YES token and 1 NO token returns 1 pUSD', requires equal amounts, is atomic, and market-maker docs tell makers to cancel orders then merge leftover complete sets to free capital. The merge page does not say whether merge is allowed before resolution (the redeem page requires a resolved market).

- Lens: venues
- Source: [Polymarket - Merge Tokens](https://docs.polymarket.com/trading/ctf/merge): "Every 1 YES token and 1 NO token returns 1 pUSD."
- Source: [Polymarket - Inventory Management](https://docs.polymarket.com/market-makers/inventory): "Merging a complete set returns pUSD."
- Verification (2026-10-09): downgraded from CONFIRMED: The merge page has 'Every 1 YES token and 1 NO token returns 1 pUSD' and equal amounts. It does not say 'atomic' or all-or-nothing, so that word is not supported. It does not say whether merge works before resolution, as the claim itself admits. The inventory page has 'Merging a complete set returns pUSD' and advises cancelling remaining orders then merging complete sets.

### F2.38 [Q5] [A1] [Q6] [S7] [S27] [S4] [S6] CONFIRMED

The spec's wording on redemption and the vault: Sell No leaves 'Yes + No, which can be redeemed for $1.00, or the system handles the close automatically'; Redeem pays winning $1.00 and losing $0.00; 'Tokens can only be destroyed via the redeem function'; 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)'. The function list has no pair-burn. Context only.

- Lens: technical
- Source: [Meridian spec](docs/spec/meridian_project.txt): "Tokens can only be destroyed via the redeem function ... Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)"
- Verification (2026-10-09): held: Spec file: line 314 'Yes + No, which can be redeemed for $1.00, or the system handles the close automatically'; 391 'Tokens can only be destroyed via the redeem function'; 386 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate...'. The $ and x signs are encoding-garbled in the file. The pair-burn absence in the function list was not checked.

### F2.39 [Q6] [D9] [S27] [S8] CONFIRMED

In Manifest, ordinary resting orders lock tokens on the market; only 'global' orders leave tokens in the wallet. So a Buy No limit order's Yes sell sits in the book while the wallet holds the No. Kalshi blocks closing a position until its resting order is cancelled; Polymarket cancels only the unfilled remainder of a partial fill.

- Lens: user
- Source: [CKS-Systems/manifest README](https://raw.githubusercontent.com/CKS-Systems/manifest/main/README.md): "A global order is an order that does not lock the tokens to support the order on the market."
- Source: [Kalshi Help - Closing or Modifying a Position](https://help.kalshi.com/en/articles/15357641-closing-or-modifying-a-position): "you cannot partially or fully close that position until the resting order is cancelled"
- Source: [Polymarket - Orders](https://docs.polymarket.com/developers/CLOB/orders/orders): "For a partially filled order, cancellation removes only its unfilled remainder"
- Verification (2026-10-09): held: The Manifest README defines a global order as one that does not lock the tokens on the market. The Kalshi help page says you cannot partially or fully close that position until the resting order is cancelled. The Polymarket orders page says cancellation removes only the unfilled remainder. Ordinary resting orders locking tokens on the market is inferred from the global-order contrast and market.rs balance handling.
