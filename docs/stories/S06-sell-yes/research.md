# Research: S6 Sells Yes and sees the realized P&L

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.32 [A1] [S4] [S6] CONFIRMED

Polymarket charges only takers, on most markets: fee = C x feeRate x p x (1-p), rates by category (Crypto 0.07; Sports and Economics 0.05; Finance, Politics, Tech 0.04; Geopolitics 0), 'Makers are never charged fees', with maker rebates of 15% to 25% of fees; fees are rounded to five decimals.

- Lens: venues
- Source: [Polymarket - Fees](https://docs.polymarket.com/trading/fees): "fee = C x feeRate x p x (1 - p) ... Makers are never charged fees."
- Verification (2026-10-09): held: Polymarket fees page: fee = C x feeRate x p x (1-p). Rates: Crypto 0.07; Sports, Economics etc. 0.05; Finance, Politics, Mentions, Tech 0.04; Geopolitics 0. 'Makers are never charged fees', rebates of 15%/20%/25%, rounded to 5 decimals.

### F2.33 [A1] [S4] [S6] SECONDARY

Kalshi charges takers by formula and charges makers on resting orders that later fill. The taker formula (0.07 x contracts x price x (1 - price), rounded up) and the maker coefficient 0.0175 come from a search snippet of the July 2026 fee-schedule PDF; the PDF itself returned HTTP 429 when I opened it. The help page confirms the maker rule.

- Lens: venues
- Source: [Kalshi Fee Schedule for July 2026 (search snippet only)](https://kalshi.com/docs/kalshi-fee-schedule.pdf): "0.07 x contracts x price x (1 - price), rounded up to a centicent; fee range (100 contracts): $0.07 - $1.75"
- Source: [Kalshi Help - Fees](https://help.kalshi.com/en/articles/13823805-fees): "Maker fees are charged for orders placed that are not immediately matched and are instead left as resting orders on the orderbook."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F2.34 [A1] [S4] [S6] CONFIRMED

Manifest states 'No trading fees forever' and charges no protocol fee at market creation; OpenBook v2 sets maker_fee and taker_fee per market and has sweep_fees. Fees on a third-party book would go to that program's accounts, not to a Meridian fee account, unless Meridian takes its own fee in its own instruction.

- Lens: technical
- Source: [CKS-Systems/manifest](https://github.com/CKS-Systems/manifest): "No trading fees forever on Manifest."
- Source: [OpenBook v2 lib.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/lib.rs): "create_market ... maker_fee, taker_fee ... sweep_fees"
- Verification (2026-10-09): held: The Manifest README says 'No trading fees forever on Manifest' and the table marks it feeless. OpenBook lib.rs has maker_fee and taker_fee in create_market, and sweep_fees. The point about fees going to the program's accounts is inference, not in the sources.

### F2.38 [Q5] [A1] [Q6] [S7] [S27] [S4] [S6] CONFIRMED

The spec's wording on redemption and the vault: Sell No leaves 'Yes + No, which can be redeemed for $1.00, or the system handles the close automatically'; Redeem pays winning $1.00 and losing $0.00; 'Tokens can only be destroyed via the redeem function'; 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)'. The function list has no pair-burn. Context only.

- Lens: technical
- Source: [Meridian spec](docs/spec/meridian_project.txt): "Tokens can only be destroyed via the redeem function ... Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)"
- Verification (2026-10-09): held: Spec file: line 314 'Yes + No, which can be redeemed for $1.00, or the system handles the close automatically'; 391 'Tokens can only be destroyed via the redeem function'; 386 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate...'. The $ and x signs are encoding-garbled in the file. The pair-burn absence in the function list was not checked.
