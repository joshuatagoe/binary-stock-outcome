# Architecture

This file says how Meridian is built: its size, its parts, the money flow, the on-chain accounts, the contracts between the parts, the front end, the stack and the build order. It builds on [PROBLEM_SPACE.md](PROBLEM_SPACE.md) (what and why) and [USERS.md](USERS.md) (who and how, flows F1 to F20). Each section was agreed with the user before the next one started, and each becomes a decision in [DECISIONS.md](DECISIONS.md) (D90 on). Every number here comes from a script in [`scripts/arch/`](../scripts/arch/), named next to it, and a finding ID (AR.01 on) points to the research file that holds the evidence.

**Running example, used everywhere:** "META $680 or above" on a Thursday when META closed at $680 the day before. At 10:16 AM the book holds the bot's bid for 5 Yes at 64¢ and offer of 5 at 66¢, plus Dave's offer of 10 at 65¢. Alice buys 10 Yes for 6.50 USDC, and Bob buys 10 No for 3.50. META closes at $684.00, so Yes wins.

## 1. Scale and availability

Meridian carries three kinds of traffic: on-chain transactions (every trade, quote and job step), our backend's requests to Solana's RPC servers (to send transactions and read what happened), and live updates pushed to browsers. Alice's 10:16 Buy Yes is one transaction. Our backend reads it back once to record its events (D62), and one book update goes to every open tab watching META (D16).

### Sizing

| Level | What it stands for | Trades a day | Busiest market at its peak | Source |
|---|---|---|---|---|
| **L1: devnet demo** (built for) | Peak6's graders and classmates: 10 to 50 traders a day, 10 to 20 actions each (assumed, confirmed by the user) | 100 to 1,000 user transactions, plus 148 to 202 from the bot and 159 from the jobs | 0.002 transactions a second | `scale-demo.mjs`, `requotes.mjs` |
| **L2: the market leader** | Kalshi's S&P 500 "above/below at 4 PM" event, the closest product to ours, times our 7 stocks | about 73,500 | about 5.6 a second | `scale-levels.mjs`; AR.07 |
| The whole channel | Every daily finance contract on Kalshi and Polymarket | about 167,000 | (as L2) | `scale-levels.mjs`; AR.07 |
| **L3: Solana's ceiling** | Every trade in one market writes that market's book account, which gets at most 12M compute units per block (the conservative figure; Agave's code has 24M) | (not a usage level) | 448 to 1,794 taker transactions a second, for 120k to 30k compute units each | `ceiling.mjs`; AR.01, AR.08 |

How the levels are computed:

- **L1.** 46 markets at the 9 October closes (49 at most, D6). The jobs send 92 transactions to create the markets (2 each, assumed), 7 for the first quotes, 46 for the close sweep, and 7 to record closes plus 7 to settle. Users send 100 to 1,000 transactions, 30% of them in the busiest hour (assumed). The bot sends 148 batch re-quotes a day at the median and 176 at p95 with Zach's hourly prices and 2% daily moves, or 202 at p95 with 3% moves. At p95 it sends no more than 9 in any 10 seconds.
- **L2.** Kalshi averages 180 contracts per trade: $68.7B of face value over 381.0M trades. The 4 PM S&P event traded 1,893,297 contracts, about 10,500 trades. Its busiest strike traded 797,377 contracts (about 4,400 trades), 45.6% of them in the last hour, which is 0.56 trades a second. The peak second is assumed to run at 10 times that hour's average. Kalshi has no single-stock daily markets that the research found, and Polymarket's take $121 to $27,591 a day each, so a Kalshi index event times 7 is a generous stand-in.

### What binds, and what doesn't

The chain doesn't bind even at L2: the busiest market needs 5.6 transactions a second against a ceiling of at least 448. These do:

1. **Devnet's per-address request limit** (100 per 10 seconds, 40 for any one method; AR.08). In L1's busiest hour, with the send queue at its D56 cap, our backend uses 5.0 of its 10 a second (`rpc-budget.mjs`). L2 needs a paid provider.
2. **The live stream's fan-out.** At L1 the stream sends 6 messages a second in all. At L2 it would send 157,000 a second if every tab got every change, or 22,000 if each tab got only its own stock (assuming 5,000 tabs and 10 order changes per trade; `rpc-budget.mjs`).
3. **Job bursts at D56's pace of 4 sends a second.** Creating the markets takes at least 23 s, inside the 1,800 s from 8:30 to 9:00. The close sweep takes at least 11.5 s, and recording the close plus settling takes 3.5 s (`scale-demo.mjs`).
4. **Devnet SOL.** About 0.445 SOL a day stays locked for good: D50's 0.008 per market plus D94's 0.0017. That is about 9.3 SOL over 21 trading days, a regular top-up for the operator (`scale-demo.mjs`).

### Built for L1, with the path to L2 written down

Three preparations are built now, so that reaching L2 means configuration and hosting, not a redesign:

- every live-stream message carries a topic (its stock);
- every send goes through the one shared queue (D56);
- reading our program's transactions sits behind one module, so a paid streaming feed can replace polling.

The path to L2, not built:

- a paid Solana provider with a streaming feed, and higher send limits;
- streaming stock prices for the bot, which then sends about 3,000 batch re-quotes a day (`requotes.mjs`), still no more than 9 in any 10 seconds at p95;
- several stream servers behind a shared message bus, with tabs subscribed to their stock only;
- an event store sized for about 800,000 rows a day.

The program needs no change for L2. The M1 spike measures how many orders one book holds and the compute per match (D21).

### Tests for each level

- **L1 load test:** "a demo day in 20 minutes" on a local chain with the fake clock (D11). It runs 46 markets, the bot, 50 simulated traders doing 20 actions each with 30% in one hour, and 50 stream clients. It passes when every job finishes inside its window (markets by 9:00, the sweep by about 4:01, settlement within 10 minutes of the posted close), nothing is rate-limited at D56's pace, and the stream meets the targets below. A small real-devnet run with about 10 traders meets the real request limits.
- **L2 load test:** one market at 6 taker transactions a second for 10 minutes on a local chain, measuring compute per transaction against the account cap; and 5,000 simulated stream clients against one backend.
- **L3:** computed only.
- **Race tests**, for the moments where two actions collide:
  - two buyers for the last 5 Yes (no over-fill; the second gets what is left or nothing);
  - an order in the last second before the stored close (D37);
  - settle sent twice (the second fails "already settled");
  - the recorded close replaced by a later valid price while settle runs (D83);
  - cancel against fill;
  - redeem twice;
  - sweep against cancel.
- **Outage drills:**
  - the backend killed mid-day (the site reads the chain directly, D16; the jobs resume without double sends, D23);
  - the chain halted mid-trading and again across 4:00 (settlement still uses the price at or before the close, D19);
  - one RPC provider failing (failover, D75);
  - the primary host down while the backup bot runs (D75);
  - the database lost.

### Availability

One always-on backend, a backup copy of the bot on a second host (D75), backups of the database, and no standby for the live stream or the database.

- **If the primary host dies,** live updates, History and the Timeline stop until it restarts. Trading continues: browsers read the books from Solana (D16), the backup bot runs the jobs (they're safe to run twice, D23), and no money is at risk, because the program holds every money rule (D23).
- **What a lost database can't rebuild from the chain** is our own off-chain records: job check-ins, the heartbeat log (D75's evidence for counting outage days), problem reports (D91) and the Tiingo reads (D93). They are backed up at least once a day, after settlement. Everything the chain recorded can be re-read from it (D62).
- **Rejected:** a hot standby with a replicated database (a second paid host, out of proportion for play money), and backups only (that would undo D75).

### Response-time targets

| What | Target | Source |
|---|---|---|
| A page's first byte | 0.8 s or less at p75 | web.dev, Time to First Byte (AR.08) |
| Main content painted | 2.5 s or less at p75 | web.dev, Largest Contentful Paint (AR.08) |
| Reaction to a click | 200 ms or less at p75 | web.dev, Interaction to Next Paint (AR.08) |
| From approving in the wallet to "Bought 10 Yes" | 3 s or less at p95 | Our own target: devnet finalizes within about a second of confirming (AR.01). Measured at M0 |
| A fill appearing in other tabs | 2 s or less at p95 | Our own target; measured in the L1 load test |
| Markets created; markets settled | by 9:00 AM; within 10 minutes of the close | The spec |
