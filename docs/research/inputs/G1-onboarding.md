# Group 1 input: Onboarding

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** S1, S2, S3, S25. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research each item through three lenses: how real venues do it (business and market practice), the technical facts, and what the user needs.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (7)

### D10

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S1, S3
- **Question:** Which pages and on-screen elements does a trader need, and how should the payoff be stated before every trade so a beginner sees the most they can win and lose?

**Spec:**

> Landing -- Product explanation, live prices, connect wallet call-to-action
>
> Simple payoff display: "You pay $X. You win $1.00 if [STOCK] closes above [STRIKE]."
>
> max gain is known at entry, max loss is known at entry.

### Q7

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S1, S3
- **Question:** The spec phrases the question as "close above" in places, while its payout rule says "at or above". What wording should users see, and how do comparable venues phrase a close exactly at the strike?

**Spec:**

> Yes token: Pays $1.00 USDC if the stock closes at or above the strike price. Pays $0 otherwise.
>
> Contract -- A binary outcome instrument: "Will [STOCK] close above [STRIKE] today?"

### Q19

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S25
- **Question:** How does a devnet user get SOL for fees and USDC to trade? What do the public faucets give and how often, can a script use them, and what alternatives exist?

**Spec:**

> Never use mainnet or real funds for the core submission
>
> Mint Pair -- Any user deposits $1.00 USDC into the vault, receives 1 Yes token + 1 No token

### Q22

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S25
- **Question:** How should the app make clear that devnet tokens are play money with no value, and how do other testnet apps do it?

**Spec:**

> Never use mainnet or real funds for the core submission

### Q40

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S25, S26, S27, S28, S29
- **Question:** Which user stories does a complete product need that the spec's User Stories section leaves out? Consider every role (trader, market maker, admin, operator, grader) and every failure state. S25 to S29 are already known; look beyond them.

**Spec:**

The spec is silent on this.

### Q52

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S1, S3
- **Question:** What do the spec's page list and key UI elements leave unspecified that a trader or market maker would need, and how do comparable apps handle those screens and states?

**Spec:**

> Portfolio -- Active positions, settled outcomes, P&L, redeem buttons
>
> History -- Trade execution log
>
> Settlement countdown timer to 4:00 PM ET

### Q54

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S2
- **Question:** In a non-custodial app with no accounts, how do traders, the admin and the operator prove who they are, and how should an admin-only screen be protected?

**Spec:**

> User connects wallet and sees their USDC balance
