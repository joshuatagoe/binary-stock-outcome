# Research: S4 Buys Yes with a market or limit order, signing once

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.01 [D20] [S4] [S9] CONFIRMED

Polymarket's CTF Exchange is a hybrid: an operator matches orders off-chain and settlement is atomic, on-chain and non-custodial. The repository is now archived with a pointer to a V2 repository.

- Lens: venues
- Source: [Polymarket/ctf-exchange README](https://raw.githubusercontent.com/Polymarket/ctf-exchange/main/README.md): "there is an operator that provides offchain matching services while settlement happens on-chain, non-custodially. ... This repository has been archived and is no longer maintained."
- Verification (2026-10-09): held: Opened the ctf-exchange README. Both quotes are verbatim, and it points to Polymarket/ctf-exchange-v2.

### F2.02 [D20] [D13] [S4] [S9] UNCONFIRMED

In Polymarket's lifecycle, orders are signed off-chain, matched by an operator and settled on-chain later; settlement is atomic, and failed settlements show as RETRYING or FAILED. Positions change only at CONFIRMED.

- Lens: venues
- Source: [Order Lifecycle - Polymarket Documentation](https://docs.polymarket.com/concepts/order-lifecycle): "Orders are created offchain, matched by an operator, and settled onchain through smart contracts. ... either the entire trade succeeds or nothing happens."
- Source: [Polymarket CLOB introduction](https://docs.polymarket.com/developers/CLOB/introduction): "Your order matched, but its trade settles on-chain asynchronously."
- Verification (2026-10-09): downgraded from CONFIRMED: Opened order-lifecycle and the CLOB intro. Confirmed: offchain create, operator match, onchain settle, 'entire trade succeeds or nothing happens', RETRYING/FAILED/CONFIRMED statuses, and the 'settles on-chain asynchronously' line. Not confirmed: 'positions change only at CONFIRMED'. The page says balances update at the Confirmation step but never says 'only'. Drop or soften that clause.

### F2.03 [D20] [S4] [S9] CONFIRMED

Hyperliquid matches orders on its own L1 with no off-chain order book: median end-to-end latency 0.2 s, about 200k orders/s. It is a purpose-built chain, not a program on a general chain.

- Lens: venues
- Source: [Hyperliquid Docs - HyperCore overview](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/overview): "HyperCore does not rely on the crutch of off-chain order books. ... end-to-end latency has a median 0.2 seconds and 99th percentile 0.9 seconds."
- Verification (2026-10-09): held: Opened the HyperCore overview. It says no off-chain order books, median 0.2 s and p99 0.9 s latency, and about 200k orders/s.

### F2.04 [D20] [D21] [S4] [S9] CONFIRMED

The spec asks for an on-chain order book in several places and names two routes: an existing on-chain CLOB, or a minimal book inside the contract. It also requires admin pause of minting and trading. Context only; not counted as an outside source.

- Lens: technical
- Source: [Meridian spec](docs/spec/meridian_project.txt): "Users trade two complementary token types -- Yes and No -- on an on-chain order book. ... Use an existing on-chain CLOB ... Build a minimal order book as part of your smart contract ... Pause / Unpause -- Admin can pause minting and trading in an emergency"
- Verification (2026-10-09): held: Grepped docs/spec/meridian_project.txt. It has the on-chain order book wording (lines 13, 21), existing on-chain CLOB (Phoenix, line 133), minimal order book (136) and Pause/Unpause (372). Spec text, not an outside source.

### F2.05 [D20] [D13] [S4] [S9] CONFIRMED

Solana slots are about 400 ms; a transaction's blockhash stays valid for 150 blocks, about 60 to 90 seconds, after which the transaction cannot land.

- Lens: technical
- Source: [Solana docs - Transaction confirmation and expiration](https://solana.com/docs/core/transactions/confirmation): "With ~400ms slots, a blockhash stays usable for about 60 to 90 seconds"
- Verification (2026-10-09): held: Opened Solana confirmation docs. It says about 150 blocks, ~400ms slots, about 60 to 90 seconds.

### F2.06 [D21] [D20] [D5] [S4] [S9] CONFIRMED

Manifest's README compares creation rent: Manifest about 0.007 SOL, OpenBook 2 SOL, Phoenix 3+ SOL (a competitor's figure; Phoenix's real rent and whether it is reclaimable were not confirmed). It also lists Manifest as crankless, feeless, GPL, 8 swap accounts (OpenBook 16, Phoenix 8), Phoenix as business-licensed (now stale, see F2.11).

- Lens: technical
- Source: [CKS-Systems/manifest README](https://raw.githubusercontent.com/CKS-Systems/manifest/main/README.md): "Creation Rent | 2 SOL | 3+ SOL | .007 SOL ... Swap accounts | 16 | 8 | 8"
- Verification (2026-10-09): held: Opened the Manifest README table. Creation rent: Manifest .007 SOL, OpenBook 2 SOL, Phoenix 3+ SOL. Swap accounts 16/8/8 for OpenBook/Phoenix/Manifest. Feeless: Manifest yes. License: Manifest and OpenBook GPL, Phoenix Business. Crankless is also listed.

### F2.07 [D21] [S4] [S9] CONFIRMED

Manifest is actively developed (commits on 2026-10-08 and 2026-10-09), licensed GPL-3.0, has an audit report and daily Certora formal verification, and is upgradeable by a 4-of-5 Squads multisig.

- Lens: venues
- Source: [CKS-Systems/manifest recent commits (GitHub API)](https://api.github.com/repos/CKS-Systems/manifest/commits?per_page=3): "2026-10-09 17:37 UTC: Export quote volume by aggregator and originating protocol (#753)"
- Source: [CKS-Systems/manifest](https://github.com/CKS-Systems/manifest): "the core program's upgrade authority is a Squads multisig with a 4-of-5 threshold ... daily formal verification with the Certora prover"
- Verification (2026-10-09): held: The GitHub API shows commits on 2026-10-09 (#753, 17:37 UTC) and 2026-10-08. The repo page confirms the Squads 4-of-5 upgrade authority, daily Certora verification, an audit report link, and GPL-3.0.

### F2.08 [D21] [D9] [S4] [S9] CONFIRMED

Manifest has no pause, close-market or market-authority instruction (instructions: CreateMarket, ClaimSeat, Deposit, Withdraw, Swap, Expand, BatchUpdate, Global*, SwapV2), and CreateMarket checks no authority, so anyone can create a market and anyone can trade it.

- Lens: technical
- Source: [Manifest instruction.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/instruction.rs): "0: CreateMarket, 1: ClaimSeat, 2: Deposit, 3: Withdraw, 4: Swap, 5: Expand, 6: BatchUpdate ... 13: SwapV2"
- Source: [Manifest create_market.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/processor/create_market.rs): "No authority check appears in this function. Any payer who supplies valid accounts can create a market."
- Verification (2026-10-09): held: instruction.rs has variants 0-13 as listed, with no pause, close or authority instruction. create_market.rs does no authority check; the quoted sentence is a paraphrase, not literal text. CreateMarketContext::load (loaders.rs) only requires a payer signer plus account/vault address checks, with no authority account.

### F2.09 [D21] [Q28] [S4] [S26] CONFIRMED

Manifest order expiry is a u32 slot number (last_valid_slot), not a clock time; reversible orders cannot expire; expired resting orders are removed when matching reaches them. Taker fills happen at the maker's resting price.

- Lens: technical
- Source: [Manifest resting_order.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/state/resting_order.rs): "last_valid_slot is a u32. ... Reverse orders cannot have expiration."
- Source: [Manifest market.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/state/market.rs): "The loop sets matched_price from maker_order.get_price() ... remove_and_update_balances"
- Verification (2026-10-09): held: resting_order.rs: last_valid_slot is u32 and 'Reverse orders cannot have expiration'. market.rs: matched_price comes from maker_order.get_price(), and expired makers are removed via remove_and_update_balances as matching reaches them.

### F2.10 [D21] [D15] [D9] [D5] [S4] [S5] [S7] UNCONFIRMED

Manifest Swap needs no seat, takes the trader's tokens by transfer_checked in the same instruction (no separate approval), and fails with InsufficientOut if the result is below out_atoms (exact-in) or above in_atoms (exact-out).

- Lens: technical
- Source: [Manifest swap.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/processor/swap.rs): "If the result is below out_atoms, it fails with ManifestError::InsufficientOut ... No seat is required."
- Verification (2026-10-09): downgraded from CONFIRMED: swap.rs confirms no seat is required (a temporary seat is claimed and released) and InsufficientOut for both exact-in and exact-out. But transfer_checked is used only for Token-2022. Legacy SPL tokens use a plain transfer instruction. The quote says 'transfer_checked' for all, which is contradicted. The input is still taken in the same instruction, so the no-separate-approval point holds. Fix the wording.

### F2.11 [D21] [D20] [S4] [S9] CONFIRMED

Phoenix v1 is now called Phoenix Legacy: renamed in Feb 2026, relicensed from BUSL to MIT in May 2026, newest commit (2026-10-09) only edits SECURITY.md; OtterSec audit and a bug bounty exist; the SDK last had a real commit in Aug 2024 aside from the Feb 2026 rename.

- Lens: venues
- Source: [Ellipsis-Labs/phoenix-v1 recent commits (GitHub API)](https://api.github.com/repos/Ellipsis-Labs/phoenix-v1/commits?per_page=3): "2026-10-09 Update SECURITY.md; 2026-05-11 Change license from BUSL to MIT (#51); 2026-02-04 Rename Phoenix to Phoenix Legacy in docs (#50)"
- Source: [Phoenix Legacy SECURITY.md](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/SECURITY.md): "Phoenix Legacy Bug Bounty Program ... Critical (up to $200,000)"
- Source: [Ellipsis-Labs/phoenix-sdk recent commits (GitHub API)](https://api.github.com/repos/Ellipsis-Labs/phoenix-sdk/commits?per_page=3): "2026-02-04 Rename Phoenix references to Phoenix Legacy (#182); 2025-03-19 Update README.md (#180)"
- Verification (2026-10-09): held: phoenix-v1 commits: 2026-10-09 Update SECURITY.md, 2026-05-11 BUSL to MIT (#51), 2026-02-04 rename (#50). The SDK commits show the 2026-02-04 rename, 2025-03-19, then 2024-08-26. The README says 'audited by OtterSec'. SECURITY.md has a bounty up to $200,000 for critical, administered by Ellipsis and OtterSec; the exact label 'Critical (up to $200,000)' is not literal. The SDK's last real commit is 2024-08-26 as claimed (the 2025-03-19 one is a README edit).

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

### F2.14 [D21] [D9] [S4] [S8] CONFIRMED

In Phoenix, Limit and PostOnly orders require a trader seat, but IOC/FOK swaps do not; the market authority can request seats on a trader's behalf and change seat status (so a permissioned-seat design is possible but swaps still skip the seat). Orders that take liquidity are rejected when market status disallows crossing.

- Lens: technical
- Source: [Phoenix new_order.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/processor/new_order.rs): "Swaps (IOC/FOK) don't need a seat ... Limit and Post-Only orders ... require a seat, or the transaction fails with "Missing seat for market maker"."
- Source: [Phoenix instruction.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/instruction.rs): "RequestSeatAuthorized (105) ... ChangeSeatStatus (104): The market_authority signer must sign to change seat status."
- Verification (2026-10-09): held: new_order.rs: swaps (IOC/FOK) need no seat. Limit and post-only fail with 'Missing seat for market maker'. Orders that take liquidity are rejected unless market status allows crossing. instruction.rs: market_authority signs ChangeSeatStatus (104) and RequestSeatAuthorized (105).

### F2.15 [D21] [S4] [S9] [S26] UNCONFIRMED

OpenBook v2 looks dormant: default branch master last pushed 2024-07-15 (last commit 2024-06-23), GPL, deployed v1.7 on mainnet, devnet and testnet. It has close_market, set_market_expired, prune_orders, settle_funds_expired (close_market_admin), consume_events (needed to process fills), maker/taker fee parameters and time_expiry.

- Lens: venues
- Source: [openbook-dex/openbook-v2 repo metadata (GitHub API)](https://api.github.com/repos/openbook-dex/openbook-v2): "default_branch: master; pushed_at: 2024-07-15T22:16:49Z; archived: false"
- Source: [OpenBook v2 lib.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/lib.rs): "create_market takes name, oracle_config, quote_lot_size, base_lot_size, maker_fee, taker_fee, and time_expiry ... close_market_admin: close_market, set_market_expired, prune_orders, settle_funds_expired"
- Source: [openbook-dex/openbook-v2](https://github.com/openbook-dex/openbook-v2): "v1.7 on mainnet, devnet, and testnet (program ID opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb)"
- Verification (2026-10-09): downgraded from CONFIRMED: The API confirms default_branch master, pushed_at 2024-07-15T22:16:49Z, archived false. lib.rs confirms create_market params (name, oracle_config, lot sizes, maker_fee, taker_fee, time_expiry), close_market, set_market_expired, prune_orders, settle_funds_expired (all close_market_admin), consume_events and sweep_fees. The README confirms v1.7 on mainnet, devnet and testnet. Two problems: the repo README says 'majority MIT, some parts GPL' and the API license is NOASSERTION, so plain 'GPL' is imprecise (only the Manifest README calls it GPL). The 2024-06-23 last-commit date was not visible on the page.

### F2.16 [D21] [S4] [S9] UNCONFIRMED

Whether Phoenix or Manifest have a public Solana devnet deployment could not be confirmed. Phoenix's SDK example connects to the public devnet RPC but gives no program ID; Manifest's README gives no devnet ID. Self-deployment of the open-source program is the likely route (Phoenix MIT; Manifest GPL-3.0).

- Lens: technical
- Source: [Phoenix Legacy SDK README](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-sdk/master/README.md): "cargo run --bin sample -- -r $YOUR_DEVNET_RPC_ENDPOINT"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.17 [D5] [D13] [Q31] [S4] [S5] [S7] CONFIRMED

A Solana transaction is atomic ('All instructions succeed or all revert') and limited to 1,232 bytes, so Buy No (mint plus sell Yes) and Sell No (buy Yes plus burn) can each be one signed transaction, with size as the main constraint.

- Lens: technical
- Source: [Solana docs - Transactions](https://solana.com/docs/core/transactions): "All instructions succeed or all revert. ... 1,232 bytes maximum"
- Verification (2026-10-09): held: Solana transactions docs: 'All instructions succeed or all revert' and 1,232 bytes maximum. It also mentions a v1 format raising the cap to 4,096.

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

### F2.24 [D13] [S4] CONFIRMED

Solana transactions can be dropped before inclusion; a successful send response does not mean it will be processed; apps should rebroadcast, check with getSignatureStatuses, and only re-sign after the blockhash has expired. Preflight simulation catches failures before submission.

- Lens: technical
- Source: [Solana - How to retry a transaction](https://solana.com/developers/guides/advanced/retry): "Before re-signing any transaction, it is very important to ensure that the initial transaction's blockhash has expired."
- Verification (2026-10-09): held: Solana retry guide: a send success does not mean processed. It covers rebroadcast, getSignatureStatuses, preflight simulation, and the exact quote on re-signing only after the blockhash has expired.

### F2.25 [D13] [S4] CONFIRMED

Save lastValidBlockHeight when fetching a blockhash and poll block height at 'confirmed' until it passes; after that the transaction can no longer land. 'confirmed' has a very low fork risk; 'finalized' is about 13 seconds slower; about 5% of 'processed' blocks are never finalized.

- Lens: technical
- Source: [Solana docs - Transaction confirmation and expiration](https://solana.com/docs/core/transactions/confirmation): "confirmed: Recommended for almost all RPC requests ... has a very low chance of belonging to a dropped fork."
- Verification (2026-10-09): held: Confirmation docs: save lastValidBlockHeight and poll getBlockHeight; confirmed should almost always be used; processed has about 5% of blocks never finalized; finalized costs about 13 seconds of lifetime. The exact quote is a paraphrase.

### F2.26 [D13] [S4] CONFIRMED

getSignatureStatuses returns confirmationStatus (processed, confirmed or finalized) and err (null on success); a signature not in the recent cache returns null unless searchTransactionHistory is set, so 'not found' must not be read as 'failed' before expiry.

- Lens: technical
- Source: [Solana RPC - getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses): "err: Error if the transaction failed. null if the transaction succeeded. ... searchTransactionHistory"
- Verification (2026-10-09): held: getSignatureStatuses docs: confirmationStatus is processed, confirmed or finalized; err is null on success; searchTransactionHistory finds signatures missing from the recent status cache. The page does not literally say 'null means unknown', but it implies it.

### F2.27 [D13] [S4] CONFIRMED

Wallet adapter distinguishes WalletSignTransactionError, WalletSendTransactionError, WalletTimeoutError and WalletWindowClosedError, so the UI can tell 'user closed the popup' from 'send failed'. Phantom's recommended signAndSendTransaction has the wallet submit right after signing and returns the signature, for the app to confirm.

- Lens: user
- Source: [anza-xyz/wallet-adapter errors.ts](https://raw.githubusercontent.com/anza-xyz/wallet-adapter/master/packages/core/base/src/errors.ts): "WalletSendTransactionError, WalletSignTransactionError, WalletTimeoutError, WalletWindowClosedError"
- Source: [Phantom docs - Sending a transaction](https://docs.phantom.com/solana/sending-a-transaction): "It is safer for users, and a simpler API for developers, for Phantom to submit the transaction immediately after signing it"
- Verification (2026-10-09): held: The wallet-adapter errors.ts defines all four error classes. The Phantom docs have the exact quote and say signAndSendTransaction returns the signature for the app to check with the RPC.

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

### F2.32 [A1] [S4] [S6] CONFIRMED

Polymarket charges only takers, on most markets: fee = C x feeRate x p x (1-p), rates by category (Crypto 0.07; Sports and Economics 0.05; Finance, Politics, Tech 0.04; Geopolitics 0), 'Makers are never charged fees', with maker rebates of 15% to 25% of fees; fees are rounded to five decimals.

- Lens: venues
- Source: [Polymarket - Fees](https://docs.polymarket.com/trading/fees): "fee = C x feeRate x p x (1 - p) ... Makers are never charged fees."
- Verification (2026-10-09): held: Polymarket fees page: fee = C x feeRate x p x (1-p). Rates: Crypto 0.07; Sports, Economics etc. 0.05; Finance, Politics, Mentions, Tech 0.04; Geopolitics 0. 'Makers are never charged fees', rebates of 15%/20%/25%, rounded to 5 decimals.

### F2.33 [A1] [S4] [S6] SECONDARY

Kalshi charges takers by formula and charges makers on resting orders that later fill. The taker formula (0.07 x contracts x price x (1 - price), rounded up) and the maker coefficient 0.0175 come from a search snippet of the July 2026 fee-schedule PDF; the PDF itself returned HTTP 429 when I opened it. The help page confirms the maker rule.

- Lens: venues
- Source: [Kalshi Fee Schedule for July 2026 (search snippet only)](https://kalshi.com/docs/kalshi-fee-schedule.pdf): "0.07 x contracts x price x (1 - price), rounded up to a centicent; fee range (100 contracts): $0.07 - $1.75"
- Source: [Kalshi Help - Fees](https://help.kalshi.com/en/articles/13823805-fees): "Maker fees are charged for orders placed that are not immediately matched and are instead left as resting orders on the orderbook."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F2.34 [A1] [S4] [S6] CONFIRMED

Manifest states 'No trading fees forever' and charges no protocol fee at market creation; OpenBook v2 sets maker_fee and taker_fee per market and has sweep_fees. Fees on a third-party book would go to that program's accounts, not to a Meridian fee account, unless Meridian takes its own fee in its own instruction.

- Lens: technical
- Source: [CKS-Systems/manifest](https://github.com/CKS-Systems/manifest): "No trading fees forever on Manifest."
- Source: [OpenBook v2 lib.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/lib.rs): "create_market ... maker_fee, taker_fee ... sweep_fees"
- Verification (2026-10-09): held: The Manifest README says 'No trading fees forever on Manifest' and the table marks it feeless. OpenBook lib.rs has maker_fee and taker_fee in create_market, and sweep_fees. The point about fees going to the program's accounts is inference, not in the sources.

### F2.38 [Q5] [A1] [Q6] [S7] [S27] [S4] [S6] CONFIRMED

The spec's wording on redemption and the vault: Sell No leaves 'Yes + No, which can be redeemed for $1.00, or the system handles the close automatically'; Redeem pays winning $1.00 and losing $0.00; 'Tokens can only be destroyed via the redeem function'; 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)'. The function list has no pair-burn. Context only.

- Lens: technical
- Source: [Meridian spec](docs/spec/meridian_project.txt): "Tokens can only be destroyed via the redeem function ... Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)"
- Verification (2026-10-09): held: Spec file: line 314 'Yes + No, which can be redeemed for $1.00, or the system handles the close automatically'; 391 'Tokens can only be destroyed via the redeem function'; 386 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate...'. The $ and x signs are encoding-garbled in the file. The pair-burn absence in the function list was not checked.

### F2.40 [Q28] [S4] UNCONFIRMED

Where I opened primary sources, crossing orders trade at the resting order's price: Manifest sets the fill price from the maker order and Polymarket takes it from the maker order with price improvement going to the taker. I found no continuous venue in this session that executes at the taker's limit or the midpoint.

- Lens: technical
- Source: [Manifest market.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/state/market.rs): "The taker fills at the maker's resting price."
- Source: [Polymarket ctf-exchange Overview](https://raw.githubusercontent.com/Polymarket/ctf-exchange/main/docs/Overview.md): "any price improvement is captured by the taking agent"
- Verification (2026-10-09): downgraded from CONFIRMED: Manifest half confirmed: market.rs sets matched_price from maker_order.get_price(); the quote is a paraphrase. Polymarket half not confirmed: the Overview says 'any price improvement is captured by the taking agent' but does not say price comes from the maker order. All its examples use $0.50, so that part is inference.

### F2.70 [Q4] [Q29] [Q41] [D14] [S26] [S4] [S9] [S10] CONFIRMED

Kalshi market lifecycle: initialized ('Created but not yet open for trading', active when open_time passes), active, inactive (paused), closed ('Past close_time. No new orders accepted. Awaiting determination.'), determined, finalized. At close, 'Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels'; once close_time passes all order operations including cancellations are rejected with MARKET_INACTIVE; resting orders are also cancelled when an inactive market is reactivated.

- Lens: venues
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels."
- Verification (2026-10-09): held: Opened Kalshi market lifecycle. All six statuses with matching descriptions, resting orders cancelled shortly after close, MARKET_INACTIVE for all order operations incl. cancellations after close, resting orders cancelled on reactivation.

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

### F2.81 [Q41] [S4] CONFIRMED

Nasdaq's Opening Cross: trading and order entry begin at 4:00 a.m. ET, imbalance information is disseminated from 9:25 a.m., and the Opening Cross occurs at 9:30 a.m. On-open orders request execution at the opening price; imbalance-only orders offset them. Pre-open orders therefore queue for a single-price cross rather than trading continuously.

- Lens: venues
- Source: [Nasdaq Opening and Closing Crosses](https://www.nasdaqtrader.com/Trader.aspx?id=OpenClose): "Dissemination of imbalance information begins ... The Opening Cross occurs"
- Verification (2026-10-09): held: Opened Nasdaq OpenClose page. Order entry 4:00 a.m., imbalance dissemination 9:25, cross 9:30, on-open orders (LOO/MOO) and imbalance-only orders offset them.

### F2.82 [Q41] [S4] SECONDARY

Cboe Australia's pre-open state lets participants enter, amend and cancel orders; overlapping orders do not trade; the opening auction runs for symbols that are pre-open with an overlapping book (from a search snippet; the PDF was unreadable).

- Lens: venues
- Source: [Cboe Australia Auctions on CXA Symbols](https://cdn.cboe.com/resources/au/participant_resources/Cboe-Australia-Auctions-on-CXA-Symbols.pdf): "Overlapping books can form, but overlapping orders will not trade"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F2.83 [Q41] [D14] [Q17] [S4] [S9] CONFIRMED

Pyth publishes US equity feeds in sessions: pre-market 4 AM to 9:30 AM ET, regular 9:30 AM to 4 PM ET, post-market 4 PM to 8 PM ET, overnight Sunday to Thursday 8 PM to 4 AM ET. The page does not say what the feed does outside these hours.

- Lens: technical
- Source: [Pyth market hours](https://docs.pyth.network/price-feeds/core/market-hours): "Pre-market: Every weekday from 4AM ET to 9.30AM ET."
- Verification (2026-10-09): held: Opened Pyth market-hours. Pre-market 4-9:30, regular 9:30-4, post 4-8, overnight Sun-Thu 8PM-4AM ET. Off-hours behaviour not stated.

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

### F2.105 [Q21] [S10] [S4] UNCONFIRMED

Inference, not sourced: with no first quotes a new market's book is empty, so a first-time trader's market order has nothing to hit (Polymarket's API shows a 0.5 placeholder for an empty untraded book) and the contract card shows no meaningful Yes/No price or implied probability. The user need is an explicit 'no quotes yet' state and a limit-order path.

- Lens: user
- Source: [Polymarket order book](https://docs.polymarket.com/trading/orderbook): "When a token has never traded and its order book is empty, the API returns the "0.5" placeholder."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

### F7.02 [D3] [Q46] [Q51] [S2] [S25] [S4] CONFIRMED

The Solana faucet is for development, does not distribute mainnet SOL, is limited to 2 requests every 8 hours (GitHub sign-in raises the limit), checks GitHub accounts for fair use, and tells AI agents not to use it. The page does not itself say devnet tokens have no value. No geoblock text was seen.

- Lens: legal
- Source: [Solana Faucet](https://faucet.solana.com/): "designed for development purposes and does not distribute mainnet SOL; Maximum of 2 requests every 8 hours"
- Verification (2026-10-09): held: Opened faucet.solana.com. Says development purposes / no mainnet SOL, max 2 requests every 8 hours, GitHub sign-in raises limit, accounts validated, AI agents should not use it. No geoblock text, no statement on devnet token value, as the claim says.

### F7.03 [D3] [Q46] [Q51] [S2] [S25] [S4] CONFIRMED

Circle's testnet faucet limits to 20 USDC per address per blockchain every 2 hours, describes testnets as letting developers test without risking assets with real-world value, and says testnet tokens can be freely obtained from faucets. It does not say outright that testnet USDC has no value, and the page does not mention Solana devnet.

- Lens: legal
- Source: [Circle Faucet](https://faucet.circle.com/): "without risking assets with real-world value; 20 USDC on testnet per address, per blockchain, every 2 hours"
- Verification (2026-10-09): held: Opened faucet.circle.com (primary). Says testnets avoid risking assets with real-world value, 20 USDC per address per blockchain every 2 hours, testnet tokens freely obtained from faucets. No Solana devnet mention. Quote's wording is a stitched paraphrase but substance matches.

### F7.08 [Q46] [S4] CONFIRMED

CFTC Core Principle 5 (17 CFR 38.300) requires a DCM to adopt, for each contract as necessary and appropriate, position limits or position accountability for speculators, at a level not higher than any Commission-set limit. 17 CFR 38.301 requires compliance with parts 150 and 151 as applicable.

- Lens: legal
- Source: [17 CFR 38.300 - Core Principle 5](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-17?part=38&section=38.300): "To reduce the potential threat of market manipulation or congestion"
- Source: [17 CFR 38.301](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-17?part=38&section=38.301): "A designated contract market must meet the requirements of parts 150 and 151 of this chapter, as applicable."
- Verification (2026-10-09): held: Opened eCFR 38.300: Core Principle 5, position limits or accountability for speculators per contract as needed, not above Commission limit. 38.301 text exactly 'A designated contract market must meet the requirements of parts 150 and 151 of this chapter, as applicable.'

### F7.09 [Q46] [Q47] [Q49] [S4] [S16] [S28] [S22] CONFIRMED

The CFTC's March 2026 ANPRM on prediction markets (published 16 March 2026, RIN 3038-AF65) asks: Q2.e how position limits across similar event contracts should be aggregated and whether event contracts need different limits; Q2.b what dispute-resolution rules should apply to how an event contract is resolved; Q30-31 about manipulation; Q2.h about blockchain-based prediction markets. It proposes no rules. The CFTC also withdrew its 2024 event contracts proposal on 4 Feb 2026.

- Lens: legal
- Source: [CFTC ANPRM: Prediction Markets (2026-05105)](https://www.cftc.gov/LawRegulation/FederalRegister/proposedrules/2026-05105.html): "how position limits across similar event contracts should be aggregated"
- Source: [CFTC Seeks Public Comment on ANPRM Relating to Prediction Markets](https://www.cftc.gov/PressRoom/PressReleases/9194-26): "This begins the process of new rulemaking grounded in a rational and coherent interpretation of the Commodity Exchange Act."
- Source: [CFTC withdraws Event Contracts proposal](https://www.cftc.gov/PressRoom/PressReleases/9179-26): "does not intend to issue final rules with respect to the proposal"
- Verification (2026-10-09): held: Opened ANPRM 2026-05105: RIN 3038-AF65, published 16 March 2026, Q2.e aggregation quote present, Q2.b disputes over resolution, Q30-31 manipulation, Q2.h blockchain-based; no rules proposed. Release 9194-26 has the quoted sentence (release dated 12 March). Release 9179-26 is dated 4 Feb 2026 and withdraws the June 2024 Event Contracts proposal; actual wording is 'The CFTC does not intend to issue final rules with respect to the proposal'.

### F7.10 [Q46] [S4] CONFIRMED

Regulated position limits are enforced by aggregation per person: 17 CFR 150.4 requires aggregating positions in accounts a person controls or in which they hold 10% or more ownership, and treats persons acting under an agreement or understanding as one person. This presupposes identified accounts, which a permissionless no-KYC chain does not provide.

- Lens: legal
- Source: [17 CFR 150.4 - Aggregation of positions](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-17?part=150&section=150.4): "must be aggregated with the positions held and trading done by such person"
- Verification (2026-10-09): held: Opened eCFR 17 CFR 150.4. Aggregation for accounts controlled or with 10 percent or greater ownership; 'must be aggregated with the positions held and trading done by such person'; persons acting under express or implied agreement or understanding treated as one. The no-KYC-chain implication is inference.

### F7.11 [Q46] [S4] SECONDARY

Kalshi's rulebook (v1.15, Jan 2025, hosted on a Robinhood CDN) has a table of contents listing Rule 5.16 Position Accountability, Rule 5.17 Position Limits and Rule 4.5 Market Maker Position Accountability Levels. I could not read the operative text because the PDF was not parseable by my tools.

- Lens: legal
- Source: [KalshiEX LLC Rulebook (search result snippet)](https://cdn.robinhood.com/assets/robinhood/legal/KalshiEX_LLC_Rulebook.pdf): "RULE 5.16 POSITION ACCOUNTABILITY ... RULE 5.17 POSITION LIMITS"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.12 [Q46] [S4] UNCONFIRMED

The $25,000 per-member Kalshi figure appears in Fortune (2021, as a general maximum) and Benzinga/Investing.com (as applying to some markets only). Scope disagrees and the rulebook text was not read, so the figure and its scope are unconfirmed. A Kalshi help article says market makers may receive adjusted position limits.

- Lens: legal
- Source: [Fortune: Kalshi (search result)](https://fortune.com/2021/09/23/kalshi-bet-investors-lil-nas-x-climate-change): "the maximum amount an investor would be able to put into one of Kalshi's markets ... is $25,000"
- Source: [Kalshi: How to become a market maker (search result)](https://help.kalshi.com/en/articles/13823819-how-to-become-a-market-maker-on-kalshi): "market makers may receive reduced fees and certain adjusted position limits"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

## 2026-10-10 architecture open question 35: self-trade (main session, read-only)

### AR.06 [D30] [D42] [D45] [S4] [S30] CONFIRMED

Solana order books and Kalshi give three ways to handle an incoming order that would trade with a resting order from the same account.

- OpenBook v2's `SelfTradeBehavior` has `DecrementTake` ("Both the maker and taker sides of the matched orders are decremented ... no fees are applied", marked `#[default]`), `CancelProvide` ("Cancels the maker side of the trade, the taker side gets matched with other maker's orders") and `AbortTransaction` ([order_type.rs](https://github.com/openbook-dex/openbook-v2/blob/master/programs/openbook-v2/src/state/orderbook/order_type.rs)).
- Phoenix's order builders `new_limit_order_default`, `new_ioc_buy_with_slippage` and `new_ioc_sell_with_slippage` use `SelfTradeBehavior::CancelProvide`; its tests also reference `DecrementTake` and `Abort` ([order_packet.rs](https://github.com/Ellipsis-Labs/phoenix-v1/blob/master/src/state/order_schema/order_packet.rs)).
- Kalshi's `SelfTradePreventionType` is `taker_at_cross`, which cancels the incoming order and keeps earlier fills, or `maker`, which cancels the resting order and continues matching ([Kalshi SDK docs](https://docs.kalshi.com/python-sdk/models/SelfTradePreventionType); the behaviour text is from its margin REST spec).

Computed for the 10:16 AM book (asks: 65¢ × 10 from Dave, 66¢ × 5 from the bot), with Dave sending Buy Yes, Market, 5 at up to 66¢:

- Letting it trade: Dave pays 3.25 USDC to himself, receives no new Yes, and a trade at 65¢ prints.
- Cancelling the resting order: Dave's 10 Yes return to him and he buys 5 from the bot for 3.30 USDC.
- Aborting: nothing happens except the network fee.

With no fees (A1), a self-trade costs nothing. So offering 1 Yes at 99¢ and buying it back nets 0.00 USDC, prints a 99¢ last trade, and would show "99% (last trade)" wherever the spread exceeds 10¢ (D45).
