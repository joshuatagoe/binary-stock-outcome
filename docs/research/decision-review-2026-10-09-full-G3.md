# Decision review 2026-10-09-full, group 3 (Daily cycle): judge's report

Group 3, "Daily cycle", covers three stories: S12 (the bot reads the previous close at 8:00 and creates every market by 8:30), S13 (minting opens at 9:00, trading at 9:30, and trading stops at the close) and S14 (the admin adds a strike during the day). Items: D6, D7, D12, D29, Q8, Q9, Q10, Q14, Q32, Q33, Q34, Q35, Q42.

Evidence: `docs/research/reports/2026-10-09-full-G3.md` (findings F3.01 to F3.37) and the input file `docs/research/inputs/G3-daily-cycle.md`. Proposals and directions: `docs/planning/2026-10-08-phase-1-plan-session-2.md`.

**How to read the labels.** A **CONFIRMED** finding means the primary source was opened and checked again. A **SECONDARY** finding comes from a second-hand source, such as a news article or a search summary. Only these two kinds carry weight. **UNCONFIRMED** findings (F3.27, F3.32, F3.35, F3.36, F3.37) are named where they matter, and no verdict rests on them. Three of them (F3.35, F3.36, F3.37) are the researcher's own arithmetic. I re-ran that arithmetic with a short script using exact fractions and half-up rounding, and it matches. Where I use those numbers I mark them "arithmetic, re-checked". The plan's own earlier research was not checked again in this review.

**The running example, and the words it uses.** A **strike** is the dollar line in a market's question: "$680" in "META ≥ $680 today?". A **Yes token** pays $1.00 if META closes at or above $680, and a **No token** pays $1.00 if it closes below. With Yes at $0.65 and No at $0.35, Alice pays $6.50 for 10 Yes and Bob pays $3.50 for 10 No. Their $10.00 sits in the market's **vault**, the account that holds the money behind the tokens, until the winner **redeems**, which means swapping each winning token for $1.00. The **previous close** is the stock's last price at the end of the last trading day. The **oracle** is the outside service that reports stock prices to the blockchain; the plan uses **Pyth**.

## Summary

This group checks how each day's markets come into being: how the strikes are computed (D6), the times of day (D7), where the list of trading days comes from (D12), and which background jobs the system runs (D29). The plan holds on all four, but each needs a written fix. The strike formula works at today's prices and gives 39 markets a day, or 46 with the optional seventh strike (F3.08 prices; arithmetic re-checked). That is fewer than the plan's "up to 49", which is the ceiling, not the expected count. The plan's word "adjust" has to mean "add", because changing a strike under people who already hold the market breaks the norm that a contract can't change after it is sold (F3.26). Every time of day must come from that day's calendar entry, because NYSE and Pyth both list 1:00 PM early closes (F3.01, F3.02). The 8:00 read must ask for the price at yesterday's close by its timestamp; asking for the latest price would not return the close. Since 26 August 2026 that read also needs the Pyth key (F3.03). The jobs should be scheduled in New York time from the calendar, not from a fixed clock string, so that settlement moves to about 1:05 PM on short days. Of the open questions, most of the plan's proposals survive, but four need fixes. Q32 must round only once, from the oracle's exact number, because rounding first to whole cents can flip a strike. Q33 must also require an empty order book before a market can be removed. Q35's "split-adjusted previous close" has no identified source, and after a big split the $10 grid leaves only two strikes. Q10 still quotes the costs of order books the owner has since rejected. On Q42, a fixed 30-second retry can send the same market twice unless market addresses are fixed in advance. The weakest evidence is what was not found: no data on which strikes actually trade, no live test of the Pyth price endpoints, and nothing on how Pyth handles stock splits.

## Verdicts

The source column is copied from the plan: "spec" means the spec says it, "owner" means you asked for it or decided it, and "Claude proposal" means Claude suggested it and you have not yet confirmed it. No open question in this group has a direction from you yet, so each Q is marked "Your call", and the why column says how the plan's proposal fares against the evidence.

| Item | Source (from the plan) | Verdict | Why |
|---|---|---|---|
| D6: strikes at ±3%, ±6%, ±9% of the previous close, rounded to the nearest $10, duplicates removed, optionally plus the rounded close; admin can add or adjust; "up to 7 per stock, so up to 49 markets a day" | spec | Holds with a caveat | The formula works, and removing duplicates is necessary: at today's NVDA price of about $230 one $10 step is about 4%, so the ±3% and ±6% rungs land on the same strikes (F3.08; arithmetic re-checked). At today's prices the count is 39 a day, or 46 with the rounded close (F3.35, arithmetic re-checked), so "49" is a ceiling for budgets and limits, not a forecast. Compute with whole numbers from the oracle's integer price, not with decimals that a computer only approximates (F3.08, F3.24). "Adjust" must be narrowed to adding strikes, because editing a held market changes the bet under its holders (F3.26); Q33 covers this. |
| D7: 8:00 read close, 8:30 create markets, 9:00 visible and minting, 9:30 trading, 4:00 close, about 4:05 settle, redeem forever after | spec | Holds with a caveat | The order of steps is sound, and the only step that cannot slip is the trading cutoff. "4:00" must mean each market's own close time from the calendar, because NYSE and Pyth both close at 1:00 PM on early-close days (F3.01, F3.02). "8:00 read close" must be a read of the price at yesterday's close, requested by timestamp. Outside the session Pyth says "it's not clear what an equity's price is" (F3.06), and Pyth's paid service could answer a "latest" request at 8:00 with a pre-market price (F3.07, F3.08). That read needs a Pyth key since 26 August 2026 (F3.03), so the morning job depends on the Pyth trial as much as settlement does. |
| D12: trading days come from the exchange's calendar (Oct 12 open, Nov 26 closed, Nov 27 closes at 1 PM) | Claude proposal | Holds with a caveat | NYSE's page lists 2026 to 2028, and the plan's dates match it exactly, including all three examples (F3.01). Pyth's own feed schedule matches NYSE on every date it carries (F3.02, F3.33), so a calendar table kept in the repo is sound. Add three things: a test that fails when the table runs out; a daily cross-check against Pyth's feed information, which needs no key (F3.02) but only reaches 5 July 2027 (F3.33); and a manual skip, because unscheduled closures such as 9/11 or Hurricane Sandy appear in no calendar (F3.05, SECONDARY). The plan's Alpaca cross-check wasn't verified, and the Nasdaq page, the listing exchange for all seven stocks, wasn't opened. |
| D29: backend job list (the spec's two jobs plus calendar, split check, paced creation, close sweep, price posts, official-close pre-check, evals and fallback; always-on relay, fill recorder, devnet watch, low-balance alert; New York time) | spec + Claude proposal | Holds with a caveat | The list covers every job the report found and more. Scheduling in the America/New_York zone is right: the common Node schedulers handle the clock changes predictably (F3.21), and the changes fall on Sunday mornings when markets are shut (F3.23, SECONDARY). GitHub's scheduled runs can be delayed, so they suit settlement poorly (F3.22). A fixed schedule such as "16:05 on weekdays" would miss the 1:05 PM settlement on early-close days, so each day's run times must be computed from the calendar. With the owner's own order book (D21), no "crank" job is needed (a crank is a bot some order books need to process trades; F3.15, F3.31 SECONDARY). Every extra job is another way to fail, so consider building them as one repeatable check that compares what should exist with what is on the chain (the report's case against, reasoning only). |
| Q8: offer the rounded previous close as a 7th strike? | Claude proposal (open) | Your call | The plan's reason, "the most-traded strike", has no data behind it: no source on trading by strike distance was found (gap), and Cboe's statement is qualitative only (F3.29). A better reason exists: both of the spec's worked examples include this strike (META 680 and AAPL 230), and the running example's $680 market is this strike. It costs 7 more markets a day (F3.35, arithmetic re-checked). |
| Q9: who sets the "user-determined percentage intervals"? | Claude proposal (open) | Your call | The proposal, offsets in config with 3/6/9 as the default, fits the evidence. The only evidence on who the "user" is comes from venue practice: on Kalshi traders request strikes and staff review them (F3.25), and Nadex used fixed spacing per stock (F3.30, SECONDARY). One day's price moves (F3.08) can't size the ladder. |
| Q10: who pays SOL fees and account deposits, and how much per day? | Claude proposal (open) | Your call | The cost formulas are confirmed (F3.11 to F3.14), giving about 0.008 SOL per market before the order book (arithmetic, re-checked). The plan's per-market figures (0.007 to 1.9 SOL) describe Manifest and OpenBook, which the owner has since rejected in favour of an order book we build ourselves (D21), and they come from Manifest's own comparison (F3.15). The size of our own book account will dominate the cost, and the faucet allows only 2 requests every 8 hours (F3.16). |
| Q14: early-close days | Claude proposal | Your call | The proposal (store a 1:00 PM close, settle at about 1:05) is option A, and the evidence backs it. NYSE and Pyth both close at 1:00 PM on 27 November and 24 December 2026 (F3.01, F3.02), and Polymarket reportedly treats short sessions as normal days (F3.28, SECONDARY). Add 26 November 2027, which the plan's list leaves out (F3.01). |
| Q32: rounding rule and number format for strikes | Claude proposal | Your call | The proposal (half-up, no decimals that computers approximate, one shared function) fits F3.24 and F3.08. One fix: "computed in whole cents" adds a second rounding, because Pyth prices carry five decimal places (F3.08), and that can flip a strike. A close of $499.995 gives a −3% strike of $480 exactly, but $490 if the close is first rounded to $500.00 (my arithmetic). |
| Q33: what "adjust strikes" means for a market people hold | Claude proposal | Your call | The proposal (a strike never changes; "adjust" means add, or remove only before anyone has minted) matches the norm that a contract can't change under its holders (F3.26) and Kalshi's add-only practice (F3.25). One gap: after 9:30 a bid to buy Yes can sit on the order book with USDC locked before any token exists (D21), so a removed market also needs an empty book. The removed market's token-definition accounts can never be closed, so their deposit is lost (F3.13). |
| Q34: strikes after an overnight jump; does the oracle give a pre-market price? | open (options listed, no proposal) | Your call | A pre-market price exists only in Pyth's paid service (F3.07, F3.08). The standard feed lists the regular session only (F3.02, F3.06), and the trial is temporary (F3.03). The spec's Add Strike needs no extra data but does need someone watching at the open. |
| Q35: stock splits and share classes | Claude proposal | Your call | The GOOGL part holds: GOOGL and GOOG are separate feeds (F3.09), and a third "GOOGL 24/7" feed also exists, so pin the exact feed ID. The "split-adjusted previous close" has no identified source, because Pyth's docs say nothing about splits (F3.10, SECONDARY), so what the evidence supports is detecting a split and skipping that stock. After a 10-for-1 split, the $10 grid leaves only two strikes (my arithmetic). |
| Q42: how the morning job retries, and the limits on a burst of transactions | spec + Claude proposal | Your call | Pacing under 40 sends per 10 seconds is right (F3.17). A fixed 30-second retry is allowed by Solana's guide (F3.18), but the spec says "retry with backoff" and AWS recommends a growing wait with a random spread (F3.19). A transaction stays valid for about 79 seconds (F3.18), so a resend at 30 seconds can create a market twice unless each market's address is fixed by its ticker, date and strike. Confirmation checks share the 100-per-10-second total (F3.17). |

## Briefings

### Q8. Should the rounded previous close be offered as a 7th strike?

**1. The terms.**
- The **strike ladder** is the set of strikes a stock gets each morning: the previous close plus and minus 3%, 6% and 9%, each rounded to the nearest $10, with duplicates removed.
- A strike is **at the money** when it is close to the current price. There Yes and No both cost about 50 cents, because the outcome is close to a coin toss. A Yes is **in the money** when the price is already well above the strike, so Yes trades near $1.00. It is **out of the money** when the price is well below the strike, so Yes trades near $0.00.
- **Rent** on Solana is the deposit every stored account must hold, paid in SOL (Solana's own coin, which is play money on devnet). Each market needs several accounts, so each extra market costs more deposit.

**2. Worked example.** META closed yesterday at $680.00. The six percentage strikes are $620, $640, $660, $700, $720 and $740 (arithmetic, re-checked). The running example's market, "META ≥ $680 today?", is the seventh strike. It exists only under option A, or under option C if the admin adds it. In that market Alice pays $6.50 for 10 Yes at $0.65 and Bob pays $3.50 for 10 No at $0.35. If META closes at $684, Alice redeems for $10.00, a gain of $3.50, and Bob's No pays $0, a loss of $3.50. Under option B, the nearest markets to a $680 open are $660, where Yes only needs META not to fall 3%, and $700, where Yes needs a 3% rise. Neither is a coin toss. Both of the spec's own examples include the rounded close: META at $680 gives seven strikes from $620 to $740, and AAPL at $230 gives $210, $220, $230, $240 and $250. Without the rounded close, AAPL would have only four.

**3. The options and their evidence.**
- **(A) Always add it.** The spec allows it ("optionally"). The spec says the most active trading happens near the current price, and Cboe says that near expiry, options near the money are "extremely sensitive" to price moves (F3.29, CONFIRMED but qualitative). Cost: 39 markets a day become 46 at today's prices, about 18% more (F3.35, arithmetic re-checked), at roughly 0.008 SOL each before the order book (F3.36, arithmetic re-checked).
- **(B) Six strikes only.** This saves 7 markets a day. Under B, the nearest strikes to today's prices are about $7 to $20 away: AAPL at $337 has $330 and $350, NVDA at $230 has $220 and $240, and META at $720 has $700 and $740 (my re-check). The report's claim that the nearest strike is "within about $5 anyway" is wrong (see Conflicts, item 2).
- **(C) The admin adds it when wanted,** using Add Strike. Kalshi adds strikes that traders request after its staff review them (F3.25, CONFIRMED).
- **Missing evidence.** No source gives trading volume by distance from the price (gap). If the stock jumps overnight (Q34), the previous-close strike is no longer at the money, which weakens A on those days.

**4. What each answer commits you to.**
- **(A):** 7 more markets to create and settle every day. That adds rent, a larger 8:30 and 4:05 burst (Q42), and 7 more order books for any market-maker bot to quote (Q21). The running example becomes a real daily market.
- **(B):** a hole in the middle of every ladder, about $20 to $40 wide for the high-priced stocks. Anyone wanting a coin-toss market depends on the admin.
- **(C):** a manual task every morning. If it's forgotten, the hole stays.

**The plan's proposal:** "yes, since it's the most-traded strike." The answer may be right, but that reason is unproven.

**Recommendation (Claude's; yours to accept or reject).** Choose A. Give as the reason that the spec's worked examples assume this strike and that it starts closest to 50/50, not that it is "the most-traded". Check the daily fill records after a few weeks of devnet trading (D26's evals) before calling it the most-traded.

### Q9. Who sets the "user-determined percentage intervals", and should they be configurable?

**1. The terms.**
- The **offsets** are the percentages above and below the previous close: 3, 6 and 9 in the spec's algorithm.
- **Config** means settings stored outside the code. They can live in the bot's settings file, or on the chain in the program's config account, which is set by Initialize Config and changed by an admin update (D27).
- **Volatility** is how much a stock usually moves in a day.

**2. Worked example.** META closed yesterday at $680. With offsets of 3/6/9 the ladder is $620, $640, $660, $680, $700, $720 and $740. With 2/4/6 it is $640, $650, $670, $680, $690, $710 and $720 (my arithmetic). Alice and Bob's $680 market exists either way; only the outer rungs move. Under 3/6/9, a Yes on $620 wins unless META falls about 9% in one day, so it trades near $1.00, and Alice gains only a few cents by buying it. On 9 October 2026 the seven stocks moved between −0.97% and +3.11% (F3.08). That is one day, not a statistic.

**3. The options and their evidence.**
- **(1) Fixed numbers in the code (3, 6, 9).** This is what the spec's algorithm shows.
- **(2) Operator-set offsets in config, the same for all seven stocks.** This is the plan's proposal.
- **(3) Different offsets per stock,** wider for jumpier stocks. No volatility figures were found to set them (gap).
- **(4) Traders request extra strikes and staff approve them.** Kalshi does this (F3.25, CONFIRMED). It treats the traders as the "users" who help set strikes.
- **(5) Fixed dollar spacing per stock around the current price.** Nadex did this (F3.30, SECONDARY, a 2015 news item).
- **A related setting:** the $10 step. For stocks under about $326, the $10 step can make rungs collide (my re-check of the plan's figure). After a split it breaks the ladder entirely (Q35). So the step could be a setting too (the report's D6 answer).

**4. What each answer commits you to.**
- **(1):** nothing to build. The docs should still say who the spec's "user" is.
- **(2):** one setting and a rule for changing it, with changes applying to future days only. If it is stored on the chain, every change is public. If it is stored in the bot's settings, traders can't see changes.
- **(3):** a volatility source and a per-stock setting.
- **(4):** a request form, a review queue and a new user story. The Add Strike function already exists.
- **(5):** a departure from the spec's percentage rule.

**The plan's proposal:** offsets in config, defaulting to 3/6/9. It fits the evidence.

**Recommendation (Claude's; yours to accept or reject).** Choose (2), with the $10 step as a setting too. State in the docs that "user" means the operator, and publish the current values where traders can read them.

### Q10. Who pays transaction fees and account deposits, and how much is it per day?

**1. The terms.**
- A **lamport** is one billionth of a SOL.
- Every transaction pays a **fee** of 5,000 lamports per signature (F3.14).
- Every stored account must hold a **rent deposit** of (its size in bytes + 128) × 6,960 lamports. The deposit is refunded when the account is closed (F3.11).
- A **token account** holds one kind of token for one owner. It is 165 bytes, a deposit of 0.00203928 SOL (F3.12).
- A **mint** is the account that defines a token, such as "META ≥ $680 Yes".
- The **payer** is whoever signs to fund a deposit. The payer can differ from the account's owner (F3.12).
- The **faucet** is devnet's free SOL dispenser. It allows 2 requests every 8 hours (F3.16).

**2. Worked example.** Creating "META ≥ $680" needs a Yes mint and a No mint (about 0.00146 SOL each, assuming the standard 82-byte size, which wasn't re-opened; F3.36), a vault (0.00204 SOL) and a market record (about 0.003 SOL if it is 300 bytes, a guess). That totals about 0.0079 SOL before the order book, or about 0.31 to 0.37 SOL a day for 39 to 46 markets (arithmetic, re-checked). The order book is the unknown. Our own book's size is an Architecture choice. As an illustration, a 10 KiB book holds about 0.072 SOL, which is about 3.3 SOL a day for 46 markets; a 100 KiB book holds about 0.71 SOL, about 33 SOL a day (my arithmetic from F3.11). On the trader side, Alice's first Yes purchase needs a USDC account (0.002 SOL, once), a Yes account (0.002 SOL) and a fee (0.000005 SOL). Bob's Buy No mints a pair and sells the Yes, so he needs Yes and No accounts, about 0.004 SOL (F3.36).

**3. The options and their evidence.**
- **(1) The bot's wallet pays every market's deposit and fees.** This is the natural default, since the bot creates the markets.
- **(2) Each user pays for their own token accounts and fees.** This is the usual Solana pattern. Every user needs devnet SOL before their first trade.
- **(3) A sponsor pays users' deposits and fees.** This is possible because the payer can differ from the owner (F3.12), but it needs a service that co-signs users' transactions.
- **Getting deposits back.** Token accounts can be closed and refunded. The standard token program can never close mints (F3.13). The newer Token-2022 program can, but only when no tokens are left (F3.13). Redemption stays open forever (D7), so a few unredeemed tokens keep a mint open indefinitely either way.
- **The plan's figures.** The plan quotes 0.007 to 1.9 SOL per market (Manifest and OpenBook). Those books are no longer the plan (D21), and the numbers come from Manifest's own comparison with its competitors (F3.15).

**4. What each answer commits you to.**
- **(1):** daily SOL top-ups for the bot and a low-balance alert (D29). Above a few SOL a day, the faucet's 2 requests every 8 hours may not keep up; this review didn't record how much each request gives. Design the book account so it can be closed after settlement and its deposit returned every day.
- **(2):** a "get devnet SOL" step in onboarding (S25). Users who skip it see "not enough SOL" errors.
- **(3):** a sponsor key to protect, and a limit so nobody can drain it.

**Recommendation (Claude's; yours to accept or reject).** Choose (1) for markets and (2) for users, with a clear onboarding step. Make the book account closable after the close. Measure real sizes with Solana's minimum-deposit call (getMinimumBalanceForRentExemption) in the first milestone, and replace the Manifest and OpenBook numbers in the plan.

### Q14. How are early-close days handled?

**1. The terms.**
- An **early-close day** is a day when the US stock market closes at 1:00 PM ET instead of 4:00 PM. The next ones are 27 November 2026, 24 December 2026 and 26 November 2027 (F3.01). Pyth's own schedule shows a 9:30 to 13:00 session on those days (F3.02).
- The **trading cutoff** is the moment the program stops accepting orders.

**2. Worked example.** Friday 27 November 2026: META is at $684 at the 1:00 PM close.
- **Option A:** orders stop at 1:00 PM, or 12:59 if Q4's one-minute buffer is adopted. Any open offer is cancelled and refunded, and the bot settles at about 1:05 on the $684 price. Alice redeems 10 Yes for $10.00, a gain of $3.50, and Bob loses his $3.50.
- **Option C:** trading runs to 4:00. From 1:00 onwards everyone knows META closed at $684. Dave left an offer from the morning to sell 10 Yes at $0.70. Carol buys it for $7.00 and redeems for $10.00, so $3.00 moves from Dave to whoever checked the price. A 4:05 settlement would also read a price three hours old (F3.32, UNCONFIRMED).
- **Option B:** no markets that day, so Alice and Bob can't trade.

**3. The options and their evidence.**
- **(A) Take every time from the calendar** (the plan's proposal, through D11). Creation, visibility and the open stay the same. The cutoff becomes 1:00 PM and settlement about 1:05, which meets the spec's "within 10 minutes of close". NYSE and Pyth agree on the 1:00 close (F3.01, F3.02).
- **(B) Skip early-close days.** Simple, but it loses about one or two trading days a year, and an early-close day is still a trading day for the spec's liveness rule, which requires markets "every trading day".
- **(C) Trade to 4:00 and settle at 4:05.** Harmful, as the example shows.
- **(D) Treat it as a normal day with the shortened official close.** Polymarket reportedly does this (F3.28, SECONDARY, from a search summary). In substance D is the same as A.

**4. What each answer commits you to.**
- **(A):** every time rule keys off the market's stored close: the cutoff, the countdown on screen (Q52), the settlement job's run time (D29), the price window (Q3) and the override delay ("1 hour after close"). It also needs a test for a 1:00 PM day.
- **(B):** the calendar must mark these days, and you must explain the skipped days to graders.
- **(C):** not defensible.

**The plan's proposal:** option A, through D11. It holds. Add 26 November 2027 to the dates the plan lists.

**Recommendation (Claude's; yours to accept or reject).** Choose A.

### Q32. Which rounding rule, and which number format?

**1. The terms.**
- **Half-up rounding** sends a value exactly halfway up: $485 becomes $490.
- **Half-even rounding,** also called banker's rounding, sends it to the even neighbour: $485 becomes $480 and $455 becomes $460. Python's `round()` does this, while JavaScript's `Math.round` and Rust's `round` round half-up for positive prices (F3.24).
- **Floating point** is how computers usually store decimals. It is approximate, so 0.97 × 500 can come out a hair above or below 485.
- Pyth reports a price as a whole number with an **exponent**. For example, 71,955,500 with exponent −5 means $719.55500 (F3.08).
- A **basis point** is 0.01%, so 3% is 300 basis points.

**2. Worked example.** Suppose META's previous close were exactly $500.00. (The running example's $680 has no halfway case.)
- The −3% value is exactly $485.00. Half-up makes the market "META ≥ $490"; half-even makes it "META ≥ $480".
- These are different contracts. If META closes at $487, Alice's Yes loses on $490 and wins on $480.
- If the bot and an outside checker use different rules, they list different strikes.
- A second trap: suppose the close is $499.995, which Pyth can report because it gives five decimal places. Exactly, −3% is $484.99515, which becomes $480. If the close is first rounded to whole cents ($500.00), −3% becomes exactly $485.00, which becomes $490 (my arithmetic). So the order of the roundings matters.

**3. The options and their evidence.**
- **Rule:** half-up (the plan's proposal; JavaScript and Rust do it for positive prices, F3.24) or half-even (Python's default, F3.24). Rounding half down, or always down or always up, is not standard and would need its own justification.
- **Number format:** whole numbers in the oracle's own units, with basis points (the report's answer; exact, one rounding), or whole cents (the plan's proposal; easy to read, but it adds a rounding step unless the close is defined in cents). Floating point is ruled out (F3.08, F3.24).
- **Where the rule lives:** the program stores whatever strike the bot sends, so the rule only exists off the chain. Anyone checking the strikes needs the rule written down.

**4. What each answer commits you to.**
- **Half-up:** no script may use Python's default `round()`.
- **Half-even:** the bot's code must avoid JavaScript's `Math.round`, and users may find $485 → $480 surprising.
- **Oracle units:** read the exponent from the feed instead of assuming −5, and use whole-number types large enough for the product (JavaScript BigInt is safest).
- **Whole cents:** the docs must say that the previous close is first rounded to cents, and how.

**The plan's proposal:** half rounds up, computed in whole cents, never with floats, in one shared function. It holds, except that "whole cents" needs to say which number is rounded and when.

**Recommendation (Claude's; yours to accept or reject).** Choose half-up, computed once from Pyth's exact whole-number price using basis points, in one shared function. Add test cases for $500.00, $499.995, and the spec's META 680 and AAPL 230 examples.

### Q33. What does "adjust strikes" mean for a market people already hold?

**1. The terms.**
- To **list** a market is to create it, and to **remove** one is to delete it.
- **Supply** is the number of Yes/No pairs minted in a market.
- To **void** a market is to cancel it and refund holders.
- A **resting order** is an offer waiting on the order book, the market's list of open offers to buy and sell.

**2. Worked example.**
- At 11:00 Alice holds 10 Yes on "META ≥ $680" (she paid $6.50) and Bob holds 10 No (he paid $3.50). The vault holds $10.00, and META is at $690.
- If the admin could "adjust" the strike to $700, Alice's Yes would suddenly need a further rise, and its value would drop. Money moves from Alice to Bob by an admin's keystroke.
- Under option 1, the admin instead adds a new market, "META ≥ $700", and Alice's contract is untouched.
- Under option 2, at 8:45 the admin can delete a mistyped "META ≥ $6,800" market, because nobody has minted in it.
- At 10:00, someone may have placed a bid to buy 10 Yes at $0.54 in a new market before anyone minted. That locks $5.40 of their USDC (D21), so deleting the market must refund that bid first.

**3. The options and their evidence.**
- **(1) Add only.** This matches the spec's function list (Add Strike). Kalshi adds strikes after staff review (F3.25, CONFIRMED), and no source shows it editing a listed strike.
- **(2) Remove only an untouched market.** Token accounts can be closed and refunded, but the standard program never closes mints, so their deposit is lost (F3.13).
- **(3) After minting, the market is fixed.** You could pause it, let it run, or void it with refunds. The spec has no refund path: tokens are destroyed only by redeem, and the outcome is permanent once written.
- **(4) Change the strike under holders.** Polymarket's rules say later clarifications "cannot change the fundamental intent of the question" (F3.26, CONFIRMED). Reading that as "no editing under holders" is the researcher's inference.

**4. What each answer commits you to.**
- **(1):** nothing beyond Add Strike.
- **(2):** a Remove Strike instruction (already listed in D27) that checks for zero supply and an empty book. The lost mint deposit is small.
- **(3) with voiding:** a refund design checked against the $1.00 rule (the vault always holds $1.00 for every pair outstanding), and an exception to "destroyed only by redeem".
- **(4):** breaks trust in a fixed payoff. Not defensible.

**The plan's proposal:** a strike is fixed forever once it exists; "adjust" means add a strike, or remove one only before anyone has minted in it. It holds, provided the removal rule also requires an empty order book (or refunds any open bids).

**Recommendation (Claude's; yours to accept or reject).** Adopt the plan's proposal with the empty-book rule. Simplest of all: allow removal only before 9:00, when nobody can yet mint or place an order.

### Q34. What happens to strikes when a stock jumps overnight, and does the oracle give a pre-market price?

**1. The terms.**
- A **gap** is when a stock opens far from yesterday's close, often after **earnings** (a company's quarterly results).
- **Pre-market** is trading from 4:00 to 9:30 AM ET (F3.08).
- **Pyth Core** is Pyth's standard feed. Its listing shows the regular 9:30 to 4:00 session only (F3.02).
- **Pyth Pro** is Pyth's paid service. It labels each price with its session, including pre-market (F3.07).

**2. Worked example.**
- **A jump up (the plan's example).** META closes at $680, reports earnings after the close, and opens at $740. The ladder is $620 to $740. At 9:30 Alice's Yes on "META ≥ $680" is almost sure to win, so it trades near $1.00, and Bob would be paying for a No that is almost worthless. Six of seven markets are one-sided, only $740 is a coin toss, and nobody can trade "META ≥ $760".
- **A drop (F3.37, arithmetic re-checked).** NVDA at $229.83 falls 10% to about $207, and every strike from $210 to $250 sits above the price.

**3. The options and their evidence.**
- **(a) The admin adds strikes after the open.** This is the spec's Add Strike (S14). Kalshi adds strikes on request (F3.25).
- **(b) Add or re-centre strikes from a pre-market price before 9:00.** A pre-market price exists in Pyth Pro (F3.07, F3.08). Core shows the regular session only, and Pyth says that outside it "it's not clear what an equity's price is" (F3.02, F3.06). The owner's Pyth trial (Q16) is a Pro trial, but "paid plans cover ongoing use" (F3.03). Re-centring would depart from the spec's "from the previous close" rule; adding extra strikes alongside the normal ladder would not.
- **(c) Add strikes automatically** whenever the live price leaves the ladder.
- **(d) A wider ladder on known earnings days.** This needs an earnings calendar, which wasn't researched.

**4. What each answer commits you to.**
- **(a):** someone on duty at 9:30 on earnings days. The extra markets open late.
- **(b):** Pyth Pro beyond the trial, which is a spend decision. Pre-market prices are also thinly traded and can mislead.
- **(c):** a bot that uses the admin's power to create markets. It needs a daily cap so that a bad price can't create dozens of markets.
- **(d):** a data source and a rule for "earnings day".

**The plan's position:** two options, no lean. The plan's statement that these companies report after the close wasn't checked in this review.

**Recommendation (Claude's; yours to accept or reject).** Choose (a) now, written up as an operator story (the plan already lists one). Consider (c) later with a cap; the backend already receives live prices for the website (D16).

### Q35. How are stock splits and share classes handled?

**1. The terms.**
- A **stock split** divides each share into several. In a 10-for-1 split, one $680 share becomes ten $68 shares, and the value held is unchanged.
- The **ex-date** is the first day the stock trades at the new price.
- A **split-adjusted** price is an old price divided by the split ratio, so it can be compared with new prices.
- A **share class** is one of several kinds of share a company issues. Alphabet trades as GOOGL (Class A) and GOOG (Class C).
- A **feed ID** is the long code that names one Pyth price stream.

**2. Worked example.**
- **A split.** Suppose META splits 10-for-1, with the ex-date on a Monday, after a Friday close of $680. If the 8:00 job uses $680, Monday's ladder is $620 to $740 while META trades near $68. Every Yes is worthless: Alice's $6.50 on "META ≥ $680" is a certain loss, and Bob's No a certain win. With the adjusted close of $68.00, the $10 grid gives only two strikes, $60 and $70; a $1 step would give $62 to $74 (my arithmetic).
- **Why only the morning is at risk.** Every contract ends the same day, so no open market ever spans a split. Only the morning's strike calculation is exposed (my reasoning).
- **A share class.** Suppose "GOOGL ≥ $350" were settled from the GOOG feed by mistake, with GOOGL closing at $350.10 and GOOG at $349.80 (made-up numbers). Yes should win, but No would be paid.

**3. The options and their evidence.**
- **The share classes are separate feeds.** GOOGL and GOOG have different feed IDs and descriptions. A search for GOOG also returns a third feed, "PYTH PRICE IN USD FOR GOOGL 24/7" (F3.09, CONFIRMED). Pin the exact GOOGL ID, and check its description at start-up.
- **(a) Watch a corporate-actions calendar** (a list of upcoming splits and similar events), and let the admin skip the stock that day.
- **(b) Compare the previous close with a second price,** such as a pre-market price or another source, and skip the stock on a large mismatch. This also catches bad prices that have nothing to do with splits.
- **(c) Rely on Pyth's split-adjusted history.** Pyth's docs don't describe how splits are handled. A Polymarket rule reportedly uses split-adjusted prices "as displayed on Pyth", but that comes from a search summary (F3.10, SECONDARY).
- **Likelihood.** No split is announced for any of the seven. Microsoft and Meta were the subject of speculation in early 2026 (F3.10, SECONDARY).

**4. What each answer commits you to.**
- **(a):** a daily check or a data source, which wasn't researched.
- **(b):** a second price source and a mismatch threshold.
- **(c):** dependence on behaviour nobody has documented, to be tested at the first split.
- **Every option:** a split leaves the stock's price far below the old ladder, so the $10 step should be a per-stock setting (Q9).

**The plan's proposal:** "the 8:00 job uses a split-adjusted previous close, and the admin can skip a stock that day; use the GOOGL feed, not GOOG". The skip and the GOOGL parts hold. The first part has no source to supply the adjusted price.

**Recommendation (Claude's; yours to accept or reject).** Combine (a) and (b): an automatic skip on a large mismatch, a manual skip for the admin, and pinned feed IDs. Add the GOOG and GOOGL 24/7 feeds to the wrong-feed tests (D28, D30).

### Q42. How does the morning job retry, and what limits apply to a burst of transactions on devnet?

**1. The terms.**
- An **RPC endpoint** is the server you send transactions to. Devnet's public one is free but rate-limited. Per internet address it allows 100 requests per 10 seconds in total and 40 per 10 seconds for any single kind of request, such as sending a transaction (F3.17), "subject to change".
- A **blockhash** is a recent block's ID that every transaction carries. It expires after 150 blocks, about 79 seconds (F3.18).
- **Idempotent** means doing something twice has the same effect as doing it once.
- **Exponential backoff with jitter** means waiting 1, 2, 4, 8 seconds and so on between retries, with a random spread so that retries don't arrive in step (F3.19).
- A transaction holds at most 1,232 bytes and 64 accounts (F3.20).

**2. Worked example.**
- **A double send.** At 8:30:00 the bot sends "create META ≥ $680" and has no confirmation by 8:30:30. Under the plan's 30-second rule it re-signs and sends again. The first transaction is still valid until about 8:31:19 (F3.18), so both can land. If each market's address is fixed by its ticker, date and strike, the second fails with "already exists", and the bot should count that as success. If not, two "META ≥ $680" markets exist. Alice's $0.65 bid sits in one book and Bob's No order in the other, and they never meet.
- **The morning burst.** 46 markets at two or three transactions each (our book account is created by the client, D21) is about 92 to 138 sends. At no more than 40 per 10 seconds, that takes at least about 23 to 35 seconds, well before 9:00.
- **The settlement burst.** 7 price posts plus 46 settles is 53 sends, at least about 14 seconds. Checking confirmations and reading accounts count against the same 100-per-10-second total (F3.17). Pyth returns all seven prices in one request (F3.34).

**3. The options and their evidence.**
- **Fixed-interval retry** (the plan's 30 seconds). Solana's guide lists constant-interval resubmission as a common approach (F3.18).
- **Backoff with jitter.** This is the spec's wording ("retry with backoff"), and AWS calls it "a standard approach for remote clients" (F3.19).
- **Whichever you pick:** re-sign only after the old blockhash has expired (F3.18), and stop retrying at a deadline (9:00), not after a fixed count.
- **Public endpoint or a dedicated provider.** A provider would lift the limits, but none was verified.

**4. What each answer commits you to.**
- **Fixed addresses per market:** a design rule for Architecture, at little cost. This is the report's advice, not a sourced fact.
- **Backoff:** a few lines of code, and a test with a fake clock (D30).
- **Pacing:** a send queue shared by every job.
- **A dedicated provider:** another account and another key (D17).

**The plan's proposal:** retry every 30 seconds, alert if markets aren't created by 9:00, do nothing on non-trading days, and pace the 4:05 burst. It holds once the retry follows the spec's backoff wording, checks blockhash expiry and treats "already exists" as success, and once the pacing counts confirmation checks as well as sends.

**Recommendation (Claude's; yours to accept or reject).** Fix each market's address in advance, back off with jitter until 9:00, re-sign only after expiry, and keep sends under 40 per 10 seconds. Measure a real 8:30 burst on devnet in the first milestone.

## Conflicts

1. **The market count differs across the plan.** D6 says "up to 49". Q10 says "~49". D29 and Q42 say "~45". The plan's section 7 note gives 38 or 45 (30 September prices), and the report gives 39 or 46 (9 October prices; F3.35, arithmetic re-checked). These don't contradict each other: the count changes with prices every day. Use 49 as the ceiling for limits and budgets, and about 39 to 46 as the expected range.
2. **The report's Q8 evidence for option B is wrong.** It says the nearest strike to yesterday's close is "within about $5 anyway (AAPL 340, NVDA 230, META 720)". Those three strikes are the rounded closes themselves, which exist only under option A. Without them the nearest strikes are $7 to $20 away (my re-check).
3. **Q8's reason has no evidence.** The plan says "the most-traded strike", but the report found no data on trading by strike (gap) and only a qualitative Cboe statement (F3.29).
4. **The close time is worded three ways.** D7 says "4:00 close". Q4 proposes a 3:59:00 cutoff buffer. Q14 and D11 store a 1:00 PM close on short days. One rule settles it: everything keys off the market's stored close, and a buffer, if adopted, applies to that close.
5. **Q42's fixed 30-second retry against the spec and the blockhash life.** The spec says "retry with backoff", and AWS recommends jittered backoff (F3.19). A 30-second resend is shorter than a blockhash's roughly 79-second life (F3.18), so without fixed market addresses it can create duplicates.
6. **Q10's costs describe rejected order books.** The owner chose to build our own book (Q1, D21), but Q10 still quotes Manifest's and OpenBook's creation costs, and those are Manifest's own claims about its competitors (F3.15). D21's OpenBook fallback is the only place those figures still apply.
7. **Q32's "whole cents" against the oracle's five decimal places.** Pyth prices carry five decimal places (F3.08, which shows $719.555). Rounding the close to cents and then rounding the strike to $10 can give a different strike from rounding once ($499.995 gives $480 or $490).
8. **Q33's removal rule against the order book design.** Q33 allows removal "before anyone has minted", but D21 lets a bid lock USDC with no tokens minted, and Q41 opens orders at 9:30. After 9:30, zero supply does not mean nobody is affected.
9. **Q35's split-adjusted close against the evidence.** The plan's source for an adjusted close isn't named, and Pyth's docs are silent (F3.10, SECONDARY). Separately, D6's fixed $10 step leaves a split stock with two strikes, which the plan's section 7 note foresees for any price under about $115.
10. **How to cross-check the calendar.** The plan's research names Alpaca's calendar as the cross-check, "confirmed via search only", but the report couldn't open Alpaca's docs (gap). It proposes Pyth's feed schedule instead (F3.02, F3.33), which needs no key but covers only about nine months ahead. Inside the report, the D12 answer says to "skip the day on any disagreement". That trades a liveness day (the spec wants markets "every trading day") for safety. Comparing only dates inside Pyth's window, and alerting the admin rather than skipping automatically, would ease this.
11. **The morning job depends on the paid oracle key.** D7 and D29 treat the 8:00 read as routine, but every Pyth price request, including the historical read the morning job needs, has required a key since 26 August 2026 (F3.03). If the trial lapses (Q16), market creation stops as well as settlement. The spec allows the previous close to come from an off-chain API (noted in the plan's Q16), which could serve as a backup.
12. **"Redeem forever" against getting deposits back.** D7 keeps redemption open forever, and the plan's Q39 already notes that vaults and market records then stay open. Mints never close under the standard program, and under Token-2022 only at zero supply (F3.13). So most of each market's deposit is permanent, apart from the order book, if it can be closed after the close.
13. **Within the report: a scheduler claim the checker dropped.** F3.21 says node-cron "advises avoiding daily jobs in the 1 to 3 AM window". The check found that the page does not say this, so that clause carries no weight. Nothing in the plan depends on it.

## Weakest spots in the evidence

- **No data on which strikes actually trade** (gap). Q8, Q9 and the case for and against the ±9% rungs in D6 rest on a qualitative Cboe statement (F3.29) and reasoning.
- **The Pyth price endpoints were never called.** They returned 401 (key required) without a key, so the previous-close read by timestamp and the price's age at 4:05 or 1:05 are untested (F3.32, UNCONFIRMED). Whether Pyth's last price matches the official closing auction, especially on short days, is unverified.
- **Nobody knows how Pyth handles splits.** The docs are silent (F3.10, SECONDARY), and no past split was examined.
- **Whether Core serves a pre-market price on Solana** is unconfirmed (F3.07 rests on F3.02 for the Core side).
- **Calendar sources.** The Nasdaq holiday page timed out, although all seven stocks are Nasdaq-listed (the plan's section 10a). Alpaca's docs returned 404, and exchange_calendars' 2026 and 2027 contents weren't confirmed (F3.04). The unscheduled-closure history is SECONDARY (F3.05), and no source gave how much notice such closures come with.
- **Costs.** The size of our own order book is unknown. The Phoenix and OpenBook costs come only from Manifest's README (F3.15). The 82-byte mint size wasn't re-opened (F3.36). The faucet's amount per request wasn't recorded.
- **Prices.** The counts use intraday prices, not closes, and the checker opened only three of the seven price pages (AAPL, MSFT, META; F3.08). So 39 and 46 are indicative.
- **Rate limits.** Pyth's current request limits after the key change weren't found; the only figure (30 per 10 seconds) is old and SECONDARY. Devnet's limits are "subject to change" (F3.17), and no real burst was measured.
- **Venue comparisons are thin.** Polymarket's stock pages contradict themselves (F3.27, UNCONFIRMED), the early-close rule comes from a search summary (F3.28, SECONDARY), Kalshi's single-stock strike rules weren't found, and the Cboe and OCC rules on adding strikes and adjusting for splits couldn't be opened.
- **Some CONFIRMED findings carry an inference.** F3.22 ("weak fit" for settlement), F3.26 ("no editing under holders") and F3.31 (OpenBook needs a crank, a competitor's claim, downgraded to SECONDARY) each rest on confirmed text, but the conclusion is the researcher's reading.
- **Design advice tied to no source.** The report's leading answers include fixed market addresses (Q42), the analysis of which steps can slip (D7) and the single repeatable check that would replace the scheduled jobs (D29). Treat these as reasoning, not evidence.
- **No volatility figures.** How often each stock moves 3%, 6% or 9% in a day wasn't found; only one day's changes were seen (F3.08).
