# Decision review 2026-10-09-full, group 2: judge's report

Group 2, "Trading and liquidity" (stories S4 to S11, S26 and S27). Items: D5, D9, D13, D14, D15, D16, D20, D21, D25, A1, Q4, Q5, Q6, Q11, Q17, Q18, Q21, Q28, Q29, Q31, Q38, Q41.

Evidence: `docs/research/reports/2026-10-09-full-G2.md` (findings F2.01 to F2.105) and the input file `docs/research/inputs/G2-trading-and-liquidity.md`. Proposals and your directions so far: `docs/planning/2026-10-08-phase-1-plan-session-2.md`. The frozen stories S26 and S27 (`docs/stories/`) are cited where they already assume an answer.

How to read the labels: a **CONFIRMED** finding means the primary source was opened and checked again. A **SECONDARY** finding comes from a second-hand source, such as a news report or a search snippet. Only these two kinds carry weight. **UNCONFIRMED** findings (F2.02, F2.10, F2.15, F2.16, F2.20, F2.21, F2.22, F2.37, F2.40, F2.53, F2.57, F2.77, F2.78, F2.90, F2.91, F2.93, F2.100, F2.102, F2.104, F2.105) are named where they matter, and no verdict rests on them. Where this report mentions the plan's own earlier research, that research was not checked again in this review. Where I did arithmetic myself, I say "computed".

## Summary

This group covers how a trade is built on the order book, at what price it happens, how the trader is protected while prices move, what the screen shows, how live data reaches browsers, and who supplies the first prices each day. Most of the plan survives the evidence, and no item is contested. One Yes book per strike with four trade paths (D5) holds: a Solana transaction is all-or-nothing (F2.17), and Kalshi documents the same rule, that a Yes bid at X is a No ask at $1 − X (F2.19). However, Sell No and the cancelling of a Buy No limit order both need a way to turn one Yes plus one No back into $1 before settlement (Q5), and the spec's function list lacks one (F2.38). Building your own order book (D21) holds against Manifest, which can't be paused or stopped at a set clock time (F2.08, F2.09). The report's lead answer prefers Phoenix, which does have those controls and became MIT-licensed in May 2026 (F2.11, F2.12), so D21's write-up should reject Phoenix on its real grounds (maintenance mode, unverified rent, seats) rather than "unmaintained" alone. The price cap (D15), the transaction status screens (D13), the live-data rules (D14) and the single relay over SSE (D16, Q18) hold with caveats. Partial fills must never leave a trader holding both Yes and No. A quiet book is not a stale book. The relay needs an always-on host and becomes a single point of failure. The plan's "980 subscriptions" argument for the relay overstates the problem, because public devnet counts its limits per internet address (F2.58). Three of Claude's still-unconfirmed proposals line up with the evidence. Trades execute at the resting order's price (Q28, F2.09). A No buyer sees $1 − Yes bid and a No seller sees $1 − Yes ask (Q38, F2.19). Trading stops at the close, and resting orders are cancelled and refunded (Q4, F2.70). Several gaps remain open. No exchange rulebook was found for the execution price. No source gives the Solana clock's error in seconds. Phoenix's real cost per market is unknown, as is whether devnet's limits count WebSocket subscriptions and whether a Pyth key for US stocks can be had for free.

## Terms used throughout

- **Order book**: the list of open offers to buy and sell one market's Yes token for USDC (a token worth one US dollar). Meridian has one book per strike. A **CLOB** (central limit order book) is an order book with a matching rule: the best price goes first, and at equal prices the earliest order goes first.
- **Bid, ask, spread**: a bid is an offer to buy and an ask is an offer to sell. The best bid is the highest bid, the best ask is the lowest ask, and the spread is the gap between them. In the examples below, the Yes best bid is $0.64 and the best ask $0.66, so the middle price is the running example's $0.65.
- **Limit order, market order**: a limit order names a price and waits on the book, and while it waits it is a **resting order**. A market order trades at once against whatever is on the book.
- **Maker, taker**: the resting order is the maker. The incoming order that trades against it is the taker.
- **Fill, partial fill**: a fill is a completed trade. A partial fill trades only part of an order.
- **Mint a pair**: pay $1.00 into the market's **vault** (an account only the program controls) and receive 1 Yes and 1 No. **Close a pair**: hand back 1 Yes and 1 No before settlement and get the $1.00 back (Q5).
- **Settle, redeem**: settling records the winner after 4:00 PM from the oracle's price. The **oracle** is the service that brings the stock price on-chain, here Pyth. Redeeming swaps tokens for their payout: $1.00 per winning token, $0 per losing one.
- **Transaction, signature**: on Solana a transaction bundles one or more instructions. The wallet signs it once, and either all of it happens or none of it does (F2.17).
- **Devnet**: Solana's public test network, where money has no value. An **RPC node** is a server that answers questions about the chain and passes transactions on to it.
- **Running example** (from the plan): "META ≥ $680 today?", Yes at $0.65, No at $0.35. Alice buys Yes, Bob buys No.

## Verdicts

The source column is copied from the plan: "spec" means the spec says it, "owner" means you asked for it or set the direction, and "Claude proposal" means Claude suggested it and you have not confirmed it yet. Open questions with no direction from you get "Your call". Their row says how the plan's proposal fares against the evidence.

| Item | Source (from the plan) | Verdict | Why |
|---|---|---|---|
| D5: one order book per strike, Yes against USDC; No is the mirror; four paths: Buy Yes, Buy No (mint, then sell Yes), Sell Yes, Sell No (buy Yes, then close the pair) | spec | Holds with a caveat | A Solana transaction is all-or-nothing and at most 1,232 bytes, so each path can be one signed transaction (F2.17), and Kalshi runs the same one-book rule: a Yes bid at X is a No ask at $1 − X, and Buy No and Sell Yes hit the same side (F2.19, F2.95). Caveats: Sell No needs a pair close before settlement that the spec's functions don't include (Q5; F2.36, F2.38), and the Buy No and Sell No book legs must never partly fill in a way that strands a Yes (see D15). Because you build the book yourself (D21), mint-and-sell can be one instruction in your own program, which avoids the cross-program size problem the report raises. The "no separate token approval on Solana" point rests on F2.10 and F2.21, both UNCONFIRMED, so nothing here relies on it. |
| D9: the UI blocks holding Yes and No on the same strike, enforced in the frontend (D24: a script could hold both, which harms no one) | spec | Holds with a caveat | The spec asks for exactly this ("The frontend should enforce this"), and venues treat holding both as harmless: Kalshi nets the two automatically and Polymarket allows both, then merges them (F2.23). A check inside the program would add little, because tokens can be moved to a second wallet (reasoning; F2.22 is UNCONFIRMED). Caveats: the frontend check must count Yes locked in the trader's own resting orders, which a wallet balance doesn't show (F2.39), and the app must handle the "both" states it creates itself (a cancelled Buy No limit order, a market maker's filled bid), for which the pair close is the escape route (Q5). |
| D13: a transaction is never half-done; after reconnecting, the UI shows what actually happened | Claude proposal | Holds with a caveat | Each transaction is all-or-nothing (F2.17). A sent transaction can still be dropped, or land up to about 60 to 90 seconds later when its expiry passes (F2.05, F2.24, F2.25), and "not found yet" must not be shown as "failed" before then (F2.26). Wallet errors tell "you closed the popup" apart from "sending failed" (F2.27). Caveats: "never half-done" holds per transaction only, so a flow spread over several transactions (Q39's batched redeem, for example) needs its own "partly done" screen; and the UI needs a "sent, may still land" state and must never re-send before the old transaction has expired (F2.24). |
| D14: the frontend always shows live prices; a price that isn't live is marked with its age; "closed" looks different from "disconnected"; the screen re-reads state after a reconnect | owner + spec | Holds with a caveat | Venues keep these states apart: Kalshi has separate "exchange active" and "trading active" fields and distinct market states (F2.69, F2.70), and Pyth says a stock's price outside market hours is "not clear" (F2.84). Caveats: a quiet book is not a stale one, because updates arrive only on change (F2.68), so staleness must come from a heartbeat; the list needs a "Pre-open, trading at 9:30" state (Q41); "Market closed · closed at $X" must name the regular-session price, since Pyth also publishes after-hours and overnight prices (F2.83). A live US stock price also depends on a paid or trial Pyth key (F2.52, Q17) and on display rights (Q50). |
| D15: every buy or sell carries a worst acceptable price; if the book has moved past it, the order fills partly or not at all, and the UI says so | Claude proposal | Holds with a caveat | This is what venues do: Phoenix's immediate orders carry minimum-fill amounts (F2.13), Polymarket's market orders carry a price limit and run as fill-and-kill or fill-or-kill (F2.29), Jupiter swaps carry a minimum output (F2.30), and Kalshi reports filled count, remaining count and average price (F2.31). Caveat: "fills partly" must not apply as written to the Buy No and Sell No book legs, because a partial sale of the minted Yes leaves the trader holding both tokens (D9). The program should mint only as many pairs as it sells, or fill all or nothing. No source gives a standard default cap, so the default width is a judgement call. |
| D16: browsers get all live data, including the order books, over one SSE stream from our service; each stream starts with a full snapshot, then changes | owner | Holds with a caveat | SSE (Server-Sent Events, a one-way stream from server to browser) reconnects by itself (F2.63), Vercel recommends it for one-way data (F2.65), and the browser only needs to receive, since orders go wallet to chain; snapshot-then-changes is how Kalshi streams books (F2.68). Caveats: it needs an always-on host, because serverless functions cut streams at 300 to 800 s (F2.65, F2.66), which D23 already plans; it must be served over HTTP/2, or a user with seven tabs hits the browser's six-connection limit (F2.63); every message needs a sequence number so a gap is caught (F2.68). The relay is a single point of failure, so keep a direct-read fallback. |
| D20: the order book lives on-chain, not hybrid | spec + owner | Holds | The spec asks for an on-chain order book in several places (F2.04). The main alternative, Polymarket's design, has an operator match orders off-chain (F2.01), which is the trusted middleman the plan rules out, and Solana's 0.4-second slots make on-chain matching workable (F2.05). The cost, already in the plan, is that every order and cancel is a transaction, which limits how fast a quoting bot can refresh on public devnet (F2.58, Q21). The plan's "ghost fills" figure was not checked again here. |
| D21: build our own minimal order book inside the program | owner + spec | Holds with a caveat | The spec offers this route (F2.04), and the evidence backs the case against Manifest: no pause, close or authority instruction, and expiry counted in slots rather than clock time (F2.08, F2.09). The report's lead answer prefers Phoenix, which has close, pause, force-cancel and clock-time expiry (F2.12, F2.13) and was relicensed to MIT in May 2026, though it is now labelled "Legacy" and its SDK last changed for real in August 2024 (F2.11). So D21's write-up should reject Phoenix on its real grounds (maintenance mode, a rent per market that may be 3+ SOL but is unverified, F2.06; seats for limit orders, F2.14) and list it as a fallback beside Manifest and OpenBook. No finding measures how much work your own book will take, and that is D21's main risk. |
| D25: two user paths; traders see four buttons and never see minting; market makers mint, post Yes limit orders and get a dashboard (exposure, fills, P&L) | spec | Holds with a caveat | The spec has both stories (F2.103), Kalshi shows traders Yes and No as one matching space (F2.95), and Kalshi's position record gives a ready field list for the dashboard: position, exposure, realized P&L, fees paid, volume (F2.94). Real market makers work through scripts and APIs (F2.96; F2.91 is UNCONFIRMED), so the maker path can be a thin page plus a script. Caveat: the plan says a maker's "buy Yes at 64¢" quote "closes for $1" with the maker's No once it fills, but fills happen when someone else trades, so either the program closes the pair during the fill or the maker holds both until they close it (Q5), and no item designs this yet. |
| A1: no protocol fees in version 1 | Claude proposal | Holds | The spec allows fees only in a separate account (F2.38), and comparable venues charge takers only, if at all: Polymarket charges only takers (F2.32), Kalshi charges by formula (F2.33, SECONDARY), Manifest charges nothing (F2.34). On devnet a fee would add rounding, a fee path inside Buy No and Sell No, and more P&L cases, with no benefit. Keep the separate-account rule in the design so fees can be added later without touching the vault. |
| Q4: does trading stop at 4:00, and what happens to resting orders (proposed: stop, cancel and refund; maybe a 3:59 buffer) | Claude proposal | Your call | Open question (see the briefing). The evidence favours a hard stop with cancel and refund: Kalshi rejects orders after close and cancels resting ones (F2.70), and an order left open after the close can be picked off (computed). The frozen story S26 already assumes this. The buffer can't be sized from evidence: no source gives the chain clock's error in seconds (F2.77, F2.78, both UNCONFIRMED). |
| Q5: close a Yes+No pair for $1 before settlement (proposed: Redeem also accepts a matched pair at any time) | spec + Claude proposal | Your call | Open question. The proposal matches the standard design: Gnosis's merge works before resolution while its redeem waits for a result (F2.36). Sell No and the cancel in story S27 can't work as written without it, and the spec's own Sell No wording allows "the system handles the close automatically" (F2.38). The cost is rewording the spec's vault rule (Q45). |
| Q6: show a Buy No limit order as a pending order, not a position | Claude proposal | Your call | Open question. Kalshi keeps resting orders apart from positions (F2.39), and in a book where resting orders lock their tokens the wallet shows only the No (F2.39, partly inferred), which fits "pending". The frozen story S27 already says "pending, not a position". Partial fills and cancelling both need the pair close (Q5). |
| Q11: Yes prices out of order across one stock's strikes: prevent or flag? | owner (raised the question; no proposal) | Your call | Open question. Venues leave these gaps to traders (F2.89), and nothing links separate books. The pricing theory is SECONDARY (F2.88) and the derivation of the risk-free trade is UNCONFIRMED (F2.90), though its arithmetic checks out (computed in the briefing). |
| Q17: live stock price in the browser when the oracle's stream needs a secret key (proposed: our service holds the key; your D16 direction already routes the oracle through it) | Claude proposal + owner (via D16) | Holds with a caveat | Every Hermes call now needs a Pyth key (F2.51) and anything in the website's code is public (F2.54), so a server-side relay is the only safe way to use Hermes, and Polymarket does the same for its stock reference prices (F2.55). Caveats: US stocks appear only on Pyth's Pro plan, from $2,500 a month (F2.52); whether a free trial exists is disputed (F2.53, UNCONFIRMED); whether one key may serve many viewers ("display" versus "redistribution") is unknown. |
| Q18: each browser subscribes directly, or one relay serves all browsers | owner (direction B, D16) | Holds with a caveat | The relay is needed for the oracle key anyway (F2.51, F2.54). A paid RPC provider would otherwise have its key in the website and share five connections among all viewers (F2.60), and public devnet warns it may block high-traffic sites (F2.59). Caveat: the plan's headline number ("980 subscriptions on the public node") overstates the problem, because devnet counts its limits per internet address (F2.58), so viewers on different networks don't share one allowance; only a group behind one address does. Keep a direct-read fallback for when the relay is down. |
| Q21: who posts the first quotes each day (bot or manual quoting) | Claude proposal | Your call | Open question. Without a quote a new book is empty and nobody can trade (the plan's own point; F2.105 is UNCONFIRMED). Faucet limits (F2.98) make your own test-USDC mint (Q19) effectively required for a bot, and devnet's rate limits cap how fast it can refresh (F2.58). |
| Q28: a trade executes at the resting order's price | Claude proposal | Your call | The one primary source supports the proposal: Manifest's matching code takes the price from the resting order (F2.09). The Polymarket half (F2.20, F2.40) is UNCONFIRMED and no exchange rulebook was found, so the evidence is thin but points one way. |
| Q29: minting closes at the market's close, with trading; pause stops both | Claude proposal | Your call | The spec is silent (F2.103). The proposal is the safe choice: Kalshi stops orders at the close (F2.70), and minting on its own can't hurt anyone, since it is $1 in for a pair worth $1 (F2.102, an UNCONFIRMED derivation whose arithmetic checks out). Closing minting before trading would break Buy No near the close. |
| Q31: a holder of No clicks Buy Yes: block and guide, or one combined action | Claude proposal | Your call | Open question. The spec says to prompt the user to sell No first; Kalshi says buying Yes and selling No are the same thing (F2.41) and nets them automatically (F2.23). A combined action needs the pair close (Q5) and fits in one transaction (F2.17). No source on how apps flip a position in one click was found. |
| Q38: show "Buy No 36¢ / Sell No 34¢"; implied probability uses the midpoint (or last trade, stated) | Claude proposal (spec correction) | Your call | The evidence backs the correction. Kalshi documents that a Yes bid at X is a No ask at $1 − X (F2.19), so a No buyer pays $1 − Yes bid, and the spec's "$1 − Yes ask" is what a No seller receives. Polymarket shows the midpoint when the spread is 10¢ or less and the last trade otherwise (F2.42). |
| Q41: minting from 9:00; orders accepted only from 9:30 | Claude proposal | Your call | The proposal matches Kalshi's "initialized, not yet open for trading" state (F2.70) and avoids an opening auction, which is how Nasdaq handles orders entered before the open (F2.81). The cost is an empty book at 9:30 until the market maker posts. Phoenix's post-only status (F2.74) shows the alternative of letting quotes rest early. |

## Briefings

### Q4. Does trading stop at 4:00 PM ET, and what happens to orders still on the book?

**1. The terms.**
- A **resting order** is a limit order waiting on the book. In your own book (D21) a resting order **locks** what it offers: a bid locks its USDC, an ask locks its Yes tokens.
- **Cancel and refund**: the order is removed and whatever it locked goes back to its owner.
- The **chain clock** is the time a Solana program reads. Solana's own docs call it only "the approximate real world time of the current slot" (F2.77). A **slot** is one turn of block production, about 0.4 seconds (F2.05).
- A **buffer** would stop trading slightly before 4:00:00, for example at 3:59:00 by the chain clock, to allow for clock error.

**2. Worked example.** At 3:58 PM two orders rest on "META ≥ $680 today?". Carol bids for 10 Yes at $0.60, which locks $6.00. Dave asks $0.66 for 10 Yes, which locks his 10 Yes. META closes at 4:00:00, and settlement is due at about 4:05.
- **If trading stays open and META closed at $684** (Yes wins): anyone who saw the close buys Dave's 10 Yes for $6.60 and redeems them for $10.00. That buyer gains $3.40 that Dave would otherwise have kept. (Computed.)
- **If trading stays open and META closed at $676** (No wins): anyone mints 10 pairs for $10.00, sells the 10 Yes into Carol's bid for $6.00, and redeems the 10 No for $10.00, a $6.00 gain. Carol has paid $6.00 for worthless tokens. (Computed.)
- **With a hard stop plus refund:** at 4:00 both orders are cancelled. Carol gets her $6.00 back. Dave gets his 10 Yes back and, if Yes won, redeems them for $10.00.

**3. The options and their evidence.**
- **(A) Hard stop, then cancel and refund.** Kalshi accepts no new orders after a market's close time. Resting orders "are cancelled shortly after close", users are told through their update channel, and after that even cancel requests are refused (F2.70). Phoenix has a Closed status in which the market's authority can force-cancel every order (F2.12). In your own book, the program checks the market's stored close time on every new order, and a close sweep (D29) cancels the rest. One detail is still open: where the refund lands. Sending tokens back to every wallet means listing each trader's accounts in the sweep, so a big sweep may need several transactions. Crediting a balance inside the book, which the trader then withdraws, is lighter. (Reasoning. For Phoenix the report's gap list notes that withdrawing is a separate step.)
- **(B) An expiry time on each order.** Phoenix orders can carry a clock-time expiry (F2.13, F2.75), while Manifest orders carry only a slot number (F2.09, F2.76). In your own book this adds nothing, because the market's close time does the job, and an expired order's funds still have to go back.
- **(C) Let orders rest until their owners cancel them.** Polymarket's docs describe cancelling at resolution and say nothing about the close (F2.73). Carol and Dave stay exposed, as in the example.
- **(D) A closing auction.** NYSE folds resting orders into an auction at the close (F2.80, SECONDARY). This is far beyond a minimal book.
- **The buffer.** The plan suggests stopping at 3:59:00 chain time, based on Pyth's advice to pause activity from 3:59 to 4:01 (plan research). This report found no number for the chain clock's error, and Solana's own documents disagree on whether the clock is a stake-weighted mean or median (F2.77, F2.78, both UNCONFIRMED). The buffer's size stays a guess until devnet's clock is measured against real time.

**4. What each answer commits you to.**
- **(A):** a close-time check in Place Order, a close sweep job, a refund path chosen in Architecture, a "cancelled at close, refunded" notice, and a countdown that counts to the cutoff (Q52). The frozen story S26 already describes this. Tests: an order after the cutoff is rejected, and the sweep refunds every order in full.
- **(B):** in your own book, nothing beyond (A). With an outside book it would be the main tool.
- **(C):** no sweep to build, but S26 would need a logged change, and stale orders can be picked off.
- **(D):** an auction engine and a second matching mode.
- **A buffer:** a documented departure from the spec's "4:00" (S26's title says 4:00 too) and a one-off measurement of devnet's clock.

**Recommendation (Claude's; yours to accept or reject).** Choose (A), with the close time enforced inside the program. Measure the chain clock against real time before you choose a buffer, and settle the refund destination in Architecture.

### Q5. Can a Yes and a No be turned back into $1 before settlement?

**1. The terms.**
- **Minting a pair** puts $1.00 into the vault and gives 1 Yes and 1 No. **Redeem** comes after settlement: a winning token pays $1.00 and a losing one $0.
- **Closing a pair** (also called "merge" or "pair burn") hands back 1 Yes and 1 No before settlement and returns $1.00 from the vault. Exactly one of the two will pay $1.00 whatever happens, so the pair is always worth exactly $1, and closing it is always fair.

**2. Worked example.** Bob bought 10 No at $0.35, paying $3.50. By noon Yes trades at bid $0.79 and ask $0.80, so his No is worth about $0.20 each. He clicks Sell No.
- Step 1 buys 10 Yes at the ask for $8.00. Bob now holds 10 Yes and 10 No.
- **With a pair close:** he burns the 10 pairs and receives $10.00. Selling his No has netted him $10.00 − $8.00 = $2.00, so he is down $1.50 on the trade ($3.50 paid, $2.00 back), and he has the money at noon. (Computed.)
- **Without one:** he holds 10 Yes and 10 No until about 4:05, then redeems both sides. One side pays $10.00 and the other $0. It is the same money, but locked up for four hours, and his screen shows the "both sides" state the position rule forbids.
- **The vault:** say 100 pairs were minted on this market, so the vault held $100. After Bob's close it holds $90 for the 90 pairs still outstanding. That keeps "$1 per outstanding pair", but it breaks the spec's literal "$1.00 × total pairs minted (exact)", which would still say $100. That is why the plan's Q45 rewords the rule.

**3. The options and their evidence.**
- **(A) Allow a pair close before settlement.** In Gnosis's Conditional Tokens, the token design Polymarket builds on, merge never checks for a result, so it works before or after resolution, while redeem waits for a reported result (F2.36). Polymarket describes merge as "Every 1 YES token and 1 NO token returns 1 pUSD" and tells market makers to merge leftover pairs (F2.37, UNCONFIRMED: the page doesn't say whether this works before resolution). To respect the spec's "Tokens can only be destroyed via the redeem function" (F2.38), it can be a mode of Redeem, as the plan proposes. A risk to watch: a grader who reads that sentence strictly, or a test of "vault = $1 × pairs minted" run after a close.
- **(B) No early close.** Sell No leaves both tokens in place until settlement. The cancel in story S27 ("returns $1 per pair") can't work, and market makers' capital stays locked.
- **(C) "The system handles the close automatically"** (the spec's own Sell No wording, F2.38). The close happens inside the Sell No transaction. This is (A) plus putting both steps in one transaction, not a separate mechanism. Kalshi gets the same effect by netting Yes and No inside one market (F2.23).

**4. What each answer commits you to.**
- **(A):** one more instruction, or a Redeem mode; the vault rule rewritten as "per outstanding pair" (Q45); tests that the vault and the counter match after every close. It makes Sell No, the S27 cancel, a one-click flip (Q31) and the market maker's exit possible.
- **(B):** rewrite or drop the Sell No story (S7) and S27, and accept that capital is locked until settlement.
- **(C):** (A)'s code, plus Sell No built as one transaction, which fits (F2.17).

**Recommendation (Claude's; yours to accept or reject).** Choose (A), built as a mode of Redeem, and use it automatically inside Sell No and the Buy No cancel, which is (C).

### Q6. How should a Buy No limit order look while it waits?

**1. The terms.**
- A **Buy No limit order** mints pairs and offers the Yes for sale at a price you choose, so the No ends up costing $1 minus that price. It waits on the book until someone buys the Yes.
- **Locked (escrowed)** tokens are held by the program while an order rests.
- A **position** is what you own and are exposed to. A **pending order** is something you have asked for that hasn't happened yet.

**2. Worked example.** Bob wants No, but at no more than $0.33 each. Today a Buy No market order would cost $0.36, because the Yes bid is $0.64. His limit order mints 10 pairs for $10.00 and offers the 10 Yes at $0.67. His wallet shows 10 No, and the 10 Yes are locked in the book.
- **Full fill:** Alice buys all 10 Yes at $0.67 and Bob receives $6.70. His 10 No cost $3.30 net, $0.33 each.
- **Partial fill, then cancel:** only 4 Yes sell, for $2.68. When Bob cancels, the 6 unsold Yes come back, so he holds 6 Yes and 10 No. He closes 6 pairs for $6.00 (Q5). He ends with 4 No that cost $10.00 − $2.68 − $6.00 = $1.32, still $0.33 each. (Computed.)
- **Nothing fills by 4:00:** the close sweep (Q4) returns the 10 Yes, and the 10 pairs redeem for $10.00, so Bob gets his money back.

**3. The options and their evidence.**
- **(1) A pending order, kept apart from positions:** "Buying 10 No: selling 10 Yes at $0.67. If all fill, you hold 10 No at $0.33." Kalshi keeps resting orders apart from positions and won't close a position while its resting order is still open (F2.39).
- **(2) The No shown as a position with a "Yes sale pending" badge,** and the filled part shown as a normal No. This handles partial fills naturally. Polymarket cancels only the unfilled remainder of an order (F2.29, F2.39), so filled and pending parts can sit side by side.
- **(3) Both Yes and No shown honestly, tagged "transient".** It is accurate, but it contradicts the spec's "should not be a persistent user position from the trading UI".
- **What the wallet sees.** In a book where resting orders lock their tokens, the wallet shows only the No (F2.39, partly inferred; D21 plans the same locking). A position check that reads only the wallet (D9) won't see a "both" state while the order rests.

**4. What each answer commits you to.**
- **(1):** an order list with the "if filled" sentence, filled parts moving into Positions as they fill, and P&L that uses the net cost. Story S27 is already written this way.
- **(2):** a positions table that separates "complete" from "pending", and P&L for a No whose final cost isn't known until the Yes sells.
- **(3):** a change to the spec's rule and to D9's check.
- **All three:** cancelling must close the returned pairs (Q5), ideally in the same transaction.

**Recommendation (Claude's; yours to accept or reject).** Choose (1) for the unfilled part, and move filled parts into Positions as they fill, a blend of (1) and (2). Have cancel close the returned pairs in the same transaction.

### Q11. Can one stock's strikes show Yes prices out of order, and should the app act?

**1. The terms.**
- A **strike ladder** is all of one stock's strikes in order, for example $660, $680, $700.
- **In order (monotone)** means the Yes price falls as the strike rises, because a higher bar is harder to clear.
- **Arbitrage** is a set of trades that cannot lose.

**2. Worked example.** Yes on "META ≥ $680" trades around $0.65. Yes on "META ≥ $700" should be cheaper. Suppose a careless bid on the $700 book offers $0.70 for Yes while the $680 book's best ask is $0.66. A trader buys 1 Yes on $680 for $0.66, then mints 1 pair on $700 for $1.00 and sells that Yes for $0.70. The outlay is $0.66 + $1.00 − $0.70 = $0.96, for a Yes on $680 and a No on $700.
- META closes below $680: $0 + $1.00 = $1.00 back.
- META closes from $680 to $699.99: $1.00 + $1.00 = $2.00 back.
- META closes at $700 or above: $1.00 + $0 = $1.00 back.

At least $1.00 comes back for $0.96, a sure gain of $0.04 or more per set, and the careless bidder pays for it. (Computed.)

**3. The options and their evidence.**
- **(A) Do nothing:** traders and bots close the gap. A 2025 study of Polymarket found about $40 million taken through gaps between related markets (F2.89).
- **(B) A ladder view that flags a live inversion,** without blocking anything.
- **(C) Smooth the displayed probabilities** so they never invert. This hides real prices.
- **(D) Block, in the UI, orders that would create an inversion.** Anyone can get around it with a direct transaction, and blocking on-chain would need one program check across several books (the report's reasoning).
- **Evidence weight.** The theory that a binary option's price falls as the strike rises is SECONDARY (F2.88). The risk-free-trade derivation is UNCONFIRMED (F2.90), though the arithmetic above checks out. No venue was found that flags or blocks ladder inversions. Inversions are likely to be more common on thin devnet books. If your market-maker bot (Q21) quotes every strike from one formula, its own quotes stay in order, and that removes most inversions.

**4. What each answer commits you to.**
- **(A):** nothing to build, and one line in the docs.
- **(B):** a ladder view and a rule that only live best bids and asks count, not old last trades.
- **(C):** a display model to explain and test, and prices on screen that differ from the book.
- **(D):** UI rules that can be bypassed, plus their tests.

**Recommendation (Claude's; yours to accept or reject).** Choose (A), and make the bot quote its prices in order across strikes. Add (B) later only if inversions actually show up.

### Q17. How can a browser show a live stock price when the oracle's stream needs a secret key?

**1. The terms.**
- **Hermes** is Pyth's web service for the latest prices. Since 26 August 2026 every call to it needs an **API key**, a secret that identifies a paying customer, sent with the request (F2.51).
- A **relay** (or proxy) is your own server that fetches the data with the key and passes it on to browsers.
- A **push feed** is a price account on Solana that Pyth updates itself, and anyone can read it without a key.

**2. Worked example.** At 11:00 META trades at $681.50, just above the $680 strike, and Yes trades around $0.65.
- **With a relay:** your server fetches META once a second with its key and sends "$681.50, 1 s ago" to every open browser. Fifty viewers still mean one key and one upstream connection.
- **With the key in the website:** the key is built into the page's code (F2.54), so anyone can copy it, and it belongs to a plan that starts at $2,500 a month for stocks (F2.52).
- **With a push feed:** most push feeds update every 55 seconds or when the price moves 0.5% (F2.57, UNCONFIRMED, and whether MAG7 stocks have such feeds on devnet isn't known). 0.5% of $680 is $3.40, so the screen could show $683.00 while META actually trades at $679.70, on the other side of the strike, for most of a minute. Alice, deciding whether to pay $0.66 for Yes, would be misled. (Computed.)

**3. The options and their evidence.**
- **(1) A relay in your service.** The key stays on the server, which is the only safe place (F2.54). Polymarket does the same: its stock reference-price stream needs credentials, while its order book stream is public (F2.55).
- **(2) Key in the browser.** The key leaks, and Pyth's Free and Starter plans include no redistribution rights (F2.52). Not safe.
- **(3) Read the on-chain push feed.** No key is needed, but the price is slow, and MAG7 coverage on devnet is unconfirmed (F2.57, UNCONFIRMED).
- **(4) A separate display-only source,** such as Alpaca's free plan. It is real-time but IEX-only (one exchange), limited to 30 symbols, its key still stays server-side, and its number can differ from the price used to settle (F2.56).
- **(5) No live stock price:** show only the last oracle value with its age.
- **Cost:** Pyth lists equities only under Pro, from $2,500 a month (F2.52). Whether a free trial exists is disputed between Pyth's own pages (F2.53, UNCONFIRMED).

**4. What each answer commits you to.**
- **(1):** relay code in the always-on service, plus a plan or trial that covers stocks and permission to show its prices to many viewers (Q50).
- **(2):** a leaked key. Ruled out.
- **(3):** up to a minute of lag, labelled on screen, and a check that devnet has the feeds.
- **(4):** a second data agreement, a "display only" label, and two prices that can disagree.
- **(5):** a weaker D14, and the simplest build.

**Your direction, judged.** D16 routes all oracle traffic through your service, which is option (1). **Holds with a caveat.** The security reasoning is CONFIRMED (F2.51, F2.54), and a venue does the same (F2.55). The caveats concern money and permission, not design: which plan gives a key for US stocks, whether a free trial really exists, and whether showing one key's prices to many viewers counts as allowed display or as redistribution. The pending Q16 spike should answer all three.

### Q18. Should each browser read the chain itself, or should one relay serve them all?

**1. The terms.**
- A **subscription** asks an RPC node to notify you whenever an account changes, for example the account that holds one strike's order book. It runs over a **WebSocket**, a two-way connection that stays open.
- A **rate limit** caps how many requests you may make. **Per IP** means it is counted per internet address, so a classroom behind one router (one address) shares a single allowance.
- **SSE** is a one-way stream from your server to the browser. A **single point of failure** is one part whose failure stops everything that depends on it.

**2. Worked example.** Alice watches the META $680 book, with the best bid at $0.64 and the best ask at $0.66. At 11:00 the relay crashes, and at 11:01 the ask moves to $0.72.
- **Under the relay (B):** Alice's screen dims and says "reconnecting, 60 s old". If she still clicks Buy Yes for 10 with a worst price of $0.67 (D15), the program refuses the trade instead of charging her $7.20 when she expected $6.60.
- **Under direct reads (A):** her browser's own subscription would have shown $0.72 at once, unless the public node had throttled her.
- **Limits:** for each internet address, public devnet allows 100 requests per 10 seconds, 40 per 10 seconds for any single kind of request, and 40 open connections (F2.58). Thirty students behind one classroom address, each subscribing to one stock's 7 strikes, make 210 subscribe calls. If subscribe calls count against the 40-per-kind limit (unknown, F2.100 UNCONFIRMED), the last of them would wait about 50 seconds. Under the relay, one connection carries about 45 subscriptions, however many people are watching. (Computed.)

**3. The options and their evidence.**
- **(A) Direct.** Each browser subscribes to the chain itself (it still gets the stock price from a relay, because of Q17). No extra service is needed for the books, and because limits are per address, viewers on different networks don't share one allowance (F2.58). But a dropped subscription has no replay, and reconnecting is the app's job (F2.61, F2.62). A paid RPC provider would need its key in the website, and all viewers would share its 5 connections (F2.60). Public devnet is "not intended for production applications" and may block high-traffic sites (F2.59).
- **(B) Relay.** One service subscribes once and streams to every tab over SSE (F2.63, F2.65). It needs an always-on host and is a single point of failure.
- **A fallback blend.** Use (B) normally, and if the stream fails, have the browser read the books directly.

**4. What each answer commits you to.**
- **(A):** reconnect and resubscribe logic in the browser, handling of rate-limit errors, and a separate path for the stock price anyway.
- **(B):** an always-on host, HTTP/2, a sequence number on every message, health monitoring, and a "reconnecting" state on every screen while the relay is down.

**Your direction, judged.** You chose (B). **Holds with a caveat.** The deciding reasons hold: the oracle key needs a server (F2.51, F2.54), a paid RPC key can't be shared safely with browsers (F2.60), and one kind of connection keeps D14's states simple. But the plan's "980 subscriptions under A versus 49 under B" assumes every viewer shares one allowance, and devnet counts per address (F2.58). Drop that number, or limit it to viewers behind one address. Keep a direct-read fallback. Also, the browser still talks to an RPC node to send and confirm its own transactions (D13; F2.26, F2.27), so D16's "only our service talks to Solana" should read "only our service streams live data from Solana".

### Q21. Who posts the first quotes in each day's new markets?

**1. The terms.**
- A **market maker** keeps a bid and an ask on the book so others can always trade, and earns the gap between them. That pair of orders is a **quote**.
- **Working capital** is the money tied up in quotes. **Refreshing** (requoting) means cancelling and replacing quotes as the stock moves.
- A quote is **picked off** when someone with newer information trades against it before it is refreshed.
- A **faucet** is a website that hands out free test tokens.

**2. Worked example.** At 9:30 the META $680 book is empty, so Alice wants Yes and has nothing to buy. The bot mints 100 pairs for $100, offers 100 Yes at $0.66, and bids for 100 Yes at $0.64, which locks another $64. This one book ties up $164. Alice buys 10 Yes for $6.60. Bob's Buy No mints 10 pairs and sells the Yes into the bot's bid for $6.40, so his 10 No cost $3.60.
- **Across all markets:** at the plan's 45 markets a day the bot ties up 45 × $164 = $7,380, or $8,036 at 49 markets. Circle's faucet gives 20 test USDC every 2 hours per address (F2.98), so $7,380 takes 369 requests, about 31 days at 12 a day. (Computed.)
- **Refresh speed:** public devnet allows 40 of the same request per 10 seconds per address (F2.58), which is 4 transactions a second. Refreshing all 45 books therefore takes at least 11 seconds. (Computed. The report's realistic estimate of about 20 seconds is UNCONFIRMED, F2.100.) Helius's free plan sends 1 transaction a second (F2.60), so about 45 seconds.
- **The plan's figures:** $4,900, 245 requests and about 20 days counted minted pairs only, over 49 markets. The bid side raises the number, but both lead to the plan's conclusion that your own test-USDC mint (Q19) is effectively required.

**3. The options and their evidence.**
- **(A) Your own bot,** run by the always-on service with its own wallet and no special program powers, as the plan's design rules say. On devnet the money is worthless. On mainnet the operator would trade against its own users with its own money: Kalshi's affiliated trading arm faces a class action over exactly this (F2.97, SECONDARY).
- **(B) Outside market makers drawn in by rewards.** Polymarket paid makers for quoting close to the midpoint (F2.92; the page notes the program has ended), and Kalshi runs an incentive pool with designated makers (F2.97, SECONDARY). Not realistic for worthless devnet tokens.
- **(C) Nobody.** The first trader's limit order seeds the book. Until then the card can only say "No quotes yet", and market orders fail (F2.105, UNCONFIRMED).
- **(D) You quote by hand** for demos (the plan's other option).
- How real venues seed brand-new short-lived markets was not found.

**4. What each answer commits you to.**
- **(A):** a quoting job (D29); your own test-USDC mint (Q19); a pricing formula; paced refreshes; a key kept apart from the admin and upgrade keys (Q25); and quotes kept in order across strikes (Q11). Mainnet would mean real capital at risk (out of scope, Q49).
- **(B):** an incentive scheme that won't work on devnet.
- **(C):** nothing to build, but demos and graders meet empty books.
- **(D):** your time on every demo day, and it doesn't scale to 45 books.

**Recommendation (Claude's; yours to accept or reject).** Choose (A), with your own test-USDC mint. Refresh only the books whose fair price has moved. If continuous quoting proves too heavy for devnet's limits, fall back to a single seed of quotes each morning.

### Q28. When two orders cross, at what price does the trade happen?

**1. The terms.**
- Two orders **cross** when a bid is at or above an ask.
- The **maker** is the order already resting on the book, and the **taker** is the incoming order.
- **Price improvement** means getting a better price than your own limit.

**2. Worked example.** Dave's ask rests on the book: sell 10 Yes at $0.65, posted at 10:02. Alice sends a buy for 10 Yes with a limit of $0.70.
- **(A) At the resting price:** they trade at $0.65. Alice pays $6.50, which is $0.50 better than her limit.
- **(B) At the incoming price:** they trade at $0.70. Alice pays $7.00, and Dave gets $0.50 more than he asked.
- **(C) At the midpoint:** they trade at $0.675, so Alice pays $6.75. A half-cent price breaks the plan's whole-cent rule (A4), so a rounding rule would be needed.
- **For Buy No:** Bob's Buy No sells Yes into Carol's resting bid at $0.64, so his No costs $1.00 − $0.64 = $0.36, even if his limit would have accepted a No at up to $0.40. (Computed.)

**3. The options and their evidence.**
- **(A):** Manifest's matching code takes the price from the resting order (F2.09, CONFIRMED). Polymarket says price improvement goes to the taker (F2.20, F2.40), but the part saying the price comes from the maker's order is UNCONFIRMED.
- **(B):** no venue was found that does this.
- **(C):** used by auctions (Q41, option 4), not by continuous books.
- **Gap:** no exchange rulebook (CME, Nasdaq) was opened.

**4. What each answer commits you to.**
- **(A):** the usual design, plus tests for price improvement and for orders that fill across several price levels. D15's worst price is then a cap, not the price paid.
- **(B):** takers always pay their limit, and the UI must warn them.
- **(C):** a rounding rule and an explanation on screen.

**Recommendation (Claude's; yours to accept or reject).** Choose (A), the plan's proposal. The plan's own example is consistent with it: Alice buys 60 at up to $0.66 against Frank's 40 and Erin's 30, both at $0.65, and pays $39.00.

### Q29. When should minting close each day?

**1. The terms.**
- **Minting** (Mint Pair) puts $1 into the vault and gives 1 Yes and 1 No. Anyone may mint (spec).
- **Pause** is the admin's emergency stop.

**2. Worked example.** Carol's bid for 10 Yes at $0.64 is still resting at 4:01, META closed at $676 (so No wins), and settlement is due at about 4:05.
- **If trading and minting are both still open:** Mallory mints 10 pairs for $10.00, sells the 10 Yes into Carol's bid for $6.40, keeps the 10 No, and redeems them for $10.00 after settlement. Mallory gains $6.40 and Carol loses $6.40.
- **If trading stopped at 4:00 but minting stays open:** Mallory can only mint 10 pairs for $10.00 and redeem them after settlement for $10.00 (10 No at $1, 10 Yes at $0). Nobody gains or loses.

So the danger comes from trading after the close, not from minting on its own. (Computed. This matches F2.102, an UNCONFIRMED derivation.)

**3. The options and their evidence.**
- **(a) Close minting at the market's close time, together with trading** (the plan). Kalshi stops new orders at the close (F2.70). Buy No needs a mint, so minting must stay open for as long as trading does.
- **(b) Close minting earlier, for example at 3:55,** to allow for clock error (F2.77, UNCONFIRMED). From 3:55 Alice could still Buy Yes but Bob couldn't Buy No, which is lopsided.
- **(c) Keep minting open until settlement is written.** This is safe only if trading has already stopped.
- **(d) Never close minting.** The Gnosis contract never checks for a result when minting or merging (F2.101), and Polymarket says redeem has no deadline. That is a precedent, not a safety argument.
- The spec opens minting at 9:00, lets the admin pause it, and never says when it stops (F2.103).

**4. What each answer commits you to.**
- **(a):** one time check in Mint Pair, using the same close time as Place Order. Pause stops both (Q44).
- **(b):** a second cutoff to document, and a lopsided experience for the last minutes.
- **(c):** a "settled yet?" check in Mint Pair, and more states to test.
- **(d):** no check at all. Minting after settlement is $1 for a pair that redeems for $1, which is pointless but harmless, and it still adds states to test.

**Recommendation (Claude's; yours to accept or reject).** Choose (a), the plan's proposal.

### Q31. Bob holds No and wants Yes on the same strike: block him, or offer one combined action?

**1. The terms.**
- The **position constraint**: on any one strike, the trading screen lets you hold Yes or No, not both.
- A **flip** is switching from one side to the other.

**2. Worked example.** Bob holds 10 No bought at $0.35, so he paid $3.50. META rallies, and Yes now trades at bid $0.79 and ask $0.80. Bob clicks Buy Yes for 15.
- **(1) Block and guide:** the screen tells him to sell his No first. Sell No buys 10 Yes at $0.80 for $8.00 and closes 10 pairs for $10.00, so he receives $2.00 and locks in a $1.50 loss on the No. Then he buys 5 Yes at $0.80 for $4.00. He ends with 5 Yes, having spent $2.00 net across the two steps, and signed twice. If the ask moves to $0.83 between the steps, the second step costs $4.15 instead. (Computed.)
- **(2) One combined action:** one transaction buys 15 Yes at $0.80 for $12.00 and closes 10 pairs for $10.00. Same end state: 5 Yes for $2.00 net, but one signature and no gap in between. (Computed.)
- **(3) Allow both and net them:** Bob simply buys 15 Yes, and the system nets 10 of them against his 10 No automatically, as Kalshi does.
- The plan's proposed message, "Buying Yes here would lock in your current −$1.50, the same as selling your No", checks out: $3.50 + $8.00 paid for pairs worth $10.00.

**3. The options and their evidence.**
- **(1):** this is what the spec says ("the UI prompts them to sell No first before buying Yes"), and it is the simplest.
- **(2):** Kalshi says "there's no inherent difference between buying a Yes contract and selling a No contract" (F2.41). It fits in one transaction (F2.17), but it needs the pair close (Q5) and buys deeper into the asks.
- **(3):** Kalshi nets the two sides (F2.23), and Polymarket allows both and offers merge (F2.23). This departs from the spec.
- No source was found on how trading apps flip a position in one click.

**4. What each answer commits you to.**
- **(1):** a message and a link to Sell No, and two transactions for a flip.
- **(2):** a combined instruction, a confirm screen that explains both parts, a worst-price limit over the whole purchase (D15), and tests.
- **(3):** a rule change against the spec's text, an automatic pair close inside Buy Yes, and a different D9.

**Recommendation (Claude's; yours to accept or reject).** Choose (1) now, with the plan's message. Keep (2) as a later upgrade once the pair close exists.

### Q38. What No price should buyers and sellers see, and which price is "implied probability"?

**1. The terms.**
- The **midpoint** is halfway between the best bid and the best ask.
- **Implied probability** reads a price as the chance of Yes: $0.65 means 65%.
- The **last trade** is the price of the most recent fill.

**2. Worked example.** The Yes best bid is $0.64 and the best ask $0.66.
- **Bob buys No:** he mints a pair for $1.00 and sells the Yes at the bid, $0.64, so his No costs $0.36, or $3.60 for 10.
- **Bob sells No:** he buys a Yes at the ask, $0.66, and closes the pair for $1.00, so he receives $0.34, or $3.40 for 10.
- **The spec's formula,** "No price = $1.00 − Yes ask price", gives $0.34, which is what a seller receives, not what a buyer pays. A card showing $0.34 would surprise Bob with $3.60 at the confirm screen.
- **Implied probability:** the midpoint of $0.65 gives Yes 65% and No 35%, which add up to 100%. Using each side's ask gives Yes 66% and No 36%, which add up to 102%.
- **Wide spread:** with a bid of $0.40 and an ask of $0.70 the midpoint is $0.55, while the last trade might be $0.65. Polymarket would show the last trade in that case (F2.42). (All computed.)

**3. The options and their evidence.**
- **(a) Show "Buy No $0.36 / Sell No $0.34"** (the plan). Kalshi documents the rule this rests on: "A YES bid at X is equivalent to a NO ask at $1.00 minus X" (F2.19).
- **(b) One headline "No $0.34",** as the spec says. It understates the cost of buying No.
- **(c) A headline No price of $1 − midpoint = $0.35,** with the real buy and sell prices on the trade panel.
- **For implied probability,** Polymarket uses the midpoint when the spread is $0.10 or less, and the last trade otherwise (F2.42). Kalshi ties price to probability without saying which price it uses (F2.43). An empty book has no midpoint and should say "No quotes yet" (Q52).

**4. What each answer commits you to.**
- **(a):** two numbers for each side on the trade panel, and a logged correction to the spec.
- **(b):** a confirm-screen surprise. The true cost must still appear before signing (D15).
- **(c):** one headline number per card that stays consistent between the Yes and No views, plus the exact prices on the trade panel.

**Recommendation (Claude's; yours to accept or reject).** Use (a) on the trade panel and (c) on the contract cards. For wide spreads, use Polymarket's rule and say on screen which price is shown.

### Q41. What can happen between 9:00 AM (markets visible, minting open) and 9:30 AM (trading starts)?

**1. The terms.**
- **Pre-market** is trading in the stock before the 9:30 open. Pyth publishes US stock prices from 4:00 AM ET (F2.83).
- An **opening auction** collects orders and then trades them all at once at a single price.
- **Post-only** means orders may rest on the book but may not trade on arrival.
- A **crossed book** has a bid above an ask, something a continuous book never allows to stand.

**2. Worked example.** META closed yesterday at $680, so today's strikes center on $680. At 9:10, in pre-market trading, META is at $692. Suppose the bot posted "sell Yes on $680 at $0.66" at 9:00, based on yesterday's close, and orders could trade before 9:30. A trader who has seen $692 buys 100 Yes for $66.00, when they are now worth perhaps $0.85 each (an illustrative figure), and takes about $19 from the bot. Under the plan nothing trades before 9:30, and the bot posts at 9:30 using the live price.

**3. The options and their evidence.**
- **(1) No orders until 9:30** (the plan). This matches Kalshi's state "Created but not yet open for trading" (F2.70).
- **(2) Post-only before 9:30.** Phoenix has a PostOnly market status (F2.74), and its post-only orders never trade on arrival (F2.75). In your own book, Place Order would reject anything that would cross before 9:30. The book then opens uncrossed, but possibly with stale quotes.
- **(3) Continuous trading from 9:00.** The first arrivals set the price, and stale quotes get picked off, as in the example.
- **(4) A real opening auction.** Nasdaq accepts orders from 4:00 AM, publishes imbalance data from 9:25, and runs one cross at 9:30 (F2.81). Cboe Australia lets pre-open orders overlap without trading (F2.82, SECONDARY). This needs a second matching mode (Q28, option C).

**4. What each answer commits you to.**
- **(1):** an open-time check in Place Order, alongside the close-time check; an "Opens 9:30 AM ET" state on screen, which D14's list lacks; minting allowed from 9:00 (Q29); and an empty book at 9:30 until the bot posts.
- **(2):** a post-only mode and a rule for the 9:30 switch, with possibly stale quotes at the open.
- **(3):** nothing to build, and quotes that get picked off.
- **(4):** an auction engine.

**Recommendation (Claude's; yours to accept or reject).** Choose (1), the plan's proposal.

## Conflicts

1. **D21 against the report's lead answer.** You decided to build your own book. The report leads with Phoenix, deployed as your own copy, and keeps your own book as the fallback. Phoenix's controls are confirmed: close, pause, force-cancel and clock-time expiry (F2.12, F2.13). It became MIT-licensed in May 2026 (F2.11). But it is labelled "Legacy", its SDK last changed for real in August 2024 (F2.11), its cost per market is known only from a competitor's table, "3+ SOL" (F2.06), and the report's own case against Phoenix lists about 147 SOL a day for 49 markets (computed from that figure) and seat handling for each trader. The evidence doesn't settle it either way, and D21 is your call. The plan's fallback list (Manifest, OpenBook) should add Phoenix.
2. **Phoenix facts: the plan's table against this report.** The plan says Phoenix's "code last changed 2023 to 24", that "traders need an approved seat", and that rent is "~0.6 to 3 SOL" (UNCONFIRMED). This report finds a commit on 9 October 2026 (only a SECURITY.md edit), a relicense in May 2026 (F2.11), and that immediate swaps need no seat; only resting limit orders do (F2.14). The Manifest README's "Business" licence for Phoenix is out of date (F2.06 against F2.11). Update the table before D21 is written up.
3. **Devnet deployments: the plan against F2.16.** The plan's direct RPC check found Manifest, Phoenix and OpenBook programs on devnet (plan research). F2.16 found no public devnet deployment for Phoenix or Manifest, but it is UNCONFIRMED. The plan's direct check is the stronger evidence.
4. **D15 against D9 and D5: partial fills on Buy No and Sell No.** D15 says an order "fills partly or not at all". For Buy No, a partial sale of the minted Yes leaves the trader holding both Yes and No. For example, mint 10 pairs, sell only 6 Yes, and 4 Yes and 10 No remain, which D9 forbids. Either the program mints only what it sells, or the book leg fills all or nothing (F2.13, F2.29 show both tools exist).
5. **D25's maker quote against Q5 and D9.** D25 says a maker's "buy Yes at 64¢" quote, once filled, closes with the maker's No for $1. A fill happens when someone else trades, while the maker isn't signing anything, so the close must be built into the fill or done later by the maker. Until then the maker holds both. No item designs this.
6. **D16 and Q18 ("only our service talks to Solana") against D13.** The browser still sends transactions through the wallet and checks their status through an RPC node (F2.26, F2.27). Those calls count against per-address limits (F2.58). The wording should say the service is the only source of streamed live data.
7. **Q18's "980 subscriptions" against per-address limits.** The plan's main argument treats all viewers as sharing one quota. Devnet counts per internet address (F2.58), so that is true only for viewers behind one address. Your direction still holds for the other reasons.
8. **The Pyth free trial: the plan against this report.** The plan's Q16 says the plans page showed "a free Pro trial key needs no card" (CONFIRMED there on 7 October). This report read the same page on 9 October as a $0 Free plan with "no API access" and no trial mentioned (F2.52, CONFIRMED), and found Pyth's own pages disagreeing about a trial (F2.53, UNCONFIRMED). Settle this in the Q16 spike before relying on a trial key.
9. **Confirmation levels: F2.25 against the plan's Q12.** Solana's docs say to use "confirmed" and that "finalized" takes about 13 seconds longer (F2.25). The plan's direct check found that on devnet, since the Alpenglow upgrade, confirmed equals finalized and takes under a second. The docs describe the older behaviour, which still applies on mainnet. For devnet, the plan's direct check wins, and D13's state labels should follow it.
10. **The chain clock: the plan's Q4 against F2.77 and F2.78.** The plan says the leader sets the clock "within a bounded range" (CONFIRMED guide). This report found only "approximate", a drift clamp expressed in percentages, and Solana documents that contradict each other on mean versus median (both UNCONFIRMED). Neither source gives a number of seconds, so measure before choosing a buffer.
11. **D14's states against the extended-hours feeds and Q41.** D14 shows "Market closed · closed at $X" after 4:00, but Pyth also publishes post-market and overnight sessions (F2.83). D14 must name the regular-session price. D14's list also lacks a "Pre-open" state for 9:00 to 9:30, which Q41 creates and the report's own D14 answer includes.
12. **D14 "always live" against cost and licensing.** A live US stock price needs a Pyth plan or trial that covers equities (F2.52) and permission to display it (Q50). D14's promise depends on the Q16 spike.
13. **The spec against itself on the No price (Q38).** It says "No price = $1.00 − Yes ask", but its own Buy No market order sells Yes at the bid. The reciprocal rule (F2.19) shows the formula is the seller's price.
14. **The spec against itself on redeem and the vault (Q5).** Its Sell No text says Yes plus No "can be redeemed for $1.00, or the system handles the close automatically", while it also says "Tokens can only be destroyed via the redeem function" and "Vault balance = $1.00 × total pairs minted (exact)" (F2.38). A pair close before settlement satisfies the first only if the vault rule is reworded (Q45).
15. **Market-maker capital: three figures.** The plan says $4,900, 245 faucet requests and about 20 days (minted pairs only, 49 markets). The report says about $7,100, 355 requests and about 30 days (pairs plus bid collateral, F2.100, UNCONFIRMED). The plan's own section 7 count is 45 markets a day, not 49. This review computes $7,380 for 45 markets and $8,036 for 49. All of them lead to the same conclusion: your own test-USDC mint.
16. **D9: frontend only against frontend plus program.** The report recommends adding a program check, but its own case against says such a check "gives false assurance", since tokens can move to a second wallet (reasoning; F2.22 is UNCONFIRMED). The spec asks only for the frontend. The plan's D9 and D24 agree with the spec.
17. **D16: books over SSE against books by direct subscription.** Your direction sends the order books through the relay too. The report's lead answer would keep direct chain subscriptions available for the books. Both are workable. Your choice stands, and the report's view supports keeping direct reads as the fallback.
18. **A finding that contradicts itself.** F2.91 claims Polymarket's maker guide doesn't separate maker tooling from retail tooling, and its own verification says the opposite. The report's case against D25 ("real makers do not use a web UI") leans partly on it. F2.96 (CONFIRMED) supports the narrower point that Polymarket's split and merge docs are written for developers.

## Weakest spots in the evidence

- **The execution price (Q28) rests on one primary source**, Manifest's matching code (F2.09). The Polymarket support (F2.20, F2.40) is UNCONFIRMED, and no exchange rulebook was opened.
- **Your own book's build effort is unmeasured.** It is D21's main risk, and no finding sizes it. Much of this group's evidence describes outside books (Manifest, Phoenix, OpenBook) that D21 has already set aside, so it informs the fallback more than the build.
- **Phoenix's real rent per market, and whether it can be reclaimed, are unknown.** The only figure is a competitor's (F2.06), and Phoenix's docs returned an error.
- **The chain clock's accuracy is unknown.** There is no figure in seconds, and Solana's documents contradict each other (F2.77, F2.78, both UNCONFIRMED). The Q4 buffer and the Q29 options depend on it.
- **Devnet's limits for WebSockets are unknown.** The public limits don't say whether connections or subscribe calls count (F2.58; F2.100 is UNCONFIRMED). This matters for Q18's fallback and for the relay's own subscriptions.
- **Pyth is the biggest open dependency.** Unknown: whether a free trial exists (F2.53, UNCONFIRMED), whether MAG7 push feeds exist on devnet (F2.57, UNCONFIRMED), whether one key may serve many viewers, and whether Hermes still streams after the August upgrade.
- **The market-maker numbers are derived, not sourced** (F2.100, UNCONFIRMED), and how real venues seed brand-new markets was not found.
- **Q11 rests on SECONDARY theory (F2.88) and an UNCONFIRMED derivation (F2.90).** Only the Polymarket study (F2.89) is CONFIRMED, and no venue's handling of ladder inversions was found.
- **Q31 has no source on one-click flips,** and Kalshi's Close action wasn't shown to place an opposite order (F2.41).
- **Q5's venue support is partial.** Polymarket's merge before resolution is UNCONFIRMED (F2.37), so the case rests on the Gnosis code (F2.36) and the spec's own text (F2.38).
- **What exchanges do with resting orders at the close is second-hand** (F2.79, F2.80, SECONDARY), as is Cboe's pre-open state (F2.82).
- **Some CONFIRMED findings carry an inference.** F2.34 (fees would go to the outside book's accounts), F2.39 (ordinary resting orders lock their tokens), F2.86 (slot updates as a heartbeat), F2.89 ("corrected by traders, not the venue") and F2.36 ("the standard pattern") each rest on confirmed text, but the conclusion is the researcher's reading.
- **The report's lead answers include claims tied to no finding:** reading up to 100 accounts in one call, the Token-2022 details beyond F2.22, "about 147 SOL a day" for Phoenix, and the 20-second refresh estimate. Treat these as reasoning, not evidence.
