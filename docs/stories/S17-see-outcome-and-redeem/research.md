# Research: S17 Sees the settlement price and outcome, then redeems winnings in one transaction, at any time

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 4: Settlement and payout

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

### F4.69 [Q39] [S17] CONFIRMED

Solana transaction limits: 1,232 bytes, 64 accounts per transaction and 12 signatures per packet; compute is 200,000 CU default per instruction and 1,400,000 max per transaction. SIMD-0296 proposes 4,096 bytes for the new v1 format only; its status is 'Review'.

- Lens: technical
- Source: [Solana docs: Transactions](https://solana.com/docs/core/transactions): "1,232 bytes maximum"
- Source: [Solana docs: Fees](https://solana.com/docs/core/fees): "Max CU limit / transaction: 1,400,000"
- Source: [SIMD-0296: larger transactions](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0296-larger-transactions.md): "This proposal presents a new transaction size of 4096 bytes."
- Verification (2026-10-09): held: Transactions page: 1,232 bytes max, 64 accounts, 12 signatures per packet. Fees page: max 1,400,000 CU per transaction and 200,000 CU default per instruction. SIMD-0296 says 'a new transaction size of 4096 bytes', applies to v1 only, and its status is Review.

### F4.70 [Q39] [S17] CONFIRMED

V0 transactions support address lookup tables, which raise the effective account limit; their size limit stays 1,232 bytes. The v1 format removes lookup tables ('every account a v1 transaction touches is listed in the message') and has a 4,096-byte limit.

- Lens: technical
- Source: [Solana docs: Transaction versions](https://solana.com/docs/core/transactions/versions): "raise the effective account limit with Address Lookup Tables"
- Verification (2026-10-09): held: Versions page: v0 'raise the effective account limit with Address Lookup Tables' with a 1,232-byte limit. Lookup tables are removed in v1 ('every account a v1 transaction touches is listed in the message'), and v1 has a 4,096-byte limit.

### F4.71 [Q39] [S17] CONFIRMED

Every account must hold a refundable minimum balance of (account_size + 128) x 3,480 x 2 lamports. By that formula a 165-byte token account needs 2,039,280 lamports and an 82-byte mint 1,461,600; a market with two mints, a vault and a market account locks roughly 0.007 SOL (my arithmetic; the market account size is an assumption).

- Lens: technical
- Source: [Solana docs: Accounts](https://solana.com/docs/core/accounts): "(account_size + 128) x 3,480 lamports/byte-year x 2 years"
- Verification (2026-10-09): held: Accounts page gives the formula '(account_size + 128) * 3,480 lamports/byte-year * 2 years' and calls the balance refundable. I checked the arithmetic: 293 x 6,960 = 2,039,280 and 210 x 6,960 = 1,461,600, both correct.

### F4.72 [Q39] [S17] CONFIRMED

Mints can be closed only if the Token-2022 MintCloseAuthority extension is initialised before the mint and the supply is 0, so a plain SPL mint stays on-chain, with its rent locked, permanently.

- Lens: technical
- Source: [Token-2022 extensions](https://www.solana-program.com/docs/token-2022/extensions): "The supply on the mint must be 0."
- Verification (2026-10-09): held: Token-2022 extensions page: a mint can be closed only when the extension was set up at initialisation, and 'The supply on the mint must be 0.' That a plain SPL mint stays on-chain forever is an inference from this.
