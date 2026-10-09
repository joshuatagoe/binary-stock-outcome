# Research: S1 Learns what a contract pays, with live prices, before connecting a wallet

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 1: Onboarding

### F1.17 [Q7] [D10] [S1] [S3] CONFIRMED

Robinhood's prediction-market page for a Kalshi-powered Nasdaq-100 market labels contracts as 'N or above' (for example '24,920 or above' at 89 cents) and uses that label on the Buy Yes/Buy No panel; the rules text itself is in a linked PDF that was not available.

- Lens: venues
- Source: [Nasdaq-100 price on Feb 24, 2026 at 2pm EST](https://www.robinhood.com/us/en/prediction-markets/financial/events/nasdaq-100-price-on-feb-24-2026-at-2pm-est-feb-23-2026/): "24,920 or above"
- Verification (2026-10-09): held: Opened Robinhood page. Contract list shows '24,920 or above' at 89 cents and a Buy Yes/Buy No panel; event closed. The linked rules PDF and 'Kalshi-powered' attribution were not verified, but the claim itself says the PDF was unavailable.

### F1.18 [Q7] [S1] [S3] CONFIRMED

Kalshi's market API has distinct strike_type values 'greater' and 'greater_or_equal' (also less, less_or_equal, between), and describes floor_strike as the minimum expiration value that leads to a YES settlement.

- Lens: technical
- Source: [Get Market - Kalshi API](https://docs.kalshi.com/api-reference/market/get-market): "Minimum expiration value that leads to a YES settlement"
- Verification (2026-10-09): held: Opened Kalshi Get Market API docs. strike_type enum includes greater, greater_or_equal, less, less_or_equal, between (plus functional, custom, structured); floor_strike 'Minimum expiration value that leads to a YES settlement'.

### F1.19 [Q7] [S1] [S3] SECONDARY

Per a search summary of Kalshi's CFTC filings, Kalshi's convention is 'above' = greater than, 'below' = less than, 'at least' = greater than or equal to, 'unless otherwise specified'. The filing PDFs I opened were compressed and unreadable, so this is not confirmed at source.

- Lens: venues
- Source: [Kalshi product certification template (search result)](https://assets.kalshi.com/regulatory/product-certifications/GPUW.pdf): "<above/below/exactly/at least/ ..."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.20 [Q7] [S1] [S3] SECONDARY

Barchart reported a Kalshi S&P 500 market with threshold 'above 6724.9999' displayed to traders as '6,725 or above' (and a Nasdaq-100 one at 24999.99 shown as '25,000 or above'), a decimal-offset way to make a whole-number level inclusive. The page body did not load when I opened it.

- Lens: venues
- Source: [Markets bet on whether the S&P 500 will be above 6724.9999 on Oct 10, 2025 at 4pm EDT](https://www.barchart.com/story/news/35360152/markets-bet-on-whether-the-sp-500-will-be-above-6724-9999-on-oct-10-2025-at-4pm-edt): "above 6724.9999"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.21 [Q7] [S1] [S3] SECONDARY

Search results report that Polymarket's weekly 'above' stock markets (for example PLTR) resolve Yes only if the Pyth close is higher than the listed price, resolve a tie to No, and use unrounded Pyth closes. The page's rules body did not render when I opened it, so the rule text is unconfirmed; only the Pyth resolution source was visible.

- Lens: venues
- Source: [Will Palantir (PLTR) finish week of August 17 above___?](https://polymarket.com/event/pltr-above-on-august-21-2026): "If the two specified prices are exactly equal, this market will resolve to "No"."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.22 [Q7] [S1] [S3] CONFIRMED

Polymarket's META Up/Down page FAQ says an equal price resolves the market 50-50. The same page names two different sources (Binance candles in the FAQ, Pyth in the resolution field), so its text is internally inconsistent.

- Lens: venues
- Source: [META Daily Up or Down](https://polymarket.com/event/meta-up-or-down-on-october-6-2026): "if equal, the market resolves 50-50"
- Verification (2026-10-09): held: Opened Polymarket META page. FAQ: 'if equal, the market resolves 50-50' and uses Binance META/USDT 1-minute candles. The Rules resolution source is a pythdata.app URL, so Pyth is inferred from the URL rather than named; inconsistency claim is reasonable but that part is an inference.

### F1.23 [D10] [Q40] [Q52] [S1] [S3] CONFIRMED

Kalshi's portfolio help says 'Potential payout is not the same as profit', that displayed position value is not a guaranteed sale amount, that the Predictions portfolio has Open, Pending and Closed filters, that unfilled buy orders are not positions, and that orders may fill completely, partly or not at all.

- Lens: venues
- Source: [Portfolio: Balances and Positions - Kalshi Help](https://help.kalshi.com/en/articles/13823844-portfolio): "Potential payout is not the same as profit"
- Verification (2026-10-09): held: Opened Kalshi portfolio help. All five points present: payout is not profit, value not guaranteed sale amount, Open/Pending/Closed filters, unfilled buy order not a position, orders fill completely/partly/remain unfilled.

### F1.24 [D10] [S1] [S3] SECONDARY

Search results report that Kalshi's sell flow shows the average price and the estimated payout before the trade is confirmed; the ticket labels for buys were not found.

- Lens: venues
- Source: [Quick Order Sale - Kalshi Help](https://help.kalshi.com/trading/selling-positions/quick-order-sale): "average price of those contracts as well as the estimated payout"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.25 [Q40] [Q52] [D10] [S1] [S3] UNCONFIRMED

Polymarket's redemption docs say each winning token returns 1 pUSD and losing tokens return 0, there is no redemption deadline, and one call redeems the wallet's balance for both outcomes.

- Lens: venues
- Source: [Manage Positions - Polymarket Documentation](https://docs.polymarket.com/developers/CTF/redeem): "Each winning token returns 1 pUSD, while losing tokens return 0."
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Polymarket redeem docs. Quote and 'no redemption deadline' confirmed. But 'one call redeems both outcomes' holds only for the TypeScript helper/CTF; the page says Protocol V2 (API and Solidity) uses one call per outcome, so the claim as stated is overbroad/partly contradicted.

### F1.26 [Q40] [Q52] [S1] [S3] SECONDARY

Search results report that Polymarket's activity endpoint records trades, splits, merges, redemptions, rewards, deposits and withdrawals, i.e. a history wider than a trade log; not opened at source.

- Lens: venues
- Source: [Get user activity - Polymarket Documentation](https://docs.polymarket.com/api-reference/core/get-user-activity): "trades, splits, merges, redemptions, rewards, deposits"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.27 [D10] [S1] [S3] SECONDARY

Per search summaries, venues charge fees that change the real max loss and profit: Kalshi's taker fee is round up(0.07 x C x P x (1-P)) with no maker fee, and Polymarket's is C x feeRate x p x (1-p) with makers never charged. The Kalshi fee schedule fetch returned HTTP 429, so neither formula is confirmed at source. The spec says fees, if any, go to a separate account.

- Lens: venues
- Source: [Kalshi fee schedule (search result)](https://kalshi.com/docs/kalshi-fee-schedule.pdf): "fees = round up(0.07 x C x P x (1-P))"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.28 [Q40] [Q52] [S1] [S3] CONFIRMED

NYSE's 2026 calendar closes markets on 10 listed holidays and has 1:00 p.m. ET early closes on Friday 27 November and Thursday 24 December; regular hours are 9:30 a.m. to 4:00 p.m. ET. A fixed 4:00 PM countdown and a fixed daily job schedule do not fit those days.

- Lens: technical
- Source: [NYSE Holidays & Trading Hours](https://www.nyse.com/markets/hours-calendars): "Friday, November 27 (day after Thanksgiving)"
- Verification (2026-10-09): held: Opened NYSE hours and calendars. 10 holidays in 2026, 1:00 p.m. early closes Fri Nov 27 and Thu Dec 24, regular session 9:30-4:00 ET. The inference about fixed countdown/job schedule is the claim author's reasoning.

### F1.38 [Q7] [D10] [S1] [S3] CONFIRMED

The spec itself mixes wording: the headline question and payoff line say 'close above', the token definitions and settlement logic say 'at or above', and its worked example says a close of exactly $680 pays Yes ('at-or-above rule'). Strikes are rounded to $10 while closes are priced to the cent, so a tie is possible but rare.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "META closes at exactly $680  Yes pays $1.00, No pays $0.00 (at-or-above rule)"
- Verification (2026-10-09): held: Read the local spec. Headline example and payoff line say 'close above'; Yes token and settlement logic say 'at or above'/>=; worked example: 'META closes at exactly $680 Yes pays $1.00 (at-or-above rule)'; strikes rounded to nearest $10. Cent pricing of closes is general knowledge, not in the spec text.

### F1.39 [Q40] [Q52] [D10] [S1] [S3] [S2] CONFIRMED

Gaps in the spec's own text: the five-page list has no admin or market-maker page though the contract has Add Strike, Pause and Admin Settle and a market-maker dashboard story; the countdown is to 4:00 PM while settlement is about 4:05 PM; tokens 'can only be destroyed via the redeem function' yet Sell No says Yes+No is redeemable for $1.00 before settlement; the Buy No limit order leaves the user holding both tokens, which the position constraint otherwise forbids; the payoff sentence is given only for Yes; and the spec requires a risks and limitations note with no page for it.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Tokens can only be destroyed via the redeem function"
- Verification (2026-10-09): held: Read the local spec. Verified: five pages (Landing, Markets, Trade, Portfolio, History) with no admin page; Add Strike/Pause/Admin Settle exist; countdown to 4:00 PM vs settlement ~4:05 PM; 'Tokens can only be destroyed via the redeem function' vs Sell No holding Yes+No redeemable for $1.00; payoff sentence only for Yes; risks/limitations note required (line 91) with no page. The market-maker dashboard story and the Buy No limit-order detail were not individually checked.

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

### F7.17 [Q49] [Q51] [S22] [S1] [S25] CONFIRMED

Polymarket's geoblock docs list fully blocked OFAC-sanctioned regions (Iran, Syria, Cuba, North Korea, Crimea/Donetsk/Luhansk) where no new orders and no closing are possible, a longer 'close-only' list including the United States and United Kingdom, and an endpoint that checks the requesting IP's eligibility. The docs list North Korea in both groups.

- Lens: legal
- Source: [Polymarket Docs: Geoblock](https://docs.polymarket.com/api-reference/geoblock): "It checks the geographic eligibility of the requesting IP address."
- Verification (2026-10-09): held: Opened Polymarket geoblock docs (primary). Fully blocked: IR, SY, CU, KP, Crimea/Donetsk/Luhansk. Close-only list includes US and UK and North Korea (appears in both). Endpoint checks eligibility of requesting IP; exact quoted sentence differs slightly ('Check the geographic eligibility of the requesting IP address:'), substance matches.

### F7.18 [Q49] [Q51] [S22] [S1] [S25] CONFIRMED

Polymarket's terms page shows a banner stating trading is blocked in the United States on polymarket.com and points US users to polymarket.us. The terms body (eligibility, KYC) was not displayed in my fetch.

- Lens: legal
- Source: [Polymarket Terms of Use (header)](https://polymarket.com/tos): "Trading is blocked in the United States on polymarket.com."
- Verification (2026-10-09): held: Opened polymarket.com/tos. Banner 'Trading is blocked in the United States on polymarket.com' and redirect to polymarket.us present. Terms body not seen, as the claim says.

### F7.22 [Q49] [Q50] [S22] [S1] [S3] [S9] CONFIRMED

Pyth's published plans: Free is view-only in the Pyth Terminal with no API access and no redistribution rights; Starter ($500/month) has display rights, no redistribution, crypto symbols only; Pro (from $2,500/month) lists equities, display and non-display rights and limited redistribution rights. The page does not mention delayed data or non-professional status.

- Lens: legal
- Source: [Pyth plans](https://app.pyth.com/plans): "Pro ... Display and non-display rights ... Limited redistribution rights"
- Verification (2026-10-09): held: Opened app.pyth.com/plans (primary). Free: view-only Terminal, no API, no redistribution. Starter $500/mo: display rights, no redistribution, crypto symbols. Pro from $2,500/mo: equities, display and non-display, limited redistribution. No mention of delayed data or non-professional status.

### F7.23 [Q49] [Q50] [S22] [S1] [S3] [S9] CONFIRMED

Pyth is an approved external distributor of Nasdaq Basic; any client who wants Pyth as its Nasdaq Basic provider needs prior written approval from Nasdaq and licenses directly with Nasdaq.

- Lens: legal
- Source: [Pyth External Distributor of Nasdaq Basic](https://www.pyth.network/blog/pyth-external-distributor-of-nasdaq-basic): "must have prior, written approval from Nasdaq before consuming the feed"
- Verification (2026-10-09): held: Opened Pyth blog post (Pyth's own announcement of a Nasdaq arrangement). Pyth approved as external distributor of Nasdaq Basic; clients need prior written approval from Nasdaq and may license directly with Nasdaq.

### F7.25 [Q50] [S1] [S3] [S9] CONFIRMED

Pyth's website terms say nothing in them grants any title, licence or right to use or reproduce price feed data (including asset prices, confidence intervals, metadata); the licence is for the site, for private non-commercial informational purposes; scraping or unauthorised API access and bypassing rate limits are prohibited; content is 'as is' and not financial advice. These are website terms; the Hermes/Core API terms were not found.

- Lens: legal
- Source: [Pyth Network Terms of Use](https://www.pyth.network/legal/terms-conditions): "price feed data (including asset prices, confidence intervals, or related metadata)"
- Verification (2026-10-09): held: Opened pyth.network/legal/terms-conditions (primary). No title/licence/right in price feed data; narrow licence for private non-commercial informational use; scraping, unauthorised API access and rate-limit bypass prohibited; as-is and not financial advice. Fetch summary did not reproduce the parenthetical 'confidence intervals, or related metadata' wording verbatim, but the substance matches.

### F7.26 [Q50] [S1] [S3] [S9] CONFIRMED

Pyth's docs state 'Hermes now requires an API Key', and that Pyth Core feed IDs differ from Pyth Pro feed IDs. The Core price-feed page lists equity index feeds (e.g. Equity.Index.SPY/USD) but my fetch did not confirm single-stock feeds such as AAPL. US equities feeds are available in regular, pre-, post- and overnight sessions.

- Lens: legal
- Source: [Pyth docs: Price feed IDs](https://docs.pyth.network/price-feeds/core/price-feeds/price-feed-ids): "Hermes now requires an API Key."
- Source: [Pyth docs: Market hours](https://docs.pyth.network/price-feeds/core/market-hours): "Weekdays, 9:30 AM to 4:00 PM ET"
- Verification (2026-10-09): held: Opened Pyth docs price-feed-ids: 'Hermes now requires an API Key' present, Core IDs differ from Pro IDs, Equity.Index.SPY/USD listed, AAPL not seen. Market-hours page lists regular, pre, post, and overnight sessions; its regular-hours wording is 'Every weekday from 9.30AM ET to 4PM ET' rather than the quoted string, but the content matches.

### F7.27 [Q50] [S1] [S3] [S9] SECONDARY

Search results for Nasdaq's Display Requirements Policy say distributors of delayed data must show a Prominent Delay Message, and Nasdaq Basic products need a Prominent Attribution Message; Nasdaq has a Digital Media License for Nasdaq Basic display to the general investing public. The policy page and the SEC filing could not be read (timeout and unparseable PDF), so exact terms, including whether delayed display needs an agreement or a fee, are unconfirmed.

- Lens: legal
- Source: [Nasdaq Display Requirements Policy (search result)](https://www.nasdaq.com/content/AdministrationSupport/Policy/DisplayRequirementsPolicy): "Prominent Delay Message on all Delayed Data Products"
- Source: [SEC filing SR-NASDAQ-2020-080 (search result)](https://www.sec.gov/files/rules/sro/nasdaq/2020/34-90616.pdf): "monthly media enterprise license"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.28 [Q50] [S1] [S3] [S9] SECONDARY

Pyth announced (2 April 2026) that Polymarket uses Pyth as resolution source for daily markets on more than a dozen single-name US equities, and a separate report says it is Pyth Pro data over WebSocket. These show a commercial precedent for Pyth Pro-sourced single-stock event markets; neither source describes licence terms. Business Wire returned 403 to my fetch.

- Lens: legal
- Source: [Pyth press release on Polymarket integration (search result)](https://www.businesswire.com/news/home/20260402971400/en): "more than a dozen single-name U.S. equities"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.29 [Q50] [S1] [S3] [S9] CONFIRMED

The spec asks for 'live prices' on the landing and markets pages and 'real-time price display from oracle' in frontend tests, and a Yes/No price display from the project's own order book is an alternative that does not itself redistribute exchange quotes.

- Lens: legal
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Markets -- Grid of 7 stocks with live prices and active contract counts"
- Verification (2026-10-09): held: Opened the local spec file via grep. Line 419 'Markets -- Grid of 7 stocks with live prices and active contract counts', line 418 landing 'live prices', line 473 'Real-time price display from oracle'. The alternative about Yes/No display from the own order book is the author's inference, not spec text.

### F7.32 [Q50] [S1] [S3] [S9] UNCONFIRMED

Pyth Pro marketing says it offers licensing 'designed for downstream systems to consume, process, and display data to end users'. This is marketing language, not contract text, and conflicts in emphasis with the Site terms in F7.25, so display rights for a free public app remain unconfirmed.

- Lens: legal
- Source: [Pyth blog: Built for the next 50 billion market data users](https://www.pyth.network/blog/built-for-the-next-50-billion-market-data-users): "rights designed for downstream systems to consume, process, and display data to end users"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F7.33 [Q51] [S1] [S25] CONFIRMED

Treasury delisted Tornado Cash in March 2025 in light of the Van Loon filing, citing novel legal and policy issues in sanctioning on-chain activity. It shows sanctions policy toward permissionless smart contracts is unsettled; the press release does not mention immutable smart contracts or the Fifth Circuit.

- Lens: legal
- Source: [Treasury press release on Tornado Cash delisting](https://home.treasury.gov/news/press-releases/sb0057): "novel legal and policy issues raised by use of financial sanctions against financial and commercial activity"
- Verification (2026-10-09): held: Opened Treasury sb0057 (primary), dated 21 March 2025. Tornado Cash delisted per Van Loon filing, quote about novel legal and policy issues present; no mention of immutable smart contracts or Fifth Circuit, as the claim says.

### F7.34 [Q51] [S1] [S25] CONFIRMED

Chainalysis Address Screening is offered as a product via demo request with API integration; the page does not state chain coverage, Solana support, or a free tier. Wallet screening therefore carries a vendor cost and integration effort.

- Lens: legal
- Source: [Chainalysis Address Screening](https://www.chainalysis.com/free-cryptocurrency-sanctions-screening-tools/): "integrated via high-reliability, low-latency APIs for real-time screening"
- Verification (2026-10-09): held: Opened Chainalysis page (vendor's own site). 'Request a demo' buttons, APIs for real-time screening, no chain list, no Solana mention, no free tier stated ('network agnostic' wording only). Vendor cost inference is the author's.

### F7.35 [Q51] [S1] [S25] SECONDARY

Search coverage reports Polymarket's restricted-region list has grown in 2026 (30+ countries) with two tiers (fully blocked vs close-only); counts vary by report and are secondary to the official page in F7.17.

- Lens: legal
- Source: [Portugal Orders Polymarket Shutdown, but Platform Remains Active](https://finance.yahoo.com/news/portugal-orders-polymarket-shutdown-platform-150142393.html): "restrictions in over 30 countries (search-result summary)"
- Verification (2026-10-09): not rechecked (SECONDARY)
