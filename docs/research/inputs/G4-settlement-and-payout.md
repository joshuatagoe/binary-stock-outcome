# Group 4 input: Settlement and payout

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** S15 to S19, S28. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research each item through three lenses: how real venues do it (business and market practice), the technical facts, and what the user needs.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (19)

### D1

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S15, S17
- **Question:** Which side wins when the closing price equals the strike exactly?

**Spec:**

> META closes at exactly $680 → Yes pays $1.00, No pays $0.00 (at-or-above rule)

### D2

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S19
- **Question:** What must the program enforce so every pair is backed by exactly $1 and outcomes never change? Can each stated invariant be enforced literally on Solana?

**Spec:**

> Vault balance = $1.00 × total pairs minted (exact -- fees, if any, must go to a separate account)
>
> Yes payout + No payout = $1.00 (at settlement, always)
>
> Settlement outcome is immutable once written

### D8

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S15, S16
- **Question:** When may settlement run, what checks must it pass, and what is the fallback if the oracle fails?

**Spec:**

> Settle Market -- Reads the oracle closing price and writes the binary outcome (Yes wins or No wins) to the contract. Can only be called after 4:00 PM ET. Must validate oracle data freshness and confidence.
>
> Admin Settle (Override) -- Admin-only fallback for when the oracle fails. Must enforce a time delay (e.g., 1 hour after market close) before it can be called. Used only in emergencies.

### D26

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S15, S28
- **Question:** Beyond rejecting a confidence band that is too wide, how should settlement handle uncertainty in the oracle price at the close? And how could the project check, after the fact, that each settlement paid the side the official closing price would have?

**Spec:**

> Confidence check: Reject prices where the oracle's reported confidence band is too wide (configurable threshold)

### D28

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S15
- **Question:** How can the settle instruction be sure a price account is genuine (right owner program, right feed, fully verified, published at the right time)? What attacks exist when it isn't?

**Spec:**

> Settlement price read: The settle function must read the stock's closing price on-chain from the oracle during the settlement transaction

### A4

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S19
- **Question:** How should money be represented on-chain and off-chain (USDC decimals, Yes/No token decimals, price ticks, the oracle's price format) so that no rounding error can occur?

**Spec:**

The spec is silent on this.

### Q2

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** Which oracles provide prices for all 7 MAG7 stocks on Solana devnet, with a confidence value and a price at 4:00 PM ET?

**Spec:**

> Provide the current day's closing price at 4:00 PM ET (for settlement)
>
> Include a staleness check (price must be recent) and a confidence/quality check

### Q3

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** Which price counts as "the close"? How do the oracle's publish times around 4:00 PM ET relate to the official closing auction price, and how should staleness be measured for a price that stops updating at 4:00?

**Spec:**

> Staleness check: Reject prices older than a defined threshold (e.g., 5 minutes)

### Q13

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** Can the settlement fallback path (retries for up to 15 minutes, an admin override after a delay) meet "settled within 10 minutes of market close"? How should misses be counted and reported?

**Spec:**

> Liveness: Markets created before market open and settled within 10 minutes of market close every trading day

### Q16

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** What does oracle access cost for MAG7 equity prices on Solana devnet (plans, trials, API keys), and what are the alternatives?

**Spec:**

> You must choose and integrate a price oracle available on your chosen chain. Popular options exist on both Solana and EVM chains. Justify your choice.

### Q20

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** Should settlement use a single closing price or a short average? What manipulation risk and what mismatch with the official close does each carry?

**Spec:**

> Read the oracle's closing price for the stock

### Q27

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S18
- **Question:** Where should Portfolio P&L and trade History get their data (entry prices, past fills), given public RPC rate limits?

**Spec:**

> Portfolio with entry price, current price, P&L, and redeem button for settled contracts

### Q30

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S19
- **Question:** Solana's token program lets holders burn their own tokens without our program. How does that interact with "tokens can only be destroyed via the redeem function", and what options exist to enforce or reinterpret it?

**Spec:**

> Tokens can only be destroyed via the redeem function

### Q36

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S28
- **Question:** If the oracle's confidence band at the close includes the strike, so the winner is uncertain, what should settlement do? Do retries help after the close?

**Spec:**

> If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes.

### Q37

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** Who should be allowed to call settle: only the automation service, or anyone once the closing price exists? What does each choice mean for correctness and for liveness?

**Spec:**

> Settlement occurs automatically via the automation service at ~4:05 PM ET

### Q39

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S17
- **Question:** Does "signs one transaction" to redeem still hold when a user has winnings in many markets? What limits a single Solana transaction, and what does keeping tokens "redeemable indefinitely" cost?

**Spec:**

> User clicks "Redeem," signs one transaction to burn tokens and receive USDC
>
> Unredeemed tokens remain redeemable indefinitely

### Q43

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S16
- **Question:** How should the admin override be designed so a wrong manual price can be caught before it becomes final? What delays and safeguards do comparable protocols use?

**Spec:**

> Admin override with time delay enforcement

### Q45

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S19
- **Question:** Can "vault balance = $1.00 × total pairs minted (exact)" hold after redemptions and after someone sends USDC straight into the vault? What precise form should the tests check?

**Spec:**

> Vault balance invariant after every mint and redeem operation

### Q48

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S15
- **Question:** What should happen if a stock is halted at the close and no normal closing price exists?

**Spec:**

The spec is silent on this.
