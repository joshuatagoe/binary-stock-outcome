# Group 3 input: Daily cycle

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** S12, S13, S14. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research each item through three lenses: how real venues do it (business and market practice), the technical facts, and what the user needs.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (13)

### D6

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S12, S14
- **Question:** How are each morning's strikes computed and deduplicated, how many markets does that give per day at current MAG7 prices, and what may the admin change?

**Spec:**

> Generate strikes at ±3%, ±6%, and ±9% from the previous close, rounded to the nearest $10
>
> After deduplication, AAPL would have 5 unique strikes: $210, $220, $230, $240, $250.
>
> Admin can add or adjust strikes before or during the trading day

### D7

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S13
- **Question:** What is the daily timeline from reading the previous close to redemption, and which steps can slip without harm?

**Spec:**

> 8:00 AM ET: Automation service reads previous close from oracle, calculates strikes
>
> 8:30 AM ET: Creates contracts and order books for each strike
>
> ~4:05 PM ET: Automation service reads oracle closing price, settles all contracts

### D12

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S12
- **Question:** Where should the trading calendar (holidays and early closes) come from, and how reliable is each source for 2026 and 2027?

**Spec:**

> An off-chain service that runs two scheduled jobs on US trading days:

### D29

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S12
- **Question:** Which scheduled and always-on backend jobs does the product need beyond the spec's morning and settlement jobs, and how should their schedules handle time zones and daylight saving time?

**Spec:**

> Morning job (~8:00 AM ET): For each of the 7 stocks, read previous close from oracle, calculate strikes, call create strike market for each. Log results. Alert on failure. Retry with backoff.
>
> Settlement job (~4:05 PM ET): For each open contract, call settle market. If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes. If still failing, alert admin for manual override.

### Q8

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S12
- **Question:** Should the rounded previous close be offered as a 7th strike? What does trading activity near the current price suggest?

**Spec:**

> This produces 6 strikes per stock (3 above, 3 below), plus optionally the rounded previous close itself as a 7th strike

### Q9

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S12
- **Question:** The spec places strikes at "user-determined percentage intervals". Who determines them, and should they be configurable?

**Spec:**

> Strikes are placed at user-determined percentage intervals above and below the previous closing price, rounded to the nearest $10.

### Q10

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S12
- **Question:** Who pays the transaction fees and account rent for creating each day's markets and for users' trades on devnet, and roughly how much is it per day?

**Spec:**

> Create Strike Market -- Create a single contract for one stock, one strike, one day. Includes creating the Yes/No token mints, the collateral vault, and the associated order book market. Called once per strike (not batched).

### Q14

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S13
- **Question:** How should early-close days (1:00 PM ET) be handled for creation, the trading cutoff and settlement?

**Spec:**

> 4:00 PM ET: US market close

### Q32

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S12
- **Question:** "Rounded to the nearest $10" is undefined when a value falls exactly halfway, for example $500 - 3% = $485. Which rounding rule should apply, and in what number format should strikes be computed?

**Spec:**

> Generate strikes at ±3%, ±6%, and ±9% from the previous close, rounded to the nearest $10

### Q33

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S14
- **Question:** "Admin can add or adjust strikes before or during the trading day": what should adjusting mean for a market people already hold? The function list has Add Strike only.

**Spec:**

> Admin can add or adjust strikes before or during the trading day
>
> Add Strike -- Admin function to add extra strikes for a stock intraday

### Q34

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S14
- **Question:** If a stock opens far from yesterday's close (for example after an earnings report), most strikes sit on one side. How should strikes respond, and does the oracle provide a pre-market price?

**Spec:**

> Strikes far from the current price will trade near $1.00 (deep in-the-money) or near $0.00 (deep out-of-the-money). The most active trading happens at strikes near the current stock price.

### Q35

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S12
- **Question:** How should stock splits and share classes (GOOGL versus GOOG) be handled in the previous close and the oracle feed?

**Spec:**

> GOOGL (Alphabet)

### Q42

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S12
- **Question:** How should the morning job retry, and what limits apply to creating and later settling a day's markets in a burst on public devnet?

**Spec:**

> Morning job (~8:00 AM ET): For each of the 7 stocks, read previous close from oracle, calculate strikes, call create strike market for each. Log results. Alert on failure. Retry with backoff.
