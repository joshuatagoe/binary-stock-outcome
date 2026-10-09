# Research: S24 Reads why each chain and architecture choice was made, and the known limits

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (pilot), group 6: Proof for the grader

### F6.01 [D4] [S24] CONFIRMED

Anchor 1.0.0 targets Solana 3.x (3.1.10 recommended) and makes Surfpool the default backend for anchor test and localnet; --validator legacy keeps solana-test-validator.

- Lens: venues
- Source: [Anchor 1.0.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0): "Surfpool replaces the local validator as the default backend for `anchor test` and `anchor localnet`."
- Verification (2026-10-09): held: Opened Anchor 1.0.0 release notes (primary). Says Anchor 1.0.0 targets Solana 3.x, recommended 3.1.10, Surfpool replaces the local validator as default for anchor test/localnet, and --validator legacy keeps solana-test-validator.

### F6.02 [D4] [S24] CONFIRMED

The spec prefers Rust/Anchor on Solana, TypeScript/React (Next.js recommended) frontend and TypeScript/Node automation; it says to avoid unnecessary third-party abstractions and justify major dependencies. Anchor and Next.js choices therefore need written justification, not a verdict from the spec.

- Lens: user
- Source: [Meridian spec (local file docs/spec/meridian_project.txt)](file:///docs/spec/meridian_project.txt): "Smart contract: Rust (using the Anchor framework on Solana) is preferred. ... Avoid unnecessary third-party abstractions; justify all major dependencies"
- Verification (2026-10-09): held: Read docs/spec/meridian_project.txt lines 61-66 and 92. Rust/Anchor preferred, TypeScript/React (Next.js recommended), TypeScript/Node automation, and 'Avoid unnecessary third-party abstractions; justify all major dependencies'. The verdict-versus-justification point is an inference but follows from the text.

### F6.03 [D4] [D18] [S24] CONFIRMED

Hyperliquid HIP-4 outcome markets exist: fully collateralized binary contracts, first market a daily BTC binary settling at 06:00 UTC to the HyperCore mark price, Yes pays settleFraction. The doc does not say who may deploy markets and does not mention a testnet.

- Lens: venues
- Source: [Hyperliquid docs: HIP-4 Outcome Markets](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-4-outcome-markets): "settles daily at 06:00 UTC to the BTC mark price on HyperCore mark prices"
- Verification (2026-10-09): held: Opened Hyperliquid HIP-4 docs (primary). Fully collateralized contracts, first market recurring binary settling daily at 06:00 UTC to the BTC mark price on HyperCore, settleFraction=1 for binary yes. Page does not say who may deploy and does not mention testnet (only 'initial mainnet release').

### F6.04 [D4] [D18] [S24] SECONDARY

Third-party reports say HIP-4 went live on mainnet 2 May 2026, settles in USDH not USDC, is curated for now, and permissionless deployment (500,000 HYPE stake per slot) is planned, testnet first. Reports differ on details (oracle vs mark price), so treat as unverified.

- Lens: venues
- Source: [Hyperliquid Advances HIP-4 with Plans for Permissionless Outcome Market Deployment](https://www.crowdfundinsider.com/2026/07/292760-hyperliquid-advances-hip-4-with-plans-for-permissionless-outcome-market-deployment/): "permissionless deployment of binary contracts ... testnet before mainnet"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.09 [D18] [S24] CONFIRMED

The spec requires a chain with sub-second finality, names Solana (recommended), EVM L2s (justify order-book latency) and HyperLiquid (document feasibility), and lists functions that must exist in the project's own on-chain program (initialize, create market, mint, settle, admin settle, redeem, pause).

- Lens: technical
- Source: [Meridian spec (local file)](file:///docs/spec/meridian_project.txt): "The following functions must exist in your on-chain program."
- Verification (2026-10-09): held: Spec lines 70-81 (sub-second finality, Solana recommended, EVM L2s justify latency, HyperLiquid research feasibility) and 349-373 ('The following functions must exist in your on-chain program'; initialize config, create strike market, mint pair, settle, admin settle, redeem, pause/unpause).

### F6.10 [D18] [S24] SECONDARY

Phoenix is an open-source on-chain Solana CLOB with price-time priority, launched March 2023; its devnet availability and current 2026 status were not found.

- Lens: venues
- Source: [QuickNode: Phoenix](https://quicknode.com/builders-guide/tools/phoenix-trade-by-phoenix): "on-chain central limit order book"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.11 [D18] [S24] UNCONFIRMED

Other chains (Sui/DeepBook, Aptos, Sei, Monad, Base/Arbitrum finality figures) and Solana's confirmed-vs-finalized timings were not researched or verified in this run.

- Lens: venues
- Source: [Solana clusters](https://solana.com/docs/references/clusters): "Devnet ... a playground for anyone who wants to take Solana for a test drive"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.15 [A2] [Q23] [S24] CONFIRMED

Solana docs state devnet may be subject to ledger resets, is for developers, runs a similar release branch to mainnet, and has a faucet; general RPC limits are 100 requests per 10 s per IP.

- Lens: technical
- Source: [Solana clusters](https://solana.com/docs/references/clusters): "Devnet may be subject to ledger resets"
- Verification (2026-10-09): held: Opened solana.com/docs/references/clusters (primary). 'Devnet may be subject to ledger resets', application developers should target Devnet, same release branch as Mainnet Beta, token faucet, max 100 requests per 10 seconds per IP.

### F6.16 [A2] [Q23] [S24] SECONDARY

Mainnet had seven full halts 2020 to Feb 2024 (Helius); the Feb 2024 bug (about 5 hours) was found while investigating a devnet cluster outage. No authoritative record of devnet halts or reset dates was found.

- Lens: venues
- Source: [Helius: Solana outages complete history](https://helius.dev/blog/solana-outages-complete-history): "investigation into a Devnet cluster outage"
- Verification (2026-10-09): downgraded from CONFIRMED: Opened Helius blog (third-party write-up). Says seven separate outage incidents over five years, Feb 2024 bug almost five hours, identified during 'an investigation into a Devnet cluster outage'. Helius wording is 'outage incidents' rather than 'full halts', and it is not a primary source. The absence of an authoritative devnet record is a negative claim that I did not check.

### F6.17 [A2] [S24] UNCONFIRMED

No source on verifiable outage-evidence practice (hash-anchored logs, status snapshots) was found; the evidence-bundle approach is reasoning, not sourced practice.

- Lens: user
- Source: [Solana clusters](https://solana.com/docs/references/clusters): "may be subject to ledger resets"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.18 [Q23] [S24] CONFIRMED

The spec's liveness metric says 'every trading day' with no devnet-outage carve-out; its only failure path is oracle failure (retry 15 min, admin override after a delay). Who grades and how was not found.

- Lens: user
- Source: [Meridian spec (local file)](file:///docs/spec/meridian_project.txt): "Liveness: Markets created before market open and settled within 10 minutes of market close every trading day"
- Verification (2026-10-09): held: Spec line 48 liveness text 'every trading day' with no devnet carve-out; failure handling lines 409-412 and 446-448 cover only oracle failure (retry up to 15 min, admin override after delay). Who grades was not stated in the portions read.