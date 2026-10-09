# Research: S12 Reads the previous close at 8:00, computes strikes and creates every market by 8:30

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

### F3.04 [D12] [S12] CONFIRMED

The exchange_calendars library says its calendars are maintained by user contributions. I could not confirm what it holds for 2026 or 2027, or how it handles ad hoc closures.

- Lens: technical
- Source: [exchange_calendars (GitHub)](https://github.com/gerrymanoim/exchange_calendars): "All of the exchange calendars are maintained by user contributions."
- Verification (2026-10-09): held: Opened the exchange_calendars GitHub README. FAQ says 'All of the exchange calendars are maintained by user contributions.' The rest of the claim is an admitted non-finding.

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

### F3.08 [D6] [Q8] [Q9] [Q32] [Q34] [Q35] [S12] [S14] CONFIRMED

Pyth Terminal feed pages (Pyth Pro-style numbered feeds) show 24/5 coverage in America/New_York: pre-market 04:00 to 09:30, regular 09:30 to 16:00, post-market 16:00 to 20:00, plus overnight. Prices use exponent -5 (an integer mantissa). On 2026-10-09 around 15:47 ET the displayed prices (intraday, not closes) were AAPL 337.09, MSFT 535.59, GOOGL 351.26, AMZN 261.92, NVDA 229.83, META 719.56 and TSLA 384.11, with 24-hour changes of -0.97%, +2.47%, +0.86%, +3.11%, -0.30%, -0.16% and +2.44%.

- Lens: technical
- Source: [Pyth Terminal: META/USD](https://app.pyth.com/explore/Equity.US.META%2FUSD): "Coverage is 24/5 in the America/New_York time zone. Sessions are pre-market (Mon-Fri 04:00-09:30)"
- Source: [Pyth Terminal: AAPL/USD](https://app.pyth.com/explore/Equity.US.AAPL%2FUSD): "Price: 337.09000 USD"
- Verification (2026-10-09): held: Opened the Pyth Terminal META page: 24/5 America/New_York, pre-market 04:00-09:30, regular 09:30-16:00, post-market 16:00-20:00, overnight, exponent -5, price 719.555 (rounds to 719.56), -0.16%. AAPL page: 337.09, -0.97%. MSFT page: 535.59, +2.47%, timestamped 15:47 UTC-4. I did not open GOOGL, AMZN, NVDA or TSLA pages, so those four values are unchecked.

### F3.09 [Q35] [S12] CONFIRMED

Alphabet's two share classes are separate Pyth feeds with different IDs. GOOGL (Class A): 5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6. GOOG (Class C): e65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2. Each feed has its own description.

- Lens: technical
- Source: [Hermes price_feeds metadata for GOOG/GOOGL](https://hermes.pyth.network/v2/price_feeds?query=GOOG&asset_type=equity): "ALPHABET INC CLASS A / US DOLLAR"
- Verification (2026-10-09): held: Opened Hermes metadata for GOOG. GOOG id e65ff435...cf3f2 is 'ALPHABET INC CLASS C / US DOLLAR'. GOOGL id 5a48c03e...d5aa6 is 'ALPHABET INC CLASS A / US DOLLAR'. The same response also lists a third feed, 'PYTH PRICE IN USD FOR GOOGL 24/7' (id ad519718...), which the finding does not mention. Pick the right GOOGL id.

### F3.10 [Q35] [S12] SECONDARY

Pyth's Core quick-start does not describe stock-split handling. A Polymarket stock rule reportedly says split-adjusted prices as displayed on Pyth are used if a split happens (from a search snippet, not opened). As of early 2026, Nvidia, Alphabet, Apple, Amazon and Tesla had split in the past, Microsoft's last was 2003 and Meta has never split; articles speculated about both in 2026. I found no announced split for any of the seven as of today.

- Lens: venues
- Source: [These 2 Magnificent Seven Stocks May Announce Stock Splits in 2026](https://finance.yahoo.com/news/2-magnificent-seven-stocks-may-162000016.html): "These 2 "Magnificent Seven" Stocks May Announce Stock Splits in 2026"
- Source: [Pyth Core quick start](https://docs.pyth.network/llms-price-feeds-core.txt): "Prices become stale if not recently updated or outside market hours."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F3.11 [Q10] [S12] CONFIRMED

Rent-exempt minimum on Solana is (account size + 128) x 3,480 lamports per byte-year x 2 years, that is 6,960 lamports per byte, and refundable when the account is closed.

- Lens: technical
- Source: [Solana accounts](https://solana.com/docs/core/accounts): "(account_size + 128) * 3,480 lamports/byte-year * 2 years"
- Verification (2026-10-09): held: Opened solana.com/docs/core/accounts. It has the formula '(account_size + 128) * 3,480 lamports/byte-year * 2 years' and calls the balance refundable. The 6,960 lamports per byte figure is arithmetic from the formula. The page does not describe the close steps.

### F3.12 [Q10] [S12] CONFIRMED

A standard associated token account is 165 bytes with a base storage cost of about 0.00203928 SOL. The payer that funds it can differ from the fee payer and from the wallet that owns it.

- Lens: technical
- Source: [Create a token account](https://solana.com/docs/tokens/basics/create-token-account): "The payer passed to the create instruction funds the storage balance and must sign."
- Verification (2026-10-09): held: Opened the create-token-account page. It gives 165 bytes for the original program ATA, 2,039,280 lamports (0.00203928 SOL), and says the payer funds the storage and must sign, and can differ from the fee payer and the owner.

### F3.13 [Q10] [Q33] [S12] [S14] CONFIRMED

The original Solana Token program cannot close mint accounts, so their rent stays locked. Token-2022 can close mints if the MintCloseAuthority extension is set before the mint is initialized.

- Lens: technical
- Source: [Token-2022 extensions](https://www.solana-program.com/docs/token-2022/extensions): "The Token program allows owners to close token accounts, but it is impossible to close mint accounts."
- Verification (2026-10-09): held: Opened the Token-2022 extensions page. It says it is impossible to close mint accounts under the Token program. It says MintCloseAuthority must be initialized before the mint is initialized. It adds that the supply must be 0 to close, which the finding omits.

### F3.14 [Q10] [Q42] [S12] CONFIRMED

The base fee is 5,000 lamports per signature (half burned, half to the validator). Default compute limit is 200,000 per instruction and the maximum is 1,400,000 per transaction.

- Lens: technical
- Source: [Solana fees](https://solana.com/docs/core/fees): "a base fee of 5,000 lamports per signature"
- Verification (2026-10-09): held: Opened solana.com/docs/core/fees. It has 5,000 lamports per signature, 50% burned and 50% to the validator, default 200,000 CU per instruction, max 1,400,000 CU per transaction.

### F3.15 [Q10] [D29] [S12] CONFIRMED

Manifest's own README compares CLOBs: creation rent OpenBook 2 SOL, Phoenix 3+ SOL, Manifest .007 SOL; crankless: No / Yes / Yes. These are Manifest's claims about competitors and I did not verify them in the other projects' docs. The Phoenix README separately says Phoenix 'operates without a crank'.

- Lens: venues
- Source: [Manifest (GitHub)](https://github.com/CKS-Systems/manifest): "Creation Rent: 2 SOL / 3+ SOL / .007 SOL"
- Source: [Phoenix v1 README](https://github.com/Ellipsis-Labs/phoenix-v1/blob/master/README.md): "an on-chain orderbook that operates without a crank"
- Verification (2026-10-09): held: Opened the Manifest README. The table has Creation Rent 2 SOL / 3+ SOL / .007 SOL and Crankless No / Yes / Yes for OpenBook / Phoenix / Manifest. The Phoenix v1 README says 'Phoenix Legacy is an on-chain orderbook that operates without a crank.' The finding already marks the competitor figures as Manifest's own claims.

### F3.16 [Q10] [D29] [S12] CONFIRMED

The official Solana devnet faucet allows a maximum of 2 requests every 8 hours (signing in with GitHub is said to raise the limit; the page does not give the figure). Large per-day rent is therefore not fundable from the faucet alone.

- Lens: technical
- Source: [Solana Faucet](https://faucet.solana.com/): "Maximum of 2 requests every 8 hours."
- Verification (2026-10-09): held: Opened faucet.solana.com: 'Maximum of 2 requests every 8 hours', and GitHub sign-in unlocks a higher airdrop limit with no figure given.

### F3.17 [Q42] [Q10] [S12] CONFIRMED

Public devnet RPC limits per IP: 100 requests per 10 seconds in total, 40 per 10 seconds for a single method, 40 concurrent connections, 40 new connections per 10 seconds, 100 MB per 30 seconds. They are 'subject to change'.

- Lens: technical
- Source: [Solana clusters](https://solana.com/docs/references/clusters): "Public endpoint rate limits are subject to change."
- Verification (2026-10-09): held: Opened solana.com/docs/references/clusters. Devnet per-IP limits: 100 requests per 10s, 40 per 10s for a single RPC, 40 concurrent connections, 40 connection rate per 10s, 100 MB per 30s. The page also says 'Public endpoint rate limits are subject to change.'

### F3.18 [Q42] [S12] CONFIRMED

A Solana blockhash lasts 150 blocks (about 1 minute 19 seconds). Before re-signing a dropped transaction, check that its blockhash has expired (lastValidBlockHeight versus current block height). Otherwise both transactions could be accepted. Common retry approaches are constant-interval resubmission and exponential backoff.

- Lens: technical
- Source: [Retrying transactions](https://solana.com/developers/guides/advanced/retry): "150 blocks or ~1 minute 19 seconds as of the time of this writing"
- Verification (2026-10-09): held: Opened the Solana retry guide. It has 150 blocks / ~1 min 19 s, the lastValidBlockHeight versus current block height check before re-signing, the warning that both transactions could land, and constant-interval and exponential-backoff retry approaches.

### F3.19 [Q42] [S12] CONFIRMED

AWS recommends jittered exponential backoff as a standard approach for remote clients. Full Jitter does less work but takes slightly longer; Decorrelated Jitter is the alternative; Equal Jitter performed worst of the jittered variants.

- Lens: technical
- Source: [Exponential Backoff And Jitter (AWS Architecture Blog)](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/): "it should be considered a standard approach for remote clients"
- Verification (2026-10-09): held: Opened the AWS Architecture Blog post. It has 'it should be considered a standard approach for remote clients'. Full Jitter makes the fewest calls and takes slightly longer than Decorrelated. Equal Jitter takes much longer and performed worst of the three jitter variants. Decorrelated makes more calls but finishes slightly sooner.

### F3.20 [Q42] [S12] CONFIRMED

A Solana transaction is at most 1,232 bytes and can reference 64 accounts, so creating the mints, vault, market state and order book in one transaction may not fit.

- Lens: technical
- Source: [Solana transactions](https://solana.com/docs/core/transactions): "1,232 bytes maximum."
- Verification (2026-10-09): held: Opened solana.com/docs/core/transactions. It has '1,232 bytes maximum' and up to 64 referenced accounts. It also says a v1 format raises the size to 4,096 bytes, which is relevant context the finding omits.

### F3.21 [D29] [S12] CONFIRMED

Node scheduling libraries handle DST predictably when given an IANA time zone. croner: 'Jobs scheduled during DST gaps are skipped'; overlaps run once at first occurrence. node-cron: gap times are skipped (a 02:30 America/New_York job misses the spring-forward day); repeated times run once; it advises avoiding daily jobs in the 1 to 3 AM window on transition days. A fixed UTC offset ignores DST.

- Lens: technical
- Source: [croner (GitHub)](https://github.com/Hexagon/croner): "Jobs scheduled during DST gaps are skipped."
- Source: [node-cron: Timezones and DST](https://nodecron.com/timezones-and-dst): "skips them rather than guessing an adjacent time"
- Verification (2026-10-09): held: Opened croner README: 'Jobs scheduled during DST gaps are skipped; jobs in DST overlaps run once at first occurrence.' Opened nodecron.com/timezones-and-dst: it skips gap times rather than guessing, fires on the first occurrence of repeated times, and a 02:30 America/New_York daily job is skipped on spring-forward day. The page does NOT advise avoiding 1-3 AM daily jobs; the finding's 'it advises' clause is unsupported and should be dropped. It does suggest a fixed-offset zone such as Etc/UTC to avoid DST effects.

### F3.22 [D29] [S12] CONFIRMED

GitHub Actions scheduled workflows can use a timezone, but may be delayed under high load, have a 5-minute minimum interval, and are disabled after 60 days of repository inactivity in public repos. That is a weak fit for a settlement job with a 10-minute target.

- Lens: technical
- Source: [GitHub Actions: schedule event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule): "can be delayed during periods of high loads of GitHub Actions workflow runs"
- Verification (2026-10-09): held: Opened the GitHub Actions events page. Scheduled workflows can be delayed during periods of high load, the shortest interval is once every 5 minutes, an IANA timezone string is supported, and scheduled workflows are disabled after 60 days without repository activity (public repos). The 'weak fit' judgment is the author's inference.

### F3.23 [D29] [S12] [S13] SECONDARY

US DST starts on the second Sunday in March and ends on the first Sunday in November, at 2 a.m. local time: 2026 starts March 8 and ends November 1; 2027 starts March 14 and ends November 7. These are weekend changes, when US equity markets are closed.

- Lens: technical
- Source: [Daylight saving time in the United States (Wikipedia)](https://en.wikipedia.org/wiki/Daylight_saving_time_in_the_United_States): "daylight saving time starts on the second Sunday in March and ends on the first Sunday in November"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F3.24 [Q32] [D6] [S12] CONFIRMED

Rounding conventions differ by language. JavaScript Math.round sends an exact .5 toward +infinity (so -5.5 gives -5). Rust f64::round sends halves away from zero. Rust f64::round_ties_even sends halves to the even neighbour (3.5 and 4.5 both give 4 and 4.0). For positive prices, JavaScript Math.round and Rust round both behave as half-up.

- Lens: technical
- Source: [Math.round (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round): "If the fractional portion is exactly 0.5, the argument is rounded to the next integer in the direction of +∞."
- Source: [f64 (Rust std)](https://doc.rust-lang.org/std/primitive.f64.html#method.round): "If a value is half-way between two integers, round away from 0.0."
- Verification (2026-10-09): held: Opened MDN Math.round: exactly 0.5 rounds toward +infinity, and Math.round(-5.5) gives -5. Opened Rust f64 docs: round sends halves away from 0.0 (3.5 gives 4.0, 4.5 gives 5.0). round_ties_even gives 4.0 for both 3.5 and 4.5.

### F3.25 [Q9] [Q33] [D6] [S12] [S14] CONFIRMED

Kalshi lets traders request additional strikes on a market (an options icon, then a Request Additional Strikes tab). Its markets team reviews each request and adds the strike promptly if appropriate. Staff, not traders, add the strikes.

- Lens: venues
- Source: [Request Additional Strikes (Kalshi Help)](https://help.kalshi.com/en/articles/13823834-request-additional-strikes): "Our markets team will thoroughly review each request"
- Verification (2026-10-09): held: Opened the Kalshi help article. Users click the options icon, then the Request Additional Strikes tab. The markets team thoroughly reviews each request and adds the strike if appropriate. The page text I got did not use the word 'promptly'.

### F3.27 [D7] [Q8] [S13] [S12] UNCONFIRMED

Polymarket's daily AAPL and META 'Up or Down' stock pages show Market Opened 8:00 AM ET on the prior day and list a Pyth Equity.US.<TICKER>/USD page as the resolution source. The same pages' FAQ text names Binance 1-minute candles and compares noon ET with noon ET, which contradicts the Rules field, so I cannot rely on how they define the reference price.

- Lens: venues
- Source: [AAPL Up or Down on October 8, 2026 (Polymarket)](https://polymarket.com/event/aapl-up-or-down-on-october-8-2026): "Resolution Source: https://pythdata.app/explore/Equity.US.AAPL%2FUSD"
- Source: [META Up or Down on October 6, 2026 (Polymarket)](https://polymarket.com/event/meta-up-or-down-on-october-6-2026): "Market Opened: Oct 5, 2026, 8:00 AM ET"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F3.29 [Q8] [S12] CONFIRMED

Cboe's 0DTE page states that as expiration approaches, options near the money are extremely sensitive to moves in the underlying. That is qualitative support for attention at the money. The page gives no strike-distance volume statistics.

- Lens: venues
- Source: [Cboe 0DTE options](https://www.cboe.com/tradable-products/0dte): "options near the money are extremely sensitive to movements in the underlying index"
- Verification (2026-10-09): held: Opened the Cboe 0DTE page. It says 'As expiration approaches, options near the money are extremely sensitive to movements in the underlying index'. No strike-distance volume statistics appear. It reports only overall shares (59% of SPX volume, 48% of XSP).

### F3.30 [Q9] [S12] SECONDARY

Nadex binaries (2015 announcements) were listed with one at-the-money strike and a fixed number of strikes above and below, at a fixed interval per instrument, with narrower spacing at some times of day. This is an older, search-snippet source.

- Lens: venues
- Source: [Nadex Announces Additional Strikes To Its Five-Minute Binary Contracts](https://www.benzinga.com/markets/binary-options/15/02/5221328/nadex-announces-additional-strikes-to-its-five-minute-binary-co): "Nadex Announces Additional Strikes To Its Five-Minute Binary Contracts"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F3.31 [D29] [S12] SECONDARY

Whether an order-book crank job is needed depends on the CLOB. Phoenix and Manifest are crankless; OpenBook is listed as needing a crank (per Manifest's README).

- Lens: technical
- Source: [Manifest (GitHub)](https://github.com/CKS-Systems/manifest): "Crankless: No / Yes / Yes"
- Verification (2026-10-09): downgraded from CONFIRMED: Opened the Manifest README. The table shows Crankless No / Yes / Yes for OpenBook / Phoenix / Manifest, and the Phoenix README confirms crankless. The OpenBook 'needs a crank' claim comes only from Manifest's README, a competitor's description, so it is a third-party claim.

### F3.33 [D12] [S12] CONFIRMED

Comparing the two sources I opened: every holiday and early close in Pyth's embedded schedule (0907, 1126, 1127 half day, 1224 half day, 1225, 0101, 0118, 0215, 0326, 0531, 0618, 0705) matches the NYSE page's 2026 and 2027 dates. The schedule has no 2027 entries after July 5, whereas NYSE lists Sep 6, Nov 25, Nov 26 (early close) and Dec 24 2027.

- Lens: venues
- Source: [Hermes price_feeds metadata for NVDA](https://hermes.pyth.network/v2/price_feeds?query=NVDA&asset_type=equity): "1127/0930-1300,1224/0930-1300,1225/C,0101/C,0118/C,0215/C,0326/C,0531/C,0618/C,0705/C"
- Source: [NYSE Holidays and Trading Hours](https://www.nyse.com/markets/hours-calendars): "Friday, November 26, 2027"
- Verification (2026-10-09): held: Compared the two pages I opened. Every date in Pyth's schedule (0907, 1126, 1127 half, 1224 half, 1225, 0101, 0118, 0215, 0326, 0531, 0618, 0705) matches the NYSE 2026 and 2027 dates. Pyth has nothing after 0705. NYSE lists Sep 6, Nov 25, Nov 26 (early close) and Dec 24 2027.

### F3.34 [Q42] [S12] CONFIRMED

Hermes returns the latest updates for one or more feed IDs in a single request, so a settlement job needs one request for all seven tickers, not one per market.

- Lens: technical
- Source: [Fetch price updates (Pyth Core)](https://docs.pyth.network/price-feeds/core/fetch-price-updates): "/v2/updates/price/latest"
- Verification (2026-10-09): held: Opened the Pyth fetch-price-updates page. /v2/updates/price/latest 'allows you to fetch the latest price updates for multiple feeds in a single request' via repeated ids[] parameters. The Core llms txt example batches three feeds. No maximum ID count is stated. The curl example uses a Bearer API key.

### F3.35 [D6] [Q8] [S12] [S14] UNCONFIRMED

My arithmetic (not a sourced fact): applying the spec algorithm to the F3.08 intraday prices gives 39 markets a day without the previous-close strike (AAPL 6, MSFT 6, GOOGL 6, AMZN 5, NVDA 4, META 6, TSLA 6) and 46 with it (7, 7, 7, 6, 5, 7, 7). AMZN loses a rung because 254.06 and 246.20 both round to 250; NVDA loses two. These use intraday prices, not previous closes.

- Lens: user
- Source: [Pyth Terminal: NVDA/USD](https://app.pyth.com/explore/Equity.US.NVDA%2FUSD): "Price: $229.83000"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F3.36 [Q10] [Q8] [S12] UNCONFIRMED

My arithmetic (not a sourced fact): using the F3.11 formula, a 165-byte token account is 2,039,280 lamports and an 82-byte mint is 1,461,600 lamports (the 82-byte size is the standard mint size; I did not re-open a source for it). Each market's two mints plus one vault cost about 0.0050 SOL, plus a state account and the order book. For 39 to 46 markets a day that is about 0.2 SOL a day before state accounts and the order book.

- Lens: user
- Source: [Solana accounts](https://solana.com/docs/core/accounts): "(account_size + 128) * 3,480 lamports/byte-year * 2 years"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F3.37 [Q32] [Q34] [Q35] [S12] [S14] UNCONFIRMED

My worked examples (not sourced facts). Halfway: a $500 previous close gives -3% = 485, -9% = 455, +3% = 515, +9% = 545, all exactly halfway between multiples of $10; half-up gives 490, 460, 520, 550 and half-even gives 480, 460, 520, 540. Gap: NVDA at 229.83 falling 10% to about 207 leaves strikes 210 to 250 all above the price. Split: a 10-for-1 split on a $1,200 stock leaves strikes near $1,092 to $1,308 against a price near $120.

- Lens: user
- Source: [Math.round (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round): "If the fractional portion is exactly 0.5, the argument is rounded to the next integer in the direction of +∞."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
