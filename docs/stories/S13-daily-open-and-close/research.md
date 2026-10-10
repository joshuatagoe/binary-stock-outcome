# Research: S13 Opens minting at 9:00 and trading at 9:30, and stops trading at 4:00

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 3: Daily cycle

### F3.01 [D12] [Q14] [D7] [S12] [S13] CONFIRMED

NYSE's official hours-and-calendars page lists full-day holidays and early closes for 2026 to 2028. 2026 holidays: Jan 1, Jan 19, Feb 16, Apr 3, May 25, Jun 19, Jul 3 (observed), Sep 7, Nov 26, Dec 25. 2027: Jan 1, Jan 18, Feb 15, Mar 26, May 31, Jun 18 (observed), Jul 5 (observed), Sep 6, Nov 25, Dec 24 (observed). Early closes at 1:00 PM ET (1:15 PM for eligible options): Nov 27 2026, Dec 24 2026, Nov 26 2027. No New Year's holiday is observed for Saturday Jan 1 2028.

- Lens: venues
- Source: [NYSE Holidays and Trading Hours](https://www.nyse.com/markets/hours-calendars): "Each market will close early at 1:00 p.m. (1:15 p.m. for eligible options) on Friday, November 27, 2026, Friday, November 26, 2027, and Friday, November 24, 2028"
- Verification (2026-10-09): held: Opened nyse.com hours-calendars. 2026 and 2027 holidays match the list exactly. Early closes Nov 27 2026, Dec 24 2026, Nov 26 2027 appear, with the 1:00 pm (1:15 pm options) wording. Page says no New Year's holiday is observed for Sat Jan 1 2028.

### F3.02 [D12] [Q14] [D7] [D29] [Q34] [S12] [S13] CONFIRMED

Pyth's Hermes feed metadata (no API key needed) gives each Core equity feed a schedule string with regular hours only (09:30 to 16:00, Mon to Fri) plus holiday overrides and 13:00 early closes. The window it carries is rolling: it ends at 07-05 (2027) and has no Sep 6, Nov 25, Nov 26 or Dec 24 2027 entries yet. The same response has live market_hours fields (is_open, next_open, next_close).

- Lens: technical
- Source: [Hermes price_feeds metadata for NVDA](https://hermes.pyth.network/v2/price_feeds?query=NVDA&asset_type=equity): "America/New_York;0930-1600,0930-1600,0930-1600,0930-1600,0930-1600,C,C;0907/C,1126/C,1127/0930-1300,1224/0930-1300,1225/C,0101/C,0118/C,0215/C,0326/C,0531/C,0618/C,0705/C"
- Verification (2026-10-09): held: Opened Hermes price_feeds NVDA. Schedule string is America/New_York;0930-1600 x5,C,C; then 0907/C,1126/C,1127/0930-1300,1224/0930-1300,1225/C,0101/C,0118/C,0215/C,0326/C,0531/C,0618/C,0705/C. It ends at 0705 with no Sep 6, Nov 25, Nov 26 or Dec 24 2027 entries. market_hours has is_open, next_open, next_close. No key was needed for this endpoint.

### F3.03 [D7] [D12] [D29] [Q34] [Q42] [S12] [S13] CONFIRMED

Hermes price endpoints now require a Pyth API key: my unauthenticated requests to the latest-price and price-at-timestamp endpoints returned HTTP 401, while the feed-metadata endpoint answered without a key. Pyth's docs say the key requirement started 2026-08-26 and mention 'a free trial is included, paid plans cover ongoing use', so the oracle read has a cost and a credential to manage.

- Lens: technical
- Source: [Pyth Core quick start](https://docs.pyth.network/llms-price-feeds-core.txt): "Since August 26, 2026, every hermes.pyth.network request requires a Pyth API Key."
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "a free trial is included, paid plans cover ongoing use"
- Verification (2026-10-09): held: Opened the Core llms txt: 'Since August 26, 2026, every hermes.pyth.network request requires a Pyth API Key.' The upgrade/preparing page says 'Required for everyone who calls Hermes... a free trial is included, paid plans cover ongoing use'. The doc claims are confirmed. I did not retest the unauthenticated 401s, but the metadata endpoint answering without a key was observed in my fetch.

### F3.05 [D12] [Q14] [S12] [S13] SECONDARY

Unscheduled NYSE closures have happened (September 11, 2001: four sessions; Hurricane Sandy, October 2012: two days; July 8, 2015: technical halt mid-day). No pre-published calendar lists these, so a static calendar needs a live check. I did not find a primary source on notice periods.

- Lens: venues
- Source: [New York Stock Exchange (Wikipedia)](https://en.wikipedia.org/wiki/New_York_Stock_Exchange): "Closed for four trading sessions, resuming September 17."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F3.06 [D7] [Q34] [Q14] [S12] [S13] CONFIRMED

Pyth's best-practices page says its equity feeds follow traditional market hours and that outside those hours an equity's price is unclear, so the feed may give no current price. It also says SDKs reject a price if too much time has passed since the last update, and that integrators should pause when updates stall.

- Lens: technical
- Source: [Pyth best practices](https://docs.pyth.network/price-feeds/core/best-practices): "US equity markets only trade during certain hours, and outside those hours, it's not clear what an equity's price is."
- Verification (2026-10-09): held: Opened Pyth best-practices. It has the quote 'US equity markets only trade during certain hours, and outside those hours, it's not clear what an equity's price is.' It also says the SDK query fails if too much time has elapsed since the last update, and says to pause new position openings or use conservative pricing when updates stall.

### F3.07 [Q34] [D7] [S12] [S13] [S14] CONFIRMED

Pyth Pro (subscription, API token needed) exposes a marketSession field with values regular, preMarket, postMarket, overNight and closed, plus a historical price-at-timestamp endpoint. So a pre-market price is available from Pro. Core's listing shows regular session only (F3.02), so whether Core can serve a pre-market price on Solana is unconfirmed.

- Lens: technical
- Source: [Pyth Pro (llms text)](https://docs.pyth.network/llms-price-feeds-pro.txt): "Use the marketSession field to filter updates for equities that have limited trading hours."
- Verification (2026-10-09): held: Opened the Pyth Pro llms txt. marketSession values are regular, preMarket, postMarket, overNight, closed, with the exact quoted sentence. It has historical price endpoints (POST /v1/price, History API GET /{channel}/price, MCP get_historical_price) and a Pro API token is required for the authenticated ones. The claim's wording on the Core limitation rests on F3.02.

### F3.23 [D29] [S12] [S13] SECONDARY

US DST starts on the second Sunday in March and ends on the first Sunday in November, at 2 a.m. local time: 2026 starts March 8 and ends November 1; 2027 starts March 14 and ends November 7. These are weekend changes, when US equity markets are closed.

- Lens: technical
- Source: [Daylight saving time in the United States (Wikipedia)](https://en.wikipedia.org/wiki/Daylight_saving_time_in_the_United_States): "daylight saving time starts on the second Sunday in March and ends on the first Sunday in November"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F3.27 [D7] [Q8] [S13] [S12] UNCONFIRMED

Polymarket's daily AAPL and META 'Up or Down' stock pages show Market Opened 8:00 AM ET on the prior day and list a Pyth Equity.US.<TICKER>/USD page as the resolution source. The same pages' FAQ text names Binance 1-minute candles and compares noon ET with noon ET, which contradicts the Rules field, so I cannot rely on how they define the reference price.

- Lens: venues
- Source: [AAPL Up or Down on October 8, 2026 (Polymarket)](https://polymarket.com/event/aapl-up-or-down-on-october-8-2026): "Resolution Source: https://pythdata.app/explore/Equity.US.AAPL%2FUSD"
- Source: [META Up or Down on October 6, 2026 (Polymarket)](https://polymarket.com/event/meta-up-or-down-on-october-6-2026): "Market Opened: Oct 5, 2026, 8:00 AM ET"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F3.28 [Q14] [S13] SECONDARY

A search summary says Polymarket's NYA and Hang Seng markets treat early-close days as normal sessions, using the official close of the shortened session; and that its S&P 500 open market falls back to the last valid on-exchange trade if there is no official close. I did not open these rules myself.

- Lens: venues
- Source: [NYA Up or Down on October 8, 2026 (Polymarket)](https://polymarket.com/event/nya-up-or-down-on-october-8-2026): "Market Opened: Oct 7, 2026, 8:00 AM ET"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F3.32 [D7] [Q14] [S13] UNCONFIRMED

Inference, not directly confirmed: Core equity feeds publish only in the 09:30 to 16:00 session (13:00 close on early-close days; F3.02), and Pyth SDKs reject prices whose last update is too old (F3.06). A settlement read at 4:05 PM (or 1:05 PM) against a 5-minute staleness rule would see a price last updated at the close, so the staleness test must be measured from the close time, not from 'now'. I did not test an actual on-chain read.

- Lens: technical
- Source: [Pyth best practices](https://docs.pyth.network/price-feeds/core/best-practices): "Querying the current price will fail if too much time has elapsed since the last update."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

## 2026-10-10 architecture check for section 4: the chain's clock and closing publish times (main session, read-only)

### AR.10 [D37] [D57] [S13] [S15] CONFIRMED (measurements; 1-second resolution)

**The chain's clock.** On 2026-10-10 between 14:30 and 15:00 UTC, `getBlockTime` was read for a just-confirmed slot 10 times, 3 seconds apart, and compared with the local clock:

- devnet's block time was 1.5 to 2.4 s behind (median 2.0 s);
- mainnet's was 1.7 to 2.8 s behind (median 2.1 s).

The local clock was 0.9 s ahead of the `Date` header from google.com, and that header has 1-second resolution. So devnet's clock ran roughly 1 to 2 seconds behind real time. Part of the gap is the time between a block being produced and its slot being reported as confirmed.

**Closing publish times.** Of the 25 closing prices in AR.04, 23 were published at exactly 16:00:00, 1 at 27 seconds before, and 1 at 300 seconds before.
