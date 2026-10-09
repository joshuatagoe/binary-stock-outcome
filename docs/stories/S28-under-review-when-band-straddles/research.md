# Research: S28 Sees "Under review" instead of an outcome when the price band straddles the strike

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 4: Settlement and payout

### F4.16 [D26] [Q20] [Q36] [S15] [S28] CONFIRMED

Pyth defines confidence as measurement uncertainty among publishers, not distance from an official close. Best practices: each publisher's interval targets about 95% coverage; a protocol can pause when sigma/mu exceeds a threshold; for settlement the page lists the EMA price, the aggregate price, or contract terms that depend on the confidence interval.

- Lens: technical
- Source: [Pyth Pro: understanding price data](https://docs.pyth.network/price-feeds/pro/understanding-price-data): "Confidence reflects the measurement uncertainty of the prices reported among publishers."
- Source: [Pyth docs: Best practices](https://docs.pyth.network/price-feeds/core/best-practices): "It can decide that there is too much uncertainty when `σ/μ` exceeds some threshold"
- Verification (2026-10-09): held: Pyth Pro understanding-price-data confirms confidence is measurement uncertainty among publishers. Best-practices: sigma/mu threshold, 95% coverage, EMA or aggregate price for settlement.

### F4.17 [Q48] [Q36] [D8] [D26] [S15] [S28] CONFIRMED

If fewer than min_pub publishers contribute, Pyth produces no new aggregate and the price fields are carried forward; consumers can detect it by comparing feedUpdateTimestamp with the update's timestampUs; marketSession keeps updating. Best practices also say outages or closures can leave Pyth returning a stale price.

- Lens: technical
- Source: [Pyth Pro: understanding price data](https://docs.pyth.network/price-feeds/pro/understanding-price-data): "comparing `feedUpdateTimestamp` against the update's `timestampUs`"
- Source: [Pyth docs: Best practices](https://docs.pyth.network/price-feeds/core/best-practices): "Pyth may return a stale price for the product."
- Verification (2026-10-09): held: Understanding-price-data: fewer than min_pub gives no new aggregate, price fields carried forward, detect by comparing feedUpdateTimestamp with timestampUs, marketSession still updates. Best practices: stale price during outages.

### F4.25 [Q13] [Q36] [Q48] [D8] [S15] [S28] SECONDARY

Kalshi Nasdaq-100 event page: the market 'will expire at the sooner of the first release of the data, or one week after market close date', payout 'usually within 1 hour of event resolution'; the page does not state a fallback if the source is unavailable. Shows a venue that waits for the authoritative data rather than guessing.

- Lens: venues
- Source: [Robinhood/Kalshi: Nasdaq-100 price on Feb 17, 2026 at 4pm EST](https://robinhood.com/us/en/prediction-markets/financial/events/nasdaq-100-price-on-feb-17-2026-at-4pm-est-feb-16-2026): "The market will expire at the sooner of the first release of the data, or one week after market close date."
- Verification (2026-10-09): downgraded from CONFIRMED: Robinhood page: expiry quote exact, payout usually within 1 hour, no stated fallback if source unavailable (refers to rulebook). Third-party listing of a Kalshi market.

### F4.26 [Q20] [Q36] [Q16] [S15] [S28] UNCONFIRMED

Secondary reports: Polymarket added daily up/down and close markets for indices and a dozen-plus single-name US equities in April 2026 with Pyth as the resolution source (Pyth Terminal as public source of truth); Benzinga reported an earlier Polymarket stock market (Oct 2025) resolving 50/50 on exactly equal closes with Nasdaq as source. Reports conflict on details (contributor counts, open-vs-close basis); the primary press release returned 403, and I could not read any market's rules.

- Lens: venues
- Source: [Business Wire: Pyth/Polymarket (search snippet; page returned 403)](https://www.businesswire.com/news/home/20260402971400/en): "Polymarket integrated Pyth as the resolution source"
- Source: [Benzinga: Polymarket stock markets (search snippet)](https://benzinga.com/z/48243824): "if the closing prices are exactly equal, this market will resolve 50/50"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F4.33 [Q3] [Q36] [Q48] [D8] [D28] [Q13] [S15] [S28] UNCONFIRMED

Inference, not observed: the regular-session Equity.US feed ends at 16:00, and the SDK checks age against the current clock, so a 300-second max age passes only up to 16:05:00 for a 16:00 update and every later retry would fail on staleness; retries cannot narrow a band if no new aggregates are published. I could not measure real publish times (price endpoints returned 401) or confirm how carried-forward prices appear in Solana's publish_time.

- Lens: technical
- Source: [Hermes price_feeds query META equity](https://hermes.pyth.network/v2/price_feeds?query=META&asset_type=equity): "weekday 09:30-16:00 sessions"
- Source: [pyth_solana_receiver_sdk price_update.rs](https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/solana/pyth_solana_receiver_sdk/src/price_update.rs): "PriceTooOld"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F4.34 [D26] [Q13] [Q36] [S15] [S28] CONFIRMED

Spec context: strikes are generated at +/-3%, +/-6%, +/-9% from the previous close plus the previous close itself as a 7th strike (so about 49 contracts a day across 7 stocks), meaning one strike per stock sits at the money and the band-straddles-strike case is not remote. An exactly-equal close pays Yes ('at-or-above rule').

- Lens: user
- Source: [Meridian project spec (local)](file:///C:/Users/joshu/OneDrive/Documents/Gauntlet/binary-stock-outcome/docs/spec/meridian_project.txt): "previous close itself as a 7th strike"
- Verification (2026-10-09): held: Local spec line 245 'previous close itself as a 7th strike'; strike examples at +/-3% shown; line 113 shows exact-equal close pays Yes (at-or-above rule). The 49-contract and straddle points are arithmetic and inference.

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
