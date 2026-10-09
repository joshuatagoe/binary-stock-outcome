# Research: S15 Settles every contract at about 4:05 after staleness and confidence checks, retrying for up to 15 minutes

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 4: Settlement and payout

### F4.01 [D8] [D28] [Q37] [S15] CONFIRMED

Pyth's Solana integration guide says the PriceUpdateV2 account only guarantees a verified price for some feed at some time, so the program must check feed and timestamp itself; Anchor's Account<PriceUpdateV2> checks the owner program, but without Anchor the developer must check it.

- Lens: technical
- Source: [Pyth docs: Pull integration on Solana](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana): "guarantees that the account contains a verified price for _some_ price feed at _some_ point in time."
- Verification (2026-10-09): held: Opened Pyth Solana pull integration page. It says PriceUpdateV2 guarantees a verified price for some feed at some time, users must validate feed and timestamp, Anchor Account<PriceUpdateV2> checks owner automatically, otherwise developer's responsibility.

### F4.02 [D8] [D28] [Q3] [S15] CONFIRMED

Pyth receiver SDK source: get_price_no_older_than requires VerificationLevel::Full, returns MismatchedFeedId for a wrong feed and PriceTooOld when publish_time plus maximum_age is before the clock; it checks age against the on-chain clock only, not against a target time. get_price_unchecked skips age and verification checks. PriceFeedMessage has a prev_publish_time field (seen in tests); semantics not documented in the file.

- Lens: technical
- Source: [pyth_solana_receiver_sdk price_update.rs](https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/solana/pyth_solana_receiver_sdk/src/price_update.rs): "Lowering the verification level from `Full` to `Partial` increases the risk of using a malicious price update."
- Verification (2026-10-09): held: Opened price_update.rs on GitHub. get_price_no_older_than uses Full verification, errors MismatchedFeedId and PriceTooOld (publish_time+max_age before clock); get_price_unchecked only checks feed id; prev_publish_time appears in tests only, logic never reads it. Lowering Full to Partial warning present.

### F4.03 [D8] [D28] [Q37] [S15] CONFIRMED

Pyth's best-practices page says pull updates let the submitter choose which valid update to submit (constraints: updates move forward in time and cannot be too old), which it calls functionally equivalent to latency; mitigations include a staleness check, avoiding races between a Pyth update and an adversary's transaction, and for derivatives delayed settlement.

- Lens: technical
- Source: [Pyth docs: Best practices](https://docs.pyth.network/price-feeds/core/best-practices): "avoid situations where a Pyth price update must race against an adversary's transaction"
- Verification (2026-10-09): held: Opened Pyth best-practices page. Race-against-adversary quote present; choosing which update to submit is 'functionally equivalent to latency'; derivatives delayed execution mitigation present. Did not separately see the 'forward in time / not too old' constraint wording in the summary, but core claim matches.

### F4.04 [D28] [D8] [S15] CONFIRMED

Pyth Core was upgraded on August 26, 2026 at 16:00 UTC: Wormhole guardians were replaced by five independently operated routers, quorum dropped from 13/19 to 3/5, contracts were redeployed with the same interface. I could not find what 'Full' verification level means in the upgraded Solana receiver SDK; the SDK source doc still says 'two thirds of the current guardians'.

- Lens: technical
- Source: [Pyth Core upgrade: how it works](https://docs.pyth.network/price-feeds/core/upgrade/how-it-works): "The upgraded Pyth Core leverages the high-performance Pyth Pro architecture while preserving the existing interfaces."
- Source: [pyth_solana_receiver_sdk price_update.rs](https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/solana/pyth_solana_receiver_sdk/src/price_update.rs): "we have verified the signatures for two thirds of the current guardians."
- Verification (2026-10-09): held: Opened upgrade how-it-works page: upgraded Aug 26, 2026 16:00 UTC, five independently operated routers, 3/5 vs 13/19, newly deployed contracts with same ABI/interface, quote present. SDK source describes Full as two-thirds of guardians (guardian wording stale), consistent with the claim's caveat.

### F4.05 [D28] [D8] [Q2] [S15] CONFIRMED

Upgraded Solana program ids (same across SVM networks): Wormhole receiver HDw2E7P8X1SkCyjvoGsfBGAVUutKcj874bXjHrpVYrVL, Solana receiver rec2HHDDnjLfj4kE7VyEtFA1HPGQLK33259532cRyHp, price feed pyt2F414BA6dPttK6RddPZUdHfapoBN24GL5wbrPCou. The older contract-addresses page still lists rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ (receiver) and pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT (price feed) for mainnet and devnet and recommends the upgraded contracts for new integrations. Per-feed push account addresses all change with the upgrade.

- Lens: technical
- Source: [Pyth Core upgrade: contracts](https://docs.pyth.network/price-feeds/core/upgrade/contracts): "The Price Feed program ID changes at the upgrade, so every per-feed account address changes too."
- Source: [Pyth docs: Solana contract addresses](https://docs.pyth.network/price-feeds/core/contract-addresses/solana): "We recommend new integrations use the upgraded Solana contracts"
- Verification (2026-10-09): held: Opened upgrade contracts page: all three upgraded Solana ids match; per-feed account addresses change quote present. Opened Solana contract-addresses page: lists rec5EK... and pythWSn... for mainnet and devnet and recommends upgraded contracts for new integrations.

### F4.06 [Q2] [D28] [Q3] [S15] CONFIRMED

Pyth's Hermes feed listing contains a regular-session Equity.US feed for all 7 MAG7 stocks: AAPL 49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688; MSFT d0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1; NVDA b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593; TSLA 16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1; META 78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe; GOOGL 5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6 (GOOG e65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2); AMZN b5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a. Separate Equity.Index.* feeds also exist for MSFT, NVDA, TSLA, GOOGL, META. This is the listing only; I could not pull live prices without an API key.

- Lens: venues
- Source: [Hermes price_feeds query META equity](https://hermes.pyth.network/v2/price_feeds?query=META&asset_type=equity): "Equity.US.META/USD"
- Source: [Hermes price_feeds equity list](https://hermes.pyth.network/v2/price_feeds?asset_type=equity&query=US): "Equity.US.AAPL/USD"
- Verification (2026-10-09): held: Opened Hermes feed listing and per-ticker queries. Equity.US ids match for AAPL, MSFT, NVDA, TSLA, META, GOOGL, GOOG, AMZN. Equity.Index feeds exist for MSFT, NVDA, TSLA, GOOGL, META (no Index AAPL/AMZN seen). The Hermes API is Pyth's own endpoint.

### F4.07 [Q3] [Q2] [D8] [Q48] [S15] CONFIRMED

Per the Hermes feed attributes, Equity.US.META/USD uses an America/New_York schedule with weekday 09:30-16:00 sessions and holiday overrides, while Equity.Index.META/USD is described as 'PYTH PRICE IN USD FOR META 24/7'. Using the wrong feed id would give a regular-session close versus an after-hours price. Holiday overrides imply early-close days differ from a fixed 4:00 PM.

- Lens: technical
- Source: [Hermes price_feeds query META equity](https://hermes.pyth.network/v2/price_feeds?query=META&asset_type=equity): "PYTH PRICE IN USD FOR META 24/7"
- Verification (2026-10-09): held: Hermes META query: Equity.US.META/USD schedule America/New_York;0930-1600 weekdays with holiday overrides (e.g. 1127/0930-1300 early close); Equity.Index.META/USD description 'PYTH PRICE IN USD FOR META 24/7' (its attributes also list a 0930-1600 schedule, noted tension). Feed-id consequence is an inference but supported.

### F4.08 [Q16] [Q2] [S15] CONFIRMED

Hermes price endpoints now require an API key (since the Aug 26, 2026 upgrade; new base URL pyth.dourolabs.app/hermes). Docs: key 'Required for everyone who calls Hermes'; 'a free trial is included, paid plans cover ongoing use' (no duration or limits). My unauthenticated request to hermes.pyth.network/v2/updates/price/latest returned 401, while the feed listing endpoint answered.

- Lens: venues
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "a free trial is included, paid plans cover ongoing use"
- Source: [Hermes latest price endpoint (unauthenticated request)](https://hermes.pyth.network/v2/updates/price/latest): "HTTP 401 Unauthorized"
- Verification (2026-10-09): held: Preparing page: key 'Required for everyone who calls Hermes', 'a free trial is included, paid plans cover ongoing use', new base pyth.dourolabs.app/hermes. curl to hermes.pyth.network/v2/updates/price/latest with an ids param returned 401; with no params returned 400 (WebFetch also 400), so the 401 holds for a valid request.

### F4.09 [Q16] [S15] CONFIRMED

Pyth plans page: Free $0/month with 'No Pyth API access' (view-only Terminal, 10 s update, 30 days history); Starter $500/month including 'Pyth API access with API Key' (up to 1 s updates); Pro starting at $2,500/month; Indices custom. Does not mention a trial or a plan called Core.

- Lens: venues
- Source: [Pyth plans](https://app.pyth.com/plans): "Starter: $500/month"
- Verification (2026-10-09): held: Opened app.pyth.com/plans: Free $0 'No Pyth API access', 10 s, 30 days history; Starter $500/month with API key, 1 s; Pro from $2,500; Indices custom; no trial or Core plan mentioned.

### F4.10 [Q16] [S15] UNCONFIRMED

Whether a no-cost Hermes API key exists for a student devnet project is not settled: the upgrade page says a free trial is included, the plans page says the Free plan has no API access, and a secondary report says Pyth Terminal gives 'free API key access for new sign-ups'. Sources disagree or are silent on duration and limits.

- Lens: user
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "a free trial is included, paid plans cover ongoing use"
- Source: [Pyth plans](https://app.pyth.com/plans): "No Pyth API access"
- Source: [Search snippet: Pyth Terminal / Polymarket news](https://www.mexc.com/news/1002177): "free API key access for new sign-ups"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F4.11 [Q2] [Q16] [D28] [S15] CONFIRMED

Pyth sponsored push feeds are live on Solana mainnet and devnet with default 55-second heartbeat and 0.5% deviation (61 feeds), so they cannot be pinned to the 4:00 PM close. The page's feed table did not render, so I could not confirm which equities are included on devnet. The SDK's price-feed program also exists on devnet.

- Lens: technical
- Source: [Pyth docs: Push feeds on Solana](https://docs.pyth.network/price-feeds/core/push-feeds/solana): "currently sponsored in Solana mainnet and devnet"
- Source: [Pyth Core upgrade: contracts](https://docs.pyth.network/price-feeds/core/upgrade/contracts): "Default: 55-second heartbeat, 0.5% deviation"
- Verification (2026-10-09): held: Push feeds on Solana page: 'currently sponsored in Solana mainnet and devnet', 61 feeds at 55 s / 0.5% default (plus 2 at 30 s and 1 at 3 min). Contracts page confirms default tier. Feed table did not render, as the claim says.

### F4.12 [Q2] [Q16] [S15] CONFIRMED

Chainlink Data Streams has a Solana devnet verifier program (Gt9S41PtjR58CbG9JhJ3J6vxesqrNAswbWYbLNTMZA3c) and states it is self-serve (sign up at app.chain.link); billing is subscription-only (pay-per-verification deprecated) and mainnet pricing requires contacting Chainlink. I could not confirm a US equities stream on a Solana verifier; the supported-networks table did not render.

- Lens: venues
- Source: [Chainlink Data Streams: Solana onchain report verification](https://docs.chain.link/data-streams/tutorials/solana-onchain-report-verification): "Data Streams is self-serve, no sales call required."
- Source: [Chainlink Data Streams billing](https://docs.chain.link/data-streams/billing.md): "Chainlink Data Streams uses a subscription-based billing option."
- Verification (2026-10-09): held: Solana tutorial: 'Data Streams is self-serve, no sales call required', devnet verifier id Gt9S41... matches, app.chain.link sign-up. Billing page: subscription-based, pay-per-verification deprecated, mainnet pricing only by contacting Chainlink (the contact-for-pricing point is on the billing page, not the tutorial).

### F4.13 [Q2] [Q3] [S15] CONFIRMED

Chainlink's schema page recommends RWA Advanced (v11) for US equities (bid, ask, depth, lastTradedPrice where supported, and a marketStatus covering pre-market, regular hours, post-market, overnight, weekend); its market-hours page says to use marketStatus, not timestamps, and gives status 5 = Closed after 4:00 PM for standard US equities. I saw no confidence-interval field in the schema as returned, and the pages do not say what price is reported after the close.

- Lens: technical
- Source: [Chainlink Data Streams: report schema overview](https://docs.chain.link/data-streams/reference/report-schema-overview.md): "For US Equities specifically, RWA Advanced (v11) is strongly recommended over v8."
- Source: [Chainlink Data Streams: market hours](https://docs.chain.link/data-streams/market-hours): "timestamps indicate when data was last recorded, not whether the market is currently active."
- Verification (2026-10-09): held: Schema overview: v11 strongly recommended for US equities; fields bid, ask, volumes, lastTradedPrice where supported, marketStatus; no confidence interval mentioned. Market-hours page: quote present, status 5 = Closed outside 9:30-4:00 ET for standard feeds, no post-close price guidance.

### F4.14 [Q2] [S15] SECONDARY

Secondary reports say Chainlink launched 24/5 U.S. Equities Streams on January 20, 2026, covering NVDA, AAPL, MSFT and more, with Solana adopters Kamino and GMX; no source mentions Solana devnet.

- Lens: venues
- Source: [LINK Rebounds 4% as Chainlink Roll Outs Data Streams for U.S. Equities and ETFs](https://finance.yahoo.com/news/rebounds-4-chainlink-roll-outs-201617996.html): "Chainlink launched 24/5 U.S. Equities Streams on January 20, 2026"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.15 [Q2] [Q16] [S15] CONFIRMED

Switchboard: Solana docs list a devnet program id and default queue; Surge lists 'All major cryptocurrency pairs' (no equities), custom feeds 'available on request', free Plug plan (10 s quote interval, 2 feeds), Pro about $3,000/month. No equity feed catalogue found. Stork supports Solana (500+ assets, 70+ chains) but its docs do not mention equities.

- Lens: venues
- Source: [Switchboard Surge on Solana](https://docs.switchboard.xyz/docs-by-chain/solana-svm/surge.md): "All major cryptocurrency pairs"
- Source: [Stork docs](https://docs.stork.network/): "currently supports 500+ assets on 70+ chains, including EVM chains, Solana, Sui, Aptos"
- Verification (2026-10-09): held: Switchboard Surge page: 'All major cryptocurrency pairs', custom feeds on request, Plug free 10 s / 2 feeds, Pro about $3,000/month, no equities. Stork docs: 500+ assets, 70+ chains including Solana; no equities mention. I did not verify the Solana devnet program id/default queue in the claim.

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

### F4.18 [Q3] [Q48] [D8] [Q36] [S15] CONFIRMED

Pyth feeds follow traditional market hours per asset class; outside US equity hours 'it's not clear what an equity's price is'. Querying fails when too much time has elapsed since the last update.

- Lens: technical
- Source: [Pyth docs: Best practices](https://docs.pyth.network/price-feeds/core/best-practices): "Pyth price feeds follow the traditional market hours for each asset class."
- Verification (2026-10-09): held: Best practices: follows traditional market hours per asset class; 'it's not clear what an equity's price is' outside hours; querying fails if too much time elapsed.

### F4.19 [Q3] [D26] [Q20] [S15] SECONDARY

Secondary summary of SEC filings: the Nasdaq Closing Cross price is the Nasdaq Official Closing Price for participating stocks, and fifteen minutes after the close Nasdaq disseminates a trade message setting the NOCP as the official consolidated last sale price where it differs from the last sale. I could not open the primary rule text (PDF unreadable, rulebook 403), so the 15-minute figure is not verified.

- Lens: venues
- Source: [SEC filing SR-NASDAQ-2025 (search snippet)](https://www.sec.gov/files/rules/sro/nasdaq/2025/34-102336.pdf): "Fifteen minutes after the close of trading, Nasdaq will disseminate via the network processor a trade message setting the Nasdaq Official Closing Price"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.20 [Q20] [D26] [Q3] [S15] CONFIRMED

SEC press release on Athena Capital: rapid-fire trades in the final two seconds of almost every trading day pushed stocks to artificial prices that the Nasdaq closing auction then used to set closing prices; shows the close is a manipulation target.

- Lens: venues
- Source: [SEC press release 2014-229 (Athena Capital)](https://www.sec.gov/news/press-release/2014-229): "artificial prices that NASDAQ then used to set the closing prices for on-close orders"
- Verification (2026-10-09): held: SEC press release 2014-229: Athena rapid-fire trades in final two seconds of almost every trading day; stocks traded at artificial prices NASDAQ then used to set closing prices for on-close orders.

### F4.21 [Q48] [S15] CONFIRMED

Nasdaq LULD rule notice (Federal Register 2014): if the volatility condition persists until 5:00 p.m., Nasdaq does not run the closing cross and uses the last sale on Nasdaq as the Nasdaq Official Closing Price for that day.

- Lens: venues
- Source: [Federal Register 2014-09205 (Nasdaq LULD closing cross)](https://www.govinfo.gov/content/pkg/FR-2014-04-23/html/2014-09205.htm): "shall instead use the last-sale on NASDAQ as the NASDAQ Official Closing Price in that security for that trading day"
- Verification (2026-10-09): held: Federal Register 2014-09205: if the condition lasts until 5:00 p.m., no LULD closing cross; 'shall instead use the last-sale on NASDAQ as the NASDAQ Official Closing Price'. Text is quoted rule language in the notice.

### F4.22 [Q48] [S15] CONFIRMED

NYSE filing notice (Federal Register Dec 2015, a proposal; I did not verify adoption or current text): if a security is under regulatory halt at 4:00 p.m., no closing auction is held and the official closing price is the most recent last-sale eligible trade; if none that day, the prior day's official close carries forward.

- Lens: venues
- Source: [Federal Register 2015-31442 (NYSE closing price rule filing)](https://www.govinfo.gov/content/pkg/FR-2015-12-15/html/2015-31442.htm): "the Official Closing Price would be the most recent last-sale eligible trade in such security"
- Verification (2026-10-09): held: Federal Register 2015-31442: regulatory halt at 4:00 p.m. means no closing auction; Official Closing Price is most recent last-sale eligible trade; else prior day's official close. It is a proposal, as the claim says.

### F4.23 [Q3] [D26] [S15] SECONDARY

SEC explainer (via search snippet): the Consolidated Tape Association made the regular session close the 4:00 p.m. price; after-hours trades do not change it; media and data vendors may still report different closes for the same stock.

- Lens: venues
- Source: [SEC: closing price (search snippet)](https://www.sec.gov/answers/closepr.htm): "The closing price for the same stock may continue to be reported differently by various media and market data vendors."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.24 [Q20] [Q13] [S15] SECONDARY

Kalshi crypto price contracts (as listed on Robinhood) settle on an average: 60 CF Benchmarks RTI prices are collected in the last minute before expiration and their average is the final value; payout is usually within 1 hour of event resolution.

- Lens: venues
- Source: [Robinhood/Kalshi: Bitcoin price on Feb 16, 2026 at 8pm EST](https://robinhood.com/us/en/prediction-markets/crypto/events/bitcoin-price-on-feb-16-2026-at-8pm-est-feb-15-2026): "The official and final value is the average of these prices."
- Verification (2026-10-09): downgraded from CONFIRMED: Robinhood page for a Kalshi contract: 60 CF Benchmarks RTI prices in last minute, 'The official and final value is the average of these prices', payout usually within 1 hour. Content matches but source is Robinhood's listing, not Kalshi's own rules.

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

### F4.27 [Q13] [D8] [Q37] [S15] CONFIRMED

Spec text fixes the timeline: liveness goal 'settled within 10 minutes of market close every trading day'; settlement job at about 4:05 PM; retry 'every 30 seconds for up to 15 minutes'; admin override only after a delay 'e.g., 1 hour after market close'. So retries run to about 4:20 and the admin path opens at about 5:00, both after the 10-minute mark; settlement 'occurs automatically via the automation service'.

- Lens: user
- Source: [Meridian project spec (local)](file:///C:/Users/joshu/OneDrive/Documents/Gauntlet/binary-stock-outcome/docs/spec/meridian_project.txt): "Liveness: Markets created before market open and settled within 10 minutes of market close every trading day"
- Verification (2026-10-09): held: Grepped local spec: liveness 'settled within 10 minutes of market close' (line 48), settlement automatic via automation service at ~4:05 PM ET (324), retry every 30 seconds up to 15 minutes (447), admin override after delay e.g. 1 hour after close (368). Derived timeline arithmetic is correct.

### F4.28 [Q13] [S15] CONFIRMED

Google SRE guidance on counting misses: an SLI is the number of good events divided by total events; the error budget is 100% minus the SLO; a four-week rolling window is a good general-purpose interval; standardize what counts and the aggregation interval.

- Lens: venues
- Source: [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/): "the error budget is 100% minus the SLO."
- Source: [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/): "a target value or range of values for a service level that is measured by an SLI."
- Verification (2026-10-09): held: SRE Workbook: error budget is 100% minus the SLO, SLI as good events over total events, four-week rolling window good general-purpose interval. SRE Book quote on SLO definition present.

### F4.29 [D8] [Q3] [S15] CONFIRMED

Solana's Clock unix_timestamp is the 'approximate real world time of the current slot', computed from a validator timestamp oracle after earlier drift problems; no numeric drift bound was given. An on-chain 'after 4:00 PM ET' rule therefore has some seconds of tolerance, and the ET-to-UTC conversion must be done outside the program or via a stored timestamp.

- Lens: technical
- Source: [solana_clock::Clock](https://docs.rs/solana-clock/latest/solana_clock/struct.Clock.html): "The approximate real world time of the current slot."
- Verification (2026-10-09): held: docs.rs solana_clock::Clock: unix_timestamp 'The approximate real world time of the current slot', earlier approach had drift, now validator timestamp oracle; no numeric bound given. The ET-to-UTC conclusion is the author's inference.

### F4.30 [D8] [Q3] [Q16] [Q20] [S15] CONFIRMED

Pyth Benchmarks serves historical signed prices at a timestamp ('contract settlement' is a listed use case): /v1/updates/price/{timestamp} or with an interval of at most 60 seconds; on EVM parsePriceFeedUpdates takes minPublishTime/maxPublishTime and reverts with PriceFeedNotFoundWithinRange. Requests now need the API key; limit 10 requests per 10 seconds per IP. The page does not define prev_publish_time or first-update-after-timestamp semantics.

- Lens: technical
- Source: [Pyth docs: Use historical price data](https://docs.pyth.network/price-feeds/core/use-historical-price-data): "lets you query historical prices at specific timestamps"
- Verification (2026-10-09): held: Pyth historical data page: query at specific timestamps, contract settlement use case, /v1/updates/price/{timestamp}, interval max 60 s, minPublishTime/maxPublishTime with PriceFeedNotFoundWithinRange, API key required since Aug 26 2026, 10 requests/10 s per IP, no prev_publish_time on page.

### F4.31 [Q37] [D28] [S15] CONFIRMED

Pyth's pull model is permissionless by design ('Update 2000+ prices on-demand, permissionlessly every 400ms'); UMA's optimistic oracle pending proposals can be disputed by anyone during a challenge period. Neither source covers who may call a settlement instruction on Solana.

- Lens: venues
- Source: [Pyth Core architecture](https://docs.pyth.network/price-feeds/core): "Update 2000+ prices on-demand, permissionlessly every 400ms."
- Source: [UMA docs: how the oracle works](https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work): "Proposals are considered pending for a challenge period during which anyone can dispute the proposal."
- Verification (2026-10-09): held: Pyth Core page contains 'Update 2000+ prices on-demand, permissionlessly every 400ms.' UMA docs contain the challenge-period quote. Neither covers Solana settlement-instruction callers, as the claim notes.

### F4.32 [Q16] [D26] [S15] CONFIRMED

Off-chain cross-check data costs: Massive (formerly Polygon) Basic plan $0/month, 5 API calls/min, 2 years of history, end-of-day only; its docs define close only as 'the close price for the symbol in the given time period' (not stated to be the official close). Alpaca's docs say IEX 'is the only feed that can be used without a subscription'.

- Lens: venues
- Source: [Massive pricing](https://massive.com/pricing): "Basic $0/month, 5 calls/min, 2 years, end-of-day only"
- Source: [Alpaca: historical stock data](https://docs.alpaca.markets/docs/historical-stock-data-1): "This is the only feed that can be used without a subscription."
- Verification (2026-10-09): held: Massive pricing: Stocks Basic $0/month, 5 calls/min, 2 years history, end-of-day data. Alpaca docs: under iex, 'This is the only feed that can be used without a subscription.' I did not verify Massive's 'close price for the symbol in the given time period' docs wording.

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

### F4.35 [Q2] [S15] CONFIRMED

Pyth's price-feed-ids page says only Aptos, Fogo, Near and Sui testnets need the Beta feed ids; Solana devnet is not listed, implying the stable ids (as returned by Hermes) apply there. This is an inference from absence.

- Lens: technical
- Source: [Pyth docs: Price feed ids](https://docs.pyth.network/price-feeds/core/price-feeds/price-feed-ids.md): "use the Beta price feed IDs instead of the stable ones"
- Verification (2026-10-09): held: Price-feed-ids page callout: 'use the Beta price feed IDs instead of the stable ones' for Aptos, Fogo, Near, Sui testnets; Solana devnet not mentioned. The table did not render; conclusion is an inference from absence, as stated.

### F4.51 [D1] [S15] [S17] CONFIRMED

Cboe's 2008 binary-options rule filing pays a binary call when the settlement value is at or above the exercise price (an exact tie pays the call) and pays the put only when the index is below it. This is the same partition as the Meridian spec.

- Lens: venues
- Source: [Federal Register, 30 May 2008, Cboe proposed rule change on binary options](https://www.govinfo.gov/content/pkg/FR-2008-05-30/html/E8-12031.htm): "at or above the option's exercise price"
- Verification (2026-10-09): held: Opened the Federal Register page (govinfo). Section II.A says a call pays if settlement value is 'at or above the option's exercise price' and a put pays if the index is 'below' it. Matches.

### F4.52 [D1] [S15] [S17] UNCONFIRMED

Kalshi's Nasdaq-100 close contracts, as listed on Robinhood, are titled with 'or above' thresholds (for example '24,100 or above'). The page does not define the tie case, and the linked contract-terms PDF could not be read. A search snippet citing a Barchart article says a '25,000 or above' market resolved on 'above 24999.99', which would put an exact tie on Yes, but I could not open that article.

- Lens: venues
- Source: [Robinhood prediction markets: Nasdaq-100 price on Feb 5, 2026 at 4pm EST](https://robinhood.com/us/en/prediction-markets/financial/events/nasdaq-100-price-on-feb-5-2026-at-4pm-est-feb-04-2026/): "Get $1 for every contract you own if your prediction is correct."
- Source: [Barchart: a trader just bet against Nasdaq 100 above 25000 (search snippet only)](https://www.barchart.com/story/news/35267226/a-trader-just-bet-26998-against-nasdaq-100-above-25000-in-2025): "above 24999.99"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F4.53 [D1] [S15] [S17] UNCONFIRMED

Polymarket's daily AAPL 'Up or Down' market says that if the two prices are equal the market resolves 50-50, and its page is internally inconsistent about the source (FAQ names Binance 1-minute candles, Rules panel names Pyth). Its 'AAPL close above ___' market page did not show any rules text in the fetch; a search snippet claims a tie there resolves No, which I could not verify.

- Lens: venues
- Source: [Polymarket: AAPL Up or Down on October 5, 2026](https://polymarket.com/event/aapl-up-or-down-on-october-5-2026): "if equal, the market resolves 50-50"
- Source: [Polymarket: Apple (AAPL) closes above ___ on October 6?](https://polymarket.com/event/aapl-close-above-on-october-6-2026): "Resolution Source: https://pythdata.app/explore/Equity.US.AAPL%2FUSD"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F4.54 [D1] [S15] [S17] SECONDARY

Nadex '>' binaries (2014 write-ups) treat a settlement at or below the strike as the sell-side win, so a tie does not pay the buyer. Based on a search snippet only; I did not open the page, and the terms may have changed since 2014.

- Lens: venues
- Source: [Benzinga: How to determine intrinsic value of a Nadex binary option](https://www.benzinga.com/markets/binary-options/14/06/4630721/how-to-determine-intrinsic-value-of-a-nadex-binary-option): "settlement at or below the strike is treated as a sell-side win"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.55 [D1] [S15] [S17] CONFIRMED

The spec states the tie rule (close >= strike means Yes) but its strike labels and payoff text read 'META > $680' and 'You win $1.00 if [STOCK] closes above [STRIKE]', which contradicts the rule on an exact tie. Strikes are rounded to the nearest $10 while prices are in cents, so a tie lands on a round strike; the per-contract probability is small (my rough estimate about 0.03% near the money) but not zero over about 12,000 market-days a year.

- Lens: user
- Source: [Meridian project spec (local file)](file:///C:/Users/joshu/OneDrive/Documents/Gauntlet/binary-stock-outcome/docs/spec/meridian_project.txt): "META closes at exactly $680 -> Yes pays $1.00, No pays $0.00 (at-or-above rule)"
- Verification (2026-10-09): held: Read the local spec. Line 113 has the exact quote with '(at-or-above rule)'. Line 109 and line 261 use 'above' / 'AAPL > $220' labels, and line 436 has 'closes above [STRIKE]'. Line 235 says strikes are rounded to the nearest $10. The probability estimate is the author's own arithmetic, not sourced.

### F4.56 [D1] [A4] [S15] [S17] [S19] CONFIRMED

Pyth prices are fixed-point integers with a shared exponent for price and confidence (actual value = integer x 10^exponent; example AAPL/USD exponent -5, price 12276250, conf 1500 = $122.7625 with a $0.015 interval). An exact tie is therefore an integer equality after bringing strike and price to the same exponent. The confidence interval is meant for 95% coverage, and the docs say protocols may pause activity when the interval is too wide relative to the price.

- Lens: technical
- Source: [Pyth price feeds best practices](https://docs.pyth.network/price-feeds/core/best-practices): "This interval is intended to achieve 95% coverage."
- Verification (2026-10-09): held: Pyth best-practices page: interval 'intended to achieve 95% coverage'; AAPL exponent -5, price 12276250 = $122.7625, conf 1500 = $0.015; protocols can pause new activity if the interval is too wide. The integer-equality tie point is the author's inference from the format.

### F4.65 [A4] [D1] [S15] [S19] CONFIRMED

The Pyth Solana receiver SDK stores price as i64, conf as u64, exponent as i32 and publish_time as i64 in PriceUpdateV2. get_price_no_older_than requires VerificationLevel::Full, a matching feed_id, and publish_time + maximum_age >= the clock.

- Lens: technical
- Source: [pyth_solana_receiver_sdk price_update.rs](https://raw.githubusercontent.com/pyth-network/pyth-crosschain/main/target_chains/solana/pyth_solana_receiver_sdk/src/price_update.rs): "VerificationLevel::Full"
- Verification (2026-10-09): held: Opened price_update.rs on GitHub. Price fields are i64 price, u64 conf, i32 exponent, i64 publish_time. get_price_no_older_than uses VerificationLevel::Full, checks the feed_id, and requires publish_time + maximum_age >= the clock's unix_timestamp. The PriceFeedMessage struct is imported, so the types come from the Price struct it maps into.
