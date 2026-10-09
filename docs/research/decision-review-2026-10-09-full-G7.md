# Decision review 2026-10-09-full, group 7: judge's report

Group 7, "Legal and compliance lens". Items: D3, Q46, Q47, Q49, Q50, Q51. The lens covers all 29 stories. These items lean most on S1, S2, S3 and S4, on S9, S16, S19 and S22, and on S25 and S28.

Evidence: `docs/research/reports/2026-10-09-full-G7.md` (findings F7.01 to F7.35) and the input file `docs/research/inputs/G7-legal-and-compliance.md`. Proposals and your directions so far: `docs/planning/2026-10-08-phase-1-plan-session-2.md`.

**Facts, not legal advice.** Nothing here says Meridian is compliant, legal or regulated. The spec also forbids such claims in the project's own risks note (F7.30).

How to read the labels: a **CONFIRMED** finding means the primary source was opened and checked again. A **SECONDARY** finding comes from a second-hand source, such as a law-firm article or a search summary. Only these two kinds carry weight. The **UNCONFIRMED** findings are F7.12 (Kalshi's "$25,000" limit) and F7.32 (Pyth marketing about display rights). They are named where they matter, and no verdict rests on them. Where this report cites the plan's own earlier research (its §10a notes of 8 October), that research was not checked again in this run.

## Summary

This group asks what laws, data licences and comparable venues say about Meridian. Some terms first. An **event contract** is a bet-like contract that pays out on a yes/no event. **KYC** ("know your customer") means checking a user's identity. **Custody** means holding other people's money. **Margin** means trading with borrowed money. **Devnet** is Solana's public test network, where tokens are play money, and **mainnet** is the real network with real money. D3, the spec's "no KYC, no custody, no margin, never mainnet or real funds", holds with caveats. The legal rules this run found all turn on real value. The federal gambling definition needs "something of value" (F7.05). Money transmission needs accepting and passing on funds (F7.06). The CFTC's case against Polymarket involved real money (F7.04). Solana says devnet tokens "are not real" (F7.01). However, no source says a devnet-only event market falls outside these rules, so "little exposure" is an inference. Two plan items also quietly weaken D3. Q19's own "get test USDC" button would remove the faucets' per-address limits and make the project the issuer of its own play token. Q19 also makes the USDC address a setting, which puts real money one configuration mistake away. The open questions remain your call. Your one specific direction, deferring the mainnet bonus (Q49), holds on the evidence. Your general direction to triage Q46 to Q51 during Architecture holds for Q46, Q47 and Q51. Q50 (whether stock prices may be shown publicly) is the exception, because it is already item 5 on the Q16 Pyth check, which runs before Architecture. In several places the plan states facts more firmly than this run could confirm: Kalshi's position caps and its review committee, Circle saying test USDC has "no financial value", and delayed data needing no display fees. The weakest evidence is a gap. No source discusses a devnet-only app, and the key primary texts could not be read: Kalshi's rulebook, the FinCEN and OFAC guidance, Nasdaq's display policies, and Pyth's API terms.

## Verdicts

The source column is copied from the plan. "Spec" means the spec says it, "owner" means you asked for or directed it, and "Claude proposal" means Claude suggested it and you have not confirmed it. On 2026-10-08 you marked Q46 to Q51 "triage in Architecture"; that direction is noted as "owner (triage in Architecture)".

| Item | Source | Verdict | Why |
|---|---|---|---|
| D3: non-custodial; no KYC, no margin; no mainnet or real funds for the core submission | spec | Holds with a caveat | The spec says this in so many words and forbids mainnet and real funds for the core submission (F7.30). The facts behind "play money" are confirmed. Solana says devnet tokens are not real (F7.01), the federal gambling and money-transmission definitions both turn on value (F7.05, F7.06), and the CFTC's Polymarket case involved real money (F7.04). Caveats: no source says a devnet event market is outside these rules, so the low-exposure reading is an inference. "No custody" has not been tested against your own admin powers: the override, the settlement hold, pause and the upgrade key (Q25, Q43, Q44). "No value" holds only while nothing is sold or given as a prize and the app can't be pointed at real USDC, and Q19 makes the USDC address a setting. |
| Q46: cap positions per wallet per market? | Claude proposal (open, for the batch) + owner (triage in Architecture) | Your call | This is an open question; see the briefing. Regulated exchanges must have position limits or "accountability" levels (F7.08), but those limits work by adding up everything one person controls (F7.10), and a chain with no KYC can't do that, so a per-wallet cap is only a speed bump. Kalshi's own limit text was not read (F7.11, SECONDARY, titles only). The $25,000 figure (F7.12) is UNCONFIRMED and carries no weight. Triaging this in Architecture holds. |
| Q47: how can users dispute a settlement? | Claude proposal (open, for the batch) + owner (triage in Architecture) | Your call | This is an open question; see the briefing. Comparable venues range from a support channel with no formal dispute step (Kalshi's help centre, F7.13) to a bonded on-chain challenge. That challenge takes about 2 hours when nobody disputes and 4 to 6 days when someone does (F7.14, F7.15), which clashes with the 10-minute settlement target, and a bond paid in play money deters nobody. The plan's safeguards protect markets that are held for review, not the ones the oracle settles at 4:05. Triaging this in Architecture holds. |
| Q49: mainnet bonus with real USDC | spec (bonus) + owner (deferred 2026-10-08) | Holds with a caveat | Your deferral fits the evidence. The bonus is "not required to pass" (F7.30). The CFTC treated on-chain event binaries as swaps that must trade on a registered exchange and fined the operator $1.4M (F7.04). Whether single-stock contracts fall under the SEC is still open (F7.19; F7.20 SECONDARY). Equities data starts at $2,500 a month (F7.24). Caveat: write the "Cut, and what's next" entry as facts and open questions, not as legal conclusions (F7.30). Some of the plan's reasons, the EU/UK retail ban and the 2023 CFTC orders, were not rechecked in this run. |
| Q50: can live Nasdaq stock prices be shown publicly? | spec (live prices) + owner (D14, triage in Architecture) + Claude proposal (options, lean: ask Pyth) | Your call | This is an open question; see the briefing. The spec and D14 ask for live stock prices on screen (F7.29). Among Pyth's plans, only Pro, from $2,500 a month, lists equities with display rights (F7.22). Nasdaq Basic through Pyth needs Nasdaq's written approval (F7.23). Whether delayed prices need an agreement is unconfirmed (F7.27, SECONDARY). Caveat on the triage direction: the Q16 Pyth check (item 5) already asks this before Architecture, so you need the answer sooner. |
| Q51: geoblocking and wallet screening on devnet? | Claude proposal (open; lean: unnecessary on devnet) + owner (triage in Architecture) | Your call | This is an open question; see the briefing. Real-money venues block by location (F7.17, F7.18), but no source discusses a devnet app with no-value tokens. OFAC's guidance text was not read (F7.31), and wallet screening is a paid product (F7.34). The plan's lean is reasonable but it is an inference, and any line about it in the risks note must state a fact, not make a compliance claim (F7.30). Triaging this in Architecture holds. |

## Briefings

### Q46. Should positions be capped per wallet per market?

**1. The terms.**
- A **position** is what one trader holds in one market, for example 10 Yes tokens on "META ≥ $680 today?".
- A **position cap** (regulators say **position limit**) is a maximum on that holding. **Position accountability** is the softer form. Above a set level, the exchange may ask questions or order the trader to cut back, but nothing stops the trade automatically.
- A **wallet** is a Solana address with its own key. Anyone can make as many as they like, free and without an identity check. Using many wallets to look like many people is called a **Sybil** attack.
- **Permissionless** means the program accepts any wallet, and nobody approves who may trade.
- **Aggregation** means adding up every account one person controls, so that splitting money across accounts doesn't escape the limit.
- A **DCM** (designated contract market) is an exchange registered with the **CFTC**, the US regulator of futures and swaps. Kalshi is one.

**2. Worked example.** Take an illustrative cap of 100 contracts per wallet per market. Alice wants 300 Yes at $0.65, which costs $195.00.
- **With the cap, one wallet:** she stops at 100 Yes ($65.00). If META closes at $684.00, she collects $100.00, a $35.00 gain.
- **With the cap, three wallets:** she buys 100 Yes in each, 300 in all for $195.00, and the cap has stopped nothing. Funding takes longer. Circle's faucet gives 20 test USDC per address every 2 hours (F7.03), so each wallet needs 4 requests to reach $65, made at 0, 2, 4 and 6 hours: about 6 hours of waiting (computed). With Q19's own "get test USDC" button and no limit on it, the waiting disappears.
- **With a market-level cap of 1,000 pairs** (a **pair** is one Yes plus one No, minted for $1.00): the vault of "META ≥ $680" never holds more than $1,000 of test USDC. Every Yes that Alice holds was minted as a pair by someone, so her three wallets together can never exceed 1,000 Yes. The market-maker bot's plan of 100 pairs per market (Q21) fits inside that cap.
- **What a cap protects here (reasoning, not a finding).** The CFTC's stated purpose for limits is to reduce "market manipulation or congestion" (F7.08). In Meridian the result is META's real Nasdaq closing price, which no trader can move with test USDC. A large trader can crowd one side of a thin book, but can't change who wins.

**3. The options and their evidence.**
- **(1) No cap, documented as a limitation.** The spec is silent on caps (input file). The devnet faucets already act as soft caps per address: Circle allows 20 USDC per 2 hours (F7.03) and Solana allows 2 requests per 8 hours (F7.02).
- **(2) A per-wallet cap in the program or the website.** This mirrors regulated venues. CFTC Core Principle 5 requires a DCM to adopt position limits or position accountability for each contract "as necessary and appropriate" (F7.08). Regulated limits work by aggregating per person (F7.10), and that needs identity. On a chain with no KYC the cap is per address only. Kalshi's rulebook has rules titled "Position Accountability" and "Position Limits" (F7.11, SECONDARY, titles only). Its limit size (F7.12) is UNCONFIRMED.
- **(3) A market-level cap:** a maximum number of pairs per strike, a vault cap, or a maximum order size. Splitting across wallets can't get around it, but it also caps total liquidity, including the market maker's. No finding shows a venue that uses this.
- **(4) Website guard-rails only:** a confirm step for large orders. It catches mistakes, but anyone using a script skips it.
- **Regulation is still forming.** The CFTC's March 2026 ANPRM (an advance notice: a request for views before any rule is written) asks how limits should be aggregated across similar event contracts and whether event contracts need different limits (F7.09). It proposes nothing.
- **Engineering notes (reasoning, not findings).** A per-wallet cap in the program needs a record per wallet per market, which means an extra account and its rent. You would also have to define what counts: tokens held, open orders, or both. If Yes and No are ordinary tokens (Q30, option A), a holder can move them to another wallet, so the program can cap what a wallet buys but not what it ends up holding. Under Q30 option B (frozen tokens) transfers are blocked and the cap holds per wallet. The market-maker bot (Q21) would need the cap set above its needs, or an exemption. Kalshi reportedly gives market makers adjusted limits (F7.12, UNCONFIRMED), and its rulebook lists a market-maker accountability rule (F7.11, SECONDARY).

**4. What each answer commits you to.**
- **(1):** a line in the risks note and nothing built. If Q19's button is built, it needs a per-address rate limit, or the faucets' soft cap is lost.
- **(2):** a new program rule and a per-wallet record, a decision on what counts and how the market maker is treated, tests for each path (D30), and an honest note that more wallets get around it.
- **(3):** a per-market setting chosen in Architecture. It must sit above the market maker's planned size, and it limits total depth.
- **(4):** website work only, which goes into USERS.md.

**Your direction (triage in Architecture): holds.** Nothing in the evidence makes this urgent on devnet, and the choice touches the program's accounts, which Architecture decides.

**Recommendation (Claude's; yours to accept or reject).** Take (1) with (4): no cap in the program on devnet, a confirm step for large orders, and a risks-note line saying, as plain facts, that the app does not limit positions and that a per-address limit could be avoided with more wallets. If Q19's button is built, rate-limit it per address. Revisit if mainnet comes back (Q49).

### Q47. How can users dispute a settlement?

**1. The terms.**
- To **settle** a market is to write on-chain which side won, using the stock's 4:00 PM price from the **oracle**, the service that brings outside prices onto the chain (Pyth here). Pyth gives each price a **confidence band**, its own measure of uncertainty, such as ±$0.05.
- The spec makes an outcome **immutable**: once written, it can never be changed.
- A **dispute** is a user's formal objection that a result is wrong.
- The **admin override** (S16) is the admin's manual settlement with a typed price, allowed only after an enforced delay. **Under review** (S28) is the plan's state for a market whose confidence band straddles the strike, so that it doesn't settle automatically (D26, Q36).
- A **bond** is money put up by the person who proposes or disputes a result, and it is lost if they are wrong. A **challenge period** is the window in which anyone may dispute. **UMA** is the outside system Polymarket uses for this, and its **DVM** is the vote by UMA token holders that decides disputes.

**2. Worked example.** At 4:00 PM, Pyth reports META at $680.20 ± $0.05, so the band runs from $680.15 to $680.25, entirely at or above $680. D26's check passes and the market settles Yes at 4:05. Alice's 10 Yes, which cost $6.50, redeem for $10.00, a gain of $3.50. Bob's 10 No, which cost $3.50, pay $0. Now suppose the official Nasdaq closing price, published later, was $679.97 (illustrative; the plan's own Q3 numbers). By the official close, No should have won. The outcome is immutable, so after 4:05 nothing can reverse it. How each option treats Bob:
- **(1) No dispute path:** Bob's $3.50 loss stands, and the risks note warned him this could happen.
- **(2) Support channel:** Bob writes in. The operator can explain and log the case, but can't reverse it.
- **(3) Bonded dispute:** no market settles at 4:05. Someone proposes "Yes" with a bond, and a 2-hour window passes. Bob disputes with a matching bond, and the result comes in about 4 to 6 days (F7.14). The bond would be test USDC, which is worth nothing, so it would deter no one (reasoning).
- **(4) Safeguards before the write:** if the bot's official-close check (D26, Q37) runs before 4:05 and sees $679.97 against $680.20, it holds the market. At 4:20 the admin proposes "No wins, official close $679.97", and the result becomes final at 5:20 (Q43). During that hour, Alice can see the proposal and raise the alarm if she thinks it's wrong. This works only if the official close is out by about 4:05, which is unverified (D26).

**3. The options and their evidence.**
- **(1) No dispute path:** rely on the oracle rules, immutability and a documented "no appeal". The spec is silent on disputes (input file). Any dispute would have to act before the write.
- **(2) Kalshi-style support.** Kalshi's help centre describes no formal dispute mechanism. A market "settles when the official outcome is confirmed and our markets team finalizes the result", and a user with a stuck market contacts in-app support, which escalates to the markets team (F7.13, CONFIRMED). Kalshi's rulebook provisions on reviews were not read. The plan says Kalshi has an Outcome Review Committee that decides within 24 hours; that is the plan's SECONDARY research and was not rechecked.
- **(3) Polymarket and UMA.** A bond of typically $750, a 2-hour challenge period, a new round on dispute and a token-holder vote on a second dispute. Undisputed markets resolve in about 2 hours and disputed ones in about 4 to 6 days (F7.14, CONFIRMED). UMA votes in rounds with 24-hour commit periods and needs a 65% majority (F7.15, CONFIRMED). Polymarket also pays $0.50 per token when the result is unknown (F7.14). Meridian's spec says each contract resolves to $1 or $0, so that route isn't open.
- **(4) Safeguards before the result is final:** the "under review" state (S28), the enforced delay on the override (S16), a public notice window before an override becomes final (Q43), and a published evidence record for each market (oracle price, confidence, publish time and transaction) so anyone can audit it. The report lists these. Most are already in the plan.
- **Regulatory context.** The CFTC's ANPRM asks what dispute-resolution rules should apply to how an event contract is resolved (F7.09, CONFIRMED). A law firm reports a CFTC staff warning that a vague settlement source may fail Core Principle 3 (F7.16, SECONDARY). Meridian names one source (Pyth) and one rule (D26, Q3), which is the opposite of vague (reasoning).
- **The plan's options.** (a) Document the lack of a dispute path as a limitation, with Q43's window and D26's evals as the safeguards. (b) Add a "report a problem" button that alerts the operator during the proposal window. One correction: the evals only measure after the result is written (D26 says so), so they detect problems and don't prevent them. The safeguard that prevents a wrong result is the official-close check before 4:05.

**4. What each answer commits you to.**
- **(1):** one line in the risks note and nothing built. You accept that a wrong automatic settlement stands.
- **(2):** a contact route and someone who watches it. It still can't reverse anything. Its records belong with the Q53 logs.
- **(3):** a bonded propose-and-challenge system in the program, a voting body, and days of delay. It gives up the spec's 10-minute settlement criterion for every market, and with no-value tokens the bond means nothing. It is out of proportion for devnet (judgement).
- **(4):** mostly what the plan already has (D26, Q36, Q43, Q44). It adds a per-market evidence record shown in the UI, plus the plan's (b) button, live only while a market is held or has a proposal pending. It also needs the timing of the official-close check verified.

**Your direction (triage in Architecture): holds.** The evidence record is cheap and fits the logging design (Q53), so plan it then.

**Recommendation (Claude's; yours to accept or reject).** Combine (4) with the plan's (a) and (b). Publish the evidence for every settlement, keep Q43's public window for overrides, show the "report a problem" button while a market is held, and state in the risks note that a settled result is final. Don't build bonded disputes.

### Q49. A mainnet deployment with real USDC (the bonus)

**1. The terms.**
- **Mainnet-beta** is Solana's real network, and **real USDC** is the dollar-backed token that can be cashed out.
- A **swap**, in US law, covers many contracts that pay out on an event. The CFTC requires swaps for the public to trade on a registered exchange, either a **DCM** or a **SEF** (swap execution facility).
- A **security-based swap** is a swap on a single company's stock or on events tied to one company. It falls under the **SEC**, the securities regulator, not the CFTC.
- A **money transmitter** (in FinCEN's rules; FinCEN is the US Treasury's anti-money-laundering bureau) is anyone who accepts money from one person and sends it to another.
- **OFAC** is the Treasury office that runs sanctions lists. An **FBOT** is a foreign board of trade, a non-US exchange registered to serve people in the US.

**2. Worked example.** Run the same trade on mainnet. Alice pays $6.50 of real USDC for 10 Yes, Bob pays $3.50 of real USDC for 10 No, and the vault holds $10.00 of real money. If META closes at $684.00, Alice gets $10.00 and Bob loses $3.50 of real money. The oracle data alone costs from $2,500 a month on Pyth Pro (F7.22, F7.24), which is $30,000 a year (computed), to price markets in which this example holds $10. In 2022 the CFTC fined Polymarket $1.4M for offering on-chain event binaries without a registered exchange (F7.04).

**3. The options and their evidence.**
- **The plan's options:** (a) skip the bonus; (b) ask Gauntlet or Peak6 how they expect it handled, then decide; (c) attempt it only with geoblocking and sanctions screening. The report adds a fourth: mainnet behind low caps, an allowlist and pause.
- **Derivatives law.** The CFTC treated event-based binary options on blockchain smart contracts as swaps needing a DCM or SEF and said "all derivatives markets must operate within the bounds of the law regardless of the technology used" (F7.04, CONFIRMED). The case involved real money.
- **Securities law for single stocks.** Law-firm commentary says single-issuer event swaps are security-based swaps and "cannot be offered to retail investors" off an exchange (F7.20, SECONDARY). The CFTC and SEC asked for public comment on these definitions on 18 June 2026 (F7.19, CONFIRMED). No outcome was found after the comment period closed in August (the 24 August date is SECONDARY).
- **Money transmission.** The definition turns on accepting and passing on value (F7.06, CONFIRMED). A program that never takes custody of funds is the project's strongest fact, but the 2019 FinCEN guidance was read only through secondary summaries (F7.07), and the admin's control over pause and settle has not been tested against it.
- **Location and sanctions.** OFAC publishes guidance for the virtual-currency industry (F7.31, CONFIRMED that it exists; text unread). Polymarket blocks sanctioned regions and makes the US and UK close-only (F7.17, F7.18). A CFTC advisory says non-US platforms serving people in the US need existing registrations (F7.21).
- **Practical needs:** a funded automation wallet, production oracle data (from $2,500 a month), monitoring and key management (F7.24; Q25's multisig upgrade key).
- **A wording point (reasoning).** The plan says (c) "departs from the spec's no-KYC spirit". Polymarket's geoblock works on IP address (F7.17), and address screening checks a wallet (F7.34). Neither checks who a person is. Whether they fit the spirit of the spec is your judgement, but they aren't KYC.

**4. What each answer commits you to.**
- **Deferral (your direction):** no mainnet work now and a "Cut, and what's next" entry. Keep mainnet from happening by accident as well: Q19 makes the USDC address a setting, so a devnet build should refuse the mainnet USDC address (a suggestion for Architecture).
- **If you revisit it:** ask Peak6 first (option b), then budget for Pyth Pro, a multisig upgrade key with a time lock (Q25), and decisions on Q46 and Q51 under real money, where Polymarket's practice becomes the benchmark.

**Your direction (deferred, revisit after the core only if there's bandwidth): holds with a caveat.** The evidence supports it on cost, on law and on the spec's own "not required to pass". The caveat: the plan wants to list "legal" among the reasons in DECISIONS.md. Phrase that as facts and open questions ("the CFTC treated similar real-money markets as swaps; the SEC question for single stocks is open"), not as a conclusion such as "this would be illegal", because the spec forbids regulatory claims (F7.30).

### Q50. Can live Nasdaq stock prices be shown publicly, and on what terms?

**1. The terms.**
- **Market data** is the stream of stock prices. The exchange (here Nasdaq, where all seven stocks are listed) owns its data and licenses it.
- **Real-time** data is shown as it happens. **Delayed** data is shown at least 15 minutes late, usually on cheaper terms and with a label saying so.
- **Display rights** permit showing prices to people. **Redistribution rights** permit passing them on to others. A **vendor** or **distributor** is a firm licensed to pass data on.
- **Pyth** is the oracle. **Hermes** is Pyth's service that hands out signed price updates, and it now needs an API key (F7.26). **Attribution** is a line naming the source.

**2. Worked example.** It is 3:50 PM. META is really at $680.40 (illustrative).
- **Live display:** the Markets page shows "META $680.40 · live · Pyth". Alice compares it with the strike and buys 10 Yes at $0.65.
- **15-minute delayed:** the page shows the 3:35 price, say "META $678.90 · delayed 15 min" (illustrative). Alice sees a price below $680 while the real price is above it, although our live book still shows Yes at $0.65. For a contract decided at 4:00, the delayed number is least useful exactly when it matters most.
- **Only Meridian's own data:** the page shows "META ≥ $680: Yes 65¢ · No 35¢" and the strike. After the close it shows "Settled Yes: Pyth 4:00 PM price $684.00".
- **Cost of a licensed live feed:** Pyth Pro starts at $2,500 a month (F7.22).

**3. The options and their evidence.**
- **(a) Ask Pyth in writing first** whether the trial or the free key allows public display. This is the plan's lean, the report's option 5, and item 5 of the Q16 check.
- **A licensed live feed.** Pyth's plans page lists equities, display rights and "limited redistribution rights" only on Pro, from $2,500 a month. Free has no API access and no redistribution, and Starter ($500 a month) covers crypto only (F7.22, CONFIRMED). Nasdaq Basic through Pyth needs Nasdaq's prior written approval and a direct licence (F7.23, CONFIRMED). Polymarket's single-stock markets reportedly use Pyth Pro (F7.28, SECONDARY). Pyth marketing says Pro's rights cover display to end users (F7.32, UNCONFIRMED; no weight).
- **(c) Delayed prices with a "delayed" label.** Nasdaq's policy reportedly requires a prominent delay message and an attribution message (F7.27, SECONDARY). Whether delayed display also needs an agreement or a fee is unconfirmed. The plan says delayed data "has no display fees", but that comes from a different exchange plan's policy (see Conflicts).
- **(b) Live prices only for connected users, with "Source: Pyth".** No finding says that limiting display to connected wallets changes the licence. Anyone can connect a wallet, so they are still the general public (reasoning).
- **Only Meridian's own data**, plus the settlement price after the close (report option 3). Our Yes/No prices come from our own book, so they aren't exchange data (F7.29, the author's inference). This drops the spec's "live prices" on the Landing and Markets pages and its test "real-time price display from oracle" (F7.29, CONFIRMED), and it drops the stock price from D14.
- **A devnet demo showing oracle prices with a source label** and no redistribution claims (report option 4). Its licence status is unconfirmed.
- **Background facts.** Pyth's website terms grant no right in "price feed data" and limit use of the site to private, non-commercial purposes. These are the website's terms, and the API terms were not found (F7.25). Hermes needs an API key, and whether Pyth's standard on-chain feeds cover the seven single stocks is unconfirmed: index feeds such as SPY were seen, AAPL wasn't (F7.26). Settlement reads the price on-chain, which is a separate matter from showing prices on the website.

**4. What each answer commits you to.**
- **(a):** one message to Pyth now. The answer may be slow, and D14's final design waits on it.
- **A licensed live feed:** $2,500 a month after any trial, of unknown length, with the key held by the backend (Q17).
- **(c):** a delay label everywhere. D14's stock price stops being live, the spec's "real-time price display" test can't pass as written, and an agreement may still be needed.
- **(b):** wallet-gating work, with no evidence that it changes the licence.
- **Only our own data:** you drop a spec requirement and part of D14. The book's prices stay live.

**Your direction (triage in Architecture): holds with a caveat.** The Q16 Pyth check, which runs before Architecture, already includes "the licence allows public display" (item 5). D14, your own direction, depends on the answer, so this question can't wait for Architecture.

**Recommendation (Claude's; yours to accept or reject).** Send the plan's question (a) to Pyth now, as part of the Q16 check. Design the price panel so it can show live, delayed with a label, or nothing, without a redesign. Name the source on every stock price, and don't rely on (b).

### Q51. Should a devnet app geoblock users or screen wallets?

**1. The terms.**
- **Geoblocking** means refusing visitors by location, usually worked out from their IP address. **Close-only** means a user may exit existing positions but not open new ones.
- **Sanctions** are US Treasury (OFAC) rules against dealing with certain countries, regions or people.
- **Wallet screening** means checking a wallet address against lists of risky or sanctioned addresses before serving it.

**2. Worked example.** A visitor from a region Polymarket fully blocks connects a wallet, gets 20 test USDC from Circle's faucet, and buys 10 Yes from Bob at $0.65.
- **Real value moved:** $0. Devnet tokens are not real (F7.01).
- **On Polymarket, with real money,** the IP check would reject the order, and in a fully blocked region the visitor couldn't even close existing positions (F7.17).
- **Under option (3) below,** Meridian's website would refuse that IP. However, our program accepts orders from any wallet (D24), so a script could still trade. A website geoblock is a front door, not a lock (reasoning).
- **Under option (4),** the backend would check the address against a paid list (F7.34). Blocking it on-chain would need a deny list inside the program, which conflicts with "anyone may mint" (D24) (reasoning).

**3. The options and their evidence.**
- **(1) Nothing beyond a clear "devnet, no-value play money" label** on the landing page and the test-money screen (S1, S25, Q22). Solana says devnet tokens are not real (F7.01). Circle describes testnets as letting developers test "without risking assets with real-world value" (F7.03). Neither faucet geoblocks, as far as this run found; both limit by rate instead (F7.02, F7.03).
- **(2) A click-through or banner** saying it is not real money, not an offer, and not for use with real funds. It is cheap, but no source says it is needed or enough.
- **(3) An IP geoblock of sanctioned regions,** as Polymarket does for real money: Iran, Syria, Cuba, North Korea, Crimea, Donetsk and Luhansk fully blocked, and the US, UK and others close-only (F7.17, CONFIRMED; the counts of countries vary by report, F7.35, SECONDARY). The website is plain files with no server of its own (D23), so a geoblock would sit in the host's settings or in the backend.
- **(4) Wallet screening.** Chainalysis sells it through a demo request, and its page names no Solana support and no free tier (F7.34).
- **Background.** OFAC publishes industry guidance (F7.31), but its text was not read, so nothing here says what it expects. Treasury lifted the Tornado Cash sanctions in 2025, citing "novel legal and policy issues" in sanctioning on-chain activity (F7.33), which shows that policy toward on-chain programs is unsettled. No source discusses a no-value devnet app.

**4. What each answer commits you to.**
- **(1):** the label work already planned (Q22, S25) and a risks-note line stating as fact that the devnet app does not geoblock or screen wallets. The line must not claim that none is required (F7.30).
- **(2):** one screen of text and a stored "seen" flag per browser.
- **(3):** host-level rules or backend checks, an IP-to-country lookup, and a block page. Scripts that call the program directly still get through.
- **(4):** a vendor contract and cost, backend integration, and a decision on what to do when an address matches.

**Your direction (triage in Architecture): holds.** The plan's lean, "probably unnecessary on devnet, required before any mainnet bonus", is reasonable, but both halves are inferences. "Required" is a compliance conclusion that this run's evidence doesn't reach, because the OFAC text was not read.

**Recommendation (Claude's; yours to accept or reject).** Take (1) with (2): the test-money label, plus a short notice on the first visit. No geoblock or screening on devnet. In the risks note, state as fact that the app does not geoblock or screen wallets. Revisit together with Q49.

## Conflicts

1. **Circle and "no financial value": the plan against F7.03.** The plan's §10a research says Circle calls testnet USDC of "no financial value" (CONFIRMED there). This run opened Circle's faucet page and found it does not say that outright. It says testnets let developers test "without risking assets with real-world value" (F7.03, CONFIRMED). Solana's faucet page doesn't say it either (F7.02). The plan's quote may come from another Circle page. In the docs, quote Solana's "Devnet tokens are not real" (F7.01), or find Circle's exact page again before quoting it.
2. **Kalshi position caps: the plan against the report.** The plan says position caps are "standard (Kalshi, CONFIRMED)". This run saw only the rule titles (F7.11, SECONDARY), the $25,000 figure is UNCONFIRMED (F7.12), and the report's gaps list says caps at comparable venues were not confirmed. What is confirmed is the rule for registered exchanges: limits *or* accountability, "as necessary and appropriate" (F7.08). Reword Q46 to match that.
3. **Kalshi disputes: the plan against F7.13.** The plan's Q47 says Kalshi "uses a review committee within 24 h" (SECONDARY in the plan). Kalshi's help centre describes no formal dispute mechanism (F7.13, CONFIRMED). Both may be true, one being the rulebook and the other the help pages, but the rulebook was not read, so don't state the committee as fact.
4. **Polymarket dispute timing: the plan against F7.14.** The plan says a UMA vote takes "~48 h". Polymarket's docs say disputed markets take about 4 to 6 days and undisputed ones about 2 hours (F7.14, CONFIRMED), with 24-hour commit rounds (F7.15). Use the docs' figures.
5. **Delayed data and fees: the plan against the report.** The plan's Q50 says 15-minute-delayed data "avoids display fees", citing the CTA's delayed-data policy (CONFIRMED in the plan). The plan's own note says all seven stocks are Nasdaq-listed and that "Nasdaq has its own" policy. The CTA, the Consolidated Tape Association, runs the shared price feed for stocks listed on other exchanges, not on Nasdaq (background knowledge, not a finding). This run could not read Nasdaq's policies (F7.27, SECONDARY), so whether delayed display needs an agreement or a fee for these stocks is unconfirmed. The plan also says redistributors "still sign a vendor agreement", so "no fees" never meant "no agreement".
6. **Pyth's equities price: the plan against F7.22 and F7.24.** The plan's §10a found $5,000 a month for US equities in a June 2026 blog post (CONFIRMED there). This run confirmed again that the plans page says Pro "starting at $2,500/month" and that it is the only tier listing equities. "Starting at" may reconcile the two figures. Settle the number in the Q16 check before any cost goes into the docs.
7. **The faucets' soft caps against Q19 and Q21.** The report treats the faucets' per-address limits as a natural cap (F7.02, F7.03; Q46 option 1). Q19 proposes our own test-USDC mint with a "get test USDC" button, and Q21 needs it to fund $4,900 for the market maker. Without its own rate limit, the button removes the soft cap. It also makes the project the issuer of its play token, so D3's "no value" then rests on the project never selling it or giving it as a prize (the report's D3 point b).
8. **Q19's swappable USDC address against D3.** Q19 makes the USDC mint address a setting "so Circle's devnet USDC (or mainnet USDC for the bonus) can be swapped in". D3 forbids real funds in the core submission (F7.30), and the report names a configuration mistake as one way devnet tokens could acquire value. Add a guard in Architecture, for example a devnet build that refuses the mainnet USDC address.
9. **"No custody" against the admin's powers.** D3 and D23 say the system "can never move users' money". Yet the admin can set outcomes through the override (S16, Q43), hold settlement (Q44) and pause minting and orders. The upgrade-key holder can replace the program (Q25), and Q30's option B would add a freeze authority. Money transmission turns on accepting and passing on value (F7.06), and no source tested a "non-custodial" claim against an admin who sets outcomes (report, D3). Q44's rule that Redeem can never be paused supports the claim. In the docs, list these powers beside the word "non-custodial" rather than letting the word stand alone.
10. **Q51's lean and the risks note against the spec.** The plan says geoblocking is "probably unnecessary, so state it in the risks note" and "required before any mainnet bonus". The spec forbids regulatory or compliance claims in that note (F7.30), and this run could not read OFAC's guidance (F7.31). The plan's §10a "OFAC's 2021 guidance expects wallet screening" is SECONDARY and was not rechecked. State what the app does, not what the law requires.
11. **Q49 option (c) and "no KYC".** The plan says geoblocking plus screening "departs from the spec's 'no KYC' spirit". Polymarket's geoblock works on IP (F7.17), and screening checks addresses (F7.34). Neither identifies a person. This is a judgement about wording, and the question of spirit is yours.
12. **Q47's safeguards against immutability.** The plan's Q47 option (a) names D26's evals as a safeguard. The evals measure only after an immutable write, and a market that settles automatically at 4:05 has no window at all. The safeguard that prevents a wrong result is the official-close check before 4:05 (D26, Q37), and its timing is unverified.
13. **A per-wallet cap (Q46) against the market maker and transferable tokens.** A cap would bind the market-maker bot (Q21, D25) unless it is exempted, and an exemption is a new admin power. If the tokens stay freely transferable (Q30, option A), a cap limits buying, not holding. This is reasoning, not a finding.
14. **Q50 against D14, the spec and the Q16 timing.** Delayed prices, or no stock price at all, would weaken D14 (your direction) and the spec's "live prices" and "real-time price display from oracle" (F7.29). Marking Q50 "triage in Architecture" also clashes with the Q16 check, which asks the same licence question (item 5) before Architecture.
15. **Q16's fallback and the licence.** The fallback reads Pyth price accounts that another person posts to devnet. Pyth's website terms grant no right in price feed data (F7.25), and no licence text for this route was found (the plan already marks it UNVERIFIED). Showing those prices on our website raises the same open question as Q50.
16. **Inside the report: the gambling exclusion.** The report's case against D3 says the exclusion for games that risk nothing of value came "via a fetch summary, so its exact scope is not confirmed". The verifier later found the exclusions on the statute page (F7.05, CONFIRMED). Treat F7.05 as confirmed for this one federal definition only. State gambling laws were not reviewed.

## Weakest spots in the evidence

- **No source addresses a devnet-only or testnet-only event-market app** (report gaps). D3's low-exposure reading, and the proportionality judgements in Q47 and Q51, rest on the absence of a value trigger, not on any source saying such an app is fine.
- **Kalshi's rulebook text was not read** (F7.11, SECONDARY; F7.12, UNCONFIRMED). Every comparison with Kalshi in Q46 and Q47 rests on rule titles and help pages.
- **FinCEN's 2019 guidance and OFAC's 2021 guidance were not read** (F7.07, SECONDARY; F7.31, content unread). D3's money-transmission point, Q49's money-transmission point and all of Q51 rest on definitions and secondary summaries.
- **Nasdaq's display and delayed-data policies were not read** (F7.27, SECONDARY). Q50's central question, whether showing prices publicly needs an agreement or a fee, is unresolved.
- **Pyth's API terms were not found, and coverage of the seven single stocks by its standard feeds is unconfirmed** (F7.25 covers only the website; F7.26 shows index feeds, not AAPL). This affects Q50 and the Q16 check.
- **The single-stock securities question rests on law-firm commentary** (F7.20, SECONDARY). No order or rule after the August 2026 comment deadline was found (F7.19).
- **Several CONFIRMED findings carry an inference by their author.** These are F7.06 (the "no custody" point), F7.10 (what aggregation implies for a chain with no KYC), F7.24 (the cost of running mainnet), F7.29 (that our own Yes/No prices are not exchange data) and F7.34 (the vendor cost). The source text is confirmed; the conclusion is the author's reading.
- **The plan's earlier legal research was not rechecked in this run:** the EU/UK retail bans, the 2023 CFTC orders, the DOJ statement of August 2025, the SEC staff relief, and the Tornado Cash and Samourai convictions. The Q49 reasons that rest on them should carry the plan's original labels.
- **No source tested "non-custodial" against admin powers** (report, D3). This matters for how D3 is worded in the docs.
- **Whether comparable venues cap positions per wallet or per market, and whether the faucets geoblock,** were not found (report gaps).
