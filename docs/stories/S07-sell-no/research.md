# Research: S7 Sells No; the app buys a Yes and closes the pair

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.10 [D21] [D15] [D9] [D5] [S4] [S5] [S7] UNCONFIRMED

Manifest Swap needs no seat, takes the trader's tokens by transfer_checked in the same instruction (no separate approval), and fails with InsufficientOut if the result is below out_atoms (exact-in) or above in_atoms (exact-out).

- Lens: technical
- Source: [Manifest swap.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/processor/swap.rs): "If the result is below out_atoms, it fails with ManifestError::InsufficientOut ... No seat is required."
- Verification (2026-10-09): downgraded from CONFIRMED: swap.rs confirms no seat is required (a temporary seat is claimed and released) and InsufficientOut for both exact-in and exact-out. But transfer_checked is used only for Token-2022. Legacy SPL tokens use a plain transfer instruction. The quote says 'transfer_checked' for all, which is contradicted. The input is still taken in the same instruction, so the no-separate-approval point holds. Fix the wording.

### F2.17 [D5] [D13] [Q31] [S4] [S5] [S7] CONFIRMED

A Solana transaction is atomic ('All instructions succeed or all revert') and limited to 1,232 bytes, so Buy No (mint plus sell Yes) and Sell No (buy Yes plus burn) can each be one signed transaction, with size as the main constraint.

- Lens: technical
- Source: [Solana docs - Transactions](https://solana.com/docs/core/transactions): "All instructions succeed or all revert. ... 1,232 bytes maximum"
- Verification (2026-10-09): held: Solana transactions docs: 'All instructions succeed or all revert' and 1,232 bytes maximum. It also mentions a v1 format raising the cap to 4,096.

### F2.19 [D5] [Q38] [Q5] [S5] [S7] CONFIRMED

Kalshi's order book shows only bids and states the reciprocal rule: a YES bid at X is a NO ask at 1 - X, and a NO bid at Y is a YES ask at 1 - Y. Its order API quotes everything from the YES side (bid buys YES, ask sells YES) and notes that selling YES is equivalent to buying NO at 1 - price.

- Lens: venues
- Source: [Kalshi API - Orderbook Responses](https://docs.kalshi.com/getting_started/orderbook_responses): "A YES bid at X is equivalent to a NO ask at $1.00 minus X"
- Source: [Kalshi API - Create Order (V2)](https://docs.kalshi.com/api-reference/orders/create-order-v2): "side: bid or ask ... this refers to the YES leg only."
- Verification (2026-10-09): held: The Kalshi orderbook page says only bids are returned, with a YES bid at X equivalent to a NO ask at $1-X and vice versa. Create Order V2 says side bid/ask refers to the YES leg only, and selling YES is equivalent to buying NO at 1-price.

### F2.20 [D5] [Q28] [Q38] [S5] [S7] [S4] UNCONFIRMED

Polymarket keeps a book per outcome that mirrors the other (Yes bid 0.01 vs No ask 0.99) and matches complementary orders by minting (two buyers whose prices sum to $1) or merging (two sellers). The price comes from the maker order and the taker keeps price improvement; you pay the ask when buying and receive the bid when selling.

- Lens: venues
- Source: [Polymarket ctf-exchange docs/Overview.md](https://raw.githubusercontent.com/Polymarket/ctf-exchange/main/docs/Overview.md): "MINT: Two buyers on complementary tokens ... any price improvement is captured by the taking agent."
- Source: [Prices & Orderbook - Polymarket Documentation](https://docs.polymarket.com/concepts/prices-orderbook): "Since $0.60 + $0.40 = $1.00, the orders match. ... you'll pay the ask ($0.40) when buying or receive the bid ($0.34) when selling."
- Verification (2026-10-09): downgraded from CONFIRMED: The ctf-exchange Overview confirms MINT/MERGE of complementary tokens and 'any price improvement is captured by the taking agent'. The prices-orderbook page confirms the 0.60+0.40 match, and paying the ask $0.40 / receiving the bid $0.34. Not stated on the pages: that price comes from the maker order (the fetch says this is inference), and the Yes bid 0.01 vs No ask 0.99 mirror example. The per-outcome mirrored book is not explicit either.

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

### F2.42 [Q38] [S5] [S7] CONFIRMED

Polymarket displays probability as the midpoint of the bid-ask spread when the spread is $0.10 or less, and the last traded price when it is wider (example: 34 cent bid and 40 cent ask gives 37%).

- Lens: venues
- Source: [Polymarket Help - How are prices calculated?](https://help.polymarket.com/en/articles/13364488-how-are-prices-calculated): "the midpoint of the bid-ask spread in the orderbook ... the last traded price is used."
- Verification (2026-10-09): held: Polymarket help: displayed probability is the midpoint of the bid-ask spread, unless the spread is over $0.10, in which case the last traded price is used. 34/40 example gives 37%.

### F2.43 [Q38] [S5] [S7] CONFIRMED

Kalshi ties the contract price to probability (70% corresponds to 70 cents Yes and 30 cents No) but its pages do not say whether the displayed number is last, bid, ask or midpoint.

- Lens: user
- Source: [Kalshi Help - How are prices determined?](https://help.kalshi.com/markets/markets-101/how-are-prices-determined): "The contract price for a particular event is directly tied to this probability."
- Verification (2026-10-09): held: The Kalshi page says price is 'directly tied to this probability' with a 70% example (70c Yes, 30c No). It does not say whether the displayed number is last, bid, ask or midpoint.
