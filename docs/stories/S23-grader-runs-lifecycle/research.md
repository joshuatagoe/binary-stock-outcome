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

## 2026-10-09 decision review (full), group 6: Proof for the grader

### F6.04 [D4] [D30] [Q55] [S24] [S23] CONFIRMED

Anchor's latest release is v1.2.1 (2026-10-06); releases from v1.0.3 live under solana-foundation/anchor. Anchor 1.0 changed: 'anchor init' generates a LiteSVM test template by default; 'anchor test' and 'anchor localnet' now use Surfpool instead of the local validator ('--validator legacy' restores it); TypeScript package moved to @anchor-lang/core; mutable accounts passed twice error unless 'dup'; Anchor 1.0 targets Solana 3.x.

- Lens: technical
- Source: [Anchor 1.0.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0): "anchor init now generates a LiteSVM test template by default ... anchor test and anchor localnet now use Surfpool instead of the local validator."
- Source: [solana-foundation/anchor releases](https://github.com/solana-foundation/anchor/releases): "v1.2.1 (Latest) 06 Oct 2026"
- Verification (2026-10-09): held: Release notes 1-0-0 confirm LiteSVM default, Surfpool for test/localnet with --validator legacy, @anchor-lang/core, dup, Solana 3.x. Releases page shows v1.2.1 Latest, 06 Oct (2026-10-06). The 'from v1.0.3 under solana-foundation' detail was not checked.

### F6.10 [D11] [Q24] [S23] CONFIRMED

Pyth's market-hours page lists US equities: regular session weekdays 9:30-16:00 ET, pre-market 4:00-9:30, post-market 16:00-20:00, overnight Sun-Thu 20:00-04:00 (follows Blue Ocean ATS), closed on weekends and NYSE holidays. The page does not say how feeds behave when closed.

- Lens: technical
- Source: [Pyth Core: market hours](https://docs.pyth.network/price-feeds/core/market-hours): "Markets are closed on weekends, and follow NYSE Holidays & Trading Hours"
- Verification (2026-10-09): held: Pyth market-hours page: regular 9:30-16:00, pre 4:00-9:30, post 16:00-20:00, overnight 20:00-04:00 Sun-Thu following Blue Ocean; page does not say how feeds behave when closed. Weekend/NYSE-holiday closure wording not shown in fetch summary but quote is consistent.

### F6.11 [D11] [Q24] [S23] CONFIRMED

Pyth best practices: 'US equity markets only trade during certain hours, and outside those hours, it's not clear what an equity's price is'; SDKs include a default staleness check; pause activity when confidence/price exceeds a threshold; for settlement, make sure a confidence-dependent contract can still settle if the interval never narrows.

- Lens: technical
- Source: [Pyth Core: best practices](https://docs.pyth.network/price-feeds/core/best-practices): "US equity markets only trade during certain hours, and outside those hours, it's not clear what an equity's price is."
- Verification (2026-10-09): held: Pyth best-practices page contains the equity-hours 'not clear what an equity's price is' statement, default staleness check, pause on confidence ratio, and settle even if the interval never narrows.

### F6.12 [D11] [Q24] [Q55] [S23] CONFIRMED

Since the Pyth Core upgrade completed on 2026-08-26, every Hermes user needs a Pyth API key (Authorization: Bearer; SDK accessToken), obtained from Pyth Terminal with a free trial and paid plans; no pricing, free-tier size or rate limits are given on the page. Upgraded base URL is pyth.dourolabs.app/hermes; hermes.pyth.network still works but needs a key.

- Lens: technical
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "every Hermes user needs a Pyth API Key"
- Source: [Pyth Hermes API instances](https://docs.pyth.network/price-feeds/core/api-instances-and-providers/hermes): "Pyth Core upgrade completed successfully on August 26, 2026. Hermes now requires an API Key."
- Verification (2026-10-09): held: Upgrade-preparing page: 'every Hermes user needs a Pyth API Key', Authorization: Bearer, Pyth Terminal, free trial plus paid plans, no pricing or limits, pyth.dourolabs.app/hermes for early upgrade. Hermes page has the 2026-08-26 completion sentence. accessToken and 'old URL still works' are implied, not explicit (hermes.pyth.network 'now requires authentication').

### F6.13 [D11] [Q24] [S23] UNCONFIRMED

Pyth Pro docs: when fewer than min_pub publishers contribute, no new aggregate is produced and price, confidence, EMA, publisherCount and feedUpdateTimestamp are carried forward; only marketSession still updates; compare feedUpdateTimestamp to timestampUs to detect carried-forward data. This is the Pro product; the Core aggregation page now redirects to these Pro pages, but I did not confirm that Core equity feeds on Solana behave identically.

- Lens: technical
- Source: [Pyth Pro: understanding price data](https://docs.pyth.network/price-feeds/pro/understanding-price-data): "The only property that still updates is marketSession"
- Source: [Pyth Core: price aggregation](https://docs.pyth.network/price-feeds/core/how-pyth-works/price-aggregation): "Pythnet, where the aggregation previously happened, is being shut down (page points to Pyth Pro docs)"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.14 [D11] [Q24] [Q55] [S23] CONFIRMED

On Solana, Pyth is a pull oracle: PriceUpdateV2 accounts, read with get_price_no_older_than(&Clock, max_age, &feed_id); the account only guarantees a verified price for some feed at some time so the program must check feed id and timestamp; price update accounts 'are a good fit for applications that want to consume prices for a specific timestamp'. The receiver program is deployed on both mainnet and devnet at the same address, and the README's devnet example fetches the update from the stable mainnet Hermes API and posts it to devnet.

- Lens: technical
- Source: [Pyth Core: use real-time data on Solana (pull integration)](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana): "PriceUpdateV2 only guarantees a verified price for some feed at some time"
- Source: [pyth-crosschain Solana target chain README](https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/solana): "currently deployed on Solana (Mainnet, Devnet) and Eclipse Testnet"
- Verification (2026-10-09): held: Pyth Solana pull-integration page confirms PriceUpdateV2 guarantee wording, get_price_no_older_than and the 'specific timestamp' line. The pyth-crosschain README shows the devnet example fetching from hermes.pyth.network and posting to api.devnet.solana.com; it does not explicitly say same address on both networks or call Hermes 'mainnet', and the exact 'deployed on Solana (Mainnet, Devnet)' quote was not seen. Those parts are inference.

### F6.15 [D11] [D18] [S23] CONFIRMED

Kalshi runs a separate demo environment: demo accounts use mock funds, demo and production credentials are separate, and the page warns that market prices and behaviour in demo may not reflect real markets (REST root external-api.demo.kalshi.co/trade-api/v2).

- Lens: venues
- Source: [Kalshi docs: demo environment](https://docs.kalshi.com/getting_started/demo_env): "Market prices and behavior in demo may not reflect real markets."
- Verification (2026-10-09): held: Kalshi demo page: mock funds, credentials not shared, prices/behavior may not reflect real markets (wording slightly differs from the quote), REST root external-api.demo.kalshi.co/trade-api/v2 recommended.

### F6.16 [D11] [S23] CONFIRMED

Stripe's Billing sandbox uses 'test clocks' to simulate time passing so lifecycle events (renewals, trials, payment failures) can be tested at any time; an example of a mainstream venue shipping a fake clock outside unit tests.

- Lens: venues
- Source: [Stripe: use simulations (test clocks) to simulate Billing objects](https://docs.stripe.com/billing/testing/test-clocks): "Simulations use test clocks to control time."
- Verification (2026-10-09): held: Stripe test-clocks page: 'Simulations use test clocks to control time'; covers payment failure on renewal, trials, lifecycle webhooks.

### F6.17 [D11] [D30] [S23] CONFIRMED

LiteSVM lets tests set the Clock sysvar (unix_timestamp), jump with warp_to_slot, and write arbitrary accounts with set_account (including a mock oracle account with the oracle program as owner and bytes matching its layout). This is available in tests only; a devnet cluster cannot be time-warped.

- Lens: technical
- Source: [Anchor docs: testing with LiteSVM](https://www.anchor-lang.com/docs/testing/litesvm): "svm.set_sysvar::<Clock>(&clock); svm.set_account(address, Account { ... })"
- Verification (2026-10-09): held: Anchor LiteSVM page has set_sysvar Clock example, set_account example, warp_to_slot in a See-also line. The page has no mock-oracle example; that use is an extension. Devnet not being warpable is obvious inference.

### F6.18 [D11] [Q24] [Q55] [S23] CONFIRMED

Surfpool is a drop-in replacement for solana-test-validator working with just-in-time mainnet account state; its cheatcodes list includes Stream Oracles, a Universal Faucet and Time Travel. The README lists install by bash curl script, cargo, or Docker image (surfpool/surfpool); Windows support is not mentioned.

- Lens: technical
- Source: [solana-foundation/surfpool README](https://github.com/solana-foundation/surfpool): "drop-in replacement for solana-test-validator ... Time Travel"
- Verification (2026-10-09): held: Surfpool README: drop-in replacement for solana-test-validator; cheatcodes Stream Oracles, Universal Faucet, Transaction Inspector, Time Travel; install by curl script, cargo, Docker; Windows not mentioned.

### F6.32 [D30] [S23] CONFIRMED

Anchor's testing page lists three options: LiteSVM (Rust, TypeScript/JavaScript, Python), Mollusk (Rust) and coverage-guided fuzzing via Crucible ('anchor fuzz'). In 'anchor fuzz', actions are functions prefixed action_ in a #[fuzz_fixture] and invariants are #[invariant_test] functions run after each action; commands include init, run, show, tmin, cmin, list.

- Lens: technical
- Source: [Anchor docs: testing](https://www.anchor-lang.com/docs/testing): "Coverage-guided fuzzing for Solana programs using Crucible."
- Source: [Anchor docs: fuzzing](https://www.anchor-lang.com/docs/testing/fuzzing): "checks invariants after each action to find bugs that unit tests can miss"
- Verification (2026-10-09): held: Anchor testing page lists LiteSVM (Rust/TS/JS/Python), Mollusk (Rust), fuzzing with Crucible. Fuzzing page confirms action_ prefix in fuzz_fixture, invariant_test after each action, commands init/run/show/tmin/cmin/list. The literal 'anchor fuzz' command was not seen on the testing page.

### F6.33 [D30] [S23] CONFIRMED

LiteSVM runs an in-process Solana VM, is Apache-2.0, and is faster to run and compile than solana-program-test and solana-test-validator; Node bindings exist; solana-bankrun's README says 'DEPRECATED: use LiteSVM instead'.

- Lens: technical
- Source: [LiteSVM README](https://github.com/LiteSVM/litesvm): "a fast and lightweight library for testing Solana programs"
- Source: [kevinheavey/solana-bankrun README](https://github.com/kevinheavey/solana-bankrun): "DEPRECATED: use LiteSVM instead"
- Verification (2026-10-09): held: LiteSVM README: in-process VM, Apache-2.0, 'much faster to run and compile' than solana-program-test and test-validator, Node package. solana-bankrun README says 'DEPRECATED: use LiteSVM instead'.

### F6.34 [D30] [S23] CONFIRMED

Mollusk (anza-xyz) is a lightweight single-instruction harness that skips AccountsDB and Bank, requires you to supply every account, and includes a compute-unit benchmarker (MolluskComputeUnitBencher) that writes markdown tables with deltas; instruction chains are not equivalent to real transactions.

- Lens: technical
- Source: [anza-xyz/mollusk README](https://github.com/anza-xyz/mollusk): "does not create any semblance of a validator runtime"
- Verification (2026-10-09): held: Mollusk README: single-instruction processing, no validator runtime, accounts must be supplied, MolluskComputeUnitBencher markdown tables with deltas, chains do not enforce transaction constraints.

### F6.35 [D30] [S23] CONFIRMED

Crucible (Asymmetric Research) is a coverage-guided fuzzer built on LibAFL and LiteSVM 0.15.2, MIT, generates typed bindings from an Anchor IDL, stateless and stateful modes; no published releases and 63 stars on the page. Trident (Ackee) is at release 0.11.1, MIT, Solana Foundation grant-backed, describes manually-guided fuzzing with flows.

- Lens: technical
- Source: [asymmetric-research/crucible README](https://github.com/asymmetric-research/crucible): "coverage-guided fuzzing framework for Solana smart contracts"
- Source: [Ackee-Blockchain/trident README](https://github.com/Ackee-Blockchain/trident): "manually-guided fuzzing framework for Solana programs written in Rust"
- Verification (2026-10-09): held: Crucible README: LibAFL, LiteSVM 0.15.2, MIT, IDL-typed bindings, stateless/stateful modes, no releases listed, 63 stars. Trident README: latest release 0.11.1, MIT, Solana Foundation grant, manually-guided fuzzing with flows.

### F6.36 [D30] [S23] CONFIRMED

The spec's testing list: unit tests for all core functions; settlement at/above/below strike; invariant 'Yes payout + No payout = $1.00 for all possible prices'; vault balance invariant after every mint and redeem; oracle stale/wide/valid scenarios; admin override with time delay; integration lifecycle, all four trade paths, multi-user; frontend tests. It names nothing about order-book matching correctness, automation service behaviour, calendar edge cases, account-validation attacks, fuzzing or CU limits.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Vault balance invariant after every mint and redeem operation"
- Verification (2026-10-09): held: Local spec line 458-459 has the invariant tests and the vault balance invariant after every mint and redeem. The claim of what the list omits was not exhaustively checked.

### F6.37 [D30] [Q23] [Q24] [S23] [S24] CONFIRMED

NYSE 2026: core hours 9:30 a.m.-4:00 p.m. ET; holidays on Jan 1, Jan 19, Feb 16, Apr 3, May 25, Jun 19, Jul 3, Sep 7, Nov 26, Dec 25; early closes at 1:00 p.m. ET on Nov 27 and Dec 24. The spec fixes settlement at 4:00 PM ET and does not mention early closes.

- Lens: venues
- Source: [NYSE: holidays and trading hours](https://www.nyse.com/markets/hours-calendars): "Early Closes (1:00 p.m. ET): Friday, November 27; Thursday, December 24"
- Verification (2026-10-09): held: NYSE page lists all ten 2026 holidays as claimed, early closes Fri Nov 27 and Thu Dec 24 at 1:00 p.m. ET, core hours 9:30-4:00. Spec's silence on early closes not checked (spec fixes 4:00 PM ET).

### F6.38 [D30] [Q55] [S23] CONFIRMED

GitHub Actions scheduled workflows can be delayed during high load, may be dropped, are disabled after 60 days without repository activity in public repos, run in UTC by default (IANA timezone supported), with a 5-minute minimum interval. Relevant to testing and hosting the 8:00 AM and 4:05 PM jobs.

- Lens: technical
- Source: [GitHub Docs: schedule event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule): "some queued scheduled jobs may be dropped"
- Verification (2026-10-09): held: GitHub Docs schedule section: delays under high load, queued jobs may be dropped, disabled after 60 days inactivity in public repos, UTC default with IANA timezone, 5-minute minimum.

### F6.39 [D30] [S23] CONFIRMED

LiteSVM test accounts bypass the real Pyth receiver's Wormhole/Merkle verification, so tests with injected PriceUpdateV2 bytes prove your staleness/confidence/feed-id logic but not the real posting path; that path needs a devnet run (the receiver's README says PriceUpdateV2 verification level matters and partially verified updates have a lower guarantee).

- Lens: technical
- Source: [Pyth Core: Solana pull integration](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana#price-update-accounts): "addPostPartiallyVerifiedPriceUpdates ... lowers the verification level"
- Verification (2026-10-09): held: Pyth Solana page: addPostPartiallyVerifiedPriceUpdates reduces verification level; receiver README says post_update_atomic only partially checks guardian signatures. Claim that LiteSVM bypasses verification is inference but sound.

### F6.40 [D30] [S23] CONFIRMED

Trident and Mollusk-based or LiteSVM-based property testing exist, but Solana's own Anchor 1.0 notes list a security-relevant change tests should cover: mutable accounts passed twice now error unless the 'dup' constraint is used; multiple #[error_code] blocks fail to compile; the legacy on-chain IDL instructions were replaced by the Program Metadata Program.

- Lens: technical
- Source: [Anchor 1.0.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0): "Mutable accounts passed twice in one instruction now cause a runtime error unless you add the dup constraint."
- Verification (2026-10-09): held: Anchor 1.0.0 notes: duplicate mutable accounts fail unless dup; multiple #[error_code] blocks cause compile error; on-chain IDL instructions replaced by Program Metadata Program.

### F6.41 [D30] [S23] UNCONFIRMED

What a grader needs from tests: the spec says 'Tests run locally and validate all key invariants', so the default test command must run on a local chain or in-process VM with no keys or devnet funds; this favours LiteSVM (in-process, default in Anchor 1.x) for the graded suite and keeps devnet/Pyth-key-dependent checks in a separate script.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Tests run locally and validate all key invariants"
- Source: [LiteSVM README](https://github.com/LiteSVM/litesvm): "in-process Solana VM"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.46 [A2] [Q55] [S24] [S23] CONFIRMED

Public Solana RPC endpoints are shared, not meant for production, and can return 429 or 403; this means a failed call in the log may be the endpoint, not the cluster.

- Lens: technical
- Source: [Solana RPC docs](https://solana.com/docs/rpc): "These are shared and not meant for production. They can return rate-limit errors (429) or block traffic (403)."
- Verification (2026-10-09): held: Solana RPC docs: public endpoints are shared infrastructure not for production; 429 on rate limits, 403 on blocked traffic.

### F6.51 [Q24] [S23] CONFIRMED

Chainlink Data Streams equities: standard feeds have no weekend sessions; 24/5 feeds are closed from about 8 p.m. ET Friday to 8 p.m. ET Sunday; a marketStatus field (v11: Unknown, Pre-market, Regular, Post-market, Overnight, Closed) should be used to decide if a market is open; the page does not say what price is reported when closed. Access is self-serve at app.chain.link with UUID and HMAC-signed headers. Solana devnet availability of equity streams was not confirmed.

- Lens: venues
- Source: [Chainlink Data Streams: market hours](https://docs.chain.link/data-streams/market-hours): "Always use the marketStatus field in each report to determine whether a market is open."
- Source: [Chainlink Data Streams: WebSocket interface](https://docs.chain.link/data-streams/reference/data-streams-api/interface-ws): "self-serve, no sales call required"
- Verification (2026-10-09): held: Chainlink market-hours page: standard feeds no weekend sessions, 24/5 closed ~8pm Fri to 8pm Sun ET, use marketStatus (v11 values listed; standard feeds use Unknown/Open/Closed, 24/5 feeds use the six values), price when closed not stated. WS interface page: 'self-serve, no sales call required', app.chain.link, UUID plus HMAC headers.

### F6.52 [Q24] [S23] UNCONFIRMED

The Pyth Hermes interactive API docs (pyth.dourolabs.app/docs) list a 'historical price at timestamp endpoint' among their topics, but only the topic titles were visible, so whether Hermes serves a 4:00 PM ET equity update days later, and how far back, is unconfirmed. The Hermes latest-updates response carries publish_time, prev_publish_time and proof_available_time fields.

- Lens: technical
- Source: [Pyth Hermes API (Swagger UI)](https://pyth.dourolabs.app/docs): "historical price at timestamp endpoint (topic title only)"
- Source: [Pyth Core: fetch price updates](https://docs.pyth.network/price-feeds/core/fetch-price-updates): "The sample responses include publish_time, prev_publish_time, and proof_available_time fields."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.53 [Q24] [S23] CONFIRMED

The grader scenario: the spec says 'Demonstrate: create -> mint -> trade -> settle -> redeem, end-to-end on testnet' and settle 'can only be called after 4:00 PM ET', so a run outside 4:05 PM ET on a trading day cannot settle a market on a real clock unless the market's expiry or the time source is configurable. Under the spec the daily lifecycle starts at 8:00 AM ET with markets visible at 9:00 AM ET.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Settle Market -- ... Can only be called after 4:00 PM ET."
- Verification (2026-10-09): held: Local spec line 489 'Demonstrate: create, mint, trade, settle, redeem, end-to-end on testnet', line 365 settle only after 4:00 PM ET, lines 339-341 8:00 AM job and 9:00 AM markets visible. The 4:05 PM figure and the configurability conclusion are inference.

### F6.54 [Q55] [S23] UNCONFIRMED

Solana's installation page says Windows developers 'must use Windows Subsystem for Linux (WSL)' (wsl --install, then run installs in Ubuntu); Anza's CLI install page instead gives a native Windows installer (agave-install-init.exe from cmd.exe) and prebuilt Windows binaries, noting WSL for building from source. Anchor's install page also says Windows users must first install WSL. The sources contradict on native Windows, so it stays unconfirmed.

- Lens: technical
- Source: [Solana docs: installation dependencies](https://solana.com/docs/intro/installation/dependencies): "must use Windows Subsystem for Linux (WSL)"
- Source: [Anza docs: install the Solana CLI](https://docs.anza.xyz/cli/install): "Native Windows install: download agave-install-init.exe (page steps via cmd.exe)"
- Source: [Anchor docs: installation](https://www.anchor-lang.com/docs/installation): "Windows users must first install WSL"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.55 [Q55] [S23] SECONDARY

A GitHub issue (anza-xyz/agave #24, opened February 2024) reports solana-test-validator not working properly on Windows; a community post describes running it in Docker on Windows without WSL. I did not open the issue itself, and its current status is unknown.

- Lens: technical
- Source: [solana-test-validator does not work properly on Windows #24 (search snippet)](https://github.com/anza-xyz/agave/issues/24): "solana-test-validator does not work properly on Windows"
- Source: [Building a persistent Solana Docker environment on Windows without WSL](https://dev.to/heyradcode/building-a-persistent-solana-docker-environment-on-windows-without-wsl): "compatible with Docker Desktop on Windows without WSL"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.56 [Q55] [S23] CONFIRMED

The Anchor install page shows the quick-install curl script working on Mac and Linux, 'Windows users must first install WSL', new projects default to Rust LiteSVM tests (Node and Yarn are only needed for TypeScript templates and are expected to become optional), and Linux/WSL users may hit a linker error fixed by installing Linux dependencies.

- Lens: technical
- Source: [Anchor docs: installation](https://www.anchor-lang.com/docs/installation): "New projects default to Rust tests using LiteSVM"
- Verification (2026-10-09): held: Anchor install page: Windows users must install WSL first, new projects default to Rust LiteSVM tests, Node/Yarn needed for TS templates and expected to become optional, Linux linker error fixed by installing Linux dependencies.

### F6.57 [Q55] [S23] CONFIRMED

The Solana faucet allows a maximum of 2 requests every 8 hours (GitHub sign-in raises the limit; GitHub accounts are validated and some may fail), and tells AI agents not to use it, pointing to the CLI airdrop, a proof-of-work faucet (devnet-pow), or a local validator with no rate limits. This is a blocker for a script that must fund a fresh keypair on every grader run.

- Lens: technical
- Source: [Solana faucet](https://faucet.solana.com): "Maximum of 2 requests every 8 hours"
- Verification (2026-10-09): held: faucet.solana.com: 'Maximum of 2 requests every 8 hours', GitHub sign-in raises limit, accounts validated and some may fail, asks AI agents not to use it and points to CLI airdrop, devnet-pow, local validator.

### F6.58 [Q55] [S23] CONFIRMED

The spec asks for 'Clear README with one-command setup (e.g., make dev or equivalent)', reproducible scripts to deploy contracts, create markets and run the full lifecycle, secrets via environment variables with a .env.example, and tests that run locally. The oracle key, devnet SOL and a funded USDC (or test mint) are all secrets/funding a grader would need to supply or the project must provide.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Clear README with one-command setup (e.g., make dev or equivalent)"
- Verification (2026-10-09): held: Local spec line 491 one-command setup, line 486 reproducible scripts, line 86 env vars and .env.example, tests local. Claim that oracle key/SOL/USDC are grader burdens is inference.

### F6.59 [Q55] [S23] UNCONFIRMED

GNU make is not part of a default Windows install, so 'make dev' would need an install or a replacement (npm scripts, just, or running inside WSL/Docker). I did not find a source for this; it is general knowledge.

- Lens: technical
- Source: [Solana docs: installation (WSL route for Windows)](https://solana.com/docs/intro/installation): "Windows users must first install WSL"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.60 [Q55] [S23] CONFIRMED

Docker route: Surfpool publishes a Docker image (surfpool/surfpool, ports 8899, 8900, 18488); the Solana installation docs do not mention Docker; whether the whole toolchain (Anchor build, Surfpool, Pyth posting) is reliably reproducible in one container on Windows/macOS was not tested.

- Lens: technical
- Source: [solana-foundation/surfpool README](https://github.com/solana-foundation/surfpool): "The public Docker image (surfpool/surfpool), which exposes ports 8899, 8900, and 18488."
- Verification (2026-10-09): held: Surfpool README gives docker run with surfpool/surfpool and ports 8899, 8900, 18488. Solana install page fetch showed no Docker mention. Reproducibility on Windows/macOS is stated as untested.

### F6.61 [Q55] [S23] UNCONFIRMED

A Pyth API key, devnet funds, and the public devnet endpoint's rate limits are all outside the project's control; a fully local tier (local chain plus mock or recorded oracle, no keys) removes those three blockers but is the simulation mode weighed in D11.

- Lens: technical
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "Sign up at Pyth Terminal ... a free trial is included and that paid plans cover ongoing use"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.62 [Q55] [D30] [S23] CONFIRMED

Anchor 1.0's 'anchor test' now starts Surfpool by default (Surfpool v1.1.2 is the lowest recommended version); a grader on a machine where Surfpool does not install natively must use '--validator legacy' or a container.

- Lens: technical
- Source: [Anchor 1.0.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0): "Surfpool v1.1.2 is the lowest recommended version."
- Verification (2026-10-09): held: Anchor 1.0.0 notes: anchor test uses Surfpool by default, --validator legacy keeps solana-test-validator, Surfpool v1.1.2 lowest recommended. Container advice is inference.
