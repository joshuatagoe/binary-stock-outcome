# Research: S14 Adds a strike during the trading day

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 3: Daily cycle

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

### F3.13 [Q10] [Q33] [S12] [S14] CONFIRMED

The original Solana Token program cannot close mint accounts, so their rent stays locked. Token-2022 can close mints if the MintCloseAuthority extension is set before the mint is initialized.

- Lens: technical
- Source: [Token-2022 extensions](https://www.solana-program.com/docs/token-2022/extensions): "The Token program allows owners to close token accounts, but it is impossible to close mint accounts."
- Verification (2026-10-09): held: Opened the Token-2022 extensions page. It says it is impossible to close mint accounts under the Token program. It says MintCloseAuthority must be initialized before the mint is initialized. It adds that the supply must be 0 to close, which the finding omits.

### F3.25 [Q9] [Q33] [D6] [S12] [S14] CONFIRMED

Kalshi lets traders request additional strikes on a market (an options icon, then a Request Additional Strikes tab). Its markets team reviews each request and adds the strike promptly if appropriate. Staff, not traders, add the strikes.

- Lens: venues
- Source: [Request Additional Strikes (Kalshi Help)](https://help.kalshi.com/en/articles/13823834-request-additional-strikes): "Our markets team will thoroughly review each request"
- Verification (2026-10-09): held: Opened the Kalshi help article. Users click the options icon, then the Request Additional Strikes tab. The markets team thoroughly reviews each request and adds the strike if appropriate. The page text I got did not use the word 'promptly'.

### F3.26 [Q33] [S14] CONFIRMED

Polymarket's resolution docs say a market's rules define how it resolves (resolution source, end date, how ambiguity is handled). Clarifications issued after trading starts cannot change the fundamental intent of the question. So the norm there is no editing the contract under holders.

- Lens: venues
- Source: [Resolution (Polymarket docs)](https://docs.polymarket.com/concepts/resolution): "The market title describes the question, but the rules define how it resolves."
- Verification (2026-10-09): held: Opened docs.polymarket.com/concepts/resolution. It says 'The market title describes the question, but the rules define how it resolves.' Rules set the resolution source, end date and edge-case handling. Clarifications after trading starts 'Cannot change the fundamental intent of the question.' The 'no editing under holders' norm is the author's inference.

### F3.35 [D6] [Q8] [S12] [S14] UNCONFIRMED

My arithmetic (not a sourced fact): applying the spec algorithm to the F3.08 intraday prices gives 39 markets a day without the previous-close strike (AAPL 6, MSFT 6, GOOGL 6, AMZN 5, NVDA 4, META 6, TSLA 6) and 46 with it (7, 7, 7, 6, 5, 7, 7). AMZN loses a rung because 254.06 and 246.20 both round to 250; NVDA loses two. These use intraday prices, not previous closes.

- Lens: user
- Source: [Pyth Terminal: NVDA/USD](https://app.pyth.com/explore/Equity.US.NVDA%2FUSD): "Price: $229.83000"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F3.37 [Q32] [Q34] [Q35] [S12] [S14] UNCONFIRMED

My worked examples (not sourced facts). Halfway: a $500 previous close gives -3% = 485, -9% = 455, +3% = 515, +9% = 545, all exactly halfway between multiples of $10; half-up gives 490, 460, 520, 550 and half-even gives 480, 460, 520, 540. Gap: NVDA at 229.83 falling 10% to about 207 leaves strikes 210 to 250 all above the price. Split: a 10-for-1 split on a $1,200 stock leaves strikes near $1,092 to $1,308 against a price near $120.

- Lens: user
- Source: [Math.round (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round): "If the fractional portion is exactly 0.5, the argument is rounded to the next integer in the direction of +∞."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
