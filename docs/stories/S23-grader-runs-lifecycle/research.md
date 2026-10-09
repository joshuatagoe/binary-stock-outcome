# Research: S23 Runs one command and watches create, mint, trade, settle and redeem on devnet

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (pilot), group 6: Proof for the grader

### F6.05 [D11] [Q24] [S23] CONFIRMED

Pyth US equity feeds follow sessions: regular 9:30-16:00 ET weekdays, pre-market 4:00-9:30, post-market 16:00-20:00, overnight Sun-Thu 20:00-04:00 ET; closed Fri-Sat night and weekends. The page does not say what price is published when closed.

- Lens: technical
- Source: [Pyth market hours](https://docs.pyth.network/price-feeds/market-hours): "Overnight: Every Sunday to Thursday from 8PM ET to 4AM ET"
- Verification (2026-10-09): held: Opened Pyth market hours page (primary). Regular weekdays 9:30AM-4PM ET, pre-market 4-9:30AM, post-market 4-8PM, overnight Sunday to Thursday 8PM-4AM ET, overnight closed Friday to Saturday, markets closed weekends. Page does not say what price is published when closed.

### F6.06 [D11] [Q24] [S23] CONFIRMED

The spec requires the settle function to read the closing price on-chain with staleness and confidence checks, and a demo end-to-end on testnet that is reproducible. A mock must keep these checks to remain a faithful demonstration.

- Lens: user
- Source: [Meridian spec (local file)](file:///docs/spec/meridian_project.txt): "Operability: Full lifecycle demo reproducible on testnet"
- Verification (2026-10-09): held: Spec lines 51, 399-405: 'Operability: Full lifecycle demo reproducible on testnet'; settle must read closing price on-chain with staleness and confidence checks. The 'mock must keep these checks' conclusion is inference, but the requirements are in the spec.

### F6.07 [D11] [Q24] [S23] SECONDARY

Surfpool (Anchor 1.0 default) is described by third parties as wrapping LiteSVM with a JSON-RPC server and cheatcodes (surfnet_* methods) that can set accounts and time, which would let a local demo set a price and clock. Details are from a third-party guide.

- Lens: technical
- Source: [Chainstack: Surfpool](https://docs.chainstack.com/docs/solana-surfpool): "wraps LiteSVM ... exposes a full Solana JSON-RPC server and adds surfnet_* cheatcode methods"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.08 [D11] [S23] UNCONFIRMED

No comparable-project evidence on whether prediction/binary-options protocols ship a simulation mode was gathered; not verified.

- Lens: venues
- Source: [Hyperliquid HIP-4 (only comparable opened)](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-4-outcome-markets): "Fees are currently zero for initial testing"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.12 [D30] [S23] SECONDARY

Current Solana test tooling per third-party guides: LiteSVM (in-process VM; Rust/TS/Python) for unit tests, Mollusk for single-instruction tests (no CPI across programs, no sysvars per a Surfpool guide), Surfpool for integration, solana-test-validator still available; bankrun reportedly deprecated in favour of LiteSVM (not confirmed from the repo).

- Lens: technical
- Source: [Chainstack: LiteSVM testing](https://docs.chainstack.com/docs/solana-litesvm-testing): "in-process Solana VM much faster than solana-program-test and solana-test-validator"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.13 [D30] [S23] CONFIRMED

The spec's listed tests: unit tests, settlement at/above/below strike, invariant tests, vault balance after each mint/redeem, oracle stale/confidence/valid, admin override delay, lifecycle, all 4 trade paths, multi-user, and frontend tests. It lists no tests for the automation service, scheduling/calendar, authorization, or CLOB edge cases.

- Lens: user
- Source: [Meridian spec (local file)](file:///docs/spec/meridian_project.txt): "Vault balance invariant after every mint and redeem operation"
- Verification (2026-10-09): held: Spec testing section lines 452-479 lists unit, at/above/below strike, invariants, vault balance after each mint/redeem, oracle stale/confidence/valid, admin override delay, lifecycle, 4 trade paths, multi-user, frontend tests. No tests listed for automation service, scheduling, authorization or CLOB edge cases.

### F6.14 [D30] [S23] SECONDARY

Pyth Solana SDK get_price_no_older_than takes a max age and (in current docs) a feed ID; the signature varies by SDK version, and Account<PriceUpdateV2> checks ownership. Tests should cover wrong-feed and stale cases.

- Lens: technical
- Source: [Pyth: use real-time data on Solana](https://docs.pyth.network/price-feeds/use-real-time-data/solana): "get_price_no_older_than(&Clock::get()?, maximum_age, &feed_id)"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.19 [Q24] [D11] [S23] SECONDARY

Pyth's Solana receiver (rec5EKMGg6...) and price feed program are listed as deployed on Solana devnet by a third-party listing; whether devnet equity feeds exist and update on the mainnet schedule was not found.

- Lens: technical
- Source: [Pyth skill listing](https://smithery.ai/skills/sendaifun/pyth): "Deployed on: Solana Mainnet, Devnet"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.20 [Q55] [S23] CONFIRMED

Hermes (Pyth's price service) now requires an API key; the Core upgrade completed 26 Aug 2026. Whether a free tier exists was not stated on the page.

- Lens: technical
- Source: [Pyth Hermes docs](https://docs.pyth.network/price-feeds/core/api-instances-and-providers/hermes): "Hermes now requires an API Key."
- Verification (2026-10-09): held: Opened Pyth Hermes docs (primary). Banner 'Hermes now requires an API Key.' and 'Pyth Core was upgraded on August 26, 2026'. No free tier mentioned.

### F6.21 [Q55] [S23] SECONDARY

Anchor and Solana docs say Windows development must go through WSL (all dependencies installed in the Linux terminal); no native Windows Agave 3.x support was found.

- Lens: technical
- Source: [Anchor installation](https://anchor-lang.com/docs/installation): "Windows users must first install WSL"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.22 [Q55] [S23] CONFIRMED

Anchor 1.0 requires Surfpool installed (>=1.1.2) or anchor test fails; Solana 3.1.10 recommended; this adds installs a one-command setup must handle.

- Lens: technical
- Source: [Anchor 1.0.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0): "The lowest recommended version is v1.1.2"
- Verification (2026-10-09): held: Anchor 1.0.0 release notes: 'The lowest recommended Surfpool version for use with Anchor is v1.1.2' and Surfpool must be installed to use the default anchor test/localnet commands; Solana 3.1.10 recommended. The page does not literally say anchor test fails, but --validator legacy is the documented alternative, so 'fails' is a fair reading.

### F6.23 [Q55] [S23] CONFIRMED

The spec requires a README with one-command setup (make dev or equivalent) and reproducible scripts to deploy, create markets and run the lifecycle; devnet public RPC is capped at 100 requests per 10 s per IP and faucet caps were not specified.

- Lens: user
- Source: [Solana clusters](https://solana.com/docs/references/clusters): "100 requests per 10 seconds per IP"
- Verification (2026-10-09): held: Spec lines 486-491 require reproducible deploy/create-market/lifecycle scripts and a README with one-command setup (make dev or equivalent). Solana clusters page confirms 100 requests per 10 seconds per IP. Faucet caps are not given there or in the spec lines read.