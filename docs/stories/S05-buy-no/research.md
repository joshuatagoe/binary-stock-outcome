# Research: S5 Buys No with one approval; the app mints a pair and sells the Yes

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

### F2.21 [D5] [S4] [S5] UNCONFIRMED

On EVM-style venues the operator checks the trader's 'balance, allowances' (a separate token approval); the Solana path in Manifest's Swap needs no separate approval because the trader signs the transfer inside the same transaction. (The no-approval point is read from Manifest's source, not from a Solana doc on token delegation.)

- Lens: user
- Source: [Order Lifecycle - Polymarket Documentation](https://docs.polymarket.com/concepts/order-lifecycle): "checks the signature, balance, allowances, and tick size"
- Source: [Manifest swap.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/processor/swap.rs): "Transfers only the consumed input from the trader's token account to the vault, via SPL Token or Token-2022 transfer_checked."
- Verification (2026-10-09): downgraded from CONFIRMED: The order-lifecycle page lists operator validation of signature, sufficient balance, required allowances and tick size; 'checks the signature, balance, allowances, and tick size' is a paraphrase. The swap.rs quote claims transfer_checked for SPL Token and Token-2022, but legacy SPL uses a plain transfer; only Token-2022 uses transfer_checked. The claim that no separate approval is needed holds, but the quote is inaccurate.

### F2.29 [D15] [S4] [S5] CONFIRMED

Polymarket market orders are FAK (default; partial allowed, rest cancelled) or FOK (all or none) with price protection via maxPrice/minPrice and a maxSpend cap; its docs say 'If the book moves before submission, the order may fill only partially or not at all.' Limit orders can fill partly with the remainder resting; cancelling a partially filled order removes only the unfilled remainder.

- Lens: venues
- Source: [Polymarket - Create orders](https://docs.polymarket.com/trading/orders/create): "A market order never rests on the book: any amount that cannot fill is canceled. ... If the book moves before submission, the order may fill only partially or not at all."
- Source: [Polymarket - Orders](https://docs.polymarket.com/developers/CLOB/orders/orders): "For a partially filled order, cancellation removes only its unfilled remainder, including when the market resolves."
- Verification (2026-10-09): held: Polymarket create-orders page: FAK default, FOK, maxPrice/minPrice, maxSpend, 'never rests on the book', and the 'book moves before submission' line. The orders page: 'cancellation removes only its unfilled remainder'.

### F2.30 [D15] [Q38] [S4] [S5] CONFIRMED

Jupiter's swap quote carries slippageBps and an otherAmountThreshold, 'the minimum acceptable output after applying slippageBps tolerance' (example 50 bps lowers the 16,198,753 expected output to a 16,117,760 floor). That the swap then fails on-chain when the floor is missed is not stated on the page I opened.

- Lens: technical
- Source: [Jupiter Developers - Get Quote](https://developers.jup.ag/docs/swap/get-quote): "otherAmountThreshold is the minimum acceptable output after applying slippageBps tolerance on outAmount."
- Verification (2026-10-09): held: Jupiter get-quote: otherAmountThreshold is 'the minimum acceptable output after applying slippageBps tolerance on outAmount'. Example outAmount 16198753 and threshold 16117760 match.

### F2.31 [D15] [S4] [S5] CONFIRMED

Kalshi's order API supports fill_or_kill, immediate_or_cancel and good_till_canceled and returns fill_count, remaining_count and average_fill_price; its Quick Order help page warns an order 'might get filled across several different prices' and does not mention price protection.

- Lens: user
- Source: [Kalshi API - Create Order (V2)](https://docs.kalshi.com/api-reference/orders/create-order-v2): "fill_count: Number of contracts filled immediately upon placement. ... average_fill_price: Volume-weighted average fill price."
- Source: [Kalshi Help - Quick Order Purchase](https://help.kalshi.com/trading/buying-positions/quick-order-purchase): "might get filled across several different prices"
- Verification (2026-10-09): held: Kalshi Create Order V2 lists fill_or_kill, immediate_or_cancel and good_till_canceled, plus fill_count, remaining_count and average_fill_price. The Quick Order help says 'might get filled across several different prices' and does not mention price protection.

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

### F2.91 [D25] [Q21] [S10] [S11] [S5] UNCONFIRMED

Polymarket's market-maker guide: makers post bids and asks on both sides; buy orders use available collateral while sell orders need the outcome tokens; makers split collateral into complete sets, merge sets to free capital and redeem winners; tooling highlighted is API-side (batch orders, GTC/GTD with post-only, market data stream, order updates, cancel-all as a kill switch; fetch open orders and trades after reconnecting). The page does not separate maker tooling from retail tooling.

- Lens: venues
- Source: [Polymarket market makers overview](https://docs.polymarket.com/market-makers/overview): "Buy orders use available pUSD, while sell orders require the corresponding outcome tokens."
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Polymarket market makers overview. Buy/sell collateral quote, split/merge/redeem, batch, GTC/GTD post-only, stream, cancel-all kill switch, refetch open orders after reconnect all confirmed. But the claim that it does not separate maker from retail tooling is contradicted: page says it is for traders providing liquidity from their own account and routes products serving users to a separate Builder Program.

### F2.95 [D25] [S5] CONFIRMED

Kalshi presents Yes and No to traders as views of one matching space: its order-direction table maps buy-No and sell-Yes to the same ask-side exposure, and says 'buy-no and sell-yes both produce long no', with an order at price p on the No side matched by a Yes order at the same price p.

- Lens: venues
- Source: [Kalshi order direction](https://docs.kalshi.com/getting_started/order_direction.md): "buy-no and sell-yes both produce long no"
- Verification (2026-10-09): held: Opened Kalshi order direction. buy-no and sell-yes both map to outcome_side no, book_side ask; quote verbatim; No order at p matched by Yes order at same p.

### F2.103 [Q29] [Q41] [Q4] [D25] [S4] [S5] [S10] [S26] CONFIRMED

Spec wording that these items turn on: '9:00 AM ET: Markets visible on frontend, minting enabled', '9:30 AM ET: US market open, live trading begins', '4:00 PM ET: US market close', '~4:05 PM ET: Automation service ... settles'; Mint Pair is 'Any user'; Settle 'Can only be called after 4:00 PM ET'; admin can 'pause minting and trading'; 'The user doesn't need to understand that Buy No is actually a mint-and-sell-Yes operation'. The spec never says when minting stops or what happens to resting orders at 4:00.

- Lens: technical
- Source: [Meridian spec (local)](file:///C:/Users/joshu/OneDrive/Documents/Gauntlet/binary-stock-outcome/docs/spec/meridian_project.txt): "9:00 AM ET: Markets visible on frontend, minting enabled"
- Verification (2026-10-09): held: Grepped local docs/spec/meridian_project.txt. Lines 341-345 hold the 9:00/9:30/4:00/~4:05 schedule; line 360 'Mint Pair -- Any user'; line 365 settle 'Can only be called after 4:00 PM ET'; line 372 admin can pause minting and trading; line 203 Buy No sentence. Grep found no statement of when minting stops or resting-order handling at 4:00.
