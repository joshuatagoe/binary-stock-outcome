# Users

This file says who uses Meridian and how each of them moves through it, step by step, with the exact words on screen when something goes wrong. It builds on [PROBLEM_SPACE.md](PROBLEM_SPACE.md) and cites decisions by number (D1 to D79 in [DECISIONS.md](DECISIONS.md)) and stories by number (S1 to S31 in [docs/stories/](stories/README.md)). The choices this file made itself were reviewed with the user and logged as D84 to D89. How any of it is built (accounts, instructions, services, the database) is left to `docs/ARCHITECTURE.md`.

**Running example.** A made-up Thursday on which META closed at $680 the day before, so the morning job creates META $620, $640, $660, $680, $700, $720 and $740 (the spec's ladder). Every flow below uses the "META $680 or above" market and these people:

- **Alice** buys 10 Yes for 6.50 USDC.
- **Bob** buys 10 No for 3.50 USDC.
- **Carol** posts a limit order below the market.
- **Dave** is a person making a market by hand, beside our bot.

At 10:15 AM META is at $684.20 and the book holds only the bot's quotes: a bid for 5 Yes at 64¢ and an offer of 5 Yes at 66¢. META closes at **$684.00**, so Yes wins. "What if" branches say so where they leave this path.

## Summary

Meridian has one primary user, the **trader**, who buys and sells Yes and No on one stock and one strike for one day, and redeems after the close. On devnet that trader is mostly played by Peak6's graders and by fellow students. They arrive with a fresh wallet and no test money, often in the evening or at a weekend when markets are shut, so getting test money (F2), the off-hours screens (F1, F3) and the proof of a past run (F19, F20) matter as much as the order ticket. Around the trader are the **market maker** (mostly our bot), the **admin** and the **operator** (one person on devnet, holding different keys), the **grader** reading the repo, and the **automation**, which has no screen but drives every state a user sees. Twenty flows follow: F1 to F14 are the trader's, F15 the maker's, F16 the automated day, F17 to F19 the admin's, operator's and grader's, and F20 the "what happened when" Timeline that the reviewers value (D47).

## Words on screen

**Units (D84).** Three units, never mixed:

| What it measures | How it reads | Example |
|---|---|---|
| A stock price or a strike (real US dollars) | `$` | META $684.20, strike $680 |
| The price of one Yes or No contract | cents | Yes 65¢ (also "65% chance") |
| Play money moving | `USDC` with two decimals | 6.50 USDC |

Kalshi and Polymarket quote contracts in cents ("89 cents", F1.17), and keeping `$` for real stock prices stops a contract price from looking like real money (D33). This rewords the `$` contract prices in D39, D44 and D45 (D84) ("Buy No $0.36" becomes "Buy No 36¢"; "−$1.50" becomes "−1.50 USDC"). Times always carry "ET".

**One verb per action.** Each button's word returns in its confirmation and in History:

| Button | Done message | Who |
|---|---|---|
| Connect wallet | Connected | anyone |
| Buy Yes / Buy No | Bought 10 Yes at 65¢ · 6.50 USDC | trader |
| Sell Yes / Sell No | Sold 10 Yes at 80¢ · received 8.00 USDC | trader |
| Cancel order | Order cancelled · 3.60 USDC returned | trader, maker |
| (the close, automatic) | Refunded at the close · 6.00 USDC returned | trader, maker |
| Redeem / Redeem all | Redeemed 10 Yes for 10.00 USDC | anyone holding tokens |
| Report a problem → Send report | Report sent | anyone |
| Mint pairs | Minted 10 pairs · 10.00 USDC | maker |
| Close pairs | Closed 5 pairs · 5.00 USDC returned | maker |
| Post quotes | Quotes posted | maker |
| Add strike / Remove strike | Strike added / Strike removed | admin, bot |
| Pause / Unpause | Paused / Unpaused | admin |
| Hold result | Held | admin |
| Propose result → Withdraw | Proposed / Withdrawn | admin |
| (wait ends) | Final | anyone |

**Market states.** Each market is in exactly one, shown on its card and its page (D14, D36, D46, D59, D63, D68):

| State | Label | When |
|---|---|---|
| Upcoming | "Opens 9:30 AM ET" | created, before the open; minting open from 9:00 |
| Open | the countdown | between the open and the stored close |
| Closed | "Trading ended · result expected by about 4:05 PM ET" | after the close, before a result |
| Settled | "Yes wins" or "No wins" | a result is written |
| Under review | "Under review" | held: the band straddles the strike, the stock was halted, or the admin held it |
| Proposed | "Proposed: No wins, final at 5:20 PM ET" | an override is waiting out its delay |
| Paused | "Paused by the admin" | covers every market; cancel, close pairs and redeem still work |

## Who we serve

| Role | What they do | Primary? | Stories |
|---|---|---|---|
| Trader | Gets test money, connects a wallet, buys and sells Yes and No, cancels orders, watches the close, redeems, tracks P&L | **Yes** | S2–S9, S17, S18, S25–S28, S30 |
| Visitor | Learns what a contract pays and sees live prices before connecting; becomes a trader | No (a trader before connecting) | S1 |
| Market maker | Mints pairs, quotes Yes on both sides, closes pairs, watches exposure and P&L. On devnet mostly our bot; a person can do it through scripts and a thin page | No | S10, S11 |
| Admin | Sets up the config once, adds and removes strikes, pauses, holds and overrides results, rotates keys, all from a hardware wallet or offline machine | No | S14, S16, S20, S21 |
| Operator | Checks the daily jobs ran, acts on alerts, tops up the bot's SOL and USDC. On devnet the same person as the admin, using other keys | No | S31 (S22 is the mainnet bonus) |
| Grader | A Peak6 blockchain engineer: reads the README and rationale, runs `make dev`, perhaps `make devnet`, opens the deployed app and the recorded run | The audience that judges; also plays trader | S23, S24 |
| Automation | The backend's jobs: create markets, quote, sweep the close, settle, audit. No screen; every flow shows its work | System actor, not a user | S12, S13, S15 |
| Everyone | Relies on every pair being backed by $1 and on the system behaving through a devnet outage | — | S19, S29 |

## Traders

### Kinds of trader

| Who | What they do | What they need from us |
|---|---|---|
| Alice, bullish | Buys 10 Yes at market and holds to the close | A payoff line that gives the total paid, payout, profit and most she can lose (D10); one approval; what happens next and when |
| Bob, bearish | Buys 10 No | "Buy No" priced like a thing he buys (36¢), with no minting in sight (D25); the honest No price, not the spec's formula (D45) |
| Carol, patient | Posts "buy 10 Yes at 60¢" and waits | Her open order, the part filled, the USDC locked, a Cancel button, and a refund she is told about at the close (D37, S30) |
| The early exiter | Sells before the close to lock a gain or cut a loss | Realized P&L right after the sale (S6, S7) |
| The grader as trader | Arrives on a Saturday with a fresh Phantom wallet | Faucet steps, a screen that says when trading opens, and the recorded run and Timeline to see the cycle anyway (D73) |
| The script trader | Calls the program directly | Nothing from the UI; the program stays safe on its own (D9, D23). Out of scope for screens |

### Pains today

- **Options are complex.** A same-day bet on a stock through options brings "Greeks, … margin calls, … unlimited downside", which the spec's binary contract removes: "max gain is known at entry, max loss is known at entry" (spec, Business Context).
- **Payout reads as profit.** "$1.00" is the payout, not the profit; Kalshi warns its users that "potential payout is not the same as profit" (F1.23).
- **Orders fill partly or not at all**, and unfilled buy orders are not positions (F1.23); a screen that blurs them misleads.
- **Test networks confuse newcomers.** Test apps make users switch networks and fetch test tokens first (F1.12), and wallets show Circle's devnet token as plain "USDC" (D33).
- **Results are taken on trust.** Most venues give no evidence of the price behind a result; Meridian can show it (D77).

### What success looks like

- Alice can say what she paid, what she gets if META closes at or above $680, and what she loses otherwise, before she signs.
- Every money screen matches the chain: a pending order is never shown as a position, and a sent transaction never as failed (D13, D36).
- A grader with no test money understands the product, sees a full past cycle and knows when they can trade live, within five minutes of arriving.
- Nobody sees a guessed result: a market too close to call says "Under review" and why (D59).

## Other users

**Visitor.** Wants to know what this is and whether the prices are real before connecting anything. Needs: the payoff in one line, live prices with their source and age, and the play-money notice (F1).

**Market maker.** Our bot quotes 5 contracts each side on every market from 9:30 so no book is empty (D41). A person like Dave mints pairs and posts quotes by script or on a thin page, and needs exposure, fills and P&L per market (D25, F2.94).

**Admin.** Holds the admin key on a hardware wallet or offline machine, never on the server (D17). Needs a page that shows the controls when that wallet is connected, a preview of every action, and on-chain checks that refuse anything else (D34).

**Operator.** Needs to know by 9:00 that the morning jobs ran, by about 4:20 that settlement did, and at once when a balance runs low or the price source goes quiet. Uses alerts and the public Timeline; there is no private operator page (D34, D70).

**Grader.** Reads before running anything. Needs the one-command local run, the devnet run's recorded signatures, the rationale for every choice, and an honest risks note (D73, D74, S24).

**Automation.** Not a person, but its timing is what users see: markets appear at 9:00, quotes at 9:30, results a few minutes after the close (D81). Its steps are listed in F16 and recorded on the Timeline (F20).

## Today vs with us

### Alice's META $680 trade

| Step | On a regulated venue today (Kalshi, real money) | On Meridian (Solana devnet, play money) |
|---|---|---|
| The question | Labelled "N or above" on Robinhood's Kalshi markets (F1.17) | "META $680 or above" (D31) |
| The price | Quoted from the Yes side; a Yes bid at X is a No ask at 1 − X (F2.19) | The same book in two views, with both No prices shown: Buy No 36¢ · Sell No 34¢ (D45) |
| Placing the order | Fills completely, partly or not at all; the API reports filled count, remaining count and average price (F2.31) | A worst price she sets ("pay at most 66¢"), checked on-chain; the screen reports filled, remaining and average (D15) |
| What she is told | "Potential payout is not the same as profit" (F1.23) | "You pay 6.50 USDC for 10 Yes. If META closes at or above $680 at 4:00 PM ET (Pyth price), you get 10.00, a profit of 3.50. Otherwise you lose 6.50." (D10) |
| At the close | Resting orders are cancelled shortly after (F2.70) | Resting orders are cancelled and refunded, and their owners told (D37) |
| The result | A Nasdaq-100 market waits for the source's first release, up to a week (F4.25, SECONDARY) | Pyth's 4:00 PM price; if its band contains the strike, the official close, entered after a waiting period, with no market waiting more than a week (D59, D68) |
| Checking it | — | The price, band, publish time and transaction on the market page (D77) |
| Getting paid | "Usually within 1 hour of event resolution" (F4.25, SECONDARY) | Redeem any time after the result, signed by her own wallet; the money goes straight from the vault to her wallet (D66) |

### The grader's check

Without Meridian's proof, a reviewer reading any devnet project on a Saturday can only read its claims. With it: `make dev` runs the whole cycle locally in minutes, saying plainly that its prices and clock are fake (D74); the README lists the signatures of a real devnet run (D73); and the Timeline shows each recent trading day: when markets were created, when each one settled, and why any was held (F20).

## UX flows

### F1 — Learn what a contract pays (Visitor; S1)

1. Opens the site. Every page carries the banner **"Solana devnet · USDC here is Circle's test token, no real value"** (D33).
2. First visit only, a notice sits under the banner; it does not block the page (D86): **"Meridian is a demo on Solana's test network, and nothing here has real value. Results come from Pyth's price at 4:00 PM ET; a result too close to call waits for the exchange's official close. [Read the risks and limitations] [Got it]"**. "Got it" hides it on this browser (D79).
3. The page explains one contract with the running example: "Yes pays 1.00 USDC if META closes at or above $680 at 4:00 PM ET. No pays 1.00 USDC if it closes below." Under it, the payoff table from PROBLEM_SPACE (META closes at $684.00, exactly $680.00, $676.00: who gets what).
4. A strip of the seven stocks, each with its price, source and age (D78), labelled by session (D87):
   - during the session: "META $684.20 · Pyth · 10:05 AM ET (12 min ago)"
   - after 4:00 PM: "META closed at $684.00 (4:00 PM ET)", and under it "After hours $684.60 · 5:05 PM ET"
   - before 9:30 AM: "META $686.10 · pre-market · 8:05 AM ET", and under it "Previous close $684.00"
5. Two buttons: **Browse markets** (no wallet needed) and **Connect wallet**. Footer links: How it works, Risks and limitations (S1's note), Timeline, the repo.

Edge cases:

- **The price is old.** While the source is Zach's hourly posts (PS.03), ages up to an hour are normal. Past 65 minutes the line adds "· may be out of date".
- **Weekend or holiday:** "Markets are closed today. Next trading day: Monday 12 October, 9:30 AM ET." with links to the last trading day's results and to the recorded run (D12, D73).
- **Live updates drop:** "Reconnecting… prices from 2 min ago" (D14, D16).
- **Devnet is down:** the banner becomes "Solana devnet is down, trading paused" (D19).

Out of scope: accounts or sign-up, price charts, news.

### F2 — Get test money and connect a wallet (Trader; S2, S25)

1. Clicks **Connect wallet**; picks a wallet from the list (Phantom, Solflare, Backpack, any Wallet Standard wallet) and approves it there. Sign-in is the wallet only (D34).
2. The header shows "7xKX…9fQ2 · 0.00 SOL · 0.00 USDC" with a copy button for the address.
3. With no SOL: "You need a little devnet SOL for network fees, about 0.01 SOL. It's free at faucet.solana.com: choose Devnet and paste your address." with [Copy address] [Open faucet] (D32).
4. With no USDC: "Get test USDC at faucet.circle.com: choose Solana Devnet and paste your address. It gives 20 USDC every 2 hours. This USDC has no value." with [Copy address] [Open faucet] (D32, D33, F1.05).
5. Balances update by themselves when funds arrive: "Received 20.00 USDC".

Edge cases:

- **No wallet installed:** "No Solana wallet found. Install one (for example Phantom), then reload this page."
- **Wallet popup closed:** "You closed the wallet window. Nothing was sent." (D13)
- **Wallet on the wrong network** (a transaction fails to simulate against devnet): "Your wallet seems to be on Mainnet. Switch it to Solana Devnet, then try again." (D36). How it is detected is for Architecture.
- **Faucet limit reached:** "Circle's faucet gives 20 USDC every 2 hours per address. Until then, the recorded run in the README shows the full cycle."
- **Low SOL during use:** "You have 0.0003 SOL. Orders need about 0.003 SOL for fees and deposits." with the faucet link.

Out of scope: an in-app faucet, a SOL drip (only if testing shows beginners stuck, D32), email or password sign-in.

### F3 — Browse today's markets (Trader; S3)

1. **Markets**: a grid of the seven stocks. Each tile shows ticker and name, price with source and age (F1 step 4), change from the previous close, and "7 contracts today".
2. Opening META shows its contracts as cards, sorted by strike, the one nearest META's price marked "nearest". A card reads "META $680 or above · Yes 65¢ · No 35¢ · 65% chance" (D31, D45).
3. Choosing a card opens Trade at an address that names the market, `/trade?market=META-680-2026-10-08` (D72).

Edge cases:

- **Before 9:00 AM:** "Today's contracts appear at 9:00 AM ET."
- **9:00 to 9:30:** cards show "Opens 9:30 AM ET" (D46).
- **Empty book:** "No quotes yet", never "0¢" (D45).
- **Spread wider than 10¢:** the chance comes from the last trade and says so, "62% (last trade)"; with no trades it shows "—" (D45).
- **Stock skipped today:** "No META contracts today: our two sources for yesterday's close disagreed. The admin has been alerted." (D55)
- **Strike added after the open:** the card carries "Added 9:35 AM" (D54).
- **Paused:** "Trading is paused by the admin. You can still cancel orders, close pairs and redeem." (D68)

Out of scope: search, watchlists, a ladder view that flags out-of-order prices (cut, D40).

### F4 — Buy Yes (Trader; S4)

Path: at 10:16 AM Dave offers 10 Yes at 65¢, so the Yes view shows asks 65¢ ×10 (Dave) and 66¢ ×5 (bot), and a bid of 64¢ ×5 (bot). The panel reads **Buy Yes 65¢ · Sell Yes 64¢ · Buy No 36¢ · Sell No 35¢**.

1. Alice picks **Buy Yes**, enters 10, and keeps **Market** (fill now at the best prices up to her limit) rather than **Limit** (rest on the book at her price; F6). Her limit defaults to just above the best ask, "Pay at most 66¢ each"; the default width is for Architecture (D15).
2. The ticket shows the payoff line (D10): "You pay 6.50 USDC for 10 Yes. If META closes at or above $680 at 4:00 PM ET (Pyth price), you get 10.00, a profit of 3.50. Otherwise you lose 6.50." and under it "You pay at most 6.60." and "Network fee about 0.00001 SOL, plus a one-time deposit of about 0.002 SOL for your META $680 Yes account."
3. Clicks **Buy Yes**: "Waiting for your wallet…"; the wallet asks for one approval.
4. "Sending…", then if it takes a while "Sent, may still land" (D13).
5. "Bought 10 Yes at 65¢ · 6.50 USDC" with a link to the transaction. If finality is shown in two stages (D71): "Bought · confirming" then "Final".
6. The panel shows "You hold 10 Yes · paid 6.50 · worth 6.40 if sold now"; Portfolio lists the position (F13).

Edge cases:

- **Partly filled:** another buyer took Dave's 65¢ offer first, leaving 5 at 66¢: "Bought 5 of 10 Yes at 66¢ · 3.30 USDC. The other 5 weren't bought: nobody was selling at 66¢ or less." (D15)
- **Nothing filled:** "No Yes was bought: nobody is selling at 66¢ or less. Raise your limit, or place a limit order."
- **Not enough USDC:** the button is disabled: "You need up to 6.60 USDC; you have 4.00."
- **Holds No on this strike:** see F8.
- **Before 9:30:** the buy and sell buttons are disabled: "Opens 9:30 AM ET".
- **After the close:** "Trading ended at 4:00 PM ET. Result expected by about 4:05 PM ET."
- **The close passes while the order is in flight:** "Trading ended before your order reached the network. Nothing was bought; only the network fee was charged." (D37)
- **Expired in flight:** "Your order expired before it reached the network. Nothing was spent. [Try again]". There is no automatic re-send before expiry (D13).
- **Large order** (could cost more than 100.00 USDC, D88): "Buy 200 Yes for up to 132.00 USDC? Only 5 are offered at 66¢ or less right now, so most of this order may not fill." [Buy Yes] [Back] (D76)
- **Paused:** "Trading is paused by the admin. You can still cancel orders, close pairs and redeem."

Out of scope: stop orders, choosing fill-or-kill, orders that expire before the close, editing an order (cancel and place again), fees (A1).

### F5 — Buy No (Trader; S5)

Path: at 11:00 AM META is $685.10 and the best Yes bids are 65¢: 5 from the bot and 5 from Dave. The panel reads **Buy No 35¢**.

1. Bob picks **Buy No** and enters 10. The ticket (D10): "You pay 3.50 USDC for 10 No. If META closes below $680, you get 10.00, a profit of 6.50. Otherwise you lose 3.50." and "You pay at most 3.60."
2. One approval. Underneath, one instruction locks 10.00 USDC, creates 10 Yes and 10 No, sells the 10 Yes at 65¢ for 6.50, and keeps the No. It creates only as many pairs as it sells (D5). Bob is shown none of this unless he opens "How Buy No works".
3. "Bought 10 No at 35¢ · 3.50 USDC".

Edge cases:

- **Partly filled:** "Bought 6 of 10 No at 35¢ · 2.10 USDC. The other 4 weren't bought: not enough buyers of Yes at 64¢ or more." He never ends up holding a stray Yes (D5).
- **Holds Yes on this strike:** see F8.
- Insufficient funds, timing, expiry and pause read as in F4, with "No" for "Yes".

Out of scope: showing traders the mint step (D25).

### F6 — Place a limit order, see it fill in part, cancel it (Trader; S30, S27)

Path (S30): at 10:00 AM Carol places **Buy Yes · Limit · 10 at 60¢** while the cheapest offer is 66¢.

1. Her order rests: "Order placed · Buy 10 Yes at 60¢ · 6.00 USDC locked". The header reads "USDC 14.00 available · 6.00 in orders".
2. Portfolio's **Open orders** lists it apart from positions (F1.23): "Buy 10 Yes at 60¢ · 0 filled · 10 open · 6.00 USDC locked [Cancel order]".
3. At 11:00 Bob's Buy No empties the 65¢ bids, and another seller sells 4 Yes into Carol's 60¢ bid. Her row becomes "4 filled · 6 open · 3.60 USDC locked", and **Positions** gains "4 Yes at 60¢ · paid 2.40".
4. At 2:00 PM she clicks **Cancel order**: "Order cancelled · 3.60 USDC returned".

A Buy No limit order is pending, not a position (D39, S27). Bob places **Buy No · Limit · 10 at 33¢**, which locks 10.00 USDC as 10 pairs and offers their Yes at 67¢:

- The pending row: "Buying 10 No: selling 10 Yes at 67¢. If all fill, you hold 10 No at 33¢."
- 4 fill at 67¢: Positions shows "4 No at 33¢"; the pending row shows 6 left.
- **Cancel order** returns the 6 unsold Yes, closes them with their 6 No and returns the money in the same transaction: "Order cancelled · 6 pairs closed · 6.00 USDC returned". Bob has spent 10.00 − 2.68 − 6.00 = 1.32 for 4 No, 33¢ each (D38, D39).

Edge cases:

- **Cancel while paused:** allowed (D68).
- **Cancel after 4:00:** not needed; the close refunds it (F10).
- **Wants to sell Yes that sits in an open order:** "4 of your Yes are in an open order. Cancel it to sell them."

Out of scope: cancelling all orders at once and changing an order's price (cut, D35; cancel and place again).

### F7 — Sell Yes and Sell No (Trader; S6, S7)

Branches off the main path:

- **Alice sells early.** At 2:30 PM the best Yes bid is 80¢. She picks **Sell Yes**, 10: "You sell 10 Yes for 8.00 USDC, a profit of 1.50 on the 6.50 you paid." Then "Sold 10 Yes at 80¢ · received 8.00 USDC · profit 1.50".
- **Bob sells early.** At noon the best Yes ask is 80¢, so Sell No reads 20¢. He picks **Sell No**, 10: "You sell 10 No for 2.00 USDC, a loss of 1.50 on the 3.50 you paid." Underneath, one transaction buys 10 Yes at 80¢ (8.00) and closes the 10 pairs for 10.00 (D38). Then "Sold 10 No at 20¢ · received 2.00 USDC · loss 1.50". He never sees the Yes.

Edge cases: a sell partly filled reads like F4's; quantity is capped at what is held and not locked in orders; after 4:00 the Sell buttons are replaced by "Trading has ended. Your 10 Yes pay 1.00 each if META closed at or above $680."

Out of scope: a one-click flip from No to Yes (cut, D44).

### F8 — Blocked from holding both sides of one strike (Trader; S8)

1. Bob holds 10 No on META $680 and clicks **Buy Yes** on the same strike at noon (Yes ask 80¢).
2. The ticket is replaced by: "Buying Yes here would lock in your current −1.50 USDC, the same as selling your No. [Sell No instead]" (D44; the figure is 3.50 paid plus 8.00 for pairs worth 10.00).
3. The mirror: Alice, holding 10 Yes bought for 6.50, clicks Buy No at noon with the best Yes bid at 79¢ and sees "Buying No here would lock in your current +1.40 USDC, the same as selling your Yes. [Sell Yes instead]" (7.90 from the Yes she'd sell, less 6.50 paid).

The check counts tokens locked in the trader's own open orders as well as the wallet (D9). It is a screen rule; the program doesn't enforce it (D9). A market maker's page doesn't apply it (F15).

### F9 — Watch the book and the clock (Trader; S9)

1. **Trade** shows the stock's strike list, the book, the four-button panel and the clock.
2. The book has a **Yes view** and a **No view** of the same orders (D5, D45). At 10:15 AM:

   | View | Asks | Bids |
   |---|---|---|
   | Yes | 66¢ × 5 | 64¢ × 5 |
   | No (1 − Yes, sides swapped) | 36¢ × 5 | 34¢ × 5 |

3. The clock shows two moments from the market's own close time (D36): "Trading ends in 1 h 42 min · 4:00 PM ET" and "Result expected by about 4:05 PM ET" (D81).
4. The stock price line reads as in F1 step 4, with its age.
5. Updates arrive live. The connection state shows only when something is wrong (D14, D16):
   - "Reconnecting… data from 25 s ago"
   - "Live updates are down; reading directly from Solana, which is slower"

Edge cases:

- **Early-close day:** "Trading ends at 1:00 PM ET today (early close)" and "Result expected by about 1:05 PM ET" (D51).
- **A quiet book is not a stale one:** staleness comes from the stream's heartbeat, not from a lack of trades (D14).
- **Paused:** the clock still runs; the label adds "Paused by the admin".

Out of scope: depth charts and a trade tape on this page (the market's activity is on the Timeline, F20).

### F10 — The close: open orders refunded (Trader, Maker; S26)

1. At the stored close (4:00 PM, or 1:00 PM on early-close days) the program refuses new orders and minting (D37, D43).
2. Right after, the close sweep cancels every resting order and refunds it (D37). If Carol had not cancelled, her History reads "Refunded at the close · Buy 10 Yes at 60¢ · 6 open · 3.60 USDC returned".
3. On her next visit a notice says "1 of your orders was refunded at the 4:00 PM close." and links to History.
4. A pending Buy No limit order is refunded the same way: "Refunded at the close · 6 pairs closed · 6.00 USDC returned".

Edge case: if Architecture puts refunds in a balance to withdraw rather than the wallet (D37), the notice reads "3.60 USDC is waiting for you. [Withdraw]", and Withdraw joins the verb table.

Out of scope: email or push notifications (no accounts, D34).

### F11 — See the result (Trader; S15, S17, S28)

1. **Closed, waiting:** "Trading ended · result expected by about 4:05 PM ET".
2. **Settled, the main path:** "Yes wins · META closed at $684.00 (Pyth, 4:00 PM ET) · settled 4:02 PM". Alice's 10 Yes show "pays 10.00 USDC"; Bob's 10 No show "pays 0.00".
3. **Evidence** on the market page (D77):
   - Pyth price and band: $684.00 ± $0.06
   - publish time: 4:00:00 PM ET
   - feed: Equity.US.META/USD
   - checks passed: genuine Pyth account, the right feed, published at or before the close, band narrow enough, band entirely above $680
   - where the price came from: the posted account and who posted it (for now, Zach Gardner's devnet feed; D80, D83)
   - the transactions that recorded the price and settled the market

What if Pyth's 4:00 PM price had been $680.02 ± $0.04 (D59)?

4. **Under review:** "Under review: Pyth's 4:00 PM price was $680.02 ± $0.04, which includes the $680 strike. The result will come from the exchange's official close, entered by the admin after a waiting period." The stock's other strikes settle normally.
5. **Proposed:** "Proposed: No wins (official close $679.97), final at 5:20 PM ET" (D63).
6. **Final:** "No wins · official close $679.97 · set by the admin, final 5:20 PM". Bob's 10 No pay 10.00.
7. While a market is under review or proposed, **Report a problem** is live (D77). It opens a box, "What looks wrong?", with [Send report]; then "Report sent. The admin has been alerted."

Edge cases:

- **No closing price:** if no valid Pyth price published at or before the close turns up within 15 minutes, "Under review: no Pyth price for META was published close enough to 4:00 PM. The result will come from the exchange's official close, entered by the admin after a waiting period." (D83)
- **Late for another reason** (our bot or devnet is down): "The result is late. The admin has been alerted. Your tokens are safe; redeeming opens when a result is set." (D8, D19)
- **Halted stock:** "Under review: META was halted at the close. The result will come from the exchange's official close for the halt, entered by the admin after a waiting period." (D65)
- **Held by the admin:** "Under review: the admin has held this result while a price problem is checked." (D68)
- **Proposal withdrawn:** "Withdrawn. A new proposal restarts the waiting period." (D63)
- **The one-week backstop:** under a held market, "If no result is final by Thursday 15 October, anyone may settle it from Pyth's 4:00 PM price." (D68)

Out of scope: disputes with a bond (D77), a "void" outcome (cut).

### F12 — Redeem (Trader; S17)

1. Portfolio's **Settled** section lists "META $680 or above · Yes wins · 10 Yes · pays 10.00 USDC [Redeem]".
2. **Redeem** asks for one approval: "Redeemed 10 Yes for 10.00 USDC". The USDC goes from the market's vault to her wallet.
3. **Redeem all** gathers every settled holding: "Redeem all · 3 markets · 20.00 USDC (one approval)". For example: META $680 Yes ×10 = 10.00; META $660 Yes ×4 = 4.00; META $700 No ×6 = 6.00, since META closed below $700. The wallet may show more than one transaction under that one approval (D66).
4. Redeeming works any time later, indefinitely, and while paused (D68).

Edge cases:

- **Partly done:** "Redeemed 2 of 3 markets · 14.00 USDC. 1 didn't go through. [Redeem the rest]" (D13)
- **Under review or proposed:** Redeem is disabled: "Redeem opens when the result is final."
- **Losing tokens:** shown as "pays 0.00". Whether redeeming them also returns their SOL deposits is for Architecture.

Out of scope: redeeming for users automatically; it needs each holder's signature (D24).

### F13 — Portfolio and History (Trader; S18)

1. **Portfolio**, in four sections:
   - **Open orders** (F6)
   - **Positions**, one row each: market, side, quantity, average entry, "worth if sold now", P&L, most it pays. At 3:00 PM with Yes at 70¢ bid / 72¢ ask:
     - Alice: "10 Yes · entry 65¢ · worth 7.00 if sold now · +0.50 · pays 10.00 if Yes wins"
     - Bob: "10 No · entry 35¢ · worth 2.80 if sold now · −0.70 · pays 10.00 if No wins"
   - **Awaiting result**
   - **Settled** (F12)
   - Totals, Alice's: "Realized today 0.00 USDC · open positions +0.50 USDC".
2. **Entry** is the average cost: 6 Yes at 64¢ and 4 at 66¢ make 64.8¢ (D62). A No bought through Buy No costs its net price (D39). "Worth if sold now" uses the price the trader would get, not the midpoint (F1.23).
3. **History** is the trader's own activity, newest first (D36):
   - columns: time ET, action (a verb from the table above), market, quantity, price, USDC, transaction link
   - it covers buys and sells, orders placed, cancelled and refunded, redemptions, and for makers mints and pair closes
   - filters by day and market
   - it is the Timeline (F20) narrowed to one wallet (D85)

Edge cases:

- **The backend is down:** "History is unavailable right now. Your balances and positions above are read straight from Solana and are current." (D62)
- **After a devnet reset:** "Solana devnet was reset on 12 November. Positions from before then are gone (play money). Your earlier history is kept below for reference." (D19)

Out of scope: P&L charts and tax exports.

### F14 — Devnet goes down or is reset (Everyone; S29)

1. When both RPC providers agree devnet has stopped (D75), the banner becomes "Solana devnet is down, trading paused". Buttons that send transactions are disabled, with "Your tokens and orders are safe on the network; nothing can change until it is back."
2. Transactions in flight read "Sent, may still land" and then either their result or "Your order expired and was not placed." (D13)
3. When devnet returns, the app re-reads balances and orders: "Solana devnet is back. Your balances and orders have been re-read."
4. **Back during trading hours:** the admin pauses briefly (D19), "Trading resumes at 11:20 AM ET so open orders can be reviewed first. You can cancel orders now."
5. **Back after the close:** settlement uses the price published at or before the close (D19, D57), so results arrive late but right; the Timeline records the cause.
6. **Back after the morning job's time:** "Today's markets opened late, at 10:12 AM ET, because Solana devnet was down." (F16)
7. **Reset:** the site says the network was reset and positions from before it are gone (F13); scripts rebuild the program, config and markets (D19).

Out of scope: keeping devnet up.

### F15 — Make a market: mint, quote, close pairs, watch exposure (Market maker; S10, S11)

The bot does this every trading day (D41). Dave does it by hand on a thin **Maker** page or with the repo's scripts (D25):

1. 9:10 AM, **Mint pairs**, 10, for META $680: "Minted 10 pairs · 10.00 USDC". Minting opens at 9:00 (D46).
2. 10:16 AM, **Post quotes**: an offer of 10 Yes at 65¢. Alice's buy takes all of it, so Dave receives 6.50 and holds 10 No.
3. 11:00 AM: a bid for 5 Yes at 65¢. Bob's Buy No fills it, so Dave pays 3.25 and now holds 5 Yes and 10 No.
4. **Close pairs**, 5: "Closed 5 pairs · 5.00 USDC returned". He holds 5 No (D38).
5. The **dashboard** per market and in total (D25; field list from F2.94):

   | Field | META $680, after step 4 |
   |---|---|
   | Holds | 0 Yes · 5 No · 0 open orders |
   | Cash so far | −10.00 + 6.50 − 3.25 + 5.00 = −1.75 USDC |
   | If Yes wins | −1.75 USDC |
   | If No wins | +3.25 USDC |
   | Fills today | 2 (15 contracts) |
   | Volume | 9.75 USDC |

6. At the close his open quotes are refunded (F10); after the result, **Redeem all** (F12).

Edge cases:

- **Holding both sides** is normal here, and the page offers it: "You hold 5 Yes and 5 No on META $680: close them for 5.00 USDC. [Close pairs]". F8 doesn't apply on the Maker page.
- **The bot falls behind** (devnet rate limits): it leaves its quotes in place rather than pulling them (D41). The Timeline notes "Quotes not refreshed since 10:42 AM (rate limited)".

Out of scope: quoting or cancelling in bulk from the page (cut, D35), maker rebates and fees (A1).

### F16 — The automated day, as users see it (Automation; S12, S13, S14, S15)

Each step leaves a Timeline row (F20) and a check-in for the watchdog (D70):

| Time (ET) | What happens | What users see |
|---|---|---|
| 8:00 | Take each stock's previous close from our program's record of yesterday's closing price, checked against the off-chain source (D82, D55) | Timeline: "Previous closes read: META $680.00 …", or "one source" when no record exists |
| 8:30 | Create every market, retrying with growing waits until 9:00 (D56) | Timeline: "Created 46 markets for Thursday (META $620 to $740)" |
| 9:00 | Markets visible, minting open (D46) | Cards with "Opens 9:30 AM ET" |
| 9:30 | Trading opens; the bot posts quotes (D41) | Prices replace "No quotes yet" |
| ~9:35 | If no strike is within 3% of a stock's price, the bot adds strikes once (D54) | "Added META $780, $800, $820 (META opened at $800)" |
| 4:00 | Trading and minting stop; the close sweep refunds open orders (D37) | "Refunded 12 open orders at the close" |
| 4:00–4:05 | As each stock's 4:00:00 price is posted (4:00 to 4:02 with Zach's feed), record it and settle that stock's markets; hold a stock with no valid price by 4:15 (D81, D83, D26, D57) | "Settled 45 of 46 by 4:02 PM · META $680 held for review" |
| next day | Compare each result with the official close (D26) | "Audit: all 45 automatic results match the official close" |

On early-close days every time after the open keys off 1:00 PM (D51). A late or failed step shows its cause on the Timeline and alerts the operator (F18).

### F17 — Admin (Admin; S14, S16, S20, S21)

The **Admin** page shows its controls only when the admin's wallet is connected. The program checks the stored key and its signature on every action, so the page is a convenience (D34). Each action previews first and then asks the wallet:

1. **Initialize config**, once, by script: tickers, pinned feed IDs, the price program, the USDC mint, admin and operator keys, thresholds and the strike ladder (S20, D24, D27, D49).
2. **Add strike:** "Add META $790 or above for today? It opens at once with an empty book." Then "Strike added" (S14). A duplicate gets "META $790 or above already exists today."
3. **Remove strike**, before 9:00 only: "Remove META $790 or above? Nobody can have traded it yet." Then "Strike removed". After 9:00: "Strikes can be removed only before 9:00 AM ET, before anyone can trade." (D53)
4. **Pause:** "Pause minting and new orders on every market? Cancelling, closing pairs, redeeming and settling keep working." Then "Paused". **Unpause** then "Unpaused" (S21, D68).
5. **Hold result** on one market, with a reason, then "Held" (D68).
6. **Propose result** with the official close and its source, then "Proposed: No wins, final at 5:20 PM ET" (S16, D63). A typo far from Pyth's 4:00 PM price is refused: "$697.97 is $17.95 from Pyth's 4:00 PM price ($680.02 ± $0.04), more than the allowed distance. Check the number." **Withdraw**, then "Withdrawn"; the wait restarts.
7. **Update config and rotate keys** by script; ladder changes apply from the next day (D27, D49).

Edge case: any other wallet sees no controls, and a direct call fails on-chain with "Not the admin" (D34).

Out of scope: a multisig on devnet (cut), a server sign-in (cut, D34).

### F18 — Operator (Operator; S31)

1. Alerts reach a person (the channel is for Architecture). Each says what is wrong and what to do:
   - "No check-in from the 8:30 job by 8:45 AM ET." (D70)
   - "Bot SOL 0.42, below 1.00. Top up from faucet.solana.com." / "Bot USDC 31.00, below 100.00. Claim at faucet.circle.com." (D32)
   - "No new Pyth price for META since 3:05 PM (65 min)." (PS.03)
   - "No valid Pyth closing price for META by 4:15 PM ET; META's markets are held for review. Propose a result after the waiting period." (D83)
   - "META $680 or above not settled by 4:20 PM ET. Check it, and propose a result if needed." (D8)
   - "A user reported a problem on META $680 or above: '…'" (D77)
   - "Solana devnet down (both providers agree) since 11:02 AM ET." / "… back at 11:14 AM ET." (D75)
2. The operator opens the **Timeline** (F20) to see which step failed and when, then acts (top up, re-run a job, or tell the admin).
3. The daily heartbeat log and the four-week liveness figures sit on the Timeline for anyone (D60, D75).

Out of scope: full monitoring dashboards (cut, D70) and mainnet operations (S22, the bonus).

### F19 — Grader (Grader; S23, S24)

1. Opens the README. It says what Meridian is, then gives two commands (D74):
   - `make dev`, or the npm script with the same name on Windows, which runs everything locally with no keys
   - `make devnet` for the real network, with `.env.example`
   It links the deployed app, the recorded devnet run's signatures and demo video (D73), the rationale (DECISIONS.md, the chain write-up, D18) and the risks note.
2. **`make dev`** starts a local chain, the program, the bot and the site. The site's banner reads "Local demo · fake prices and a fake clock · Pyth's signatures are not checked here" (D11). A **demo clock** panel, shown only in this mode (D89), has [Open trading] [Close at 4:00] [Settle], so the grader can go from create to redeem in minutes.
3. **`make devnet`** outside market hours: "Market closed; next run window Monday 9:30 AM ET", with an offer to run locally (D73).
4. On the deployed app off-hours, the Landing and Markets pages say when trading opens and link to the last trading day on the Timeline (F1, F20).

Edge cases: `make` missing on Windows (use the npm script); Windows without WSL ("Install WSL with Ubuntu first: the Solana tools run there", D74).

Out of scope: grader accounts on our host.

### F20 — Timeline: what happened when (Everyone; D47)

The dashboard reviewers asked for (D47), built on the event records (D62, D70). One public log, three views (D85):

- **Timeline page** (`/timeline`), one trading day at a time. At the top, the day against its targets: "Markets created 8:31 AM (target 9:00) ✓ · 45 of 46 settled by 4:06 PM (target 4:10) ✓ · 1 held · audit: pending". Below, every event in order: time ET, what happened, by whom (the bot, the admin, or a shortened wallet), the market, and a transaction link. Filters: stock, market, kind (jobs, trades, results, admin), wallet.
- **A market's Activity tab**: the same log for one market, with the settlement evidence (F11).
- **History**: the same log for the connected wallet (F13).

Below the day view, the liveness figures over four weeks: "settled on time through the oracle" and "settled by any path", each late market listed with its cause, and the devnet heartbeat (D60, D75).

Edge cases: no trading today ("Markets are closed today" and the last trading day shown); the backend down ("The Timeline is unavailable right now"; market evidence still reads from the chain).

Out of scope: charts, private operator views (D34).

## Accessibility needs

General rules for every flow:

- **Readable values.** A screen reader hears whole values with their unit: "Yes, 65 cents, 65 percent chance", "minus 1.50 USDC, loss", "strike 680 dollars". A sign or color is never the only signal: P&L carries "profit" or "loss", and the book's sides carry "bid" and "ask", not only green and red. The palette is safe for color-blind readers and meets WCAG AA contrast (4.5:1 for text) in light and dark themes.
- **Keyboard.** Every flow completes by keyboard. The strike list and the four buttons are arrow-key groups, the quantity is a number field, and Enter opens the review. After the wallet popup closes, focus returns to the status line.
- **Announcements.** Order results, refunds and errors go to a polite live region; errors that block an action use an alert. Live prices and book updates are not announced; a "Read price" control announces them on request.
- **Time.** Times are spelled "Eastern Time" to screen readers. The countdown is announced at 60, 15, 5 and 1 minute, never every second.
- **Motion.** No flashing on price changes when reduced motion is set, and nothing ever flashes more than three times a second.
- **Zoom and small screens.** Usable at 200% zoom, and reflows at 320 CSS pixels with no sideways scrolling except the book table. On phones the panel stacks under a five-level book, and the trade button stays reachable.
- **Plain words.** Each term (Yes, No, strike, bid, ask, settle, redeem, band) has a short definition one tap or focus away, for newcomers (F1).

Per flow:

| Flow | Key need |
|---|---|
| F1 | The payoff table is a real table with headers; the age of each price is part of its accessible name |
| F2 | Faucet steps are a numbered list; [Copy address] confirms "Address copied" in the live region |
| F3 | Cards are links whose name holds strike, prices and chance; "No quotes yet" is text, not a dash |
| F4, F5, F7 | The payoff line is read whole before the button; the cap is labelled "pay at most"; partial fills announce filled and remaining |
| F6 | Each open order row has its own named Cancel button ("Cancel order: buy 10 Yes at 60 cents") |
| F8 | The block message is announced, and focus moves to [Sell No instead] |
| F9 | The book is a table with "price" and "contracts" headers; the Yes and No views are a two-option toggle |
| F10, F11 | A refund or result is announced on the next visit; "Under review" is read with its reason |
| F12 | "Redeem all" states the count and total in its name; partial results are a list |
| F13, F20 | Tables have sortable headers and filters are form fields; transaction links name the action, not "link" |
| F15, F17 | Every irreversible action has a preview step that can be read and cancelled by keyboard |

## Research basis

- **Kalshi:** portfolio help (F1.23, CONFIRMED); the Yes-side book and reciprocal rule (F2.19, CONFIRMED); order fill reporting (F2.31, CONFIRMED); market states and cancelling at the close (F2.69, F2.70, CONFIRMED); position fields for the maker dashboard (F2.94, CONFIRMED); one matching space for Yes and No (F2.95, CONFIRMED); waiting for the authoritative source and payout timing (F4.25, SECONDARY).
- **Robinhood (Kalshi markets):** "or above" labels and cents prices (F1.17, CONFIRMED).
- **Polymarket:** price-limited market orders and partial fills (F2.29, CONFIRMED); midpoint or last-trade display (F2.42, CONFIRMED); split, merge and redeem as developer tools (F2.96, CONFIRMED); a wide activity history (F1.26, SECONDARY).
- **Test networks:** Phantom's testnet banner (F1.10, CONFIRMED); Aave's testnet mode and faucet tab (F1.12, CONFIRMED); Circle's faucet limits (F1.05, CONFIRMED).
- **Calendar:** NYSE early closes (F1.28, CONFIRMED).
- **Price source:** the devnet check of 2026-10-09, findings PS.01 to PS.06 in [S15's research](stories/S15-automatic-settlement/research.md) (CONFIRMED on-chain; the wallet's attribution to Zach is SECONDARY).
- **What reviewers value:** Byron Mackay, Gauntlet Slack #g4-peak6, 2026-03-10 ("a nice dashboard that shows when things happened"; cited in D47).
- **Accessibility:** WCAG 2.2 success criteria 1.4.3 (contrast), 1.4.4 (resize text), 1.4.10 (reflow) and 2.3.1 (three flashes) (UNCONFIRMED here: cited from the standard's numbering, not re-opened in this session).

## Assumptions to validate with real users

1. Graders use a desktop browser wallet (Phantom or Solflare), not a phone.
2. Most graders arrive outside market hours (D73), so the recorded run and the Timeline carry the demo.
3. Newcomers read "65¢" as a price and "65% chance" as its meaning without confusion (D84).
4. The banner and the first-visit notice are noticed (D33's trade-off).
5. Five contracts a side from the bot are enough for a grader to try all four trade paths (D41).
6. An hourly stock price, shown with its age, is accepted as "live" while the price source is Zach's posts (D14, PS.03).
7. "Under review" and a wait of about an hour and twenty minutes are understood and accepted (D59, D63).
8. 100.00 USDC is a sensible line for the large-order confirm (D88).
9. 65 minutes is the right age for "may be out of date" with hourly posts (F1).
10. Phantom and Solflare sign a "Redeem all" batch with one approval (D66).
