# Group 2 input: Trading and liquidity

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** S4 to S11, S26, S27. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research each item through three lenses: how real venues do it (business and market practice), the technical facts, and what the user needs.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (22)

### D5

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S4, S5, S6, S7
- **Question:** How should one order book per strike serve Buy Yes, Buy No, Sell Yes and Sell No, and what does each path cost in transactions and wallet approvals?

**Spec:**

> For Meridian, each strike market has one order book where Yes tokens are traded against USDC.
>
> Key insight: Buy Yes and Sell No are the same side of the book (both are buying Yes tokens). Buy No and Sell Yes are the same side of the book (both are selling Yes tokens). One book, four user actions, two perspectives.

### D9

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S8
- **Question:** Where should the rule against holding Yes and No on the same strike be enforced (frontend, program, or both), and what could a user bypass in each case?

**Spec:**

> The frontend should enforce this by checking the user's token balances before presenting trade options and guiding them to exit their current position first.

### D13

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S4
- **Question:** When a transaction fails partway or the connection drops while a trader is signing, what can the trader end up seeing, and how do on-chain apps make sure the screen shows what actually happened?

**Spec:**

The spec is silent on this.

### D14

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S9
- **Question:** Which prices and states must the frontend show live, and how should it show a price that is not live (the market is closed, the connection dropped, the chain is down)? How do trading apps tell those cases apart on screen?

**Spec:**

> Frontend displays real-time prices, order books (both perspectives), positions, and settlement outcomes

### D15

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S4, S5
- **Question:** A price can move between the moment a trader sees it and the moment they sign. How do order-book apps protect traders from that, and how are partial fills shown?

**Spec:**

The spec is silent on this.

### D16

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S9
- **Question:** Which transport should carry live data (order books, stock prices, market status) to the browser: WebSockets, Server-Sent Events, polling, or direct chain subscriptions? Compare reconnection behaviour, browser connection limits, hosting needs and how many always-on services each requires.

**Spec:**

> Real-time order book from the CLOB, displayed for both Yes and No perspectives (same book, two views)

### D20

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S4, S9
- **Question:** Should order matching run on-chain, or off-chain with on-chain settlement (a hybrid)? What do real prediction-market venues do, and what does the spec require?

**Spec:**

> Users trade two complementary token types -- Yes and No -- on an on-chain order book.

### D21

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S4, S9
- **Question:** Use an existing Solana order book (Phoenix, OpenBook v2, Manifest, or others) or build a minimal one inside the program? For each option: maintenance status, cost per market, whether trading can be stopped at 4:00 PM ET and paused by an admin, and the build and test risk.

**Spec:**

> Use an existing on-chain CLOB already deployed on your chosen chain (e.g., Phoenix on Solana, or similar protocols on EVM chains)
>
> Build a minimal order book as part of your smart contract (more ambitious, but demonstrates deeper understanding)
>
> Pause / Unpause -- Admin can pause minting and trading in an emergency

### D25

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S5, S10, S11
- **Question:** How should the app serve ordinary traders versus market makers who mint pairs and post quotes? What does each need to see and do?

**Spec:**

> The user doesn't need to understand that Buy No is actually a mint-and-sell-Yes operation, or that Sell No is actually a buy-Yes operation.
>
> See exposure, fills, and P&L in a dashboard or portfolio view

### A1

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S4, S6
- **Question:** Should version 1 charge protocol fees? What does the spec allow, and what do comparable venues charge?

**Spec:**

> Vault balance = $1.00 × total pairs minted (exact -- fees, if any, must go to a separate account)

### Q4

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S26
- **Question:** Does trading stop at 4:00 PM ET, and what happens to orders still resting on the book at the close? How do real venues handle it, and how precise is the chain's clock?

**Spec:**

> 4:00 PM ET: US market close

### Q5

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S7, S27
- **Question:** Can someone holding one Yes and one No for the same strike turn the pair back into $1 before settlement? How do the spec's Redeem function, its token invariants and its Sell No story fit together on this?

**Spec:**

> The user now holds Yes + No, which can be redeemed for $1.00, or the system handles the close automatically
>
> Redeem -- Any token holder burns their tokens and receives the payout from the vault. Winning tokens pay $1.00; losing tokens pay $0.00.
>
> Tokens can only be destroyed via the redeem function

### Q6

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S27
- **Question:** A Buy No limit order leaves the user holding both tokens until the Yes sell fills. How should that state be shown, given the position constraint?

**Spec:**

> Limit order: atomic transaction that mints a pair, posts Yes as a limit sell at user-chosen price. User holds both tokens until the Yes sell fills.
>
> Holding both Yes and No simultaneously is only a transient state during the mint-pair operation -- it should not be a persistent user position from the trading UI.

### Q11

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S9
- **Question:** Across one stock's strikes, the Yes price should fall as the strike rises. Can the books show prices out of that order, and should the app prevent or flag it?

**Spec:**

The spec is silent on this.

### Q17

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S9
- **Question:** How can a browser show a live stock price when the oracle's streaming service requires a secret API key?

**Spec:**

> Real-time price display from oracle

### Q18

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S9
- **Question:** How should live data reach browsers: each browser subscribing to the chain and the oracle directly, or one service relaying to all of them? Compare the public devnet rate and connection limits at a realistic number of viewers.

**Spec:**

> Order book rendering and updates (both Yes and No views of the same book)

### Q21

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S10
- **Question:** Who posts the first quotes in each day's new markets, and how? What would a quoting bot need (working capital, quote refresh rate against devnet rate limits), and whose money would it use?

**Spec:**

> Post limit orders for Yes tokens on the order book
>
> Multi-user scenario: one user mints and quotes, another takes, both redeem

### Q28

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S4
- **Question:** When an incoming order crosses a resting one, at what price does the trade happen? The spec defines when orders match but not the execution price.

**Spec:**

> A CLOB (Central Limit Order Book) is a trading mechanism that matches buy and sell orders based on price-time priority. Bids (buy orders) and asks (sell orders) are posted to the book, and the matching engine fills orders when a bid price meets or exceeds an ask price.

### Q29

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S10
- **Question:** When should minting close each day? The spec opens it at 9:00 AM ET but never says when it stops.

**Spec:**

> 9:00 AM ET: Markets visible on frontend, minting enabled

### Q31

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S8
- **Question:** A user holding No who wants Yes on the same strike: should the app block them, or offer one combined action that closes the No and buys Yes? How do comparable apps handle flipping a position?

**Spec:**

> If user already holds No tokens for this strike, the UI prompts them to sell No first before buying Yes

### Q38

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S5, S7
- **Question:** The spec says "No price = $1.00 - Yes ask price", but its Buy No market order sells Yes at the best bid. What price should a No buyer and a No seller see, and which price should "implied probability" use?

**Spec:**

> No price = $1.00 - Yes ask price
>
> Market order: atomic transaction that mints a Yes/No pair, immediately sells Yes at best bid -- user keeps No tokens. One wallet approval.
>
> Contract cards showing strike, current Yes/No prices, and implied probability

### Q41

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S4
- **Question:** What can happen between 9:00 AM ET (markets visible, minting enabled) and 9:30 AM ET (trading begins)? If orders could be placed before 9:30, would that need an opening auction?

**Spec:**

> 9:00 AM ET: Markets visible on frontend, minting enabled
>
> 9:30 AM ET: US market open, live trading begins
