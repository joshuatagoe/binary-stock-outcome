# Decision review 2026-10-09-full, group 1: judge's report

Group 1, "Onboarding": a beginner's first minutes with Meridian. Stories: S1 (learns what a contract pays before connecting a wallet), S2 (connects a wallet and sees the USDC balance), S3 (browses today's contracts and prices) and S25 (gets devnet SOL and test USDC, labelled as play money). Items: D10, Q7, Q19, Q22, Q40, Q52, Q54.

Evidence: `docs/research/reports/2026-10-09-full-G1.md` (findings F1.01 to F1.39, plus F1.44) and the input file `docs/research/inputs/G1-onboarding.md`. Proposals and your directions so far: `docs/planning/2026-10-08-phase-1-plan-session-2.md`.

How to read the labels: a **CONFIRMED** finding means the primary source was opened and checked again on 2026-10-09. A **SECONDARY** finding comes from a second-hand source, such as a search summary or a third-party guide. Only these two kinds carry weight. Two findings are **UNCONFIRMED**: F1.09 (Meridian could issue its own test dollar token) and F1.25 (Polymarket's redeem rules, downgraded because its source partly contradicts it). Each is named where it matters, and no verdict rests on either. In a few places this report quotes the spec directly to settle a point the findings left open; those places say "judge's check of the spec". The plan's own earlier research is quoted as the plan states it and was not checked again here.

## Summary

This group covers a beginner's first minutes with Meridian: what the screens say a contract pays (D10, Q7), how a new user gets free test money and knows it is worthless (Q19, Q22), which stories and screens the spec left out (Q40, Q52), and how people prove who they are when there are no accounts (Q54). The evidence supports the plan's direction throughout, but one decision has fallen behind the plan's own later thinking. D10 still keeps the spec's payoff sentence, "You pay $X. You win $1.00 if [STOCK] closes above [STRIKE]", although the payout rule is "at or above" (F1.38) and "$1.00" is the payout, not the profit (F1.23). D10 holds with a caveat: use the fuller line that Q52 already drafts, and add the profit and a No version. On wording (Q7), the spec's rule, its worked example and the venue labels found ("24,920 or above", F1.17) all favour "at or above", and the spec's own "META > $680" labels need changing too. On test money (Q19), the public faucets are real but small and built for people (F1.02, F1.05), and Circle's API needs an upgraded account (F1.06). That leaves the plan's own test-dollar token as the only route that serves a bot and scripts. Its cost is a departure from the spec's literal "USDC", and this report leaves its feasibility UNCONFIRMED (F1.09). For labelling (Q22), clear sources back the wording (F1.01, F1.07, F1.10), but nothing shows what users actually notice. Your two directions hold with caveats. The missing stories S25 to S29 are each backed, but cancelling your own order, a devnet operator, the risks note and a devnet reset still have no story (Q40). The evidence supports giving every screen loading, empty and error states, but the grader's tests are narrower, so rank the work (Q52). On sign-in (Q54), the real protection is the program checking that the admin key actually signed (F1.33, F1.34, F1.36). The plan's "Sign In With Solana" for the operator page has narrow wallet support (F1.31) and reportedly fails on Ledger hardware wallets (F1.32). As worded, it also can't work with a multisig admin. The weakest evidence: no venue rule text for ties, no venue order-ticket wording, unknown SOL faucet amounts, and no grader rubric.

## Verdicts

The source column is copied from the plan: "spec" means the spec says it, "owner" means you asked for it or set its direction, and "Claude proposal" means Claude suggested it and you have not yet confirmed it. Where an open question has no direction from you yet, the verdict is "Your call", and the "why" column says how the plan's current proposal fares against the evidence.

| Item | Source (from the plan) | Verdict | Why |
|---|---|---|---|
| D10: pages Landing, Markets, Trade, Portfolio, History; payoff line "You pay $X. You win $1.00 if …" | spec | Holds with a caveat | The five pages are the spec's own list, and nothing in the evidence argues against them as a minimum, though the spec leaves out a market-maker view, an admin screen and a home for the risks note it requires (F1.39). The payoff line is the weak part. It says "closes above" where the payout rule is "at or above" (F1.38), it is written only for Yes (F1.39), and "You win $1.00" gives the payout, not the profit, a difference Kalshi warns its users about in so many words (F1.23). Reword D10 to match Q52 item 2, add the profit and a No version, and log it as a deliberate change to the spec's sentence. |
| Q7: words for a close exactly at the strike; plan proposes "at or above" on screen | Claude proposal | Your call | The evidence strongly backs the proposal. The spec's rule and worked example are inclusive (F1.38), the venue labels found say "or above" (F1.17, F1.18), and a strict "above" reads as "a tie pays No" on venues that use it (F1.19, F1.21, SECONDARY). |
| Q19: how users get devnet SOL and test dollars; plan proposes its own test-USDC token with a "Get test USDC" button | Claude proposal | Your call | Circle's faucet gives 20 USDC every 2 hours behind a human check (F1.05), and its API needs an upgraded account (F1.06). The plan's own token is the only route that serves a bot and scripts, but it departs from the spec's word "USDC", this report leaves it UNCONFIRMED (F1.09), and it does nothing for SOL. |
| Q22: how to label test money; plan proposes a persistent "Devnet · test USDC, no real value" banner and the unit shown as "test USDC" | owner (raised it) + Claude proposal | Your call | The wording is well sourced (F1.01, F1.07, F1.10, F1.16) and the banner matches what testnet apps do (F1.10, F1.12). No evidence shows whether users notice it, and a distinct token name is possible only with the plan's own token (Q19). |
| Q40: stories the spec leaves out | owner (direction: keep them for USERS.md; S25 to S29 frozen in the approved Story map) + Claude proposal | Holds with a caveat | Each of S25 to S29 is backed (F1.01 to F1.07, F1.39, and plan items reviewed in other groups). Cancelling your own resting order with partial fills (F1.23), a devnet operator, the required risks note (F1.39) and a devnet reset (F1.01) still have no story. |
| Q52: screens and states the spec leaves out | Claude proposal + owner (direction: every screen gets its loading, empty and error states) | Holds with a caveat | Your direction and the plan's six gaps are supported (F1.12, F1.23, F1.28, F1.39). The grader's front-end tests are narrower, the venues' live screens were not opened, and History should list mints, cancels, refunds and redemptions as well as trades (F1.26, SECONDARY), so rank the work. |
| Q54: how traders, the admin and the operator prove who they are; how to protect an admin screen | owner (raised it) + Claude proposal | Your call | The plan's core holds: traders just connect, and admin power is checked on-chain, which needs a Signer check as well as has_one (F1.33, F1.34, F1.36). Its "operator page authenticated by the admin wallet through Sign In With Solana" clashes with its own multisig and hardware-wallet plans, given narrow wallet support (F1.31) and the Ledger failures (F1.32). |

### D10 in numbers: the spec's line against the fuller line

A **payout** is what a token pays at settlement, $1.00 or $0.00. **Profit** is the payout minus what you paid.

- **The spec's line, for Alice:** "You pay $0.65. You win $1.00 if META closes above $680." A beginner can read "win $1.00" as a gain of $1.00. Her real gain is $0.35 per contract. And the word "above" suggests that a close of exactly $680.00 loses, when under the rule it wins.
- **The fuller line, Alice buys 10 Yes:** "You pay $6.50 for 10 Yes. If META closes at or above $680 at 4:00 PM ET (Pyth price), you get $10.00, a profit of $3.50. Otherwise you get $0.00 and lose $6.50. Most you can lose: $6.50. Most you can gain: $3.50."
- **Bob buys 10 No.** Behind the scenes, Buy No mints 10 pairs for $10.00 and sells the 10 Yes at $0.65, which brings back $6.50. His ticket: "You pay $3.50 for 10 No. If META closes below $680 at 4:00 PM ET, you get $10.00, a profit of $6.50. Otherwise you get $0.00 and lose $3.50."
- **Bob's Buy No as a limit order** (he names a price and waits): "You put in $10.00 now and hold 10 Yes and 10 No until your 10 Yes sell at $0.65 or better. Then $6.50 comes back, so your 10 No cost $3.50. Cancel at any time to get the $10.00 back." The spec says such a user holds both tokens until the sale fills (F1.39), and the plan shows this as a pending order (Q6, S27).
- **Market orders.** The report's case against says a moving price makes "most you can lose" an estimate. The plan's D15 already closes that gap: every order carries a worst acceptable price, so the ticket can say "You pay at most $6.60. Most you can lose: $6.60", which is a true ceiling.
- **Fees.** The plan assumes none in version 1 (A1). The fee formulas the report found are SECONDARY (F1.27). If fees come later, they go inside "You pay" so the maximum loss stays true.

## Briefings

### Q7. What words should users see for a close exactly at the strike?

**1. The terms.**
- The **strike** is the price level in the question, here $680.
- The **close** is the stock's price at the 4:00 PM ET end of trading. Meridian reads it from Pyth, an **oracle**: a service that publishes outside prices onto the blockchain.
- A **tie** is a close that lands exactly on the strike: $680.00.
- **"At or above"** (written ≥, also called inclusive) counts a tie as Yes. **"Above"** (written >, also called strict) counts a tie as No.
- The spec's payout rule is inclusive: "Yes token: Pays $1.00 USDC if the stock closes at or above the strike price", and its worked example says a close of exactly $680 pays Yes (F1.38). Its headline question, its payoff sentence and its glossary say "close above" (F1.38). Its market labels use the strict sign, "META > $680", in the order-book section, the strike examples and the Buy Yes story (judge's check of the spec PDF, pages 4, 6 and 7). The plan has already settled the rule itself (D1: at or above, from the spec). Q7 is only about the words on screen.

**2. Worked example.** Alice buys 10 Yes at $0.65 ($6.50). Bob buys 10 No at $0.35 ($3.50). The vault holds $10.00. META closes at exactly $680.00.
- Under the rule (D1), Yes wins. Alice redeems 10 Yes for $10.00, a profit of $3.50. Bob's 10 No pay $0.00, a loss of $3.50.
- If Bob's screen said "Will META close above $680?" or "META > $680", he could fairly read $680.00 as "not above" and expect $10.00. He gets $0.00, and the app's own words support his complaint.
- For comparison, under a 50-50 tie rule (option D below) each token would pay $0.50. Alice would get $5.00 (a loss of $1.50) and Bob $5.00 (a profit of $1.50). The spec rules this out.
- **How often this happens.** Strikes are whole multiples of $10 and closes are quoted in cents, so a tie needs the close to land on one exact cent (F1.38; the point about cents is general knowledge, not spec text). Ties are rare, but on the day one happens, the words decide whether someone feels cheated.

**3. The options and their evidence.**
- **(A) "At or above" everywhere a user reads the question**: card titles ("META $680 or above"), the payoff line, the glossary and the settlement display. In favour: it matches the spec's rule and worked example (F1.38). Robinhood's Kalshi-powered index market labels its contracts "24,920 or above" on its buy panel (F1.17, CONFIRMED). Kalshi's API also has a separate "greater_or_equal" strike type next to "greater" (F1.18, CONFIRMED). Against: it is slightly longer. Both label findings also come from one venue family, so they show "or above" in use, not that it is the industry norm (report, Q7 against).
- **(B) "Above" in headlines, "at or above" in the fine print.** This is the spec's own mix. In favour: it is shorter, and it is the spec's literal headline. Against: Kalshi's filings reportedly define "above" as strictly greater and "at least" as greater-or-equal (F1.19, SECONDARY). Polymarket's weekly "above" stock markets reportedly resolve a tie to No (F1.21, SECONDARY). A reader who knows those venues would expect a tie to pay No, the opposite of Meridian's rule.
- **(C) Keep "above" and store the line a fraction lower**, so that "above $679.9999" pays Yes at $680.00. Kalshi was reported doing this, while showing traders "6,725 or above" for a threshold of 6,724.9999 (F1.20, SECONDARY). So even Kalshi shows "or above" to the user here, and option C changes the stored number, not the words. Against: the stored number differs from the strike on screen, and the trick only works if the program compares prices at a known precision (see Conflicts, item 4).
- **(D) Pay 50-50 on a tie.** Polymarket's META Up/Down market does this (F1.22, CONFIRMED). Against: it breaks the spec's explicit rule (a close of exactly $680 pays Yes, F1.38) and the spec's required at-strike settlement test (judge's check of the spec). It isn't available without departing from the spec.

**4. What each answer commits you to.**
- **(A):** a word change everywhere a user sees a market, and a line in DECISIONS.md recording that the spec's payoff sentence was reworded (a spec correction, like Q38 and Q45). It also needs one UI test that a tie shows "Yes wins". The program and its at-strike test stay as D1 has them.
- **(B):** no rewording, but a written explanation of the tie rule in the glossary and the risks note, and acceptance that a user who knows other venues may misread it.
- **(C):** two numbers per market (the stored line and the displayed strike), a written precision rule and extra tests. A grader reading the on-chain accounts would also find them harder to follow.
- **(D):** a change to the payout rule itself, which contradicts D1 and the spec.

**Recommendation (Claude's; yours to accept or reject).** (A), which is the plan's current proposal. Use "META $680 or above" as the short label (Robinhood's form, F1.17) and "closes at or above $680" in sentences. The No side reads "closes below $680". Replace the spec's "META > $680" labels everywhere they would appear on screen.

### Q19. How does a devnet user get SOL for fees and dollars to trade?

**1. The terms.**
- **Devnet** is Solana's public test network. Its tokens are "not real", it "may be" reset (wiped and restarted), and its public connection point (the **RPC**) allows 100 requests per 10 seconds per IP address (F1.01, CONFIRMED).
- **SOL** is Solana's own coin. Every transaction pays a small fee in SOL. Every new on-chain account, such as the one that holds your Yes tokens, needs a refundable SOL deposit called **rent**.
- **USDC** is a dollar token issued by the company Circle. On devnet it is a separate test token at the address 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU. Circle says testnet USDC has "no financial value" (F1.07, CONFIRMED).
- A **faucet** is a website or command that hands out free test tokens, with limits on how much and how often.
- A token's **mint** is the on-chain record that defines the token. Whoever holds its **mint authority** can create more of it.

**2. Worked example.** Alice arrives with a new wallet on devnet: 0 SOL and 0 USDC.
- **SOL comes first.** She can't sign anything without it. The web faucet allows 2 requests every 8 hours and doesn't say how much each gives (F1.02, CONFIRMED). The command-line airdrop (`solana airdrop 2`) allows up to 5 SOL per request (F1.03, CONFIRMED), but a beginner won't open a command line. Fees are tiny: 5,000 lamports (0.000005 SOL) per signature, from the plan's research. Rent for her new token accounts is the larger cost, and this review didn't measure it.
- **Then dollars.** Circle's faucet gives 20 USDC per request, once every 2 hours per address (F1.05, CONFIRMED). With $20 Alice can buy 30 Yes at $0.65 for $19.50 (the plan's arithmetic). If META closes at or above $680, she redeems 30 × $1.00 = $30.00.
- **Bob, as a market maker**, wants to mint 100 pairs, which takes $100. That means five Circle requests, the last one 8 hours after the first (the plan's arithmetic). A bot quoting every market with 100 pairs each needs about $4,900, which is 245 requests (the plan, Q21).
- **With Meridian's own test dollar** (option c below), Alice clicks "Get test USDC" and gets, say, 1,000 test dollars at once. The amount is a design choice. Bob's bot gets what it needs from a script.

**3. The options and their evidence.**

For dollars:
- **(a) Circle's devnet USDC, with users sent to Circle's public faucet.** In favour: it is the real devnet USDC that the spec's word "USDC" points to (F1.07). Against: 20 USDC every 2 hours (F1.05) is too little for a market maker or a bot. The faucet also sits behind a reCAPTCHA (a "prove you're human" check) and offers no API (F1.05), so scripts can't use it.
- **(b) Circle's faucet API** (POST /v1/faucet/drips), which lists SOL-DEVNET and a USDC option (F1.06, CONFIRMED). Against: Circle says calling it "requires upgrading to mainnet", which is an account tier, and it gives no rate limit (F1.06). Whether a free account works, and what the tier costs, is unknown.
- **(c) Meridian's own test-dollar token**, with a "Get test USDC" button and an unlimited route for scripts. This is the plan's proposal. In favour: no third-party limits, so a bot, a grader's script and a fresh demo after a devnet reset all work. Against: it isn't Circle's USDC, so it departs from the spec's literal "USDC" and needs a logged reason. This report leaves the claim that a self-issued token works this way UNCONFIRMED (F1.09). It uses the same mint-authority mechanism that the plan already relies on for the Yes and No tokens (D24), so the first milestone will prove it either way.
- **(d) A switch between them.** The plan already makes the dollar token's address a setting, so a deployment can use (c) or Circle's mint (a). Each market's vault holds one kind of token, so a deployment uses one at a time.

For SOL there is no "own token" option, because SOL is the network's own coin:
- **the web faucet:** 2 requests every 8 hours, with more after a GitHub sign-in. The page also says AI agents should not use it (F1.02, CONFIRMED);
- **the command-line airdrop:** up to 5 SOL per request, and Solana's docs point to the web faucet when it is rate-limited (F1.03, CONFIRMED);
- **other faucets:** RPC providers (Helius, QuickNode, Triton), a proof-of-work faucet and Discord bots (F1.04, CONFIRMED list, no amounts). A third-party comparison reports QuickNode at 1 SOL per 12 hours with a mainnet-balance requirement (F1.44, SECONDARY);
- **a local test chain** with unlimited SOL, for local runs only (F1.02);
- **a project wallet that sends each new user a little SOL** along with the test dollars. This moves the faucet limits from the user onto the project.

**4. What each answer commits you to.**
- **(a):** nothing to build. But every user makes two faucet trips with waits, a bot becomes impractical, and the grader's scripts need some other source of dollars.
- **(b):** an account upgrade with Circle (a possible spend, so ask before signing up), an API key kept in the backend (D17), and an unknown limit.
- **(c):** a mint-authority key held by the backend, or a faucet instruction in the program. It also needs a per-wallet limit on the button, a distinct token name so nobody mistakes it for Circle's USDC (this feeds Q22), a script that recreates the token after a devnet reset, and a line in DECISIONS.md explaining the departure from "USDC".
- **A SOL drip from a project wallet:** regular top-ups for that wallet through the command-line airdrop or provider faucets, inside the public rate limits (F1.01, F1.03). The plan's low-balance alert (D29) already watches the bot's wallet and would cover this one too.

**Recommendation (Claude's; yours to accept or reject).** (c) with (d)'s setting, which is the plan's proposal, plus a guided SOL step: link to the web faucet first, and add a small capped SOL drip only if testing shows beginners get stuck. Keep Circle's mint as the documented alternative.

### Q22. How should the app make clear that devnet tokens are play money?

**1. The terms.**
- **Play money** here means tokens that can't be turned into real money. Solana says "Devnet tokens are not real" (F1.01). Circle says testnet USDC has "no financial value" and is not backed by real dollars (F1.07). Phantom says "Tokens on test networks have no real value" (F1.10). All three are CONFIRMED.
- A **banner** is a strip across the top of every page. A **testnet mode** is a switch, in a wallet or an app, that moves it onto a test network.
- A token's **name and symbol** are the labels wallets show for it, such as "USD Coin" and "USDC". Whoever creates the token chooses them.

**2. Worked example.** Alice clicks "Get test USDC", and her screen says "Balance: 20.00 USDC". She buys 10 Yes at $0.65, and the ticket says "You pay $6.50". META closes at $684, and Portfolio shows "$10.00 to redeem". Nothing on screen has told her that none of this can be withdrawn as dollars. Under the plan's proposal she sees "Devnet · test USDC, no real value" at the top of every page, her balance reads "20.00 test USDC", and her ticket reads "You pay 6.50 test USDC". But if the token were Circle's devnet USDC, her wallet's own signing window would still say "USDC". Wallets show the token's own name, which Meridian doesn't control (judge's reasoning, not a finding).

**3. The options and their evidence.**
- **Rely on the wallet.** Phantom shows a banner in its testnet mode (F1.10, CONFIRMED). Phantom's developer docs, however, mention neither the banner nor the no-value point (F1.11), and Meridian can't count on every user's wallet. Not enough on its own.
- **A persistent banner in the app** (the plan's proposal). Aave puts its test market behind a testnet-mode switch at the top right of its app, with a Faucet tab (F1.12, CONFIRMED). Its guide page doesn't itself say the tokens have no value, though its faucet pages reportedly do (F1.13, SECONDARY). Uniswap's wallet has a testnet mode described as trying features "without real funds" (F1.14, SECONDARY).
- **A different name for the unit.** Manifold writes its play money with an "M" prefix (M1000) and says it "cannot be converted to cash" (F1.16, CONFIRMED). Kalshi's demo uses "mock funds" (F1.15, CONFIRMED). For Meridian, this means "test USDC" in the app. If Meridian issues its own token (Q19 option c), it can also get a distinct name and symbol, which wallets will then show too.
- **A first-visit acknowledgement:** a one-time "I understand these are test tokens with no value" step. It could also link to the risks note that the spec requires (F1.39).
- **The same notice wherever money appears:** the faucet button, the order ticket and the redeem screen.
- **A wrong-network warning:** refuse, or warn, when the wallet is on mainnet. This wasn't researched, and how much a website can see of a wallet's network varies by wallet.

None of the sources prescribes exact wording (report, Q22), so the copy is a design choice.

**4. What each answer commits you to.**
- **Banner and "test USDC" wording:** one shared component and a word change. The unit wording must also fit the payoff line from D10 and Q7, for example "You pay 6.50 test USDC" rather than "$6.50".
- **A distinct token name:** only possible if you pick Q19 option (c).
- **An acknowledgement step:** one more click for every new visitor, and remembering in the browser that they agreed.
- **A network check:** research into what each wallet exposes.
- **The mainnet bonus:** if it ever comes back (Q49, deferred), every "no real value" label must switch off with the network setting. So tie the label to the deployment's network rather than hard-coding the text.

**Recommendation (Claude's; yours to accept or reject).** The plan's banner and "test USDC" wording, plus a distinct token name through Q19 option (c), and the same short notice on the faucet button and the order ticket. Leave the acknowledgement step to USERS.md, where it can double as the link to the risks note. Nothing was found on whether users ignore banners (the report's case against), so this rests on practice, not measurement.

### Q40. Which user stories does a complete product need that the spec leaves out?

**1. The terms.**
- A **user story** is one short sentence about what a type of person needs to do. It is used to plan and test the build. The **roles** here are trader, market maker, admin (holds the program's admin key), operator (runs the daily jobs) and grader.
- A **failure state** is what a person sees when something goes wrong: a rejected signature, a closed market, a devnet outage.
- The approved **Story map** froze S1 to S29 on 2026-10-09. S25 to S29 are the stories the spec left out: getting test money, an open order refunded at close, a Buy No limit order shown as pending, "under review" when the price band straddles the strike, and a devnet outage. Changes now need a logged decision (the story files say so).
- A **resting order** is a limit order waiting in the order book. A **partial fill** is when only part of it trades.

**2. Worked example.** At 10:00 Alice places "buy 10 Yes at $0.60" while the cheapest seller asks $0.65, so her order rests. Under the plan's book design it locks $6.00 of her test dollars (D21). At 11:00 a seller takes 4 at $0.60. Alice now holds 4 Yes ($2.40 spent), and $3.60 is still locked in the open part. At 2:00 PM she changes her mind and cancels, and the $3.60 comes back. No story in S1 to S29 covers this. S26 covers the automatic cancel at 4:00, and S27 covers cancelling a Buy No limit order, but no story covers a trader cancelling her own order or seeing a partial fill. Kalshi's help pages treat both as normal: orders may fill "completely, partly or not at all", and an unfilled order is not a position (F1.23, CONFIRMED). Without a cancel, Alice's $3.60 would stay locked until the 4:00 sweep.

**3. The options and their evidence.** The report found no published story list from a comparable venue (report, gaps), so these candidates come from venue help pages and the spec. They fall into three kinds.
- **Already covered by a story or a plan item:** the admin adds a strike (S14), pauses (S21), overrides a settlement (S16) and sets up the config (S20). The grader's one-command setup and lifecycle run are S23. Holidays and 1:00 PM early closes (F1.28, CONFIRMED) fall under S13 with D12 and Q14. Stock halts (F1.29, SECONDARY) fall under the plan's Q48 and S15, and splits (F1.30, SECONDARY) under Q35 and S12. Exiting a Yes-plus-No pair before settlement, where the spec contradicts itself (F1.39), falls under the plan's Q5, S7 and S27. Redeeming a loss for $0, or redeeming much later, falls under S17, and "redeemable indefinitely" is the spec's own wording. F1.25 is UNCONFIRMED and isn't needed for this.
- **Not covered by any story:**
  1. A trader cancels her own resting order and sees partial fills (F1.23, CONFIRMED). This one locks money, so it passes the report's test of whether a failure can lose or lock funds.
  2. An operator on devnet checks that the 8:00 AM and 4:05 PM jobs ran and acts on alerts. The only operator story, S22, is tied to the mainnet bonus, which you deferred (Q49), yet the plan builds alerts and retries for devnet (D29). The plan's own USERS.md notes list operator stories (read the daily check alerts, skip a stock on a split day, handle an outage) that no story holds.
  3. A visitor reads the risks and limitations note that the spec requires. The spec gives it no page (F1.39, CONFIRMED).
  4. A devnet reset, where the network is wiped (F1.01, CONFIRMED). S29 covers a halt, where everything on the chain survives, but not a reset. The pilot review found the same gap.
  5. A market maker quotes or cancels in bulk, and the admin changes thresholds after setup. The plan's D27 adds an Update Config function, but S20 covers only the first setup. These are nice to have.
- **Failure states rather than stories:** wrong network, low SOL, a rejected signature, a failed transaction. These belong in the states list (Q52), not in separate stories.

**4. What each answer commits you to.**
- **Keep S1 to S29 as they are:** nothing new to research. Items 1 to 4 must then be written into existing stories' acceptance criteria (for example, own-order cancel into S4 and S26), or they risk being missed.
- **Add the few that lock money or are required:** a logged decision under the freeze rule, then research and tests for each one: own-order cancel with partial fills, a devnet operator, and the risks note. Items 4 and 5 attach to S29 and S20.
- **Add every candidate:** a bigger build. The spec's success criteria (the invariant, the four trade paths, the devnet lifecycle and the documented trade-offs) need few of them (report, Q40 against).

**Verdict on your direction (keep the missing stories for USERS.md, with S25 to S29 frozen): Holds with a caveat.** Each of the five is backed. S25 rests on the faucet and no-value findings (F1.01 to F1.07), and S27 on the spec's own Buy No limit rule (F1.39). S26, S28 and S29 rest on plan items reviewed in other groups. The caveat is the four gaps above, chiefly own-order cancel and a devnet operator, which need either new stories or a place in existing ones.

**Recommendation (Claude's; yours to accept or reject).** Through one logged decision, add a story for own-order cancel with partial fills and one for the devnet operator. Put the risks note into S1 (the landing page) and the reset case into S29 as acceptance criteria.

### Q52. What do the spec's pages and UI elements leave unspecified?

**1. The terms.**
- A **screen state** is a version of a screen for one situation. A screen can be **loading** (waiting for data or a signature), **empty** (nothing to show yet) or in **error** (something failed), as well as in its normal state.
- A market's **lifecycle states** are the stages of its day: created, minting open (9:00), trading (9:30), closed (4:00), settling (about 4:05) and settled. There is also paused and, under the plan, "under review".
- **Implied probability** is the Yes price read as a chance. Yes at $0.65 means the market puts roughly a 65% chance on META closing at or above $680.
- An **activity log** lists everything a wallet did, not only trades: mints, sales, cancels, refunds and redemptions.

**2. Worked example.**
- **An empty book.** At 9:31 on a quiet morning nobody has posted orders on the $680 strike yet. A card that shows "Yes $0.00" tells Alice the market thinks Yes is impossible. It should say "No quotes yet" (the plan's Q52 item 4).
- **The countdown.** Friday 27 November 2026 is a 1:00 PM early close (F1.28, CONFIRMED). At 12:30 PM, a countdown fixed to 4:00 PM ET, as the spec has it, shows 3 h 30 min left, when trading actually ends in 30 minutes.
- **Position value.** Alice holds 10 Yes bought at $0.65 ($6.50). At noon the best bid is $0.60 and the best ask $0.62. Valued at the bid, her position is worth $6.00 (−$0.50). At the midpoint, $0.61, it is worth $6.10 (−$0.40). Kalshi warns that displayed value is "not a guaranteed amount you can sell them for" (F1.23, CONFIRMED). The screen has to say which price it uses.
- **History.** Bob's Buy No is a mint of 10 pairs ($10.00) plus a sale of 10 Yes ($6.50 back). A "trade execution log", the spec's words, shows one Yes sale. Bob looks for "bought 10 No for $3.50" and can't find it.

**3. The options and their evidence.** First, the plan's six gaps (Q52 items 1 to 6), checked against the evidence:
- **(1) Market-maker page.** The spec's market-maker story asks for "a dashboard or portfolio view" (judge's check of the spec), but the five-page list has none (F1.39, CONFIRMED). The plan adds it to Portfolio or as its own page (S11, group 2). Supported.
- **(2) Payoff line.** Supported (F1.38, F1.23, F1.17); see "D10 in numbers" above. Add the profit and the No version.
- **(3) Countdown target.** The early-close part is supported (F1.28). Counting to 3:59 depends on Q4's buffer (group 2). The spec counts down to 4:00 PM while settlement runs at about 4:05 (F1.39), so the screen needs two moments: "trading ends" and "result expected".
- **(4) Empty book.** No finding either way. This is reasoning, and which price implied probability uses depends on Q38 (group 2).
- **(5) History.** The plan proposes both the user's own trades and the market's recent trades. Polymarket's activity record reportedly covers trades, splits (mints), merges, redemptions, deposits and withdrawals (F1.26, SECONDARY). That suggests the user's History should also list mints, cancels, refunds at close and redemptions, which the plan's item 5 doesn't mention.
- **(6) Operator screens.** The spec's gap supports this (F1.39). How to protect them is Q54.

The report also adds further states:
- wallet and network states: disconnected, wrong network, no token account, zero SOL. Aave tells users to switch network and get gas (fee money) first (F1.12, CONFIRMED);
- open, pending and closed orders, and partial fills (F1.23);
- a Buy No limit order holding both tokens (F1.39, S27);
- the settlement price and the outcome;
- mobile layout and accessibility;
- a link to the risks note.

The plan's own "States and transitions" list (market lifecycle, order lifecycle, loading, empty and error states) already covers most of these.

**4. What each answer commits you to.**
- **The spec's minimum:** the grader's front-end tests list wallet connection, placing and signing orders, real-time prices, both views of the order book, the position constraint, portfolio and P&L, and settlement and redeem (judge's check of the spec; the report's case against says the same). This is the least work, but it leaves beginners without empty and error states.
- **Every state on every screen (your direction):** the most front-end work, because each state needs a design and a test. D30 item 8 already plans tests for the loading, empty, error, reconnecting, devnet-down and under-review states.
- **Ranked:** start with the states where a wrong screen costs money or misleads: the payoff line, a pending Buy No limit order, open orders and partial fills, wrong network and low SOL, and the countdown on early-close days. Then the display states (empty, loading, stale price), then the market-maker and admin views.

**Verdict on your direction (every screen gets its loading, empty and error states): Holds with a caveat.** The evidence supports it. Venues separate open, pending and closed orders and warn about what a position is worth (F1.23). Test apps make users fix the network and get gas first (F1.12). A fixed 4:00 countdown is wrong on early-close days (F1.28). The caveat is scope and order. The grader's test list is narrower, only the venues' help pages were opened (not their live screens), and nothing measured which states real users hit most.

**Recommendation (Claude's; yours to accept or reject).** Keep the direction, rank the work as above, and widen History into an activity log.

### Q54. With no accounts, how do traders, the admin and the operator prove who they are?

**1. The terms.**
- **Non-custodial** means Meridian never holds anyone's money or keys. Each person's wallet does.
- A wallet holds a **private key**, which is secret, and shows a **public key**, also called the address, which can be shared. A **signature** is proof, made with the private key, that the owner approved one specific transaction or message.
- **Sign In With Solana (SIWS)** is a standard way for a website's server to check that a visitor controls an address. The wallet signs a short message naming the site and a one-time code (a **nonce**), and the server checks it (F1.31, CONFIRMED).
- The **admin authority** is the public key stored in the program's settings account (its **config**). Only that key may run admin actions such as pause, add a strike and override a settlement.
- **Anchor** is the Rust framework the program is written in. Its **has_one** check confirms that an account passed in matches the stored key. Its **Signer** check confirms that the key actually signed (F1.33, F1.34, both CONFIRMED).
- A **multisig** is an account controlled by several keys, where an action needs, say, 2 of 3 approvals. Squads is the common one on Solana (F1.35, CONFIRMED). A **time lock** is a forced wait before an approved action takes effect.
- The **operator key** is a "hot" key, one kept on an always-on server, that the automation service uses for the daily jobs.

**2. Worked example.**
- **Alice trades.** She connects her wallet, and the site learns her address (F1.37, CONFIRMED). She buys 10 Yes at $0.65, and her wallet asks her to sign. The program checks the signature and moves $6.50 of her test dollars. There is no account and no password.
- **Mallory tries the admin page.** The page can load in her browser, because the website is plain files (D23). She clicks "Pause". The program checks whether the admin key signed. It didn't, so nothing happens (F1.33, F1.34). If the program used only has_one, without the Signer check, it would compare keys without checking who signed. Mallory could then pass in the admin's public key, which anyone can read, and pause trading (F1.34).
- **What it means in dollars.** Alice holds 10 Yes ($6.50) and Bob 10 No ($3.50). With a stolen admin key and no wait, a thief could override the settlement to "No wins". Bob would get $10.00 and Alice $0.00, a $10.00 swing on one pair of positions. Signer checks, careful key storage and the plan's two-step override with a waiting period (Q43) are what stop that.
- **Mallory calls the backend directly.** If the operator page reads the backend's logs or alerts through an API, hiding the page in the browser does nothing, because Mallory can call the API herself. The Next.js guide says client-side restrictions "alone are not sufficient" and that checks belong close to the data (F1.36, CONFIRMED). That API needs its own check.

**3. The options and their evidence.**
- **Traders connect, with no sign-in.** The wallet library supplies the address and sends signed transactions (F1.37). SIWS is needed only if the server keeps private per-user data (F1.31), and the plan notes that P&L and History data are public on-chain anyway (Q54).
- **Admin: one key or a multisig.** A single key is simple but a single point of failure, which may be acceptable on devnet (report, Q54 against). Squads has independent audits, time locks and roles. It also warns that whoever controls its settings can change the members and the approval threshold (F1.35, CONFIRMED). The plan points towards a multisig with a time lock (Q25, Q43).
- **A separate operator key with narrower powers:** creating markets and normal settlement, but not pause or override. The sources don't prescribe this (report). The plan already leans this way: the bot's key is separate from the admin and upgrade keys (Q21), only the bot may settle until a deadline (Q37), and D24 lets the "admin or automation key" create markets.
- **The operator page:**
  - (i) public but inert, with every power checked on-chain (F1.33, F1.34, F1.36);
  - (ii) the same, plus SIWS or a signed-message session on the backend for any data that isn't public;
  - (iii) no page, with scripts and an alert channel instead (the plan's Q52 item 6 allows "an admin page or scripts").
- **SIWS has limits.** Phantom's own repository says SIWS is supported only in the Phantom browser extension, version 23.11 or later (F1.31, CONFIRMED). A Phantom discussion shows sign-in failing with Ledger hardware wallets, and no fix had been posted by January 2024 (F1.32, CONFIRMED, though the thread is old). The plan's chosen wallet library (@solana/kit with @solana/react) is not the wallet-adapter library that F1.37 describes, and neither finding confirms SIWS support in it.

**4. What each answer commits you to.**
- **Traders connect only:** nothing to build beyond the wallet connection. Either there is no per-user data on the server, or that data stays public.
- **A single admin key:** simple to set up. Document it as a devnet-only choice and keep the key off the operator's server.
- **A Squads multisig:** setup and member management, slower admin actions (several approvals) and the risk around whoever controls its settings (F1.35). It also changes the admin page, which then builds proposals for members to approve instead of sending transactions directly.
- **A separate operator key:** a second stored key in the config and a Signer check on each instruction it may call. If the operator key leaks, the thief can create markets or settle on schedule, but can't pause or override.
- **(i) A public, inert page:** nothing secret on the page. The cheapest option.
- **(ii) Plus a backend sign-in:** a nonce endpoint and a signature check in the always-on service, tested with the wallets you will actually use. If the admin is a multisig, the sign-in must accept a list of member or operator keys, because a multisig account has no single key that can sign a message (judge's reasoning, not a finding).
- **(iii) Scripts only:** less front-end work. The operator works from a terminal and an alert channel.

**Recommendation (Claude's; yours to accept or reject).** Traders only connect. The program checks both has_one and Signer on every admin and operator instruction. A separate operator key handles market creation and normal settlement. The operator page starts public and inert. Add a backend sign-in only for data that isn't public, check it against an allow-list of keys rather than "the admin wallet", and test it with the wallet, including any hardware wallet, that you plan to use.

## Conflicts

1. **The payoff line inside the plan: D10 against Q7 and Q52.** D10 keeps the spec's "You pay $X. You win $1.00 if …". Meanwhile Q7 proposes "at or above", and Q52 item 2 proposes a fuller line with totals, the settlement source and the most you can lose. The evidence backs the fuller line (F1.38, F1.23, F1.17). Q52's version still lacks the profit figure and a No version (F1.39), which the report's leading answer adds.
2. **The spec against itself on ties.** The payout rule, the worked example and the at-strike test say "at or above" (F1.38). The headline question, the payoff sentence and the glossary's "Contract" entry say "above" (F1.38), and so do the market labels "META > $680" on spec pages 4, 6 and 7 (judge's check of the spec). The plan's running example already writes "META ≥ $680". Settling Q7 means changing the labels as well as the payoff line.
3. **Polymarket's tie rule: the plan's research against this report.** The plan's research notes say "Polymarket and HIP-4 both pay Yes on 'at or above'". This report found that Polymarket's META Up/Down market pays 50-50 on a tie (F1.22, CONFIRMED) and that its weekly "above" stock markets reportedly pay No on a tie (F1.21, SECONDARY). Polymarket's rule depends on the market type. D1 rests on the spec, so it is unaffected, but the docs shouldn't cite Polymarket as agreeing with Meridian's tie rule.
4. **Q7's option C against A4's precision.** Storing the line a fraction below the strike (F1.20, SECONDARY) gives the same result as "at or above" only if prices are compared at a fixed precision. Pyth prices carry more decimals than cents, and A4 converts them before comparing with the strike. If that conversion rounds, a close of $679.996 could become $680.00 and turn a No into a Yes. A4 should say "truncate, never round up", or compare at full precision (judge's reasoning; A4 belongs to group 4).
5. **The own test dollar against the spec's "USDC" (Q19).** The spec says Mint Pair takes "$1.00 USDC". The plan's own token isn't Circle's devnet USDC (F1.07), and this report leaves the claim that it works UNCONFIRMED (F1.09). Circle's routes are too small for a bot (F1.05) or need an account upgrade (F1.06). The plan's setting to switch tokens answers most of this, but DECISIONS.md must record the departure.
6. **Q22's label against Q19's choice.** A distinct token name that wallets also show is possible only with Meridian's own token. With Circle's token, the app can relabel its own screens, but the wallet's signing window still says "USDC" (judge's reasoning). The report reaches the same point: a label alone may not prevent confusion with real USDC (Q22, against).
7. **The faucet the plan sizes against is for people (D29 and Q55 against F1.02 and F1.03).** The plan measures the bot's SOL needs "against a faucet of 2 requests per 8 h". That faucet is a web page for people, and it says AI agents should not use it (F1.02). The scripted routes are the command-line airdrop, at up to 5 SOL per request (F1.03), and provider faucets (F1.04), all within the public rate limits (F1.01). The bot's top-up plan should name one of those.
8. **The operator page's sign-in against the plan's key plans (Q54 against Q25, Q43 and the §10a research).** Q54 says the operator page "must be authenticated by the admin wallet" with SIWS. The plan also wants the admin to be a multisig with a time lock (Q25, Q43) and, from its key-care research, to use hardware wallets (§10a). SIWS is supported only in Phantom's browser extension (F1.31), it reportedly fails with Ledger hardware wallets (F1.32), and a multisig has no single key that can sign a sign-in message (judge's reasoning). An allow-list of keys avoids the clash.
9. **Where the check lives (Q54 against D23 and F1.36).** F1.36 says checks belong close to the data. D23 makes the website plain files with no server. So any check on non-public operator data has to live in the always-on backend's API, not in the page or in a Next.js server.
10. **The wallet library (F1.37 against the plan's research).** F1.37 describes the wallet-adapter library. The plan's research calls wallet-adapter-react legacy and leans towards @solana/kit with @solana/react. Both give the address and signing, so the trader model holds, but nobody has checked SIWS support in the chosen library.
11. **The countdown (Q52 item 3 against the spec).** The spec counts down to 4:00 PM ET. The plan counts to the trading cutoff (3:59 if Q4's buffer is adopted) and to 1:00 PM on early-close days (F1.28). Settlement runs at about 4:05 (F1.39). This departs from the spec's wording and needs a logged reason.
12. **History (Q52 item 5 against F1.26).** The plan proposes the user's own trades plus the market's recent trades. The venue evidence points to an activity log that also includes mints, merges and redemptions (F1.26, SECONDARY). The spec says only "Trade execution log".
13. **The frozen Story map against uncovered stories (Q40).** S1 to S29 are frozen, yet own-order cancel with partial fills (F1.23), a devnet operator and the risks note (F1.39) have no story. The only operator story, S22, is tied to the mainnet bonus, which is deferred (Q49). S29 covers a halt but not a reset (F1.01).

## Weakest spots in the evidence

- **No venue rule text for a tie.** Kalshi's contract PDFs were unreadable, and Polymarket's rules didn't render (report, gaps). Q7's venue comparison therefore rests on Robinhood's labels (F1.17), Kalshi's API (F1.18) and three SECONDARY snippets (F1.19, F1.20, F1.21). The spec alone settles the rule, so the venue evidence only shapes the wording.
- **No venue order-ticket wording.** How Kalshi or Polymarket word a buy ticket wasn't found (report, gaps). D10's fuller line rests on Kalshi's portfolio help (F1.23), a SECONDARY sell-flow snippet (F1.24) and reasoning.
- **No user testing.** Nothing measures whether beginners misread "above", find "at or above" cluttered, or ignore banners (the report's cases against Q7 and Q22).
- **SOL faucet amounts are unknown.** The web faucet doesn't state an amount or its GitHub-tier limit, and the proof-of-work faucet's repository returned 404 (report, gaps). The only other limits come from one third-party article (F1.44, SECONDARY).
- **Circle's API route is unknown.** Nobody checked whether a free account can call it, or at what limit (F1.06; report, gaps). Whether Circle's devnet token survives a devnet reset wasn't found either.
- **The own-token route is UNCONFIRMED in this report** (F1.09), though it uses the same mechanism D24 relies on.
- **Testnet apps' on-screen wording wasn't opened.** Aave's and Uniswap's faucet and app text are SECONDARY (F1.13, F1.14), or the opened page was silent (F1.12).
- **No comparable venue's story list** was found (report, gaps), so Q40's candidates are inferred.
- **No grader rubric.** The scope of D10, Q40 and Q52 depends on it, and only the spec's own test list is known.
- **The venues' live screens weren't opened** (report, Q52 against), so how Kalshi and Polymarket show empty, error and paused states is unknown.
- **The SIWS evidence is narrow and dated.** F1.31 comes from Phantom's own repository, other wallets weren't checked, and the Ledger thread dates from January 2024 (F1.32). Squads' detailed docs on time locks and roles weren't opened, and F1.35's sentence about admin keys on Squads' docs home wasn't verified (report, gaps).
- **Some CONFIRMED findings carry an inference.** F1.28's point about fixed countdowns and job schedules, and F1.38's point that closes are quoted in cents, are the author's reasoning on top of confirmed text. F1.39's verifier didn't individually check the market-maker dashboard story or the Buy No limit-order detail. This judge checked both in the spec text, and both are there.
- **The fee evidence is SECONDARY** (F1.27). The plan's no-fee assumption (A1) makes it irrelevant for now.
