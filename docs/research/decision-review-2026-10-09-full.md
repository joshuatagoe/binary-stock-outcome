# Decision review 2026-10-09-full: cross-group check

This file sits on top of the seven group judges' reports for run 2026-10-09-full. It doesn't re-judge any item. It gives one summary of the whole review, the full verdict table, the places where one group's findings or verdicts pull against another group's, and the weakest evidence across all groups. Each judge's own "Conflicts" section covers conflicts inside its group and between its findings and the plan. This file covers only conflicts between groups.

Plan copy used by the judges: [`docs/planning/2026-10-08-phase-1-plan-session-2.md`](../planning/2026-10-08-phase-1-plan-session-2.md).

**How to read the labels.** A **CONFIRMED** finding means someone opened the primary source and checked it again on 2026-10-09. A **SECONDARY** finding comes from a second-hand source, such as a news report or a search summary. Only these two kinds carry weight. An **UNCONFIRMED** finding is named where it matters, and nothing here rests on it alone. Finding IDs start with their group number: F4.08 is finding 8 in group 4's report.

## Summary

This review checked 86 items from the phase 1 plan against new research, in seven groups. No decision was rejected. Three hold as written (D1, D20, A1), 42 hold with a caveat, and 40 are open questions left for you, with the evidence laid out. One is contested: A2, your assumption that a day lost to a devnet outage won't count against the project. The spec's rule says "every trading day" with no exception (F6.48), and Solana keeps no official devnet outage record you could point to (F6.29). Read across the groups, four threads matter more than any single verdict. **First, almost everything depends on Pyth**, the price service. The 8:00 AM read that sets the strikes (D7), the live stock price on screen (D14), settlement (Q16), the grader's devnet run (Q24, Q55) and recovery after a devnet halt (D19) all need a Pyth key. Pyth's plans page lists stock prices only on its Pro plan, from $2,500 a month (F2.52, F7.22), not on the $500 plan that group 4 quotes (F4.09). A free trial exists (F4.08), but nobody knows how long it lasts, whether it covers stocks, or whether it lets you show prices to the public (Q50). The Q16 Pyth check should answer all of that before Architecture. **Second, several choices put a correct answer ahead of the 10-minute settlement target.** Holding a market whose price band straddles the strike (D26, Q36), the strike at yesterday's close (Q8) and late settlement after an outage (D19) all make late settlements more likely. The spec allows no exceptions, so you need one written rule for counting misses (Q13, Q23). **Third, a safety check that three items lean on probably can't run in time:** comparing Pyth's price with the official close before the 4:05 settlement. The official close may only be final about 15 minutes after 4:00 (F4.19, SECONDARY). **Fourth, your own test-dollar token (Q19) fixes the faucet limits** for users and for the market-maker bot (Q21). But it makes the project the issuer of a token, and a configurable USDC address puts real money one setting away (D3). The groups also disagree on some facts. Two CONFIRMED pages contradict each other on whether devnet already runs Alpenglow, Solana's fast-finality upgrade (F5.44 against F6.20). The groups also disagree on whether Pyth's single-stock feeds are available (F4.06 against F7.26). Four groups found separately that no item plans for a devnet reset, which would wipe every market (F1.01, F4.74, F5.11, F6.01). Three groups agree that prices must be compared at Pyth's full precision and never rounded first (group 1's conflict 4, Q32, A4).

## Verdict table

Copied from the seven judges' reports. "Spec" means the spec says it, "owner" means you asked for it or set its direction, and "Claude proposal" means Claude suggested it and you haven't confirmed it yet.

| Item | Group | Source | Verdict | Why |
|---|---|---|---|---|
| D10 | 1 | spec | Holds with a caveat | The five pages hold as a minimum, but the spec omits a market-maker view, an admin screen and a home for the risks note (F1.39), and its payoff line says 'above' where the rule is 'at or above' (F1.38), covers only Yes (F1.39) and states the payout rather than the profit (F1.23), so reword it to Q52's fuller line plus profit and a No version. |
| Q7 | 1 | Claude proposal | Your call | The evidence strongly backs the plan's 'at or above' proposal: the spec's rule and worked example are inclusive (F1.38), venue labels say 'or above' (F1.17, F1.18), and a strict 'above' reads as 'a tie pays No' on other venues (F1.19, F1.21, SECONDARY). |
| Q19 | 1 | Claude proposal | Your call | Circle's faucet gives 20 USDC every 2 hours behind a human check (F1.05) and its API needs an upgraded account (F1.06), so the plan's own test token is the only route for a bot and scripts, at the cost of the spec's literal 'USDC', with feasibility UNCONFIRMED here (F1.09) and no help with SOL. |
| Q22 | 1 | owner (raised it) + Claude proposal | Your call | The 'no real value' wording is well sourced (F1.01, F1.07, F1.10, F1.16) and a banner matches testnet practice (F1.10, F1.12), but nothing measures whether users notice it, and a distinct token name needs the plan's own token from Q19. |
| Q40 | 1 | owner (keep missing stories for USERS.md; S25 to S29 frozen) + Claude proposal | Holds with a caveat | S25 to S29 are each backed, but own-order cancel with partial fills (F1.23), a devnet operator, the required risks note (F1.39) and a devnet reset (F1.01) still have no story in the frozen map. |
| Q52 | 1 | Claude proposal + owner (every screen gets loading, empty and error states) | Holds with a caveat | The direction and the plan's six gaps are supported (F1.12, F1.23, F1.28, F1.39), but the grader's front-end tests are narrower, venue live screens were not opened, and History should become an activity log (F1.26, SECONDARY), so the work needs ranking. |
| Q54 | 1 | owner (raised it) + Claude proposal | Your call | The plan's core holds (traders just connect; admin power is checked on-chain with Signer as well as has_one, F1.33, F1.34, F1.36), but its 'operator page authenticated by the admin wallet via SIWS' clashes with its own multisig and hardware-wallet plans given narrow SIWS support (F1.31) and Ledger failures (F1.32). |
| D5 | 2 | spec | Holds with a caveat | Atomic one-signature transactions (F2.17) and Kalshi's one-book reciprocal rule (F2.19, F2.95) support the four paths, but Sell No needs a pre-settlement pair close the spec lacks (Q5; F2.36, F2.38), and the Buy No and Sell No book legs must not partly fill and strand a Yes. |
| D9 | 2 | spec | Holds with a caveat | The spec asks for frontend enforcement and venues treat holding both as harmless (F2.23), but the check must count Yes locked in the trader's resting orders (F2.39) and needs the pair close (Q5) as the escape route from both-held states the app creates itself. |
| D13 | 2 | Claude proposal | Holds with a caveat | Atomicity, expiry and status-check rules are confirmed (F2.17, F2.24 to F2.27), but 'never half-done' holds per transaction only, and the UI needs a 'sent, may still land' state that never re-sends before the blockhash expires. |
| D14 | 2 | owner + spec | Holds with a caveat | Venues keep closed, paused and disconnected states separate (F2.69, F2.70, F2.84), but staleness must come from a heartbeat because a quiet book is not stale (F2.68), a Pre-open state is missing, 'closed at $X' must name the regular-session price (F2.83), and a live stock price depends on a paid or trial key (F2.52). |
| D15 | 2 | Claude proposal | Holds with a caveat | Worst-price caps are standard practice (F2.13, F2.29, F2.30, F2.31), but partial fills must not apply to the Buy No and Sell No book legs, where they would leave the trader holding both tokens, and no source gives a default cap width. |
| D16 | 2 | owner | Holds with a caveat | SSE suits one-way data and reconnects by itself (F2.63, F2.65), and snapshot-then-changes matches Kalshi (F2.68), but it needs an always-on host (F2.66), HTTP/2, sequence numbers, and a direct-read fallback because the relay is a single point of failure. |
| D20 | 2 | spec + owner | Holds | The spec requires an on-chain book (F2.04), hybrid matching puts a trusted operator in the middle (F2.01), and Solana's 0.4 s slots make on-chain matching workable (F2.05); the per-transaction cost for a quoting bot is already acknowledged. |
| D21 | 2 | owner + spec | Holds with a caveat | The case against Manifest is confirmed (F2.08, F2.09), but Phoenix has every needed control and is now MIT-licensed (F2.11, F2.12, F2.13), so the write-up should reject it on its real grounds (Legacy status, unverified rent F2.06, seats F2.14) and list it as a fallback; the own book's build effort is unmeasured. |
| D25 | 2 | spec | Holds with a caveat | Both paths are in the spec (F2.103) and Kalshi gives a ready field list for the dashboard (F2.94), but makers work through scripts (F2.96), and the plan's 'filled maker bid closes the pair for $1' needs a design, because the maker isn't signing when the fill happens. |
| A1 | 2 | Claude proposal | Holds | The spec allows fees only in a separate account (F2.38) and comparable venues charge takers only, if at all (F2.32, F2.33 SECONDARY, F2.34), so on devnet fees add complexity without benefit; keep the separate-account rule so fees can be added later. |
| Q4 | 2 | Claude proposal | Your call | The evidence favours a hard stop with cancel and refund (F2.70; frozen story S26 already assumes it), but the 3:59 buffer can't be sized because no source gives the chain clock's error (F2.77, F2.78 UNCONFIRMED). |
| Q5 | 2 | spec + Claude proposal | Your call | A pre-settlement pair close is the standard Gnosis pattern (F2.36), and Sell No and the S27 cancel need it, at the cost of rewording the spec's vault rule (F2.38, Q45). |
| Q6 | 2 | Claude proposal | Your call | Showing a pending order fits Kalshi's practice and a book that locks resting tokens (F2.39), and the frozen story S27 already says 'pending', but partial fills and cancelling depend on the pair close (Q5). |
| Q11 | 2 | owner (raised the question; no proposal) | Your call | Venues leave strike-ladder gaps to arbitrageurs (F2.89); the theory is SECONDARY (F2.88) and the derivation UNCONFIRMED (F2.90), though its arithmetic checks out, and a bot quoting in order removes most inversions. |
| Q17 | 2 | Claude proposal + owner (via D16) | Holds with a caveat | A server-side relay is the only safe way to use the now key-gated Hermes (F2.51, F2.54, F2.55), but US stocks need Pyth's Pro plan (F2.52), the free trial is disputed (F2.53 UNCONFIRMED), and display rights for many viewers are unknown. |
| Q18 | 2 | owner (direction B, D16) | Holds with a caveat | The relay is needed anyway for the oracle key and avoids putting a paid RPC key in the browser (F2.51, F2.60), but the plan's '980 subscriptions' argument overstates the problem because devnet limits are per address (F2.58), and the relay needs a fallback. |
| Q21 | 2 | Claude proposal | Your call | Without a quoter a new book is empty, faucet limits make your own test-USDC mint effectively required (F2.98), and devnet's rate limits cap how fast the bot can refresh (F2.58). |
| Q28 | 2 | Claude proposal | Your call | The one primary source, Manifest's matching code (F2.09), supports execution at the resting order's price; the Polymarket support (F2.20, F2.40) is UNCONFIRMED and no exchange rulebook was found. |
| Q29 | 2 | Claude proposal | Your call | Closing minting together with trading matches Kalshi's stop at close (F2.70), and minting alone is value-neutral (F2.102 UNCONFIRMED, arithmetic checked), while closing it earlier would break Buy No near the close. |
| Q31 | 2 | Claude proposal | Your call | The spec says block and guide; Kalshi treats buying Yes and selling No as the same (F2.41) and nets the two (F2.23); a one-transaction flip needs the pair close (Q5); no source on one-click flips was found. |
| Q38 | 2 | Claude proposal (spec correction) | Your call | Kalshi's reciprocal rule (F2.19) confirms that a No buyer pays $1 minus the Yes bid, so the spec's $1 minus Yes ask is the seller's price, and Polymarket's midpoint-or-last-trade rule (F2.42) supports the proposed probability display. |
| Q41 | 2 | Claude proposal | Your call | No orders before 9:30 matches Kalshi's 'not yet open' state (F2.70) and avoids an opening auction like Nasdaq's (F2.81), at the cost of an empty book at 9:30; Phoenix-style post-only (F2.74) is the alternative. |
| D6 | 3 | spec | Holds with a caveat | The formula works and removing duplicates is required (F3.08, F3.24), but today's prices give 39 or 46 markets a day rather than 49 (F3.35, arithmetic re-checked); strikes must be computed with whole numbers, and "adjust" must be narrowed to adding strikes because editing a held market changes the bet under its holders (F3.26). |
| D7 | 3 | spec | Holds with a caveat | The order of steps is sound, but "4:00" must be each market's close time from the calendar (1:00 PM early closes, F3.01, F3.02), and the 8:00 read must request yesterday's close by timestamp, a read that needs the Pyth key since 2026-08-26 (F3.03, F3.06, F3.07). |
| D12 | 3 | Claude proposal | Holds with a caveat | NYSE's published calendar matches the plan's dates and Pyth's schedule matches NYSE (F3.01, F3.02, F3.33), so a table kept in the repo is sound once it gets a test that fails when it runs out, a keyless Pyth cross-check covering about nine months ahead, and a manual skip for unscheduled closures (F3.05, SECONDARY). |
| D29 | 3 | spec + Claude proposal | Holds with a caveat | The job list and New York time scheduling are supported (F3.21, F3.22, F3.23 SECONDARY), but each day's run times must come from the calendar so that settlement moves to about 1:05 PM on early-close days, and no crank job is needed with our own book (F3.15, F3.31 SECONDARY). |
| Q8 | 3 | Claude proposal (open) | Your call | No data shows which strikes trade most (gap; F3.29 is qualitative only), so the plan's "most-traded" reason is unproven, but both spec examples and the running $680 market include the 7th strike, at a cost of 7 more markets a day (F3.35, arithmetic re-checked). |
| Q9 | 3 | Claude proposal (open) | Your call | Offsets in config with a 3/6/9 default fit the evidence; who the "user" is rests only on venue practice (Kalshi trader requests reviewed by staff, F3.25; Nadex, F3.30 SECONDARY), and the $10 step should also be a setting. |
| Q10 | 3 | Claude proposal (open) | Your call | The deposit formulas are confirmed (F3.11 to F3.14), giving about 0.008 SOL per market before the book, but the plan's Manifest and OpenBook figures are out of date since the owner chose our own book (D21) and come from Manifest's own claims (F3.15). |
| Q14 | 3 | Claude proposal | Your call | The proposal (store a 1:00 PM close and settle at about 1:05) is backed by NYSE and Pyth (F3.01, F3.02) and by reported Polymarket practice (F3.28, SECONDARY); add 2027-11-26 to the dates. |
| Q32 | 3 | Claude proposal | Your call | Half-up rounding with whole numbers in one shared function fits F3.24 and F3.08, but "whole cents" adds a second rounding because Pyth prices carry five decimal places, which can flip a strike ($499.995 gives $480 or $490). |
| Q33 | 3 | Claude proposal | Your call | "Fixed once it exists; adjust means add, or remove before any minting" matches venue norms (F3.25, F3.26), but removal must also require an empty order book, because a bid can lock USDC before anything is minted (D21). |
| Q34 | 3 | open (options listed, no proposal) | Your call | A pre-market price exists only in Pyth's paid service (F3.07, F3.08), the standard feed covers the regular session only (F3.02, F3.06) and the trial is temporary (F3.03), so the spec's admin Add Strike is the option that needs no extra data. |
| Q35 | 3 | Claude proposal | Your call | Pinning the GOOGL feed holds (F3.09; a third "GOOGL 24/7" feed also exists), but the "split-adjusted previous close" has no source because Pyth's docs are silent (F3.10, SECONDARY), so detecting a split and skipping the stock is what the evidence supports. |
| Q42 | 3 | spec + Claude proposal | Your call | Pacing is right (F3.17), but the fixed 30-second retry should follow the spec's backoff wording (F3.19), re-sign only after the roughly 79-second blockhash life ends, and count "already exists" as success so that a market is never created twice (F3.18). |
| D1 | 4 | spec | Holds | The spec states at-or-above outright and Cboe's binary rule splits outcomes the same way (F4.51); venues are not uniform (F4.54 SECONDARY, F4.53 UNCONFIRMED), and the spec's 'closes above' labels contradict the rule (F4.55), which Q7 fixes. |
| D2 | 4 | spec | Holds with a caveat | The Yes+No=$1 and mint-only-by-program rules are literal, but vault equality (F4.57, F4.85), burn-only-via-redeem (F4.60) and immutability (F4.59) are not, so D2's row must be rewritten to match the plan's own Q45/Q30/Q25 corrections. |
| D8 | 4 | spec | Holds with a caveat | The structure fits, but 'after 4 PM' must be each market's stored close (F4.07, F4.29), freshness must be measured against the close because the SDK only checks against now (F4.02; the retry-failure claim F4.33 is UNCONFIRMED), and retries cannot narrow a band after the close (F4.17). |
| D26 | 4 | owner | Holds with a caveat | Pyth lists confidence-dependent contract terms as valid (F4.16), but the band says nothing about the official close, the official close may be final only ~15 min after 4:00 (F4.19 SECONDARY) so the pre-4:05 pre-check is unlikely, and straddle frequency at near-money strikes is unmeasured (F4.34). |
| D28 | 4 | Claude proposal | Holds with a caveat | Pyth's docs back every check (F4.01, F4.02), but the program must pin one of two receiver IDs (F4.05), 'Full' verification changed meaning in the August upgrade (F4.04), and a wide window allows cherry-picking (F4.03). |
| A4 | 4 | Claude proposal | Holds with a caveat | Integers and 0-decimal tokens are right, but compare by scaling the strike up to Pyth's exponent rather than rounding Pyth's price to cents (F4.56, F4.65), read the exponent per update (F4.66), and read devnet USDC decimals at runtime (F4.64 SECONDARY). |
| Q2 | 4 | Claude research; owner (Pyth, via Q16) | Holds with a caveat | Pyth is the only provider confirmed with all 7 stocks and a confidence value (F4.06, F4.16), but no live update has been verified on devnet yet because Hermes needs a key (F4.08). |
| Q3 | 4 | Claude proposal (owner to choose) | Your call | Measuring against the market's close is strongly supported (F4.02, F4.07); the open choices are the close definition and the window width, since a ±60 s window lets a caller pick a favourable update (F4.03). |
| Q13 | 4 | Claude proposal | Your call | The spec's own timeline puts retries and the override past 4:10 (F4.27), so documenting the limit is right; how misses are counted (per contract, stock-day or trading day) is the open choice (F4.28). |
| Q16 | 4 | owner (direction) + Claude proposal (spike) | Holds with a caveat | A free trial exists (F4.08) but its length is unknown and the cheapest keyed plan is $500/month (F4.09); the spike should also check which equities Pyth's devnet push feeds cover (F4.11), the most concrete form of the fallback. |
| Q20 | 4 | Claude proposal (open, no lean) | Your call | Single prices invite close manipulation (F4.20) while averages are used by venues (F4.24 SECONDARY, F4.16) but can only sit before 16:00 (F4.07) and diverge more from the official close. |
| Q27 | 4 | Claude proposal | Your call | The fill-event-plus-recorder design matches the evidence on RPC limits and resets (F4.74, F4.75) and log truncation (F4.77); the cost-basis rule for entry price is still unchosen. |
| Q30 | 4 | Claude proposal + owner (keep open) | Holds with a caveat | Keeping A vs B open is fine, but Token-2022 Permissioned Burn also blocks holder burns (F4.61), contradicting the plan's 'only extension' claim, so it should be added as option C pending checks on PDA authority and wallet support. |
| Q36 | 4 | owner (direction, to confirm) + Claude proposal | Holds with a caveat | Retries cannot help after the close (F4.17; timing detail F4.33 UNCONFIRMED) and waiting for authoritative data matches Kalshi (F4.25 SECONDARY), but each held market misses 4:10 (F4.27), the hold rate is unmeasured (F4.34) and the override is a hand-typed price. |
| Q37 | 4 | Claude proposal | Your call | Bot-only settle blocks cherry-picking (F4.03) and open settle helps liveness (F4.31); no source showed how other Solana venues decide, and the deadline length is the open choice. |
| Q39 | 4 | Claude proposal | Your call | Transaction limits are confirmed (F4.69, F4.70), but the plan's ~10 markets per transaction needs lookup tables (about 4 without, arithmetic on UNCONFIRMED account counts), and plain mints can never be closed (F4.72). |
| Q43 | 4 | Claude proposal | Your call | Comparable systems pair delays with cancel paths and challenge windows (F4.80, F4.79), which the plan's propose-withdraw-finalize design has; the wait length trades safety against locked money. |
| Q45 | 4 | Claude proposal | Your call | Donations (F4.57) and pair redemptions (F4.85) make the literal wording false, strongly supporting the plan's counter-exact plus balance-at-least form; whether to add a sweep is the remaining choice. |
| Q48 | 4 | Claude proposal | Your call | Exchanges still define an official close for halted stocks after the fact (F4.21; F4.22 a 2015 proposal) and Pyth carries prices forward (F4.17), but how that appears in Solana's publish time is UNCONFIRMED (F4.33). |
| D17 | 5 | spec | Holds with a caveat | Environment variables follow the spec (F5.01), but they are the weakest store (F5.02, F5.03), so D17 should cover only the backend's own secrets and keep the admin and upgrade keys off the server in a hardware wallet or multisig (F5.06), with a rotate-first runbook (F5.05). |
| D19 | 5 | owner + Claude proposal | Holds with a caveat | The close-anchored price rule, the on-chain cutoff and rebuilt retries are backed by F5.08, F5.10, F5.16 and F5.17, but the plan lacks a reset plan (F5.11), a mid-day grace period (F5.09), a single-update rule for the 4:00 price on the regular-session feed (F5.15) and a block-progress halt detector (F5.13, F5.14). |
| D22 | 5 | spec + owner | Holds with a caveat | Anchor 1.2.1, WSL, Codama with Kit and LiteSVM all match confirmed findings (F5.18 to F5.25), but Anchor's churn means one exact version should be pinned and the plan's two different minimums reconciled; the OneDrive build concern (F5.26) is UNCONFIRMED. |
| D23 | 5 | owner + Claude proposal | Holds with a caveat | The three-part shape with the backend affecting only liveness matches the report and F5.29 and F5.04, but 'trading still works if the backend dies' is only half true under D16, and 'never moves users' money' depends on D24's role limits. |
| D24 | 5 | spec + Claude proposal | Holds with a caveat | A program-owned mint authority and holder-only redeem are confirmed (F5.32, F5.33, F5.34), but D24 still needs a freeze-authority rule, an initialize signer lock, Q37's settle rule, and rows for the later functions. |
| D27 | 5 | spec + Claude proposal | Holds with a caveat | Close pair is well supported (F5.38, F5.41), but the list misses the settlement hold, the two-step override steps and a key-rotation function that other plan items now need. |
| Q12 | 5 | Claude proposal + owner direction | Holds with a caveat | Your direction (wait for finalized on devnet, defer mainnet handling) rests on devnet running Alpenglow, which the plan's RPC check says and Solana's own page (F5.44, CONFIRMED) contradicts, so run getAgGenesisCert and a timed sample first. |
| Q25 | 5 | Claude proposal | Your call | The upgrade key can rewrite the 'immutable outcome' rule (F5.47), and a multisig (F5.48) or immutability (F5.47) are the confirmed options; whether Squads time locks cover upgrades is untested (F5.49). |
| Q26 | 5 | owner + Claude proposal | Holds with a caveat | A server-less React site works with either a Next.js static export (F5.28) or Vite (F5.54), but it depends on the backend for all live prices (F5.04) and daily-created markets shape the page addresses. |
| Q44 | 5 | owner + Claude proposal | Holds with a caveat | No frozen money fits the spec (F5.61), Phoenix (F5.36) and Gnosis (F5.39), but the settlement hold rests on reasoning and its public fallback fails if devnet halts across 4:05. |
| Q53 | 5 | owner (raised it) + Claude proposal | Your call | The three logging layers match OWASP (F5.63), but fill events used for P&L can be lost with emit! (F5.66) and a missed job needs an outside dead man's switch (F5.64). |
| D4 | 6 | spec + Claude proposal (the HyperLiquid note) | Holds with a caveat | The stack is the spec's preferred one and current (F6.04, F6.05), but the HyperLiquid note must give D18's reasons because HIP-4 now exists (F6.06, F6.07), Next.js conflicts with Q26's deferral, and Anchor 1.x and @solana/kit churn needs pinning and an M0 Codama test (F6.02, F6.04). |
| D11 | 6 | owner + Claude proposal | Holds with a caveat | A close time per market is supported (F6.37, F6.53), and keeping fake prices and clock outside the deployed program matches venue sandbox practice (F6.15, F6.16, F6.17), but the report's own lead favours a demo mode, the plan words the boundary four ways, and the local run skips Pyth's real signature path (F6.39). |
| D18 | 6 | owner + spec | Holds with a caveat | The own-program reason is confirmed against HIP-4 and Injective (F6.27, F6.07, F6.25), but Sui's DeepBook can be called from your own program (F6.23) so Sui needs other reasons, finality must be stated for Alpenglow devnet (F6.20), and several alternative-chain facts conflict with the plan. |
| D30 | 6 | spec + Claude proposal | Holds with a caveat | It fills the spec list's real gaps (F6.36) with current tools (F6.33, F6.34), but should add a devnet smoke run for the real Pyth path (F6.39), duplicate-account tests (F6.40), compute checks and bot-crash/rate-limit tests (F6.38, F6.46), settle the fuzzer choice (F6.32, F6.35), and be ranked. |
| A2 | 6 | owner (to confirm) | Contested | The spec's liveness rule has no outage exception (F6.48) and there is no official devnet record to cite (F6.29); the protections are sound and checkable (F6.42, F6.43, F6.44) but cannot separate devnet from RPC failures (F6.46) or survive a ledger reset (F6.01). |
| Q23 | 6 | Claude proposal (open, ask in the batch) | Your call | Open question; the plan's proposal (document, log evidence, ask Peak6) fits F6.48 and F6.29, except its uncorroborated 'devnet halted 3 times in 2026' line (F6.28, SECONDARY). |
| Q24 | 6 | owner (decided 2026-10-07) | Holds with a caveat | The direction keeps every settle check and gives an any-hour local run (F6.17, F6.18), but a weekend grader cannot see the cycle on testnet as the spec and S23 say (F6.53), so add archived signatures from a real devnet run (F6.01), narrow the 9:30-4:00 wording to the regular-session feed (F6.10), and note the devnet run needs a Pyth key (F6.12). |
| Q55 | 6 | Claude proposal (open, ask in the batch) | Your call | Open question; the plan's two-tier shape matches the evidence that Windows needs WSL (F6.56), Surfpool's Windows support is undocumented (F6.18, F6.62), and devnet needs a Pyth key (F6.12) and rate-limited faucet SOL (F6.57). |
| D3: non-custodial; no KYC, no margin; no mainnet or real funds for the core submission | 7 | spec | Holds with a caveat | The spec states it (F7.30), and the relevant rules all turn on real value (F7.01, F7.04, F7.05, F7.06), but low exposure is an inference: 'no custody' is untested against the admin's override, hold, pause and upgrade-key powers, and 'no value' depends on never selling the token and on Q19's swappable USDC address not reaching real funds. |
| Q46: cap positions per wallet per market? | 7 | Claude proposal (open, for the batch) + owner (triage in Architecture) | Your call | Registered exchanges must have limits or accountability levels (F7.08), but those work by aggregating per person (F7.10), so on a chain with no KYC a per-wallet cap is a speed bump; Kalshi's text was unread (F7.11 SECONDARY), the $25,000 figure (F7.12) is UNCONFIRMED and carries no weight, and the triage-in-Architecture direction holds. |
| Q47: how can users dispute a settlement? | 7 | Claude proposal (open, for the batch) + owner (triage in Architecture) | Your call | Venues range from support-only (F7.13) to bonded challenges taking 2 hours to 4-6 days (F7.14, F7.15), which clash with the 10-minute target and mean nothing with no-value bonds; the plan's safeguards cover held markets, not the ones settled automatically at 4:05, and the triage direction holds. |
| Q49: mainnet bonus with real USDC | 7 | spec (bonus) + owner (deferred 2026-10-08) | Holds with a caveat | The deferral fits the spec's 'not required to pass' (F7.30), the CFTC's Polymarket order (F7.04), the open SEC question on single stocks (F7.19, F7.20 SECONDARY) and the $2,500-a-month data cost (F7.24), but the 'Cut' entry must state facts, not legal conclusions, and some of the plan's reasons were not rechecked. |
| Q50: can live Nasdaq stock prices be shown publicly? | 7 | spec (live prices) + owner (D14, triage in Architecture) + Claude proposal (options, lean: ask Pyth) | Your call | The spec and D14 want live oracle prices (F7.29), but only Pyth Pro lists equities with display rights (F7.22) and delayed-display terms are unconfirmed (F7.27 SECONDARY); the triage direction holds with a caveat, because the Q16 Pyth check needs the answer before Architecture. |
| Q51: geoblocking and wallet screening on devnet? | 7 | Claude proposal (open; lean: unnecessary on devnet) + owner (triage in Architecture) | Your call | Real-money venues geoblock (F7.17, F7.18), but no source covers a no-value devnet app, OFAC's text was unread (F7.31) and screening is a paid product (F7.34); the plan's lean is a reasonable inference, any risks-note line must state a fact rather than make a compliance claim (F7.30), and the triage direction holds. |

## Words used below

- **Pyth:** the price service (an **oracle**) that puts stock prices on the blockchain in a form the program can check. **Hermes** is Pyth's web service for signed prices. Since 26 August 2026 every Hermes request needs an **API key**, a password that identifies a paying or trial customer.
- **Devnet:** Solana's free public test network, where all money is play money. In a **halt** the network stops but keeps everything. In a **reset** it is wiped and restarted empty.
- **Settle:** record which side won. **Redeem:** swap a winning token for $1.00.
- **Confidence band:** the "±" Pyth puts on each price. When the band contains the strike, it **straddles** the strike, and the price can't say who won.
- **Liveness:** the spec's rule that markets exist before the open and settle within 10 minutes of the close, every trading day.
- **Official close:** the price Nasdaq sets in its 4:00 PM closing auction. It is not the same as Pyth's last price.
- **Alpenglow:** Solana's new voting method, which makes a transaction final in about 0.15 seconds instead of about 13.
- **Freeze authority:** the one account allowed to lock someone's token account.
- **Running example:** "META ≥ $680 today?". Yes trades at $0.65 and No at $0.35. Alice pays $6.50 for 10 Yes, and Bob pays $3.50 for 10 No.

## Conflicts between groups

Ordered roughly by how much they affect the build. Each one names the items and findings on both sides.

### 1. Live stock prices on screen against the data licence

- **Groups 2, 5 and 6 build on live prices.** D14 (group 2, holds with a caveat) promises a live stock price. Q17 (group 2, holds with a caveat) relays Pyth through our backend to every browser, because the key can't sit in the website (F2.51, F2.54). Q26 (group 5) has the website get every live price from the backend (F5.04). Q55 (group 6) offers graders our hosted backend, which shows our key's prices to them.
- **Group 7 (Q50) finds the right to show them unsettled.** Only Pyth Pro, from $2,500 a month, lists stocks with display rights and "limited redistribution" (F7.22). Nasdaq data through Pyth needs Nasdaq's written approval (F7.23). The terms for delayed prices are unconfirmed (F7.27, SECONDARY), and Pyth's API terms weren't found (F7.25). Group 2 also left open whether one key may serve many viewers (Q17).
- **Why it matters:** if the answer is no, D14's live price, the spec's "real-time price display from oracle" test and Q55's hosted-backend path all change. Q50 is marked "triage in Architecture", but D14 needs the answer first.
- **What settles it:** ask Pyth in writing as part of the Q16 check, before Architecture. Design the price panel so it can show a live price, a labelled delayed price, or nothing (group 7's recommendation).

### 2. What Pyth costs for these seven stocks

- **Group 4 (Q16, holds with a caveat):** "the cheapest keyed plan is $500/month" (F4.09). Its worked example prices three months at $1,500.
- **Groups 2 and 7:** the same plans page, read the same day, lists the $500 Starter plan as crypto only. Stocks appear only under Pro, from $2,500 a month, or $7,500 for three months (F2.52, F7.22, both CONFIRMED). Group 7 also notes that the plan's §10a cites $5,000 a month from a June blog post.
- **On the trial:** group 4 says a trial exists (F4.08, CONFIRMED in Pyth's upgrade docs). Group 2 says Pyth's own pages disagree, because the plans page shows no trial (F2.53, UNCONFIRMED). Nobody has confirmed whether the trial covers stocks.
- **What settles it:** budget for $2,500 a month as the cost after the trial ends. Have the Q16 check record which plan the trial key belongs to and whether it returns stock prices.

### 3. Which Pyth feeds exist for the seven stocks

- **Group 4 (Q2, holds with a caveat):** Pyth's own feed listing has a regular-session feed for all seven stocks (F4.06, CONFIRMED, listing only, no live price).
- **Group 7 (Q50):** Pyth's Core feed-ID page showed index feeds but no single stocks such as AAPL, and it says Core feed IDs differ from Pro feed IDs (F7.26, CONFIRMED). Group 6 reports, UNCONFIRMED, that Pyth's Core docs now redirect to Pro pages (F6.13). Group 4 says Core now runs on Pro's system with the same interface (F4.04).
- **Why it matters:** D28 (group 4) pins exact feed IDs inside the program. If the IDs depend on the plan, a wrong pin makes every settlement fail.
- **What settles it:** in the Q16 check, pull one live update for each of the seven stocks with the trial key, verify it on devnet, and record the IDs that work.

### 4. The Pyth key is needed far beyond settlement, but Q16's fallback covers only settlement

- **Group 4 (Q16):** your fallback, if the trial ends, is to read Pyth prices that someone else posts on devnet, such as Pyth's own sponsored feeds (F4.11).
- **Other groups need the key for things that fallback doesn't cover:**
  - the 8:00 AM read of yesterday's close, by timestamp (D7, group 3; F3.03);
  - the live price on screen (Q17, group 2; F2.51);
  - the grader's devnet run (Q24, Q55, group 6; F6.12);
  - fetching the 4:00 PM price again after a devnet halt (D19, group 5's conflict 5; F5.04).
- **Why it matters:** if the trial lapses, market creation and the live screen stop, as well as settlement. The licence for reading someone else's posted prices is also unverified (group 7's conflict 15, F7.25).
- **What settles it:** widen the Q16 check to cover each use. Keep group 3's backup for the morning read: the spec allows the previous close to come from an off-chain data service.

### 5. Is devnet already running Alpenglow?

- **Group 5 (Q12, holds with a caveat):** Solana's own Alpenglow page lists devnet as "planned" (F5.44, CONFIRMED), and a news report says only testnet has it (F5.45, SECONDARY). So group 5 says not to claim sub-second finality yet.
- **Group 6 (D18, holds with a caveat):** Anza's Alpenglow page, published 8 October, lists "devnet 9/25 Completed" (F6.20, CONFIRMED). Group 6 tells the docs to state sub-second finality for devnet. Group 2 (its conflict 9, on D13) also trusts the plan's 7 October direct check, which saw confirmed and finalized blocks arrive together on devnet.
- **Why it matters:** two CONFIRMED pages contradict each other. Anza's page is newer and matches the plan's measurement. If devnet turns out not to run Alpenglow, a trade takes several seconds to become final. Then the two-stage "Filled · confirming" screen moves into the core build (group 5), which changes D13's states (group 2) and Q52's states list (group 1).
- **What settles it:** group 5's getAgGenesisCert call plus a timed sample of real transactions, recorded with the date.

### 6. Holding an uncertain market against a public settle after the deadline

- **Group 4 (Q36, your direction, holds with a caveat):** a market whose band straddles the strike isn't settled on Pyth's price, because that price can't say who won.
- **Group 5 (Q44, holds with a caveat):** after the hold's deadline (for example 24 hours), anyone may settle with Pyth's 4:00 PM price.
- **Group 4 (Q3, Q37):** inside a ±60-second window, whoever calls settle can pick whichever valid price suits them (F4.03).
- **Why it matters:** a held market that nobody resolves in time is then settled on the very price Q36 refused, possibly by the side that gains. In the example, Bob submits the update that makes No win. Group 5 says it plainly: "the deadline guarantees the market ends, not that the answer is right".
- **What settles it:** your call. Options include narrowing the window so only one update qualifies (group 4's Q3 recommendation), or a different end rule for held markets. A "void" that pays $0.50 per token is a third outcome the spec doesn't allow (group 4's conflict 11).

### 7. The check before 4:05 that probably can't run in time

- **Group 4 (D26 caveat):** Nasdaq's official close may only be final about 15 minutes after 4:00 (F4.19, SECONDARY), and the free daily data source found is end-of-day only (F4.32). So comparing Pyth with the official close before the 4:05 settlement is unlikely.
- **Items in other groups that lean on that check:**
  - Q44 (group 5): the hold can be placed by "the bot's pre-check".
  - Q47 (group 7): the safeguard that stops a wrong automatic settlement is this check (group 7's conflict 12).
  - Q37 (group 4): part of the reason for the 24-hour bot-only window is to give this check time.
- **Why it matters:** without the check, a market settled at 4:05 has no review before its result becomes permanent. Q47's "report a problem" button only helps markets that are already held.
- **What settles it:** measure when the official close is actually published (a no-key data check), then decide whether the pre-check stays in D26.

### 8. The strike at yesterday's close against the 10-minute target

- **Group 3 (Q8):** recommends always adding the 7th strike, yesterday's close rounded. Both spec examples assume it, at a cost of 7 more markets a day (F3.35, arithmetic re-checked).
- **Group 4 (D26, Q36, Q13; its conflict 6):** a strike near where prices tend to end raises how often the band straddles it, so how often settlement misses 4:10 (F4.34). That rate is unmeasured.
- **Group 6 (A2, contested):** a miss can't be excused, because the spec allows no exceptions (F6.48).
- **What settles it:** Q8 is also a lever on liveness. Count how often bands straddle near-money strikes in the D26 evals before you rely on the 7th strike's miss rate.

### 9. Two different counting rules for missed settlements

- **Group 4 (Q13):** recommends reporting two numbers, "on time through the oracle" and "settled by any path", plus the spec's per-trading-day figure (F4.27, F4.28).
- **Group 6 (Q23):** recommends a raw rate and an adjusted rate that leaves out outage days with logged evidence (F6.42, F6.43). A2 is contested (F6.48).
- **Why it matters:** both answer the same spec line in different ways. A grader who sees two schemes may read it as moving the goalposts.
- **What settles it:** one rule that covers held markets, devnet halts and 1:00 PM early closes, written in the README before the first graded day.

### 10. Proving the 4:00 PM price hours later is assumed but untested on Solana

- **Items that rely on it:**
  - D19 (group 5): after a halt, settle with the 4:00 price (F5.10, F5.17).
  - Q44 (group 5): the public fallback after the deadline.
  - Q23 and Q24 (group 6): the worked example and option 3 settle later on a price stamped at the close (F6.14; F6.52 UNCONFIRMED).
  - D8 (group 4): use Pyth's historical service before anyone types a price by hand (F4.30).
- **Against:** group 4 (its conflict 10) and group 5 (its conflict 4) both find that Pyth documents checking historical prices only for Ethereum-style chains, and the Hermes address for a price at a given time wasn't found.
- **The workaround and its limit:** the bot keeps the seven price accounts it posts at 4:05 (group 4). That fails if devnet halts across 4:05 (group 5's conflict 5).
- **What settles it:** add to the Q16 check: post the 4:00 PM update an hour later and have the program accept it.

### 11. Your own test-dollar token against "no real value"

- **Group 1 (Q19):** the plan's own token is the only route that serves a bot and scripts. Circle's faucet gives 20 USDC every 2 hours behind a human check (F1.05), and its API needs an upgraded account (F1.06). Whether the own token works this way is UNCONFIRMED (F1.09).
- **Group 2 (Q21):** your own token is "effectively required" to fund the market-maker bot (F2.98).
- **Group 7:**
  - D3: the project becomes the issuer of a token. "No value" holds only while it is never sold or given as a prize, and Q19's configurable USDC address puts real money one setting away (F7.30).
  - Q46: an unlimited "Get test USDC" button removes the faucets' per-address limits, which today act as a soft cap (F7.02, F7.03).
- **What settles it:** if you choose the own token, add three things in Architecture: a per-address limit on the button, a devnet build that refuses the mainnet USDC address, and a distinct token name (Q22).

### 12. Freeze power: Q30 against D24, D3, D9 and Q46

- **Group 4 (Q30, keep open):** option B makes our program the freeze authority, so holders can't burn tokens outside Redeem (F4.62). Option C, Permissioned Burn, is the missing alternative (F4.61).
- **Group 5 (D24):** set the freeze authority to none, or to the program only if you choose B, and never to a person (F5.32).
- **Group 7 (D3):** "no custody" is untested against the admin's powers, and B adds one more.
- **The ripple:** D9 (group 2) and Q46 (group 7) both conclude that an on-chain position check or a per-wallet cap is only a speed bump, because tokens can move to a second wallet. Under option B, transfers are blocked, so those checks would actually bind.
- **What settles it:** decide Q30 knowing that it also decides how D9 and Q46 work.

### 13. "Non-custodial" against the admin's powers

- **Group 7 (D3):** money-transmission rules turn on accepting and passing on value (F7.06), and no source tested a "non-custodial" claim against an admin who sets outcomes.
- **Group 5:** D23 says the backend "can never move users' money", which holds only if D24 limits the bot key. Q25's recommendation keeps a single upgrade key on devnet, and that key can replace the program, including the rule that fixes an outcome (F5.47).
- **Group 4:** D2 says "immutable" holds only while the upgrade key is controlled (F4.59). Q43's override is a price an admin types by hand.
- **What settles it:** in the docs, list these powers next to the word "non-custodial": the override, the hold, pause and the upgrade key, plus a freeze authority if Q30 adds one.

### 14. Signing in with the admin wallet against keeping that wallet on a hardware device

- **Group 1 (Q54):** the plan's operator page signs in with the admin wallet through Sign In With Solana. Phantom supports that only in its browser extension (F1.31), and it reportedly fails with Ledger hardware wallets (F1.32).
- **Group 5:** D17 keeps the admin and upgrade keys off the server, in a hardware wallet or a multisig (F5.02, F5.03, F5.06). Q25 recommends a hardware wallet or an offline machine.
- **What changes:** Q43 (group 4) and Q25 (group 5) both put the multisig off until the mainnet bonus, so the multisig half of group 1's clash fades on devnet. The hardware-wallet half stays.
- **What settles it:** group 1's fix. The backend checks an allow-list of keys rather than "the admin wallet", and you test sign-in with the wallet you will actually use.

### 15. "Trading still works if the backend dies" against the relay

- **Group 2 (D16, Q18):** every price and order book reaches the browser through one relay, so the relay is a single point of failure. Keep a direct-read fallback (F2.63, F2.66).
- **Group 5:** D23 says trading still works if the backend dies. Q26 has the static website depend on the backend for all live data (F5.04).
- **Why it matters:** without the fallback, users can still sign orders, protected by D15's price cap, but they can't see the book.
- **What settles it:** both groups recommend the same fix, a direct read from Solana when the stream fails. Word D23 as "the backend affects timing, never the safety of money".

### 16. History as an activity log against events for fills only

- **Group 1 (Q52):** History should list mints, cancels, refunds at the close and redemptions, not only trades (F1.26, SECONDARY).
- **Group 4 (Q27):** builds P&L and History from one event per fill, recorded by the backend (F4.74, F4.77).
- **Group 5 (Q53):** the event list covers mints and pair closes but not cancels or close-sweep refunds. The sturdier event type (emit_cpi!) is recommended only for fills, settle and redeem (F5.66).
- **What settles it:** for an activity log, the program must also record cancel and refund events, and the backend must store all of them.

### 17. Order-book account deposit: "optional" to recover, but possibly the biggest cost

- **Group 3 (Q10):** our own book's size dominates each market's deposit. A 10 KiB book holds about 0.072 SOL per market and a 100 KiB book about 0.71 SOL, so 46 markets need about 3.3 to 33 SOL a day (F3.11, arithmetic). Make the book closable.
- **Group 5 (D27):** closing a settled market's book account to get the deposit back is optional (F5.40).
- **Group 4 (Q39):** closing the book recovers most of the deposit (reasoning).
- **Group 2 (D21):** the "real grounds" for rejecting Phoenix include a deposit of "3+ SOL" per market (F2.06). That figure comes from Manifest's README, a competitor's table that group 3 flags as Manifest's own claim (F3.15).
- **Why it matters:** our own book's size is unmeasured, so the same deposit argument may apply to it.
- **What settles it:** size the book account in the first milestone. Make closing it a required step after settlement, not an optional one.

### 18. Who supplies devnet SOL, and how

- **Group 1 (Q19, conflict 7):** a project wallet could send new users a little SOL, used only if testing shows beginners get stuck. That wallet and the bot would top up through the command-line airdrop, up to 5 SOL per request (F1.03), or through provider faucets.
- **Group 6 (Q55):** Solana's faucet asks AI agents not to use it (F6.57), so the bot's low-balance alert (D29) should go to a person rather than trigger an automatic request.
- **Group 3 (Q10):** the bot pays every market's deposit, and the faucet's 2 requests every 8 hours may not keep up (F3.16).
- **Why it matters:** no group adds up market deposits, bot fees and any user drip into one daily SOL budget. No group settles whether a scripted airdrop is acceptable either.
- **What settles it:** one daily SOL budget and one named top-up route, with a person in the loop.

### 19. Market count and market-maker money differ across groups

- **Group 3 (D6):** at 9 October prices there are 39 markets a day, or 46 with the 7th strike (F3.35, arithmetic re-checked). The "49" in the plan is a ceiling.
- **Group 2 (Q21):** sizes the bot's working money at 45 or 49 markets: $7,380 or $8,036 of test dollars.
- **Groups 1 and 7:** both quote the plan's older figure of $4,900 (Q19; group 7's conflict 7).
- **What settles it:** all three lead to the same conclusion (your own test-dollar token), but the docs should use one count and one figure: 49 as the ceiling, about 39 to 46 as the expected range.

### 20. Closing a pair: a mode of Redeem or its own function?

- **Group 2 (Q5):** build it as a mode of Redeem, so the spec's "tokens can only be destroyed via the redeem function" stays literally true (F2.38).
- **Group 5 (D27):** lists it as a separate function and says the spec's wording must change (F5.41).
- **Group 4 (D2, Q30 option A):** rewrites the rule as "only in redeem and close-pair".
- **What settles it:** pick one form and use the same words in D2, D24 and D27.

### 21. The No price on the order ticket

- **Group 1 (D10):** wants a fuller ticket line with "You pay", profit and a No version.
- **Group 2 (Q38):** the spec's "No price = $1 − Yes ask" is what a No seller receives. A No buyer pays $1 − Yes bid (F2.19). With a bid of $0.64, Bob's 10 No cost $3.60, not $3.40.
- **What settles it:** the No ticket must take Q38's buy price, capped by D15, or it repeats the spec's mistake.

### 22. Next.js named in D4 against Q26's deferral

- **Group 6 (D4):** still names Next.js.
- **Group 5 (Q26):** your direction leaves Next.js against plain React to Architecture (F5.28, F5.54).
- **What settles it:** word D4 to match Q26.

### 23. A conflict that another group's evidence already answers: Circle's "no financial value"

- **Group 7 (its conflict 1):** Circle's faucet page doesn't say outright that testnet USDC has "no financial value" (F7.03).
- **Group 1:** found that exact sentence on Circle's USDC contract-addresses page (F1.07, CONFIRMED).
- **What settles it:** when Q22's wording quotes Circle, link the contract-addresses page.

## Weakest spots in the evidence across all groups

- **No live Pyth data at all.** Every price request without a key returned "401 unauthorised" (F4.08; also groups 2, 3 and 6). Several things are therefore unmeasured: the band width at 4:00 PM, publish times near the close, how a carried-forward price looks after a halt (F4.33, UNCONFIRMED), the gap to the official close, the read of yesterday's close by timestamp (F3.32, UNCONFIRMED), and which stocks the sponsored devnet feeds cover (F4.11; F2.57 UNCONFIRMED). D7, D8, D19, D26, Q3, Q13, Q20, Q24, Q36 and Q48 all lean on these. The Q16 check, widened as in conflicts 2, 3, 4 and 10, is the most useful next step.
- **Pyth's commercial terms are unresolved.** The trial's length and coverage, the price for stocks ($2,500 on the plans page against $5,000 in the plan), display against redistribution, Pyth's API terms (not found, F7.25) and Nasdaq's display policies (unread, F7.27) are all open.
- **Nothing was measured on devnet itself.** That covers finality timing (group 5), the chain clock's error (F2.77, F2.78 UNCONFIRMED; F4.29; the clock after a restart wasn't researched), whether devnet's limits count WebSocket subscriptions (F2.58; F2.100 UNCONFIRMED), the 8:30 and 4:05 bursts (group 3), accounts per redeem (group 4) and a timed setup on a clean Windows machine (group 6). Several verdicts carry "measure first" as their caveat.
- **No devnet outage or reset record, and no plan for a reset.** Solana's status page has no devnet entry (F5.13, F6.29), the plan's three 2026 halts are uncorroborated (F6.28, SECONDARY), and four groups found that no item covers a reset (F1.01, F4.74, F5.11, F6.01).
- **Who grades, and how, is unknown** (groups 1 and 6; F6.50, UNCONFIRMED). A2 and Q23 depend on it entirely, and the scope of D10, Q40, Q52 and Q55 in part.
- **Key rulebooks were not read.** These are Kalshi's rulebook (groups 1, 4 and 7), the Nasdaq and NYSE rules on the official close and halts (F4.19, F4.22), FinCEN's and OFAC's guidance (F7.07, F7.31), and Polymarket rule pages that didn't load (groups 1, 3 and 4). Many venue comparisons rest on help pages, rule titles and search snippets.
- **Our own order book is unmeasured.** Neither its build effort (group 2) nor its account size (group 3) is known. These drive the deposit cost, the bot's refresh speed and the fairness of the Phoenix comparison (conflict 17).
- **No data on behaviour.** Nobody has measured which strikes trade (group 3), how often bands straddle a near-money strike (F4.34), whether beginners notice a play-money banner (group 1), or how venues seed brand-new markets (group 2).
- **CONFIRMED means "the page said it on 9 October", not "current and true".** Two CONFIRMED pages contradict each other on Alpenglow (F5.44, F6.20). The same Polymarket rule that a tie pays 50-50 is CONFIRMED in group 1 (F1.22) and UNCONFIRMED in group 4 (F4.53). Circle's "no financial value" is on one Circle page (F1.07) and not on another (F7.03). Pyth's plans page and its upgrade docs disagree about a trial (F4.08, F4.09, F2.53). Every judge also flagged CONFIRMED findings whose conclusion is the researcher's own reading.
- **Derived numbers rest on assumptions and differ between groups.** Examples: markets a day (39 to 49), market-maker money ($4,900 to $8,036), deposit per market (about 0.008 SOL before the book, unknown with it), markets per redeem transaction (about 4 or about 10, group 4's conflict 12) and the plan's "one market about 1 trading day in 17" straddle illustration.
- **The plan's own earlier research was not rechecked.** Many group conflicts are the plan against this run. Examples: the Pyth trial and prices, Phoenix's facts, HIP-4 and Sui, Kalshi's caps and committee, the Trident version, and the plan's 4,096-byte transaction format, while groups 2, 3 and 4 all found the 1,232-byte limit (F2.17, F3.20, F4.69).

## Group reports

| Group | Judge's report | Group report (findings) |
|---|---|---|
| 1, Onboarding | [decision-review-2026-10-09-full-G1.md](decision-review-2026-10-09-full-G1.md) | [reports/2026-10-09-full-G1.md](reports/2026-10-09-full-G1.md) |
| 2, Trading and liquidity | [decision-review-2026-10-09-full-G2.md](decision-review-2026-10-09-full-G2.md) | [reports/2026-10-09-full-G2.md](reports/2026-10-09-full-G2.md) |
| 3, Daily cycle | [decision-review-2026-10-09-full-G3.md](decision-review-2026-10-09-full-G3.md) | [reports/2026-10-09-full-G3.md](reports/2026-10-09-full-G3.md) |
| 4, Settlement and payout | [decision-review-2026-10-09-full-G4.md](decision-review-2026-10-09-full-G4.md) | [reports/2026-10-09-full-G4.md](reports/2026-10-09-full-G4.md) |
| 5, Platform | [decision-review-2026-10-09-full-G5.md](decision-review-2026-10-09-full-G5.md) | [reports/2026-10-09-full-G5.md](reports/2026-10-09-full-G5.md) |
| 6, Proof for the grader | [decision-review-2026-10-09-full-G6.md](decision-review-2026-10-09-full-G6.md) | [reports/2026-10-09-full-G6.md](reports/2026-10-09-full-G6.md) |
| 7, Legal and compliance | [decision-review-2026-10-09-full-G7.md](decision-review-2026-10-09-full-G7.md) | [reports/2026-10-09-full-G7.md](reports/2026-10-09-full-G7.md) |

Findings that serve no single story are in [cross-cutting.md](cross-cutting.md).
