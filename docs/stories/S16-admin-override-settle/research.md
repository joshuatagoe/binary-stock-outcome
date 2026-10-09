# Research: S16 Settles by hand with a manual price, only after the enforced delay

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 4: Settlement and payout

### F4.79 [Q43] [S16] CONFIRMED

Polymarket settles through the UMA Optimistic Oracle with a 2-hour challenge period after a proposal; UMA's own docs say anyone can dispute during the challenge period and a dispute goes to DVM voting in 24-hour commit and 24-hour reveal rounds, resolving at 65% of staked UMA. Wrong prices are caught by watchers with money at stake during the window.

- Lens: venues
- Source: [Polymarket help: how are prediction markets resolved](https://help.polymarket.com/en/articles/13364518-how-are-prediction-markets-resolved): "it goes into a challenge period of 2 hours"
- Source: [UMA docs: how does UMA's oracle work](https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work): "anyone can dispute the proposal"
- Verification (2026-10-09): held: Polymarket help: 'goes into a challenge period of 2 hours'. UMA docs: 'during which anyone can dispute the proposal'; DVM has 24-hour commit and 24-hour reveal periods; resolves at 65% of staked UMA. The 'watchers with money at stake' point is the author's gloss.

### F4.80 [Q43] [S16] CONFIRMED

OpenZeppelin's TimelockController has a configurable minimum delay; proposers schedule and cancel operations, executors run them after the delay, and 'cancel allows proposers to cancel any Pending operation'. A delay is paired with a cancel path.

- Lens: venues
- Source: [OpenZeppelin Contracts: TimelockController](https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController): "cancel allows proposers to cancel any Pending operation"
- Verification (2026-10-09): held: OpenZeppelin TimelockController docs (first 100k characters of the page read): 'cancel allows proposers to cancel any Pending operation'. A minimum delay applies, proposers schedule, and executors execute after the timelock.

### F4.81 [Q43] [S16] CONFIRMED

Squads v4 multisigs support time locks of 1 hour, 1 day, 1 week, a custom number of seconds, or none, which defer execution of approved transactions. The Squads README warns users might 'inadvertently set long or permanent time-locks' and that a compromised config_authority can change settings. The docs I read do not say whether pending transactions can be rejected during a lock.

- Lens: venues
- Source: [Squads docs: time locks](https://docs.squads.so/main/navigating-your-squad/settings/time-locks.md): "defer the execution of approved transactions for a set period of time"
- Source: [Squads Protocol v4 README](https://github.com/Squads-Protocol/v4): "Users might inadvertently set long or permanent time-locks"
- Verification (2026-10-09): held: Squads time-locks doc: 'defer the execution of approved transactions for a set period of time'. Options are 1 hour, 1 day, 1 week, custom seconds, or none. It does not say whether pending transactions can be rejected. The v4 README has 'Users might inadvertently set long or permanent time-locks' and a compromised config_authority warning.

### F4.82 [Q43] [S16] SECONDARY

MakerDAO's Oracle Security Module repository describes itself as a 'Feed with 1 hour delay', poked hourly so the current value trails the source by about one interval. The repository states no purpose beyond that tagline and was archived on 8 Oct 2024. That the delay exists to give governance time to react is from a search-result write-up, not the repository.

- Lens: venues
- Source: [makerdao/osm repository](https://github.com/makerdao/osm): "Feed with 1 hour delay"
- Source: [arXiv 2401.06044 (search snippet)](https://arxiv.org/html/2401.06044v1): "introduce delays when using oracle value inputs"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.83 [Q43] [S16] SECONDARY

Pyth documents a Benchmarks API for historical prices at a timestamp (search snippet from Pyth documentation pull requests), which could serve as an independent cross-check of a manual 4:00 PM price. I did not open the Benchmarks docs; Hermes now requires an API key since 26 August 2026 per Pyth's Solana page, and the Pyth Core sunset may affect availability.

- Lens: technical
- Source: [pyth-network/documentation pull request 814 (search snippet)](https://github.com/pyth-network/documentation/pull/814/files): "Fetching historical prices from the Benchmarks API is the most straightforward way to get historical prices."
- Source: [Pyth docs: Solana pull integration](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana): "Users must validate the price update for the appropriate price feed and timestamp."
- Verification (2026-10-09): not rechecked (SECONDARY)

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

### F7.09 [Q46] [Q47] [Q49] [S4] [S16] [S28] [S22] CONFIRMED

The CFTC's March 2026 ANPRM on prediction markets (published 16 March 2026, RIN 3038-AF65) asks: Q2.e how position limits across similar event contracts should be aggregated and whether event contracts need different limits; Q2.b what dispute-resolution rules should apply to how an event contract is resolved; Q30-31 about manipulation; Q2.h about blockchain-based prediction markets. It proposes no rules. The CFTC also withdrew its 2024 event contracts proposal on 4 Feb 2026.

- Lens: legal
- Source: [CFTC ANPRM: Prediction Markets (2026-05105)](https://www.cftc.gov/LawRegulation/FederalRegister/proposedrules/2026-05105.html): "how position limits across similar event contracts should be aggregated"
- Source: [CFTC Seeks Public Comment on ANPRM Relating to Prediction Markets](https://www.cftc.gov/PressRoom/PressReleases/9194-26): "This begins the process of new rulemaking grounded in a rational and coherent interpretation of the Commodity Exchange Act."
- Source: [CFTC withdraws Event Contracts proposal](https://www.cftc.gov/PressRoom/PressReleases/9179-26): "does not intend to issue final rules with respect to the proposal"
- Verification (2026-10-09): held: Opened ANPRM 2026-05105: RIN 3038-AF65, published 16 March 2026, Q2.e aggregation quote present, Q2.b disputes over resolution, Q30-31 manipulation, Q2.h blockchain-based; no rules proposed. Release 9194-26 has the quoted sentence (release dated 12 March). Release 9179-26 is dated 4 Feb 2026 and withdraws the June 2024 Event Contracts proposal; actual wording is 'The CFTC does not intend to issue final rules with respect to the proposal'.

### F7.13 [Q47] [S16] [S28] CONFIRMED

Kalshi's help centre describes no formal dispute mechanism: a market settles when the official outcome is confirmed and the markets team finalises the result; it relies on a source agency; users with a stuck market check the rules and then contact in-app support, which escalates to the markets team. Its full rulebook review provisions were not read.

- Lens: legal
- Source: [Kalshi Market FAQs](https://help.kalshi.com/en/articles/13823821-market-faqs): "A market settles when the official outcome is confirmed and our markets team finalizes the result."
- Verification (2026-10-09): held: Opened Kalshi help article (Kalshi's own site). Quote present; mentions source agency delays, check rules, contact in-app chat, which escalates to the markets team. No formal dispute mechanism described.

### F7.14 [Q47] [S16] [S28] CONFIRMED

Polymarket resolves via the UMA Optimistic Oracle: a proposer posts a bond (typically $750 pUSD), a 2-hour challenge period follows, a dispute needs a matching bond and starts a new round, a second dispute goes to a UMA token-holder vote; undisputed markets resolve in about 2 hours, disputed ones in about 4-6 days; an unknown/50-50 result redeems at $0.50 per token.

- Lens: legal
- Source: [Polymarket Docs: Resolution](https://docs.polymarket.com/concepts/resolution.md): "2-hour challenge period where anyone can dispute the outcome"
- Verification (2026-10-09): held: Opened docs.polymarket.com resolution.md (primary). Typical $750 pUSD bond, 2-hour challenge period, same-size counter-bond, second dispute escalates to UMA DVM token holder vote, undisputed ~2 hours, disputed 4-6 days, Unknown/50-50 redeems $0.50.

### F7.15 [Q47] [S16] [S28] CONFIRMED

UMA's oracle: proposals are pending for a challenge period in which anyone can dispute; each proposal can be disputed once; disputes go to the DVM, where stakers vote in rounds with a 24-hour commit period; a dispute resolves at a 65% majority of staked UMA; non-voters and the losing side are slashed.

- Lens: legal
- Source: [UMA Docs: How does UMA's Oracle work](https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work): "Disputes resolve when a minimum 65% majority of staked UMA is cast in favor of a single outcome."
- Verification (2026-10-09): held: Opened docs.uma.xyz page (primary). Challenge period with anyone able to dispute, each proposal disputable once, DVM stakers vote, 24-hour commit period, 65% majority quote exact, non-voters and minority voters slashed.

### F7.16 [Q47] [S16] [S28] SECONDARY

Law-firm commentary reports the CFTC ANPRM asks how disputes should be resolved where triggering events are contested, and that a DMO advisory said a settlement source described as a 'consensus of yet-to-be-determined sources' may not satisfy Core Principle 3. The advisory itself was not opened.

- Lens: legal
- Source: [Cleary Gottlieb: Prediction Markets for Those Who Don't Predict (and Those Who Do)](https://www.clearygottlieb.com/news-and-insights/publication-listing/prediction-markets-for-those-who-dont-predict-and-those-who-do): "where the triggering events underlying a contract are contested"
- Verification (2026-10-09): not rechecked (SECONDARY)
