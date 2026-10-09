# Group 6 input: Proof for the grader

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** S23, S24. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research each item through three lenses: how real venues do it (business and market practice), the technical facts, and what the user needs.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (8)

### D4

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S24
- **Question:** Which languages and frameworks for the contract, the frontend and the automation service best fit the spec's requirements and stated preferences, and what would each alternative cost? If HyperLiquid is not built on, what does the spec require the documentation to say about it?

**Spec:**

> Smart contract: Rust (using the Anchor framework on Solana) is preferred. Solidity on an EVM-compatible L2 is also acceptable, though EVM chains may introduce latency challenges for on-chain order book performance.
>
> Frontend: TypeScript and React (Next.js recommended)
>
> Automation service: TypeScript / Node.js
>
> HyperLiquid is worth considering as an alternative, though it may not natively support this type of custom instrument at this time -- research and document feasibility if you explore this path

### D11

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S23
- **Question:** Should the product have a simulation mode (fake prices and a fake clock outside the automated tests) so the full lifecycle can be shown at any hour, or should it settle only on real oracle prices? What do comparable projects do, and what does each option mean for demos, grading and testing?

**Spec:**

> Operability: Full lifecycle demo reproducible on testnet -- create → mint → trade → settle → redeem

### D18

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S24
- **Question:** Which blockchains could host this product (the spec names Solana, EVM L2s and HyperLiquid; look for others too)? How does each meet sub-second finality and the requirement that the market functions and invariants live in the project's own on-chain program, and what must the documentation say about the alternatives?

**Spec:**

> Must deploy to a blockchain (L1 or L2) with sub-second finality -- fast enough to support real-time order book trading
>
> Solana is the recommended chain given its transaction speed and existing order book infrastructure
>
> EVM L2s (e.g., Arbitrum, Base) are acceptable alternatives, but be prepared to justify how order book latency is handled
>
> The following functions must exist in your on-chain program. Names are descriptive -- use whatever naming convention fits your chain:

### D30

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S23
- **Question:** What test plan covers the spec's testing requirements, and which areas does the spec's list leave out for a product with an on-chain order book (its own or an existing one), an oracle and scheduled jobs? Which test tools for Solana programs are current today?

**Spec:**

> Unit tests for all core functions (mint, settle, redeem, etc.)
>
> Invariant tests: Yes payout + No payout = $1.00 for all possible prices
>
> Full lifecycle: create market → mint pair → trade on order book → settle → redeem
>
> Tests run locally and validate all key invariants

### A2

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S24
- **Question:** What is Solana devnet's actual reliability record (halts, restarts, ledger resets), and what can a project do to keep a verifiable record of a trading day lost to an outage?

**Spec:**

> If using Solana, deployment to Solana devnet is required to pass. Include reproducible scripts to deploy and run the full lifecycle on devnet.

### Q23

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S24
- **Question:** The liveness metric expects markets created before the open and settled within 10 minutes of the close "every trading day". How should a day lost to a devnet halt count, and how could the graders be asked?

**Spec:**

> Liveness: Markets created before market open and settled within 10 minutes of market close every trading day

### Q24

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S23
- **Question:** Settlement needs a real oracle price, and stock prices only update during US market hours. How can a grader see the full lifecycle when they run it in the evening or at a weekend?

**Spec:**

> Demonstrate: create → mint → trade → settle → redeem, end-to-end on testnet

### Q55

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S23
- **Question:** Can a grader set the system up from the README with one command on Windows, macOS and Linux? What does that command need (a local chain, an oracle access key, devnet SOL), and what would block it?

**Spec:**

> Clear README with one-command setup (e.g., make dev or equivalent)
>
> Include reproducible scripts/commands to deploy contracts, create markets, and run the full lifecycle
