# Group 5 input: Platform

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** S20, S21, S22, S29. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research each item through three lenses: how real venues do it (business and market practice), the technical facts, and what the user needs.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (11)

### D17

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S20
- **Question:** How should secrets (admin and automation wallet keys, the oracle API key) be stored and documented?

**Spec:**

> Secrets via environment variables; provide .env.example

### D19

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S29
- **Question:** If Solana devnet halts on a trading day, what should the program, the backend and the website do during the halt and after it returns, including for markets whose close passed while the chain was down?

**Spec:**

> Settlement job (~4:05 PM ET): For each open contract, call settle market. If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes. If still failing, alert admin for manual override.

### D22

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** none (cross-cutting)
- **Question:** Which framework and tooling should the Solana program use (Anchor versions, native Rust, Pinocchio, others), developed on Windows, with which client generator and test framework?

**Spec:**

> Smart contract: Rust (using the Anchor framework on Solana) is preferred.

### D23

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** none (cross-cutting)
- **Question:** What is the overall system shape: which parts live on-chain, in the browser and in an always-on service, and what must each part never be able to do?

**Spec:**

> This service should live in the same repo as the smart contract and frontend.

### D24

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S20, S21
- **Question:** Who may call each program function (config, create and add strike, mint, place and cancel orders, settle, override, pause, redeem), and who controls the Yes/No token mint authority?

**Spec:**

> Mint Pair -- Any user deposits $1.00 USDC into the vault, receives 1 Yes token + 1 No token
>
> Admin Settle (Override) -- Admin-only fallback for when the oracle fails. Must enforce a time delay (e.g., 1 hour after market close) before it can be called. Used only in emergencies.

### D27

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S20
- **Question:** Which program functions does the full lifecycle need beyond the eight the spec requires?

**Spec:**

> The following functions must exist in your on-chain program. Names are descriptive -- use whatever naming convention fits your chain:

### Q12

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** none (cross-cutting)
- **Question:** Which Solana confirmation level counts as "sub-second finality" on devnet and on mainnet today? Measure it directly where possible.

**Spec:**

> Must deploy to a blockchain (L1 or L2) with sub-second finality -- fast enough to support real-time order book trading

### Q25

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** none (cross-cutting)
- **Question:** Who can upgrade the program after deployment, and how should the upgrade key be held so that "settlement outcome is immutable once written" stays true?

**Spec:**

> Settlement outcome is immutable once written

### Q26

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** none (cross-cutting)
- **Question:** Should the website use Next.js (the spec's recommendation) or plain React, and how should it be built and hosted if it has no server-side work?

**Spec:**

> Frontend: TypeScript and React (Next.js recommended)

### Q44

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S21
- **Question:** What should Pause stop (minting, placing orders, cancelling, settlement, redemption), and how do comparable protocols keep users able to withdraw during a pause?

**Spec:**

> Pause / Unpause -- Admin can pause minting and trading in an emergency

### Q53

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S22
- **Question:** What should be logged on-chain, in the backend and in the browser for audit, monitoring and alerting, without logging secrets or personal data?

**Spec:**

> Monitoring and alerting for daily operations
