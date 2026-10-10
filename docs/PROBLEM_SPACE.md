# Problem space

This file says what Meridian is for, who judges it and how, how the money moves, what must never happen, and what is in and out of scope. It is the agreed starting point for the next two phases: `docs/USERS.md` (who uses it and how each flow goes, step by step) and `docs/ARCHITECTURE.md` (how it is built). It doesn't repeat the decisions: each one lives in [DECISIONS.md](DECISIONS.md), and this file cites them by number (D1 to D79, assumptions A1, A4, A5). The brief is the Meridian spec in `docs/spec/meridian_project.pdf`. The evidence behind the decisions is the stage 1 decision review (`docs/research/decision-review-2026-10-09-full.md` and its seven group reports), and the answers come from the question round of 2026-10-09.

**Running example, used everywhere:** "META ≥ $680 today?". Yes trades at $0.65 and No at $0.35. Alice buys 10 Yes for $6.50; Bob buys 10 No for $3.50.

## Problem

Meridian lets people bet, with play money on Solana's test network, on one kind of question: will one of seven big US stocks (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA) close at or above a given price today? Each question is a **market** with a **strike** (the $680) and two tokens. A **Yes** token pays $1.00 if the stock closes at or above the strike, a **No** token pays $1.00 if it closes below, and the loser pays $0 (D1). Traders buy and sell these tokens from each other on an **order book** (a list of offers to buy and sell) that lives on the blockchain. Every morning the system creates the day's markets; at the close it reads the price from **Pyth**, an **oracle** (a service that publishes outside prices onto the blockchain in a form a program can check), records the winner, and lets winners swap each token for $1.00. Nobody's money passes through the project's hands: it sits in each market's **vault**, an account that only the program controls (D3, D23).

Why it is worth building, in the spec's words: "max gain is known at entry, max loss is known at entry". Alice can lose at most her $6.50 and gain at most $3.50, and she knows both before she clicks.

### Functional requirements (brief)

From the spec, with the decisions that settle each one:

1. **Morning market creation.** Before the open, the bot reads each stock's previous close and creates up to 7 strikes per stock: the close ±3%, ±6% and ±9%, plus the close itself, each rounded to $10 (D6, D7, D48, D49, D52, D55, D56). That is at most 49 markets a day, and about 39 to 46 at October 2026 prices.
2. **Minting.** Anyone can lock $1.00 of USDC (a dollar token) and receive one Yes plus one No (D2, D24, D43).
3. **Trading on an on-chain order book**, built inside our own program, with four buttons: Buy Yes, Sell Yes, Buy No, Sell No (D5, D20, D21, D42, D45, D15).
4. **Settlement** after the close from a genuine Pyth price, with a freshness check and a confidence check (D8, D26, D28, D57, D58, D59).
5. **Redemption** of winning tokens for $1.00, at any time after settlement (D2, D66).
6. **Admin functions:** initialize config, add strike, an override with an enforced delay, and pause (D24, D27, D53, D63, D68).
7. **A website** with Landing, Markets, Trade, Portfolio and History pages, live prices and the order book from both the Yes and the No side (D10, D14, D36, D45, D78).
8. **An always-on automation service** in the same repo, running the daily jobs (D29, D41, D23).
9. **Proof for the grader:** deploy and lifecycle scripts for devnet, local tests of every invariant, a one-command README setup, `.env.example`, a risks and limitations note with no regulatory claims, and the reasoning behind every major choice (D17, D18, D30, D73, D74).

### Out of scope (brief)

Each item has a row in DECISIONS.md's "Cut, and what's next" table, so none of it reads as forgotten.

- **Real money and mainnet** (D3, the mainnet bonus cut row). Everything runs on Solana **devnet**, the public test network, with play money.
- **Identity checks (KYC), borrowing (margin) and holding users' money (custody)** (D3).
- **Fees** (A1).
- **A simulation mode on devnet.** Fake prices and a fake clock exist only on a local chain or in tests (D11).
- **Per-wallet position caps, a bonded dispute system, geoblocking and wallet screening** on devnet (D76, D77, D79).
- **An averaged closing price** until a production deployment (D61).

### Impact metrics (brief)

The spec's four metrics, and how each will be shown:

| Metric (spec) | How we show it |
|---|---|
| **Correctness:** 100% of settlements pay the correct side; the $1.00 invariant is never violated | On-chain checks and tests after every instruction (D64, D30); a next-day audit of every settlement against the official close (D26); a market is held rather than guessed when the price can't decide it (D59) |
| **Liveness:** markets created before the open and settled within 10 minutes of the close, every trading day | One counting rule written in the README before the first graded day: raw and adjusted figures, each late market listed with its cause (D60, D75) |
| **Operability:** the full lifecycle (create, mint, trade, settle, redeem) reproducible on testnet | `make dev` locally with no keys, `make devnet` on the real network, and the signatures of a recorded devnet run in the README (D73, D74) |
| **Documentation:** clear rationale for architecture and chain decisions, trade-offs explained | DECISIONS.md; the chain write-up (D18); the admin's powers listed next to "non-custodial" (D3) |

## How this is judged

- **Who reads it:** Peak6's blockchain engineers review the projects (Gauntlet Slack, #g4-peak6, 2026-03-10). Gauntlet's target date is Sunday 2026-10-11, midnight, with Peak6 on site on Tuesday 2026-10-13, and the repo must be public. The user's direction is to build the system properly rather than trim it for that date (D47).
- **What they value:** "Functionality is more important than good user experience"; a plain UI is fine, and "a nice dashboard that shows when things happened" beats polish (same source; D47).
- **What the spec checks:** its success criteria (the contract logic works, the $1.00 invariant holds, all four trade paths work, settlement via the oracle within 10 minutes, the frontend shows real-time prices, books, positions and outcomes, the position constraint holds, trade-offs are documented) and its test lists (unit, integration and frontend).
- **What graders will likely do:** read the README and the rationale, run the one command, and look at the devnet deployment, possibly in the evening or at a weekend when the stock market is shut (D73). Staff collected demo videos and deployed apps from the previous cohort (Gauntlet Slack, #peak6project, 2026-05-28), so both are probably expected, although the spec doesn't list them.
- **Unknown:** no grading rubric was found, nor any statement on how a lost devnet day counts (A2 stays an assumption until Peak6 answers; D75).

## Product principle

**Pay the right side exactly $1, never freeze anyone's money, and when the price can't say who won, wait rather than guess.**

In practice: the program enforces every money rule itself, so a bug or an outage in our backend can delay things but never misplace money (D23). Cancel, close pair and redeem can never be paused (D68). A market whose price is too close to call is held for the exchange's official close instead of settled on a coin flip (D59), which costs the 10-minute target on those days, a trade-off stated openly (D60). Play money is always labelled as play money (D33).

## Money model

All amounts below are play money: Circle's devnet USDC, which has no value (D32, D33). On screen, amounts read "6.50 USDC"; this file writes $ for readability.

**Minting and the vault.** One **pair** (1 Yes + 1 No) costs exactly $1.00, which goes into the market's vault. Exactly one of the two tokens will pay $1.00, so the pair is always worth exactly $1.00 and the vault always holds enough to pay it (D2, D64).

**One book, two views.** Each market has one order book, trading Yes against USDC. No prices are worked out from it (D5, D45). With the best Yes bid at $0.64 and the best ask at $0.66:

| Button | What happens underneath | 10 tokens cost or bring |
|---|---|---|
| Buy Yes | buy Yes at the ask | pay $6.60 |
| Sell Yes | sell Yes at the bid | receive $6.40 |
| Buy No | mint 10 pairs ($10.00), sell the 10 Yes at the bid ($6.40) | pay $3.60 |
| Sell No | buy 10 Yes at the ask ($6.60), close the 10 pairs ($10.00) | receive $3.40 |

The market cards show the midpoint, Yes $0.65 and No $0.35, which also reads as a 65% chance (D45). A trade happens at the price of the order that was already waiting, so a buyer whose limit is $0.70 still pays $0.65 if that is the waiting offer (D42). Every order carries a worst acceptable price that the program enforces (D15).

**Who pays whom, and when.** Traders pay each other through the book; the vault holds $1.00 per pair; winners are paid from the vault. Nobody else takes a cut: there are no fees (A1). With Alice's $6.50 and Bob's $3.50 in a $10.00 vault:

| META closes at | Winner | Alice | Bob |
|---|---|---|---|
| $684.00 | Yes | gets $10.00, +$3.50 | gets $0, −$3.50 |
| exactly $680.00 | Yes (at or above, D1) | gets $10.00, +$3.50 | gets $0, −$3.50 |
| $676.00 | No | gets $0, −$6.50 | gets $10.00, +$6.50 |

**The payoff line** shows total paid, payout, profit and the most you can lose, for Yes and for No: "You pay 6.50 USDC for 10 Yes. If META closes at or above $680 at 4:00 PM ET (Pyth price), you get 10.00, a profit of 3.50. Otherwise you lose 6.50." (D10, D31).

**Rounding and units.** Money is whole numbers end to end, so nothing is ever rounded: USDC has 6 decimals, so 10 Yes at 65¢ is 6,500,000 units; Yes and No tokens have 0 decimals; prices are whole cents from 1¢ to 99¢ (A4). Pyth's price is compared with the strike by scaling the strike up to Pyth's format ($680 becomes 68,000,000 at exponent −5), never by rounding Pyth's price (A4). The one place rounding happens is the strike ladder: nearest $10, with an exact tie rounded away from the previous close (D52).

**Costs outside the product.** Every transaction pays a SOL fee of 5,000 lamports per signature (0.000005 SOL), and every new account needs a refundable SOL deposit. Each user pays for their own token accounts (about 0.002 SOL each) and fees. The bot pays for the markets: about 0.008 SOL per market that stays locked for good, plus each order book's deposit, which comes back when the book is closed after settlement (D50). All of it is devnet SOL from the faucet.

**The market maker's money.** The bot quotes 5 contracts each side. Quoting every market locks at most $388 to $458 of USDC, collected by hand from Circle's faucet at 20 every 2 hours, and the money comes back at each day's redeem apart from trading gains and losses (D32, D41).

## Screens or surfaces

The details belong to USERS.md; the list is settled:

- **Landing, Markets, Trade, Portfolio, History** (D10), with live stock prices showing their source and age (D14, D78), the play-money banner (D33), and loading, empty and error states built in priority order (D36). History is an activity log of mints, trades, cancels, refunds and redemptions (D36, D62).
- **Each market's evidence:** the price, band, publish time and transaction used to settle it, and a "report a problem" button while a result is held or proposed (D77).
- **A market-maker view and an admin view**, built last (D25, D36). Sign-in is the wallet only (D34).
- **Operator alerts and an outside watchdog** for the daily jobs, rather than a screen (D70, S31).
- **The "what happened when" dashboard** that the reviewers value (D47) draws on the on-chain events and the backend's records (D62, D70); USERS.md decides its shape.

## Demo data

The deployed app uses real data only: real MAG7 prices from Pyth (for now, the Pyth updates a fellow, Zach Gardner, posts to devnet), markets the bot creates each morning, and the bot's quotes so no book is empty (D32, D41; the Q16 answer in DECISIONS.md). Test traders bring Circle devnet USDC from the faucet. Off-hours demos use the local tier, where prices and the clock are fake and say so (D11, D73, D74). The README carries the signatures of a recorded real devnet run, archived off the chain because a devnet reset would erase them (D73).

## Metrics

Recorded every trading day, by the backend and by on-chain events (D26, D60, D70, D75):

- each settlement's time against the close: on time through the oracle, or settled by another path, with the cause;
- markets created before 9:00, and any created late;
- held markets, and Pyth's band width at the close;
- the next-day audit: any settlement on the other side of the official close;
- devnet heartbeat: block height, restarts and resets, from two RPC providers;
- the bot's SOL and USDC balances, and every job's check-in.

## Integrity rules

What must never happen, in plain words, with the decision that enforces each:

1. **A vault never holds less than it owes.** It holds $1.00 for every pair outstanding, and after settlement $1.00 for every unredeemed winning token (D64).
2. **Yes and No together always pay exactly $1.00** (D2).
3. **Only the program creates tokens**, and the program destroys them only in Redeem, including the pair close (D2, D38, D67).
4. **A settled result never changes.** This holds only while the upgrade key is safe, and the docs say who holds it (D2, D69).
5. **Settlement trusts only a genuine Pyth price** for the right stock, published at or before the market's close, inside a narrow window (D28, D57).
6. **Nobody guesses a result.** If Pyth's band contains the strike, the market waits for the official close (D59, D65).
7. **Nobody can freeze people's exits.** Cancel, close pair and redeem always work, and no held market waits more than a week (D68).
8. **No trading outside the market's hours:** no orders before 9:30, none after the close, and resting orders are refunded at the close (D37, D43, D46).
9. **A strike never changes** once its market exists (D53).
10. **Admin power is checked on-chain by signature**, listed next to "non-custodial", and slowed by waiting periods and a sanity bound (D3, D34, D63).
11. **Devnet stays devnet:** play money is labelled, and the devnet build refuses the real USDC address (D32, D33).
12. **Secrets never reach the repo**, and the admin and upgrade keys never sit on the server (D17).

## Quality areas

- **Security.** Every admin and operator instruction checks the stored key and its signature (D34); permissions per function (D24); genuine-price checks (D28); keys kept apart and off the server (D17, D69, A5); swapped-account and duplicate-account tests (D30).
- **Performance.** Devnet takes about 4 transactions a second per address, so all jobs share one paced send queue and the bot batches a stock's quotes into one transaction (D41, D56). Finality on devnet is measured, not assumed (D71). Live data reaches browsers over one stream per tab (D16).
- **Accessibility.** Every screen has its loading, empty and error states (D36); keyboard use and readable states are part of the frontend skill and USERS.md.
- **Observability.** Structured job logs, on-chain events, a halt detector, two RPC providers and an outside watchdog for the daily jobs (D19, D70, D75).
- **Auditability.** Public on-chain events for every action, the evidence behind each settlement on its market page, the next-day audit, and an activity log per wallet (D26, D36, D62, D70, D77).
- **Testability.** Local tests with a fake clock and fake prices, a devnet run for the real price path, and every test seen failing before it passes (D11, D30, D74).
- **Fail-safes that hold even if our code has a bug.** The money rules live in the program, not the backend (D23); the worst-price cap is checked on-chain (D15); exits can't be paused and a held market has a one-week backstop (D68); jobs are safe to run twice and market addresses are fixed, so a retry can't create a duplicate (D23, D56); the override can't set a price far from the reference without a longer wait (D63).

## Known limitations

These go in the risks and limitations note as facts, with no regulatory or compliance claims (D3).

- **Devnet outages and resets can't be prevented.** In 2026 devnet was halted or restarted about once a quarter, mostly on purpose by Solana's own teams (D75). The system stays correct through a halt and catches up afterwards; a reset wipes every on-chain position (D19).
- **Some markets settle late by design.** A market whose band contains its strike waits for the official close: illustratively about 1 trading day in 17, mostly on the 7th strike, to be measured (D26, D48, D59).
- **"The close" is Pyth's last regular-session price**, which can differ from the official closing auction by cents; the next-day audit compares them, and a wrong automatic settlement can't be reversed (D57, D77).
- **The devnet build settles on a single closing price**, which last-second trading could in principle push (D61).
- **The upgrade key can replace the program**, including the rule that keeps results final (D69).
- **The price source is borrowed for now.** Until the project has its own Pyth access, prices come from a fellow's devnet posts; which stocks he posts, on what schedule and under what licence are still to be confirmed, and Pyth's terms for showing its stock prices publicly were not found (D28, D78).
- **No per-wallet limits, disputes, geoblocking or wallet screening** on devnet (D76, D77, D79).
- **Holders can burn their own tokens** outside our program until Architecture decides D67; it only lowers what the vault owes.
- **Our own order book's build effort and account size are unmeasured** until the spike (D21).

### Open before Architecture

- The price-source check with Zach: which of the seven stocks, posted through Pyth's own receiver program or not, and the schedule around 8:00 AM and 4:00 PM ET; plus posting the 4:00 PM price an hour later (D19, D28, D57).
- The Alpenglow check on devnet before any finality claim (D71).
- The order-book spike: account size and compute per match (D21).
- Whether our program can hold Token-2022's burn authority (D67).
