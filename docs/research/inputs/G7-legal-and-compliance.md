# Group 7 input: Legal and compliance lens (facts, not legal advice)

Written 2026-10-09 for the stage 1 decision review. Questions only: no proposed answers.

- **Stories:** all 29. Read each story file in `docs/stories/` (index: `docs/stories/README.md`).
- **Spec:** `docs/spec/meridian_project.txt` (gitignored, so open it by this path). The PDF is beside it.
- **Do not open** `docs/DECISIONS.md`, `docs/planning/`, or any plan file. The review is blind.

Research every item through one lens: facts about law, regulation, licensing and market practice, with sources. This is not legal advice, and findings must not claim the product is compliant, legal or regulated.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED. Sources that contradict each other stay UNCONFIRMED.

## Items (6)

### D3

- **Kind:** decision. Research it blind and give your leading answer plus the strongest case against it.
- **Stories:** S2, S19
- **Question:** What do "no KYC, no custody, no margin" and "never use mainnet or real funds" mean in practice for a devnet app, and what legal exposure, if any, does a devnet-only deployment with no-value tokens carry?

**Spec:**

> No KYC, no custody, no margin.
>
> Never use mainnet or real funds for the core submission

### Q46

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S4
- **Question:** Should positions be capped per wallet per market? What do regulated venues do, and what can a cap achieve on a permissionless chain where one person can use many wallets?

**Spec:**

The spec is silent on this.

### Q47

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S16, S28
- **Question:** How can users dispute a settlement? What do comparable venues provide, and what is proportionate for a devnet project?

**Spec:**

The spec is silent on this.

### Q49

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S22
- **Question:** What legal and practical issues would a mainnet deployment with real USDC raise for single-stock binary contracts offered without KYC?

**Spec:**

> Deploy to Solana mainnet-beta (or equivalent production chain) with real infrastructure

### Q50

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S1, S3, S9
- **Question:** Can live prices of Nasdaq-listed stocks be shown publicly in the app, and under what terms (exchange data agreements, delayed data, the oracle provider's terms)?

**Spec:**

> Markets -- Grid of 7 stocks with live prices and active contract counts

### Q51

- **Kind:** open question. Research the options and their evidence. Do not pick for the user.
- **Stories:** S1, S25
- **Question:** Do comparable products geo-block users or screen wallets, and is that proportionate for a devnet-only app with no-value tokens?

**Spec:**

The spec is silent on this.
