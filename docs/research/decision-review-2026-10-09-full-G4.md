# Decision review 2026-10-09-full, group 4: Settlement and payout (judge's report)

Group 4 covers "Settlement and payout": stories S15 (automatic settlement), S16 (admin override), S17 (see the outcome and redeem), S18 (portfolio and history), S19 (the one-dollar invariant) and S28 (under review when the band straddles the strike). Items: D1, D2, D8, D26, D28, A4, Q2, Q3, Q13, Q16, Q20, Q27, Q30, Q36, Q37, Q39, Q43, Q45, Q48.

Evidence: `docs/research/reports/2026-10-09-full-G4.md` (findings F4.01 to F4.85) and the input file `docs/research/inputs/G4-settlement-and-payout.md`. Proposals and your directions: `docs/planning/2026-10-08-phase-1-plan-session-2.md`. Two group 1 findings in `docs/research/cross-cutting.md` (F1.29 and F1.30, both SECONDARY) are cited once, under Q48.

**How to read the labels.** A **CONFIRMED** finding means someone opened the primary source and checked it again. A **SECONDARY** finding comes from a second-hand source, such as a news report or a third-party listing. Only these two kinds carry weight. **UNCONFIRMED** findings (F4.10, F4.26, F4.33, F4.52, F4.53, F4.63, F4.78) are named where they matter, and the text says so whenever a point leans on one. Some CONFIRMED findings also carry a conclusion the verifier drew from the source, and those are flagged too. Where this report quotes the plan's own earlier research, that research was not checked again here.

**Terms used throughout.**
- **Settle:** record which side won a market. **Redeem:** swap a winning token for $1.00 (a losing token pays $0).
- **Strike:** the price the question asks about ($680 in "META ≥ $680 today?").
- **Mint a pair:** lock $1.00 of USDC (a digital dollar) and receive one Yes token plus one No token. **Vault:** the account where the program keeps that locked USDC.
- **Oracle:** a service that publishes real-world data, here stock prices, onto the blockchain in a form a program can check. The plan uses **Pyth**.
- **Confidence band (conf):** the "±" figure Pyth attaches to each price. It measures how much Pyth's data providers (called **publishers**) disagree (F4.16).
- **Publish time:** the time stamp on each Pyth price.
- **Official close:** the price the exchange sets in its closing auction at 4:00 PM. It is not the same thing as Pyth's last price.

## Summary

This group decides how a market ends: which price counts, when settlement runs and who may run it, what happens when the price is uncertain or missing, and how winners get paid while every pair stays backed by exactly $1. Most of the plan holds against the evidence, and the evidence sharpens it in four places. **First,** the plan's most important correction is confirmed: check a price's age against the market's close time, not against "now" (Q3). Pyth's own code only compares the price's age with the current clock (F4.02), and the regular-session stock feed stops at 4:00 PM (F4.07). Under the spec's literal 5-minute check, every retry after about 4:05 would fail. **Second,** two of the spec's invariants (rules that must always be true) can't be enforced word for word on Solana. Anyone can send USDC into the vault (F4.57), and holders can burn their own tokens without the program (F4.60). The plan already rewrites both (Q45, Q30), but D2's row still states the literal versions. The plan's claim that only one token add-on (extension) can block burns is also wrong, because the Permissioned Burn extension blocks them too (F4.61). **Third,** your band-versus-strike check (D26) has support: Pyth itself lists contract rules that depend on the band as a valid way to settle (F4.16). However, the official close may only be fixed about 15 minutes after 4:00 PM (F4.19, SECONDARY), so the planned check against the official close before the 4:05 settlement probably can't happen in time. Cases where the band crosses the strike won't be rare either, because one strike per stock sits close to the opening price (F4.34). **Fourth,** Pyth changed on 26 August 2026: new program IDs, an API key for every price request, and a new rule for how many of Pyth's servers must sign each price (F4.04, F4.05, F4.08). Several statements in the plan predate that change. Your directions on Q16 (Pyth trial key with a fallback), Q36 (hold straddling markets for an override) and Q30 (keep the burn trade-off open) all hold with caveats. The weakest evidence is that no live Pyth price could be pulled, because Pyth's server refused the requests without a key (F4.08). So band widths at 4:00 PM, the publish times near the close, and the gap between Pyth and the official close are all still unmeasured.

## Verdicts

The source column is copied from the plan. "spec" means the spec says it, "owner" means you asked for it or gave the direction, and "Claude proposal" means Claude suggested it and you haven't confirmed it yet.

| Item | Source (from the plan) | Verdict | Why |
|---|---|---|---|
| D1: Yes pays $1.00 if the close is at or above the strike; No pays $1.00 if below | spec | Holds | The spec states the rule outright, and the only exchange rulebook the research opened (Cboe's 2008 binary options filing) splits outcomes the same way: "at or above" pays the call (Yes), "below" pays the put (No) (F4.51). With two outcomes split this way, every possible price lands in exactly one, so Yes + No = $1.00 always holds. Venues don't all agree, though: Nadex pays the buyer only when the price is strictly above the strike (F4.54, SECONDARY), and a search snippet claims Polymarket's "close above" markets resolve a tie as No (F4.53, UNCONFIRMED). So the docs shouldn't claim an industry consensus. The spec's own labels ("META > $680", "closes above") contradict the rule (F4.55). Q7 already fixes the screen wording. Compare prices as exact whole numbers in Pyth's own format (F4.56; see A4). |
| D2: vault = $1.00 × pairs minted; Yes + No payout = $1.00; tokens created only by mint pair and destroyed only by redeem; settlement immutable; all enforced on-chain | spec | Holds with a caveat | Two of the rules can be enforced literally. Yes + No = $1.00 is built in when the outcome can only take two values. "Created only by mint pair" is built in when only the program's own address may create tokens. Two of the rules can't be enforced literally. Anyone can send USDC into the vault without the vault owner signing, so the raw balance can exceed $1 × pairs (F4.57, F4.85). And a holder can burn (destroy) their own tokens without our program (F4.60). "Immutable" holds only while the program's upgrade key is controlled, because that key can replace the code (F4.59). The plan already fixes these in Q45, Q30 and Q25, but D2's row still states the literal versions and should be rewritten to point at them. USDC's issuer can also freeze any USDC account, including the vault (F4.58, SECONDARY), and no design can prevent that. |
| D8: settle only after 4:00 PM, with freshness and confidence checks; retry every 30 s for 15 min, then alert; admin override only after an enforced delay | spec | Holds with a caveat | The structure matches the spec and the evidence. Caveat 1: "after 4:00 PM" should mean each market's stored close time. Pyth's schedule has early-close days (F4.07), and Solana's clock is only approximate (F4.29). D11 and Q14 already do this. Caveat 2: freshness must be measured against the close, because Pyth's built-in check only measures age against the current clock (F4.02) and the regular feed stops at 16:00 (F4.07). That retries after about 4:05 would fail rests on combining these two confirmed facts. The combined claim itself (F4.33) is UNCONFIRMED. Caveat 3: retrying can't narrow a wide band after the close, because no new prices are formed (F4.17). Pyth's historical service (Benchmarks) serves signed past prices and lists "contract settlement" as a use (F4.30), so it could cover the fallback before anyone types a price by hand. Whether such a price can be posted on Solana is unproven (see Conflicts, item 10). |
| D26: two checks at settle (band not too wide; whole band on one side of the strike), plus daily evals against the official close; your direction: settle immediately on the band checks and also verify against official values | owner | Holds with a caveat | Pyth's guidance supports both checks. It suggests pausing when the band is too wide relative to the price, and it lists "contract terms that depend on the confidence interval" as a valid settlement design (F4.16). Caveat 1: the band measures disagreement among Pyth's publishers, not distance from the official close (F4.16). The official close can also be revised about 15 minutes after 4:00 PM (F4.19, SECONDARY). So the planned check before settling at ~4:05 probably can't use a final official close, and only the after-the-fact evals are realistic. Caveat 2: each stock gets a strike at the previous close (F4.34), so strikes sit close to where prices end the day, and cases where the band crosses the strike won't be rare. Their rate is unmeasured. Caveat 3: a free source of daily closing prices exists (Massive Basic, $0), but it doesn't say its "close" is the official one (F4.32). |
| D28: settle trusts only a genuine price account (owned by Pyth's program, fully verified, right feed ID, publish time in the close window) | Claude proposal | Holds with a caveat | Pyth's docs back every check. A posted price account only proves "a verified price for _some_ price feed at _some_ point in time", so our program must check the feed and the time itself (F4.01). Pyth's code rejects a wrong feed and a partly verified price (F4.02). Caveat 1: Pyth now has two receiver programs on Solana, the upgraded `rec2HH…` and the legacy `rec5EK…`, so our program must pin one on purpose (F4.05). Caveat 2: since the upgrade, "fully verified" means 3 of 5 Pyth servers have signed, instead of the old 13 of 19, and Pyth's code comments still describe the old system (F4.04). Caveat 3: the close-window check is our own code, and a wide window lets whoever calls settle choose the price they prefer (F4.03; see Q3). Also add price > 0 and a sane exponent (the power of ten that scales Pyth's integer). Pin the regular-session "Equity.US" feeds, never the 24/7 "Equity.Index" ones (F4.07). |
| A4: integer money (USDC 6 decimals, Yes/No tokens 0 decimals, prices in whole cents 1 to 99, Pyth price converted to the same scale before comparing) | Claude proposal | Holds with a caveat | Whole-number amounts everywhere is right. Zero-decimal Yes/No tokens (1 token = 1 contract) avoid the tiny leftover fractions that the report's own case against warns about. Caveat 1: compare by scaling the strike up to Pyth's format, not by rounding Pyth's price to cents. Pyth gives an integer plus a power of ten (F4.56, F4.65), so $680 becomes 68,000,000 at exponent −5. Rounding a Pyth price of $679.996 to $680.00 would turn a No win into a tie that pays Yes. Caveat 2: read the exponent from every update, because its type and range differ between Pyth Core and Pyth Pro (F4.65, F4.66). Caveat 3: devnet USDC's decimals weren't confirmed (F4.64, SECONDARY), so read them from the token's settings at startup. |
| Q2: which oracle has all 7 stocks on Solana devnet (you chose Pyth in Q16) | Claude research; owner (Pyth, via Q16) | Holds with a caveat | Pyth is the only provider confirmed to list all 7 stocks with a confidence value (F4.06, F4.16), and its upgraded receiver has the same ID on every Solana network (F4.05). Chainlink's coverage on Solana is unconfirmed (F4.12, F4.14 SECONDARY) and has no confidence field (F4.13). Caveat: no live update for these stocks has yet been verified on devnet, and that needs the key (F4.08). |
| Q3: which price is "the close", and how staleness is measured | Claude proposal (owner to choose) | Your call | The plan's "measure against the market's close" fits the evidence (F4.02, F4.07). The open choices are how to define the close and how wide to make the window. The plan's ±60-second window lets a caller choose from a minute of valid prices (F4.03). |
| Q13: the fallback path can't meet "settled within 10 minutes"; document it as a known limitation | Claude proposal | Your call | The spec's own timeline puts retries and the override past 4:10 (F4.27, CONFIRMED), so documenting the limitation is right. The open choice is how misses are counted (F4.28). |
| Q16: oracle access cost; your direction: Pyth trial key, with a fallback of reading Pyth updates someone else posts on devnet | owner (direction) + Claude proposal (spike) | Holds with a caveat | A free trial exists (F4.08), but its length is unknown and the cheapest published plan with an API key is $500 a month (F4.09). The most concrete form of your fallback is Pyth's own sponsored "push" feeds on devnet (F4.11), so the spike should check which stocks they cover. |
| Q20: settle on one closing price or a short average | Claude proposal (open, no lean) | Your call | Both are used by real venues (F4.24 SECONDARY, F4.16). The closing moment is a known manipulation target (F4.20). An average can only use prices before 16:00 on the regular feed (F4.07) and will differ from the official close more often. |
| Q27: P&L and History from an event per fill, recorded by the always-on service | Claude proposal | Your call | The evidence supports the plan's design. The public devnet server limits requests and the network may be reset (F4.74, F4.75). Program events written to logs can be cut short, and Anchor offers a safer variant (F4.77). The rule for computing an entry price from several fills is still unchosen. |
| Q30: holders can burn their own tokens; option A (interpret and test) vs B (frozen accounts); your direction: keep A vs B open | Claude proposal + owner (keep open) | Holds with a caveat | Keeping it open is reasonable, but the option list is incomplete. Token-2022's Permissioned Burn extension also blocks holder burns (F4.61, CONFIRMED), which contradicts the plan's "Default Account State is the only extension that blocks burns". Whether our program's own address can hold that burn permission, and whether wallets support it, is unverified. |
| Q36: a market whose band straddles its strike; your direction: hold it and settle it via the override using the official close | owner (direction, to confirm) + Claude proposal | Holds with a caveat | Retrying can't help after 4:00 PM (F4.17; F4.33 UNCONFIRMED for the exact timing). Waiting for the authoritative number is what Kalshi does (F4.25, SECONDARY). Caveats: each held market misses 4:10 by design (F4.27); the hold rate is unmeasured (F4.34); and the override is a hand-typed price, so Q43's safeguards matter more. |
| Q37: who may call settle; plan: our bot only until a deadline (e.g. 24 h), then anyone | Claude proposal | Your call | Pyth warns that whoever submits a price can choose which valid update to use (F4.03), so limiting settle to the bot helps correctness. Open settlement helps liveness (F4.31). No source showed how other Solana venues decide this. |
| Q39: one Redeem click for all winnings, split into as few transactions as needed; unredeemed tokens keep accounts open forever | Claude proposal | Your call | The limits are confirmed (F4.69, F4.70). The plan's "about 10 markets per transaction" needs address lookup tables, and without them it's about 4 (arithmetic on UNCONFIRMED account counts). Plain token types (mints) can never be closed (F4.72). |
| Q43: make the admin override two-step (propose, then finalize after a wait), with optional price bounds | Claude proposal | Your call | Comparable systems pair a delay with a way to cancel (F4.80) and with a challenge window (F4.79). The plan's design has both. The open choice is the length of the wait, which trades safety against how long held money stays locked. |
| Q45: replace "vault = $1 × pairs minted (exact)" with a pairs-outstanding counter (exact) plus actual vault ≥ that amount | Claude proposal | Your call | Strongly supported. Deposits from outsiders (F4.57) and pair redemptions (F4.85) make the literal wording false. The remaining choice is whether to add a sweep that restores exact equality. |
| Q48: a stock halted at the close is held "under review" and settled via the override with the official close or last sale | Claude proposal | Your call | Exchanges still define an official close for a halted stock, after the fact (F4.21; F4.22, a 2015 proposal). Pyth carries the old price forward (F4.17). How that shows up in the publish time on Solana is unknown (F4.33, UNCONFIRMED). |

## Briefings

Running example for every briefing: "META ≥ $680 today?". Yes trades at $0.65 and No at $0.35. Alice buys 10 Yes for $6.50 and Bob buys 10 No for $3.50, so the vault holds $10.00 for 10 pairs. If Yes wins, Alice gets $10.00 (+$3.50) and Bob gets $0 (−$3.50). If No wins, Bob gets $10.00 (+$6.50) and Alice gets $0 (−$6.50).

### Q2. Which oracle has prices for all seven stocks on Solana devnet?

**Your direction (via Q16, 7 October):** use Pyth with a trial key. That answers Q2 in practice, so this briefing also checks the choice.

**1. The terms.**
- **Price feed and feed ID:** one stream of prices for one asset, such as "Equity.US.META/USD", identified by a long ID.
- **Pull vs push:** in Pyth's **pull** model, whoever needs a price fetches a signed update from Pyth's price server (called **Hermes**) and posts it on the chain in their own transaction. Pyth's **receiver program** on Solana checks the signatures. In a **push** feed, a sponsor posts updates to a fixed account on a timer.
- **Devnet:** Solana's public test network. All money on it is play money.

**2. Worked example.** At 4:00 PM, Pyth's regular-session META feed reads $680.10 ± $0.04. On the chain this is stored as the integer 68,010,000 with exponent −5 and a confidence of 4,000 (Pyth's whole-number format, F4.56). The bot posts the signed update to devnet, and settle compares it with the strike. The whole band, $680.06 to $680.14, is at or above $680, so Yes wins. Alice receives $10.00 and Bob $0. Chainlink would report the same moment as a bid and an ask, say $680.05 and $680.15, with no "±" figure (F4.13). The spec's confidence check would then have to use the gap between the two.

**3. The options and their evidence.**
- **Pyth pull feeds.** Pyth's listing has a regular-session feed for all seven stocks, each on a weekday 9:30 AM to 4:00 PM New York schedule (F4.06, F4.07). The upgraded receiver program has one ID across Solana networks (F4.05). Solana devnet isn't on Pyth's list of networks that need separate test IDs (F4.35, CONFIRMED, though the conclusion is drawn from the absence of a listing). Not yet shown: a live update for these stocks verifying on devnet, because price requests returned "401 unauthorised" without a key (F4.08).
- **Pyth push feeds sponsored on devnet.** They exist and update every 55 seconds or on a 0.5% price move (F4.11). Which stocks they cover on devnet is unknown.
- **Chainlink Data Streams.** A devnet verifier exists, and sign-up is self-serve (F4.12). US stock streams launched in January 2026 (F4.14, SECONDARY). All seven stocks on Solana isn't confirmed, and there is no confidence field (F4.13).
- **Switchboard and Stork.** No stock feeds were found (F4.15).
- **No provider publishes the exchange's official closing price.** Chainlink's schema has no such field (F4.13), and the report found none in Pyth's docs.

**4. What each answer commits you to.**
- **Pyth:** an API key (Q16), the seven regular-session feed IDs pinned in config (D28), and a spike that shows a real update verifying on devnet.
- **Chainlink:** a sign-up, a confidence check rebuilt from the bid-ask gap (stated in the docs as a departure from the spec's wording), and a check that all seven stocks exist on Solana.
- **Push feeds only:** no key for settlement, but the "4:00 PM price" could be up to about 55 seconds old.

**Verdict on your direction: holds with a caveat.** Pyth is the only option confirmed to have all seven stocks and a confidence value, but it isn't proven on devnet until the spike runs.

### Q3. Which price counts as "the close", and how should staleness be measured?

**1. The terms.**
- **Closing auction (closing cross):** at 4:00 PM the exchange matches all closing orders in one batch at one price. For Nasdaq stocks, that price is the **Nasdaq Official Closing Price**.
- **Staleness check:** rejecting a price that is too old. The spec's example threshold is 5 minutes.
- **Window:** an allowed range of publish times. The plan measures it around the market's close time instead of around "now".

**2. Worked example.** Illustrative Pyth prices for META near the close:
- 15:59:10 gives $679.90 ± $0.04.
- 15:59:59.6 gives $680.10 ± $0.04. This is the last one, because the regular-session feed stops at 16:00 (F4.07).
- The exchange's official close is $679.97 (illustrative).

If "the close" means the Pyth price nearest 16:00, Yes wins (Alice +$3.50, Bob −$3.50). If it means the official close, No wins (Bob +$6.50, Alice −$6.50).

Staleness: suppose the settle job retries at 4:05:30. Under the spec's literal check, "no older than 5 minutes from now", the 15:59:59.6 price is about 5 minutes 30 seconds old and fails. Every retry until 4:20 fails the same way. Under the plan's window rule (publish time between 15:59:00 and 16:01:00), the same price passes at any time.

However, both the 15:59:10 and the 15:59:59.6 updates fall inside that window. If anyone may call settle, Bob can submit the 15:59:10 update, whose whole band is below $680, and No wins. Pyth calls this choice of update "functionally equivalent to latency" and warns about it (F4.03).

**3. The options and their evidence.**

Which price:
- **(a) The last Pyth regular-session price at or before the close.** Pyth follows market hours (F4.18), and the regular feed ends at 16:00 (F4.07). The program can't prove an update is the *last* one. The update carries a `prev_publish_time` field, but its meaning is undocumented (F4.02).
- **(b) The first Pyth price at or after the close.** The regular feed may publish nothing after 16:00 (F4.07). The 24/7 "Equity.Index" feed would give an after-hours price, which is a different product.
- **(c) The official close.** No oracle carries it (F4.13). Nasdaq publishes it as the official last sale about 15 minutes after the close when it differs (F4.19, SECONDARY), which is after the 4:05 settlement. Using it means a person or our backend posts it.
- **(d) A data vendor's daily close.** Vendors can report different closes (F4.23, SECONDARY), and the free source found doesn't say its close is the official one (F4.32).

How to measure staleness:
- **(i) Against "now"**, which is Pyth's built-in check (F4.02). It fails after about 4:05. This combines F4.02 and F4.07, and the combined claim (F4.33) is UNCONFIRMED.
- **(ii) A window around the market's close (the plan's proposal).** This is our own code. It must still require full verification and the right feed. Pyth's `get_price_unchecked` skips the verification check (F4.02), so don't build on it alone.
- **(iii) A longer "now" limit**, for example 20 minutes. Simple, but it would accept a 15:45 price.

Solana's clock is itself approximate (F4.29), which is another reason to tie the window to the price's own time stamp.

**The plan's proposal:** take the Pyth price nearest 16:00:00 inside a window from the close minus 60 seconds to the close plus 60 seconds, with the width tuned by the D26 evals. The docs state that this price can differ from the official close. An audit afterwards compares the two.

**4. What each answer commits you to.**
- **(a) with a narrow window** (say, the last few seconds before the close): the docs define "the close" as Pyth's last regular-session price, and you accept a small gap to the official close. If the feed is slow in its last seconds, the market goes to review.
- **(a) with the plan's ±60 seconds:** easier to satisfy, but the caller can choose from about a minute of prices. That is safe only while settle is limited to our bot (Q37), and the public fallback after the deadline reopens the problem.
- **(b):** you would need the 24/7 feed and its after-hours price, which is a different contract.
- **(c) or (d):** every market is settled from a price someone types or posts, and none settles by 4:10.

**Recommendation (Claude's; yours to accept or reject).** Keep the rule of measuring against the close, because the evidence for it is strong. Define the close as "Pyth's last regular-session price published at or before the market's close time". Raise the window's lower edge as close to the close as the D26 evals allow, and drop the "plus 60 seconds" half, which the regular feed never fills. Keep the audit. Whatever the definition, settle must also check that the chain's clock has passed the close (see Conflicts, item 13).

### Q13. Can the fallback path meet "settled within 10 minutes of market close", and how should misses be counted?

**1. The terms.**
- **Liveness:** the spec's measure that the system does its daily job on time (F4.27).
- **Service level indicator (SLI):** good events divided by all events. **Service level objective (SLO):** the target for that ratio, such as 99%. **Error budget:** 100% minus the SLO, the share of misses you allow yourself (F4.28).

**2. Worked example.** A Tuesday has 45 markets (the plan's count at current prices; the spec's maximum is 49). At 4:05 the bot settles 44 of them by 4:06. META at $680 reads $680.02 ± $0.04, a band from $679.98 to $680.06 that contains $680, so under D26 that market goes to review. The override settles it at 5:20, and Alice and Bob wait until then for their payout.
- **Counted per contract:** 44 of 45 on time, 97.8% that day.
- **Counted per stock and day:** 6 of 7 stocks on time, 85.7%.
- **Counted per trading day:** the day is a miss, because the spec says "every trading day".
- **Over 20 trading days with only that one miss:** 899 of 900 contracts (99.9%), 139 of 140 stock-days (99.3%), or 19 of 20 days (95%).

**3. The options and their evidence.** The spec's own timeline is confirmed (F4.27): the settlement job starts at ~4:05, retries run until ~4:20, and the override opens at ~5:00. Both fallbacks fall after 4:10.
- **(1) Per contract.** Easiest on the score. Correlated failures, such as one stock's feed failing and taking all of its strikes with it, look small.
- **(2) Per stock and day.** Treats a correlated failure as one event.
- **(3) Per trading day.** Matches the spec's words exactly. A single held market fails the whole day.
- **(4) Two numbers:** "on time via the oracle" and "settled by any path", with each late market listed with its cause, over a rolling four-week window. Google's SRE guidance supports counting good events over total events in such a window (F4.28).
- **Venue practice is looser:** Kalshi pays "usually within 1 hour" and lets a market wait for its data (F4.24, F4.25, SECONDARY).
- **Ways to shorten the delay:** start trying at 4:00 and some seconds rather than 4:05; end retries by 4:10; or let anyone settle (Q37).

**The plan's proposal:** document the miss as a deliberate trade-off, correctness over speed, and report the real rate from the evals.

**4. What each answer commits you to.**
- **(1):** a flattering number, which a grader may read as gaming the metric.
- **(3):** honest to the spec's wording. Every straddle or halt costs a day.
- **(4):** a little more reporting work, and the most transparent option.
- **In every case:** the plan's "one market about 1 trading day in 17" is an illustration based on an assumed ±5¢ band. It must be measured before it is quoted.

**Recommendation (Claude's; yours to accept or reject).** Use (4), and also show the per-trading-day figure, since that is the spec's unit. Label the 1-in-17 figure as illustrative until the evals measure it.

### Q16. What does oracle access cost, and what are the alternatives?

**Your direction (7 October):** (1) a Pyth trial key; (2) as a fallback, read the Pyth price updates another person already posts to devnet. Your own price poster and a simulation mode are cut.

**1. The terms.**
- **API key:** a password-like string a service issues to know who is calling.
- **Hermes:** Pyth's price server. **Benchmarks:** Pyth's service for historical prices.
- **Trial:** free use for a limited time.
- **Sponsored push feed:** an account on the chain that Pyth or a partner updates on a timer, readable by anyone for free.

**2. Worked example.** Meridian needs seven signed 4:00 PM prices a day for settlement, seven previous closes each morning for the strikes, and live prices all day for the website (D14).
- **On the Starter plan** at $500 a month with an API key (F4.09), three months cost $1,500.
- **On the trial,** it costs $0 until the trial ends, and how long that takes is unknown (F4.08).
- **On the push-feed fallback,** at 4:05 the bot reads META's sponsored account. If it was last updated at 15:59:20 with $680.10 ± $0.04, that is inside the plan's 60-second window: Yes wins, and Alice gets $10.00. If the last push came at 15:58:50, which the 55-second timer allows (F4.11), it falls outside the window, and the market goes to review with Alice and Bob waiting.

**3. The options and their evidence.**
- **Pyth trial:** "a free trial is included, paid plans cover ongoing use", with no length or limits given (F4.08).
- **Pyth paid plans:** Free ($0, "No Pyth API access"), Starter ($500 a month with an API key), Pro (from $2,500 a month) (F4.09). Whether a free developer key exists outside the trial is disputed (F4.10, UNCONFIRMED).
- **Pyth push feeds on devnet:** no key is needed to read them, and they update every 55 seconds or on a 0.5% move (F4.11). Which stocks they cover on devnet is unknown.
- **Someone else's posted Pyth updates (your fallback):** a signed Pyth update proves itself whoever posts it, provided D28's checks pass. The timing depends on the other person, and their licence is unverified (plan).
- **Chainlink Data Streams:** self-serve, billed by subscription, with mainnet prices only by contacting Chainlink (F4.12). Stocks on Solana aren't confirmed, and there is no confidence field (F4.13).
- **Switchboard:** the free plan covers crypto only, custom feeds are available on request, and Pro costs about $3,000 a month (F4.15).
- **Off-chain data for strikes and the audit (not for settlement):** Massive Basic costs $0, allows 5 calls a minute and has end-of-day data only. Alpaca's free feed covers only the IEX exchange (F4.32).
- **Benchmarks** also needs the key and allows 10 requests per 10 seconds per internet address (F4.30).

**4. What each answer commits you to.**
- **Trial:** free now, with a cliff later. Run the spike early, and either budget for Starter or have the fallback ready before the trial ends.
- **Starter:** a spending decision of $500 a month.
- **Push feeds:** free, but the close window must allow about 55 seconds, and the spike must check the devnet feed list.
- **Another person's posts:** you depend on their schedule and licence.
- **Chainlink:** a different confidence rule, and a departure from the spec's wording.

**Verdict on your direction: holds with a caveat.** The trial is confirmed to exist (F4.08), but its length is unknown, and the cheapest published plan with an API key is $500 a month (F4.09). Add two points to the spike checklist: (a) which stocks the devnet push feeds cover (F4.11), since that is the most concrete form of your fallback; (b) the length and limits of the trial. Spike item 2 ("Pro uses a different verifier") is mostly answered: since August, Pyth's standard service runs on its Pro system with the same interface, and the upgraded receiver has one ID across Solana networks (F4.04, F4.05). What "fully verified" now means is not answered (F4.04).

### Q20. Should settlement use one closing price or a short average?

**1. The terms.**
- **TWAP (time-weighted average price):** the average of prices over a short period, such as the last minute.
- **EMA (exponential moving average):** an average that weights recent prices more heavily. Pyth publishes one alongside each price (F4.16).
- **Marking the close:** trading in the last seconds to push the closing price, which is a form of manipulation.

**2. Worked example.** META's Pyth prices over the last minute average $679.98. A burst of buying in the final two seconds lifts the last price, at 15:59:59.6, to $680.10.
- **Settled on the single price:** Yes wins. Alice gets $10.00 (+$3.50), and Bob loses $3.50.
- **Settled on the one-minute average:** No wins. Bob gets $10.00 (+$6.50), and Alice loses $6.50.

If the burst was manipulation, as in the SEC's Athena case where trades in the last two seconds set "artificial prices that NASDAQ then used to set the closing prices" (F4.20), the average protects Bob. If the burst was genuine and the official close is $680.10, the average pays the wrong side by the official yardstick, and D26's audit flags it.

**3. The options and their evidence.**
- **(1) A single closing price.** This matches the spec's wording ("Read the oracle's closing price"), and the official close is itself one price. The closing moment is a known manipulation target (F4.20). Pyth's price combines many publishers, which should make it harder to move, but no Pyth source on this for stocks was found.
- **(2) A short average ending at 16:00.** Kalshi's crypto contracts average 60 readings in the last minute (F4.24, SECONDARY). The plan's research says Pyth's Solana program has a TWAP instruction (CONFIRMED there, not checked again). The window must end at 16:00, because the regular feed stops then (F4.07). The average will differ from the official close more often, and it changes the question to "the average of the last minute".
- **(3) Pyth's EMA price.** It is built in, and Pyth lists it as a settlement option (F4.16). It lags the price further than a one-minute average does.

**4. What each answer commits you to.**
- **(1):** document the manipulation risk, and rely on Pyth's many publishers and the audit.
- **(2):** reword the contract and the payoff line, add code to compute or verify the average, and apply D26's band rule to the average's own band (which Pyth doesn't publish for a custom average).
- **(3):** reword the contract, and expect more "wrong by the official yardstick" days.

**Recommendation (Claude's; yours to accept or reject).** Use (1) for the devnet build. It matches the spec, it keeps D26's band rule meaningful, and play money gives little reason to manipulate. Revisit it if the evals show large gaps or before any mainnet bonus. No measured data exists either way (see Weakest spots).

### Q27. Where should Portfolio P&L and trade History get their data?

**1. The terms.**
- **RPC server:** the server apps use to read the chain. The public devnet one allows 100 requests per 10 seconds, and 40 per 10 seconds for any one kind of request (F4.74).
- **Indexer:** a service that watches the chain and saves records in its own database.
- **Event:** a record a program writes during a transaction.
- **Cost basis:** how "entry price" is worked out for a position bought in several fills. **FIFO** ("first in, first out") assumes you sell the oldest units first. **Average cost** uses the average price you paid.

**2. Worked example.** Alice buys her 10 Yes in two fills: 6 at $0.64 ($3.84) and 4 at $0.66 ($2.64), $6.48 in total. Her average entry is $0.648. Yes now trades at $0.70, so her position is worth $7.00, a gain of +$0.52 not yet locked in.

She then sells 5 at $0.70 for $3.50.
- **Under FIFO,** those 5 cost $3.20, so her realised (locked-in) gain is +$0.30, and her remaining 5 cost $3.28.
- **Under average cost,** they cost $3.24, so her realised gain is +$0.26, and her remaining 5 cost $3.24.

The total is +$0.52 either way, but the screen shows different numbers. Rebuilding everyone's history from the chain is slow: 100 users with 50 trades each means 5,000 transaction reads. At 40 per 10 seconds, that takes about 21 minutes.

**3. The options and their evidence.**
- **A. The browser reads the chain on demand.** At most 1,000 transaction IDs per call, then one read per transaction (F4.75). The public server is "not intended for production applications", and devnet "may be subject to ledger resets" (F4.74).
- **B. Our always-on service records each fill as it happens** (the plan's proposal). It avoids the rate limits, but it must catch up after restarts. Events written to program logs "may be truncated" by data providers. Anchor's `emit_cpi!` variant is less likely to be cut short and costs a little more compute, and Anchor points to dedicated streaming services for robust event handling (F4.77).
- **C. A hosted provider.** Helius's free tier offers 10 requests a second, and devnet streaming starts at $49 a month (F4.76).
- **D. Record each order when the app submits it.** Simplest, but it records what was intended, not what filled.
- **E. Work out the entry price from the wallet's own balance changes.**
- **Order-book event format:** the report's open question about it (F4.78, UNCONFIRMED) no longer matters, because D21 builds our own book, so we define the event.

**4. What each answer commits you to.**
- **B:** the fill event and the database are part of the program and backend design. You also need a catch-up routine after downtime, a privacy notice for the fills table (plan §10a), and a plan for a devnet reset (the database survives one, but its links to chain transactions break).
- **A or E:** no database, but slow screens under load, and history is lost on a reset.
- **C:** a monthly fee and an outside dependency.
- **In every case:** choose FIFO or average cost, because the spec says "entry price" without defining it.

**Recommendation (Claude's; yours to accept or reject).** Use B as planned, emit fills with `emit_cpi!`, and add a catch-up step that rereads the program's recent transactions on restart. Use average cost, which is simpler to explain on one screen. Decide this in USERS.md.

### Q30. Holders can burn their own tokens. What does that mean for "tokens can only be destroyed via redeem"?

**Your direction (8 October):** keep A (interpret and test) against B (frozen accounts) as an open trade-off. The spec doesn't ask for wallet-to-wallet transfers, so losing them isn't a cost against the spec.

**1. The terms.**
- **Burn:** destroy tokens. On Solana's standard token program, a token account's owner, or someone they approve (a **delegate**), can burn without any other program taking part (F4.60).
- **Token-2022:** Solana's newer token program, with optional add-ons called **extensions**.
- **Freeze authority:** an address that can freeze token accounts. Frozen accounts can't transfer or burn until thawed (F4.62).
- **Permissioned Burn:** an extension under which every burn needs a second signature from a set "burn authority" (F4.61).

**2. Worked example.** Before 4:00 PM Bob burns 3 of his 10 No from his own wallet, without Meridian taking part. Supplies are now 10 Yes and 7 No, and the vault still holds $10.00.
- **If No wins,** Bob redeems 7 No for $7.00. The other $3.00 stays in the vault and nobody can ever claim it.
- **If Yes wins,** Alice redeems 10 Yes for $10.00, and the vault is empty.

Only Bob loses. A test that checks "No supply = pairs outstanding" now fails, though, so tests must check "supply ≤ pairs outstanding". Redeem must never assume Yes supply equals No supply (F4.63, UNCONFIRMED; this is reasoning, not a sourced fact).

**3. The options and their evidence.**
- **A. Interpret and test** (the plan's lean): "our program destroys tokens only in redeem and close-pair", plus tests that the vault always covers what is owed. A self-burn only lowers what is owed (F4.60; F4.63 UNCONFIRMED).
- **B. Default Account State = Frozen,** with our program as the freeze authority. Our program thaws and refreezes accounts inside each instruction. Frozen accounts fail every token instruction (F4.62). Cost: more code and compute in every instruction, plus checks that Token-2022 works with wallets, the client generator and our own order book.
- **C. Permissioned Burn,** with our program's address as the burn authority. While it is set, normal burns fail, and each burn needs both the authority and the owner (F4.61, CONFIRMED). This option is missing from the plan. Unverified: whether a program-controlled address can be the burn authority, and wallet support (Solana's legacy JavaScript token library doesn't support it yet, F4.61).
- **Avoid two other extensions.** Pausable blocks burns only while paused, and it would block redeem too. Permanent Delegate gives a delegate power to burn anyone's tokens (F4.62).
- **D. Internal balances instead of tokens.** This conflicts with the spec (plan).

**4. What each answer commits you to.**
- **A:** a sentence in the docs, "≤" tests and no new code. A grader reading the spec literally may still note it as a gap.
- **B:** Token-2022, freeze logic in every instruction, and the freeze power held only by the program, never by a person's key.
- **C:** Token-2022, plus a quick check that a program address can be the burn authority. It meets the spec's wording literally with less code than B, because transfers and trading aren't affected.

**Verdict on your direction: holds with a caveat.** Keeping it open is fine, but add option C. Also correct the plan's statement that Default Account State is "the only extension that blocks holder burns": F4.61 shows that Permissioned Burn blocks them too.

### Q36. If the confidence band at the close includes the strike, what should settlement do?

**Your direction (8 October, as interpreted; to confirm):** option (a). Straddling markets are held "under review" and settled through the admin override using the official close.

**1. The terms.**
- **Straddle:** the band, price minus conf up to price plus conf, contains the strike, so the oracle can't say which side won.
- **Under review:** a visible state in which a market waits for a manual decision (story S28).
- **Void:** cancel the market and pay each token a fixed share, such as $0.50.
- **Admin override:** the admin-only fallback that writes the result after a delay.

**2. Worked example.** At 4:00 PM Pyth reads META at $680.02 ± $0.04, a band from $679.98 to $680.06. That contains $680, so the market doesn't settle automatically. The other META strikes settle at 4:05.
- **(a) Hold and override:** at 4:20 the admin proposes "official close $679.97, No wins", and the result becomes final at 5:20 (with Q43's two steps). Bob receives $10.00 (+$6.50), and Alice receives $0 (−$6.50).
- **(b) Settle on the point price:** $680.02 ≥ $680, so Yes wins at 4:05. Alice gets $10.00 (+$3.50), which is the wrong side if the official close is $679.97.
- **(c) Void at $0.50 a token:** Alice gets $5.00 (−$1.50), and Bob gets $5.00 (+$1.50).

**3. The options and their evidence.**
- **Retry.** It helps only if the band is briefly wide. With too few publishers, Pyth forms no new price and carries the old one forward (F4.17), and the regular feed stops at 4:00 PM (F4.07, F4.18). After the close there is nothing new to narrow the band. The exact behaviour of the time stamp in that case is UNCONFIRMED (F4.33).
- **(a) Hold and override with the official close.** This resembles Kalshi, whose index markets expire at "the sooner of the first release of the data, or one week after market close" (F4.25, SECONDARY).
- **(b) Settle on the point price.** Simple, but the outcome is close to a coin flip, which undercuts the spec's "100% of settlements pay the correct side".
- **(c) Void.** Polymarket resolved equal-close stock markets 50/50 (F4.26, UNCONFIRMED). The plan's research says Polymarket pays 50/50 on markets it can't resolve (CONFIRMED there). A void is a third outcome, though, while the spec says settle writes "Yes wins or No wins" (see Conflicts, item 11).
- **(d) A fixed rule written into the contract terms.** Pyth lists "contract terms that depend on the confidence interval" as valid (F4.16). An example: "if the band contains the strike, settle on the official close published by 4:30 PM".

**4. What each answer commits you to.**
- **(a):** each held market misses 4:10 by design (F4.27). Someone has to type the official close, so Q43's safeguards matter more, and you need a source for the official close. Users' money waits until the override is final.
- **(b):** meets 4:10, and accepts occasional wrong payouts.
- **(c):** a new contract term users must see before trading, and a third outcome in the program.
- **(d):** like (a), but users see the rule up front in the terms.

**Verdict on your direction: holds with a caveat.** Retries can't help after 4:00 PM, and waiting for the authoritative number is what a regulated venue does (F4.25, SECONDARY). Caveats: every held market misses 4:10 (F4.27); how often holds happen is unmeasured, and at-the-money strikes make holds more likely (F4.34); and the official close may not be final until about 4:15 (F4.19, SECONDARY). Writing the rule into the contract terms, as in (d), makes the hold a disclosed rule rather than an emergency.

### Q37. Who should be allowed to call settle?

**1. The terms.**
- **Permissionless:** anyone may call it.
- **Signer:** the key that approves a transaction.
- **Cherry-picking:** choosing, among several valid prices, the one that suits you (F4.03).
- **Grace period:** a short time reserved for our bot before others may act.

**2. Worked example.** Our bot is down at 4:05.
- **(A) Bot only:** the META market waits until the bot recovers or until the admin override (5:00 at the earliest). Alice's $10.00 waits with it.
- **(B) Anyone:** Alice calls settle herself at 4:06. She pays the transaction fee and the cost of posting the price, and Yes wins on the 15:59:59.6 price of $680.10 ± $0.04. But Bob could get there first and submit the 15:59:10 price of $679.90 ± $0.04, which is also inside a ±60-second window, so No wins (F4.03).
- **(C) Bot first, then anyone after a deadline:** either Alice waits until the deadline, or the window is narrow enough that Bob has nothing to choose from.

**3. The options and their evidence.**
- **(A) Bot only.** Removes cherry-picking. Liveness depends on one service and its backup copy, and the spec says settlement "occurs automatically via the automation service" (F4.27).
- **(B) Anyone.** Pyth's model is permissionless by design (F4.31). Correctness then rests entirely on the program's checks, especially the width of the window (F4.03).
- **(C) Hybrid.** The report suggests a short grace period, for example until 4:10. The plan proposes bot-only until a deadline, for example 24 hours after the close, so that the D26 check against the official close and the Q44 hold can work first.
- **No source showed how other Solana venues decide this.** The report's lookups of Drift and Openbook were inconclusive.

**4. What each answer commits you to.**
- **(A):** a backup bot and alerts. A dead bot means a late settlement.
- **(B):** a window so narrow that only one price qualifies (see Q3). Any check against the official close before settlement is dropped.
- **(C) with a short grace period:** close to (B) for correctness, and better liveness.
- **(C) with a 24-hour deadline:** the bot's checks and the hold keep working. Money can't be trapped forever, but it can wait a day.

**Recommendation (Claude's; yours to accept or reject).** Keep the plan's (C), but decide the deadline knowing that the check against the official close before 4:05 is unlikely to work (see D26). The stronger reason for limiting settle to the bot is to stop cherry-picking. Narrowing the window (Q3) shrinks that risk whichever way you choose.

### Q39. Does "signs one transaction" to redeem still hold with winnings in many markets?

**1. The terms.**
- **Transaction limits on Solana:** 1,232 bytes, 64 accounts and 1,400,000 compute units (the measure of a program's work) (F4.69).
- **Address lookup table:** a list stored on the chain, so a transaction can refer to an account by a 1-byte number instead of its full 32-byte address (F4.70).
- **Rent:** a refundable deposit, paid in SOL (Solana's own coin), that every account must hold: (size + 128) × 6,960 lamports, where a lamport is the smallest unit of SOL (F4.71).
- **signAllTransactions:** a wallet feature that approves several transactions in one click. Wallet support wasn't checked.

**2. Worked example.** By Friday, Alice holds winning tokens in 12 markets, including her 10 Yes on META $680, which are worth $10.00.
- **One transaction per market:** 12 approvals.
- **Packed transactions:** one redeem touches about 6 accounts of its own plus about 4 shared ones. Without lookup tables, the 1,232-byte limit allows about 4 markets per transaction, so 3 transactions. With lookup tables, the 64-account limit allows about 9 or 10, so 2 transactions. These counts are my arithmetic on account numbers the report estimated (UNCONFIRMED).
- **Rent for the META market:** two token mints at 1,461,600 lamports each, plus the vault at 2,039,280, about 0.005 SOL before the market's own account. If Alice never redeems, the vault and the $10.00 stay locked forever. The two mints stay on the chain forever either way, because a standard mint can't be closed (F4.72).

**3. The options and their evidence.**
- **(a) One transaction per market.** Simplest. Honest wording would be "one transaction per market".
- **(b) A "Redeem all" button** that packs as many redeems as fit and asks the wallet to approve the batch once.
- **(c) A redeem_many instruction** that takes the extra accounts as a list.
- **(d) Wait for larger transactions.** A 4,096-byte format is proposed. The report found its proposal still "in review" (F4.69), while the plan's research says it is live (see Conflicts, item 12).
- **Rent is real but refundable** (F4.71). The vault and the market account can be closed after the last winning token is redeemed. The mints can't, unless they are created with Token-2022's Mint Close Authority and their supply reaches 0 (F4.72).

**The plan's proposal:** one click redeems everything, split into as few transactions as needed, with one batch approval where the wallet supports it.

**4. What each answer commits you to.**
- **(a):** change the spec's "one transaction" wording.
- **(b):** a lookup table per user or per day, plus testing of batch approval in the target wallets.
- **(c):** more program code and a harder account count.
- **In every case:** "redeemable indefinitely" means some rent stays locked for good. On devnet SOL has no value, so this matters only for a mainnet bonus. Closing each market's order-book account after settlement (the book isn't needed to redeem) recovers most of the rent. That point is reasoning, not a finding.

**Recommendation (Claude's; yours to accept or reject).** Use the plan's (b), with lookup tables. Say "one approval" rather than "one transaction" in the interface, and measure the real account count in the first redeem test.

### Q43. How should the admin override be designed so that a wrong manual price is caught before it becomes final?

**1. The terms.**
- **Timelock:** a forced wait before an approved action runs.
- **Propose, then finalize:** the admin publishes a price, and it becomes final only after a waiting period.
- **Challenge window:** the period during which others can object.
- **Multisig:** an account that needs several keys to sign.
- **Sanity bound:** a limit that rejects a price too far from a reference.

**2. Worked example.** META at $680 is under review. At 4:20 PM the admin proposes "official close $679.97, No wins". Suppose he mistypes it as $697.97, which would flip the result to Yes: Alice would get $10.00 and Bob $0.
- **With the plan's design,** the price can't become final before 5:00 (one hour after the close) or before 5:20 (one hour after the proposal). The bot sees that $697.97 is $17.91 above the 4:00 PM Pyth band ($679.98 to $680.06) and raises an alert. The admin withdraws it, re-proposes $679.97 at 4:35, and the result becomes final at 5:35. Bob gets his $10.00.
- **With a sanity bound** of, say, Pyth's price ± 10 times its band, $697.97 is rejected on the spot.
- **With a 24-hour wait,** Bob is paid on Wednesday at 4:35 PM.

**3. The options and their evidence.**
- **(1) Delay only** (the spec's minimum). OpenZeppelin's standard timelock pairs a delay with "cancel allows proposers to cancel any Pending operation" (F4.80). A delay without a way to cancel only gives time to watch the mistake happen.
- **(2) Propose, then finalize.** Polymarket's results sit in a 2-hour challenge period, and UMA lets "anyone" dispute during it (F4.79). The full UMA dispute vote takes days, which is far too slow for a daily contract.
- **(3) Sanity bounds.** For a straddle, the 4:00 PM Pyth band is a natural reference. For a halt or an outage there may be none, which is why the plan pairs bounds with "a longer wait otherwise". Pyth Benchmarks could serve as a cross-check (F4.30; F4.83, SECONDARY).
- **(4) Two keys.** Squads multisigs offer time locks of 1 hour, 1 day or 1 week (F4.81). On devnet one person probably holds every key, so this adds little there.
- **(5) Visibility.** Show "Proposed result X, final at T" on the site and send alerts.
- **(6) One-way.** Once final, the result is immutable (D2), so the waiting period is the only chance to catch a mistake.
- **Maker's oracle** delays its prices by one hour (F4.82, SECONDARY).
- **Common practice:** the plan's own research notes that 1 hour is short (Compound uses 2 days).

**4. What each answer commits you to.**
- **(1):** the least code. A typo becomes final after the delay unless someone notices.
- **(2):** propose, withdraw and finalize instructions, states shown on screen, and tests (D30 already lists them).
- **(3):** the reference price stored at the close, plus a rule for cases with no reference.
- **(4):** a Squads setup, which is mostly useful for a mainnet bonus.
- **Every extra hour** is an hour that held money stays locked (Q36), and it doesn't change the 10-minute miss, which already happens.

**Recommendation (Claude's; yours to accept or reject).** Use the plan's design: (2) with a withdraw step, (3) with the Pyth band as the bound in straddle cases, and (5). Keep the wait at the spec's 1 hour after the close plus 1 hour after the proposal on devnet, and require a longer wait plus a multisig before any mainnet bonus.

### Q45. Can "vault balance = $1.00 × total pairs minted (exact)" hold, and what should the tests check?

**1. The terms.**
- **Pairs outstanding:** pairs minted minus pairs redeemed as a pair.
- **Donation:** USDC that someone sends straight to the vault. The token program lets anyone do this without the vault's owner signing (F4.57).
- **Counter:** a number our program keeps itself.
- **Sweep:** an instruction that moves any extra money out to a separate account.

**2. Worked example.** Alice and Bob's trade makes 10 pairs, and the vault holds $10.00. Carol mints 5 pairs and then redeems them as a pair before the close: 15 pairs minted, 10 outstanding, vault $10.00. The literal wording says $15.00. A stranger sends $2.00 into the vault, which now holds $12.00 against $10.00 owed. Yes wins, and Alice redeems her 10 Yes for $10.00. The vault keeps $2.00 and owes $0, while Bob's 10 losing No stay outstanding, worth nothing.

**3. The options and their evidence.**
- **(1) The literal equality.** False after any pair redemption (F4.85) and after any donation (F4.57).
- **(2) The plan's form.** A counter rule, exact: before settlement, the program's own counted USDC equals $1 × pairs outstanding; after settlement, it equals $1 × unredeemed winning tokens. Plus a balance rule: the actual vault balance is at least that amount. Anchor can check that the vault is the right token account with the right owner (F4.84).
- **(3) Exact equality restored by a sweep.** Equality then holds after each of our instructions, but never "at all times", because a donation can land between instructions.
- **The report's test list:** "vault ≥ owed" after every instruction; exact equality in tests with no donation; supplies ≤ the counter; a donation test; conservation (money in minus money out equals the vault); a random-sequence test; and rereading the vault from the chain after each step. The reread step guards against a stale cached balance, which is unconfirmed for Anchor.

**4. What each answer commits you to.**
- **(2):** a counter in the market account, and the tests above. The docs say plainly that the spec's wording was corrected.
- **(3):** (2) plus a sweep instruction, an account to receive the surplus, and a decision on who may call the sweep.
- **Either way:** add settle and admin-settle to the tests that check the vault. The spec's test line names only mint and redeem (F4.85).

**Recommendation (Claude's; yours to accept or reject).** Use the plan's (2) and skip the sweep. Donations harm nobody, and a sweep is one more privileged power to explain.

### Q48. What should happen if a stock is halted at the close?

**1. The terms.**
- **Trading halt:** the exchange stops trading in one stock, for example pending news or after a sharp move.
- **LULD (limit up-limit down):** automatic pauses when a stock hits its price band. Per secondary summaries, a pause lasts five minutes and ends with a reopening auction (F1.29, SECONDARY, from group 1).
- **Carry-forward:** Pyth keeps showing the last price when too few publishers report (F4.17).

**2. Worked example.** META is halted at 3:40 PM pending news. The last trade was $681.20, and no closing auction runs.
- **The exchange's rule:** under the NYSE proposal, the official close is the most recent eligible last sale, $681.20, so Yes wins and Alice gets $10.00 (F4.22).
- **Pyth:** no new prices are formed, and $681.20 is carried forward (F4.17).
- **Under the plan's proposal,** the market goes under review and the admin settles with $681.20 after the delay. Yes wins.
- **Under a void,** Alice and Bob each get $5.00.
- **The open risk:** if the carried-forward price shows a fresh-looking publish time on Solana, the window check passes and settle runs automatically. In this example that gives the same answer, but nobody chose it on purpose. Whether this happens is unknown (F4.33, UNCONFIRMED).

**3. The options and their evidence.**
- **What exchanges do.** Nasdaq's rule says that if a volatility condition lasts until 5:00 PM, it "shall instead use the last-sale on NASDAQ as the NASDAQ Official Closing Price" (F4.21). An NYSE proposal from 2015 uses the last eligible sale, or the prior day's official close if the stock didn't trade that day (F4.22; adoption unverified). So an official close exists even for a halted stock, but only after the fact.
- **(a) Treat it as an oracle failure:** under review, then the override with the official figure (the plan's proposal).
- **(b) Void and refund the pairs.** A third outcome (see Conflicts, item 11).
- **(c) Wait for the official close up to a cap,** as Kalshi does ("the sooner of the first release of the data, or one week", F4.25, SECONDARY).
- **(d) Write the exchange's "last sale" rule into the contract.** Per secondary summaries, Polymarket's stock rules fall back to the exchange's official close when oracle data is missing (F1.30, SECONDARY, from group 1).
- **Frequency.** A halt at the close is likely rare for these seven very large companies, but no finding counts how rare.

**4. What each answer commits you to.**
- **(a):** a way to detect the halt (at least an admin "hold" button, Q44) and a manual step. Each such market misses 4:10.
- **(b):** a new outcome in the program and in the terms.
- **(c):** money locked for up to the cap.
- **(d):** a rule in the terms users see, and still a manual or backend-posted price.
- **Any choice is a new contract term,** because the spec is silent. It belongs in the payoff text and the risks note.

**Recommendation (Claude's; yours to accept or reject).** Use the plan's (a), write it into the contract terms in the spirit of (d) ("if the stock is halted at the close, the result uses the exchange's official close, set by the admin after the delay"), and add a test for a carried-forward price once the spike shows what its publish time looks like.

## Conflicts

1. **The spec's retry plan against its own freshness check.** The spec retries every 30 seconds for 15 minutes from about 4:05 and rejects prices older than 5 minutes. The regular feed stops at 16:00 (F4.07), and Pyth's built-in check measures age against "now" (F4.02). Taken literally, every retry after 4:05 fails. That conclusion combines two confirmed facts, and the combined claim (F4.33) is UNCONFIRMED. The spec's 10-minute target also sits before the end of its own retries and its own override delay (F4.27). The plan's Q3 window resolves the first problem, and Q13 documents the second.
2. **The spec's tie rule against its own labels.** "At or above" (the rule) contradicts "META > $680" and "closes above [STRIKE]" (the labels and payoff text) (F4.55). The plan's Q7 and Q52 fix the screen wording, and the glossary entry needs the same fix.
3. **D2 against the plan's own Q45, Q30 and Q25.** D2 states the literal invariants as "all enforced on-chain". Q45 (vault wording), Q30 (self-burn) and Q25 (upgrade key) each show one of them can't be literal (F4.57, F4.60, F4.59). D2's row should point to the corrected forms.
4. **Q30's "only extension" claim against F4.61.** The plan says Default Account State = Frozen is "the only extension that blocks holder burns (CONFIRMED)". F4.61 (CONFIRMED) shows that Permissioned Burn makes ordinary burns fail too.
5. **D26's check against the official close before 4:05, against the official close's timing.** D26 says the bot can compare Pyth with the official close before settling, "if the official close is out by ~4:05". Nasdaq disseminates the official close about 15 minutes after the close where it differs (F4.19, SECONDARY), and the free data source found is end-of-day only (F4.32). Q37's case for limiting settle to the bot partly rests on that early check. The other reason, preventing cherry-picking (F4.03), still holds.
6. **Correctness against liveness, made sharper by the strike at the previous close.** The spec wants 100% correct settlements and settlement within 10 minutes. D26 and Q36 choose correctness. The strike at the previous close (F4.34; Q8 proposes keeping it) puts a strike near where many closes land, which raises how often bands straddle a strike and so how often 4:10 is missed. Q8 is therefore also a lever on Q13.
7. **Industry tie practice: the plan's research against this report.** The plan says "Polymarket and HIP-4 both pay Yes on 'at or above' (CONFIRMED/SECONDARY)". This report has Nadex paying the buyer only strictly above (F4.54, SECONDARY), Polymarket's daily up/down markets splitting a tie 50-50 (F4.53, UNCONFIRMED as a finding), and a snippet saying Polymarket's "close above" markets resolve a tie as No (F4.53, UNCONFIRMED). D1 doesn't change, because the spec decides it, but the docs shouldn't claim the industry agrees.
8. **Pyth after the August upgrade: the plan against F4.04 and F4.05.** D28 says "owned by Pyth's receiver (or Pro verifier) program", and Q16's spike says "Pro uses a different on-chain verifier whose devnet support is UNCONFIRMED". Since 26 August, Pyth's standard service runs on its Pro system with the same interface (F4.04). The upgraded receiver `rec2HH…` has one ID across Solana networks, while the legacy `rec5EK…` is still listed (F4.05). Prices are now signed by 3 of 5 Pyth servers, while the code comments still describe the old system (F4.04).
9. **Pyth's prices and trial: the plan against F4.08 and F4.09.** The plan (Q16, 7 October) says Starter is crypto-only and "a free Pro trial key needs no card (CONFIRMED app.pyth.com/plans)". §10a cites $5,000 a month for US stocks. On 9 October the plans page showed Free with "No Pyth API access", Starter at $500 with an API key and Pro from $2,500, and it didn't mention a trial (F4.09). The trial is stated in Pyth's upgrade docs instead (F4.08). Whether a free key exists outside the trial is disputed (F4.10, UNCONFIRMED).
10. **Historical prices on Solana: three statements that don't agree.** The report's answer for D8 says anyone can post a signed historical update from Benchmarks, but F4.30 documents only the path for Ethereum-style chains. The plan's research says both "fetch the historical update and check publish_time in our program (CONFIRMED)" and "historical (Benchmarks) on-chain verification is documented for EVM only (CONFIRMED)". This is unresolved, and it affects D8's fallback, Q37's public settlement and Q43's cross-check. The plan's workaround, the bot keeping the 7 price accounts it posted at 4:05 (D29), avoids needing it.
11. **Void against the spec's two outcomes.** The report offers voiding (Q36 option c, Q48 option b), and Polymarket does it (plan research; F4.26 UNCONFIRMED). The spec says settle writes "the binary outcome (Yes wins or No wins)", and D2 proposes an outcome that can only take two values. A void keeps Yes + No = $1.00, but it is a third outcome and a new term users must see.
12. **Transaction size: the plan's research against F4.69 and F4.70.** The plan says the 4,096-byte transaction format is "live on devnet and mainnet since 2026-09-15" and that a lookup table doesn't lift the 64-account limit. The report found the 4,096-byte proposal at "Review" status (F4.69), and Solana's docs say lookup tables "raise the effective account limit" (F4.70). A proposal page's status can lag the network, so check the chain itself. The answer changes Q39's count of markets per transaction (about 4 against about 10).
13. **"Gate on publish time, not the clock" against "only after 4:00 PM".** The plan's research advises gating settlement on the oracle's publish time rather than the coarse chain clock, and Q3 says "never against the coarse chain clock". The spec requires settle to run only after the close. With a window from the close minus 60 seconds, a settle at 15:59:30 chain time could use a 15:59:20 price while trading is still open. Both checks are needed: the clock has passed the market's close (approximate, F4.29), and the publish time is inside the window.
14. **A4: the plan against the report on decimals and scaling.** The plan uses 0-decimal Yes/No tokens, while the report's leading answer uses 6 decimals (its own case against favours 0). The plan "converts" Pyth's price to the strike's scale, while the report says to scale the strike and never round (F4.56). Rounding can flip a result (see A4).
15. **Q37's deadline, and D24's leftover idea.** The report's hybrid uses a short grace period (around 4:10), while the plan uses 24 hours, so that the check before settlement and the Q44 hold can work. D24's row still says "or anyone once the 4:00 oracle price exists, an idea", which Q37 has since replaced.
16. **Q43's longer wait against money locked under Q36.** The plan's research calls 1 hour short (Compound uses 2 days) and floats 24 hours. Under your Q36 direction, every held market's money waits for the override, and Kalshi's stated payout is "usually within 1 hour" (F4.24, F4.25, SECONDARY). A longer wait buys safety at the cost of locked funds. On devnet with one admin key, a veto adds little (reasoning, not a finding).

## Weakest spots in the evidence

- **No live Pyth data.** Price requests returned "401 unauthorised" and a Benchmarks request returned "404 not found" (F4.08), so the band width at 4:00 PM, the real publish times near the close, how the band behaves after the close, and the gap between Pyth's last price and the official close are all unmeasured. D26, Q3, Q13, Q20 and Q36 all lean on these, and the plan's "1 day in 17" is an assumption.
- **The official close's timing and exchange rules.** The "15 minutes after the close" figure is SECONDARY (F4.19). The Nasdaq and NYSE rulebooks couldn't be opened, and the NYSE halt rule is a 2015 proposal whose adoption is unverified (F4.22).
- **Pyth's verification and time stamps after the upgrade.** What "fully verified" means under 3 of 5 servers (F4.04), what `prev_publish_time` means (F4.02), and how a carried-forward price shows up in the publish time on Solana (F4.33, UNCONFIRMED). D28, Q3 and Q48 depend on these.
- **Pyth's key and coverage.** The trial's length and limits, whether a free key exists (F4.10, UNCONFIRMED), and which stocks the devnet push feeds cover (F4.11).
- **Tie practice at other venues.** Only Cboe's 2008 rule is confirmed (F4.51). Kalshi (F4.52) and Polymarket (F4.53) are UNCONFIRMED, and Nadex is a 2014 secondary source (F4.54).
- **The Kalshi evidence comes through Robinhood's listings,** downgraded to SECONDARY (F4.24, F4.25). Kalshi's own rulebook couldn't be read.
- **Token-2022 details.** Whether a program address can be the Permissioned Burn authority, wallet support for it, and how it fits with our own book (F4.61). These decide whether Q30's option C is real.
- **Transaction and compute counts for redeem are estimates** (Q39), and the facts about the 4,096-byte format disagree (Conflicts, item 12).
- **USDC on devnet.** Its decimals are unconfirmed, and the freeze authority comes from a third-party API (F4.58, F4.64, SECONDARY).
- **No source on who may call settle on other Solana venues** (Q37).
- **Some CONFIRMED findings carry the verifier's own inference:** F4.07 (the effect of using the wrong feed ID), F4.29 (doing the Eastern Time conversion off the chain), F4.34 (straddles "not remote"), F4.35 (devnet uses the stable feed IDs, inferred from absence), F4.57 (anyone can deposit), F4.72 (a plain mint stays forever) and F4.85 (the "pairs outstanding" reading). They are probably right, but they are readings, not quotes.
- **Some numbers in the report's answers are reasoning only:** the ~0.03% tie chance per contract, the 85 SOL a year of rent, and the account counts for each redeem.
