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

## 2026-10-09 decision review (full), group 6: Proof for the grader

### F6.01 [D4] [A2] [Q23] [D18] [S24] CONFIRMED

Solana's official docs say devnet may be subject to ledger resets and is served publicly by a single rate-limited node; they give no stability or uptime figure for devnet.

- Lens: technical
- Source: [Solana clusters and endpoints](https://solana.com/docs/references/clusters): "Devnet may be subject to ledger resets (page also describes the public endpoint as a single rate-limited node)"
- Source: [Anza docs: available clusters](https://docs.anza.xyz/clusters/available): "Devnet may be subject to ledger resets."
- Verification (2026-10-09): held: Opened solana.com clusters page: 'Devnet may be subject to ledger resets'; devnet endpoint 'single ... API node; rate-limited'; no uptime figure. Anza docs also state ledger resets.

### F6.02 [D4] [S24] CONFIRMED

@solana/kit is the renamed web3.js 2.x line; the 1.x code sits on a maintenance branch; Kit is a breaking redesign (modular, no third-party dependencies); a compat package bridges legacy types. Kit's README does not describe Anchor support and says Anchor support in create-solana-program is 'coming soon'.

- Lens: venues
- Source: [anza-xyz/kit README](https://github.com/anza-xyz/kit): "We have renamed the 2.x line of @solana/web3.js to @solana/kit."
- Verification (2026-10-09): held: Kit README: renamed 2.x line to @solana/kit; 1.x on maintenance/v1.x; @solana/compat bridges types; 'Anchor coming soon' in create-solana-program. 'No third-party dependencies' and 'breaking redesign' wording not seen in fetch summary.

### F6.03 [D4] [S24] CONFIRMED

Pinocchio is a no_std, zero-copy Rust library optimised for compute units and binary size, but leaves parsing, memory layout and instruction routing to the developer; the repo page names no audit or users and gives no Anchor comparison numbers.

- Lens: technical
- Source: [anza-xyz/pinocchio README](https://github.com/anza-xyz/pinocchio): "optimized in terms of both compute units consumption and binary size"
- Verification (2026-10-09): held: Pinocchio README: no_std, zero-copy, optimized for CU and binary size; parsing/memory layout left to developer (lazy entrypoint, no_allocator); no audit or Anchor numbers mentioned.

### F6.04 [D4] [D30] [Q55] [S24] [S23] CONFIRMED

Anchor's latest release is v1.2.1 (2026-10-06); releases from v1.0.3 live under solana-foundation/anchor. Anchor 1.0 changed: 'anchor init' generates a LiteSVM test template by default; 'anchor test' and 'anchor localnet' now use Surfpool instead of the local validator ('--validator legacy' restores it); TypeScript package moved to @anchor-lang/core; mutable accounts passed twice error unless 'dup'; Anchor 1.0 targets Solana 3.x.

- Lens: technical
- Source: [Anchor 1.0.0 release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0): "anchor init now generates a LiteSVM test template by default ... anchor test and anchor localnet now use Surfpool instead of the local validator."
- Source: [solana-foundation/anchor releases](https://github.com/solana-foundation/anchor/releases): "v1.2.1 (Latest) 06 Oct 2026"
- Verification (2026-10-09): held: Release notes 1-0-0 confirm LiteSVM default, Surfpool for test/localnet with --validator legacy, @anchor-lang/core, dup, Solana 3.x. Releases page shows v1.2.1 Latest, 06 Oct (2026-10-06). The 'from v1.0.3 under solana-foundation' detail was not checked.

### F6.05 [D4] [S24] CONFIRMED

The spec's wording on the three stacks and HyperLiquid: Anchor on Solana is 'preferred', Solidity on an EVM L2 is 'also acceptable' with a latency warning, frontend TypeScript/React (Next.js recommended), automation TypeScript/Node.js. For HyperLiquid the spec only requires to 'research and document feasibility if you explore this path'; the story S24 also requires 'alternatives considered' and 'justify all major dependencies'.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "HyperLiquid is worth considering as an alternative, though it may not natively support this type of custom instrument at this time -- research and document feasibility if you explore this path"
- Verification (2026-10-09): held: Local spec lines 61-62 (Anchor preferred, Solidity EVM L2 also acceptable with latency note) and lines 79-80 (HyperLiquid 'research and document feasibility if you explore this path') match. Story S24 wording is not in the spec file and was not checked; Next.js/Node lines not opened.

### F6.06 [D4] [D18] [S24] CONFIRMED

Hyperliquid HIP-4 outcome markets: Yes/No tokens, fully collateralised, Yes converts to settleFraction quote tokens; the page's first market is a recurring BTC daily binary settling at 06:00 UTC against HyperCore BTC mark price; stocks/equities are not mentioned; who may create outcomes is not stated on the page.

- Lens: venues
- Source: [HIP-4: Outcome markets (Hyperliquid docs)](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-4-outcome-markets): "The first market is a recurring binary outcome that settles daily at 06:00 UTC"
- Verification (2026-10-09): held: HIP-4 docs page: Yes/No sides with tokens, fully collateralized, settleFraction conversion, first market recurring binary settling daily 06:00 UTC against HyperCore BTC mark; no stocks; creator permissions not stated.

### F6.07 [D4] [D18] [S24] CONFIRMED

HIP-4 deployer actions: deployers create markets from validator-approved templates; the deployer submits the settlement (settleOutcome / settleQuestion2; question outcomes settle to exactly 0 or 1); settlement only targets the deployer's own outcomes; no price source or oracle is specified; the hlPerp keyword type needs an existing perp coin; malformed markets are slashable by validators. This means the product's own mint/vault/settle/redeem invariants cannot live in a user program and a MAG7 close-above-strike product is not a documented template.

- Lens: venues
- Source: [HIP-4 deployer actions (Hyperliquid docs)](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/hip-4-deployer-actions.md): "Deployers create markets from validator-approved templates ... Settlements can only target the deployer's own outcomes and questions."
- Verification (2026-10-09): held: Deployer actions page: validator-voted templates, settleOutcome/settleQuestion2, settlements limited to deployer's own outcomes, no oracle specified, hlPerp needs existing perp coin, malformed markets slashable. 'Settle to exactly 0 or 1' for questions not explicitly seen; the conclusion about invariants is inference.

### F6.08 [D4] [D18] [S24] CONFIRMED

HIP-3 (builder-deployed perps): any deployer meeting the staking requirement (500k HYPE on mainnet, held at least 183 days after deploy) can deploy one perp dex; the deployer defines the oracle and sets oracle prices; haltTrading settles positions at the current mark price; slashing applies to malicious deployer inputs. The page does not address equities or arbitrary instruments.

- Lens: venues
- Source: [HIP-3: Builder-deployed perpetuals](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals): "Any deployer that meets the staking requirement can deploy one perp dex."
- Verification (2026-10-09): held: HIP-3 page: 500k HYPE mainnet, held 183 days, one perp dex per qualifying deployer, deployer defines oracle and sets prices, haltTrading settles at current mark, slashing; equities not mentioned.

### F6.09 [D4] [D18] [S24] UNCONFIRMED

HIP-4 went live on Hyperliquid mainnet on 2026-05-02 with a BTC daily binary, validator-curated, collateralised in USDH (per two third-party write-ups; the Hyperliquid HIP-4 page itself says only 'initial mainnet release'). Sources conflict on collateral (USDC vs USDH) and on when or whether permissionless builder deployment opened (one says 2026-08-29, another end of August, another says a phased rollout with builder deployment later, staking 1,000,000 HYPE per slot). Treat deployer permissions and dates as unconfirmed.

- Lens: venues
- Source: [Chainstack: Trading HIP-4 outcome markets on Hyperliquid](https://docs.chainstack.com/docs/hyperliquid-hip4-outcome-markets-trading): "HIP-4 launched on mainnet on May 2, 2026 with a recurring BTC daily binary."
- Source: [GN Crypto: Hyperliquid launches HIP-4 outcome markets on mainnet](https://www.gncrypto.news/news/hyperliquid-hip-4-outcome-markets-mainnet/): "Builders would stake 1,000,000 HYPE per slot, and stakes are slashable. Initial markets are curated and deployed by validators."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.19 [D18] [S24] SECONDARY

Solana commitment levels: 'confirmed' means a supermajority of active stake voted for the block; 'finalized' is the strongest; the docs give no timing. The legacy-consensus figure of about 12.8 s block-to-finality and Alpenglow's about 150 ms median target come from third-party reports of an Anza write-up.

- Lens: technical
- Source: [Solana RPC: commitment levels](https://solana.com/docs/rpc): "confirmed means a supermajority of active stake has voted for the block"
- Source: [Search snippet: Alpenglow finality about 150 ms vs about 12.8 s under TowerBFT](https://www.mexc.com/news/997638): "approximately 12.8 seconds ... expected to achieve actual finality in about 150 milliseconds at the median"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.20 [D18] [A2] [S24] CONFIRMED

Anza's Alpenglow page (published 2026-10-08) states a 150 ms finality target and lists testnet 9/24 Completed, devnet 9/25 Completed, mainnet-beta Upcoming with no date; years are not printed on the page. Devnet is positioned for testing against deterministic finality before mainnet-beta migrates; no developer warning about devnet instability or resets appears.

- Lens: technical
- Source: [Anza: Alpenglow](https://www.anza.xyz/alpenglow): "Devnet 9/25 Completed; Mainnet-beta Upcoming"
- Verification (2026-10-09): held: Anza Alpenglow page: 150ms finality, testnet 9/24 Completed, devnet 9/25 Completed, mainnet-beta Upcoming, published Oct 8 2026; no devnet warning.

### F6.21 [D18] [S24] CONFIRMED

Base Flashblocks give about 200 ms pre-confirmations from the sequencer ('pending' tag updates about every 200 ms, about 1.8 s before a block seals); the page contrasts this with standard 2-second blocks and does not define finality timing. Arbitrum's L2-to-L1 message path has a challenge period of about 6.4 days (also described as approximately 7 days). So EVM L2 'sub-second' means sequencer confirmation, not settled finality.

- Lens: venues
- Source: [Base docs: Flashblocks for apps](https://docs.base.org/base-chain/flashblocks/apps): "about 200ms ... pending block tag"
- Source: [Arbitrum docs: L2 to L1 messaging](https://docs.arbitrum.io/how-arbitrum-works/deep-dives/l2-to-l1-messaging): "challenge period ... 6.4 days"
- Verification (2026-10-09): held: Base docs: ~200ms pending tag, 1.8s before seal, 2-second standard blocks, finality not defined. Arbitrum docs: ~6.4 day challenge period, ~7 days in one spot.

### F6.22 [D18] [S24] UNCONFIRMED

Hyperliquid's overview quotes end-to-end order latency of median 0.2 s and p99 0.9 s from a co-located client, about 200k orders/s, HyperBFT consensus. HyperEVM docs say contracts can read the order books through a read precompile and that 'write system contracts are not live on mainnet yet', but another HyperEVM page documents a CoreWriter limit-order action with a few-seconds on-chain delay, without stating mainnet status. These two pages conflict or one is stale, so whether Solidity can place orders on mainnet is unconfirmed.

- Lens: venues
- Source: [Hyperliquid docs: HyperCore overview](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/overview): "median of 0.2 seconds and a 99th percentile of 0.9 seconds"
- Source: [Hyperliquid docs: HyperEVM](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperevm): "write system contracts are not live on mainnet yet"
- Source: [Hyperliquid docs: interacting with HyperCore](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/interacting-with-hypercore): "Order actions and vault transfers are delayed onchain for a few seconds"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.23 [D18] [D4] [S24] CONFIRMED

Sui: DeepBook is the native CLOB (callable from your own Move module, TypeScript SDK, or read-only) and the index lists margin, Predict and DeepBookV3. DeepBook Predict is an expiry-based prediction market (range contracts; one-sided up/down is closest to binary) quoted from Pyth Lazer, settled from the exact Pyth price at expiry with a Block Scholes fallback after 30 s; mainnet and testnet went live 2026-09-12; at the last recorded chain read the initial markets had expired unsettled and no oracle update had landed, so quotes and mints aborted on both networks.

- Lens: venues
- Source: [Sui docs: DeepBook](https://docs.sui.io/standards/deepbook): "Call the DeepBookV3 Move package from your own Move module."
- Source: [Sui docs: DeepBook Predict](https://docs.sui.io/standards/deepbook-predict): "the exact Pyth price at the expiry timestamp ... quotes and mints abort on both networks"
- Verification (2026-10-09): held: Sui DeepBook page: Move module, TS SDK, read-only; index lists Margin, Predict, DeepBookV3. Predict page: expiry-based, Pyth Lazer, exact Pyth price at expiry with Block Scholes fallback after 30s, live 2026-09-12, initial markets expired unsettled, quotes and mints abort. 'One-sided up/down is closest to binary' not checked.

### F6.24 [D18] [S24] CONFIRMED

Sui's consensus doc gives about 0.5 s average commit latency and under 1 s up to 300k TPS in controlled benchmarks that it says are not production metrics; no production finality figure is stated.

- Lens: technical
- Source: [Sui docs: consensus](https://docs.sui.io/concepts/sui-architecture/consensus): "Average consensus commitment is about 0.5 seconds (benchmark results, not production metrics)"
- Verification (2026-10-09): held: Sui consensus page: benchmark figures (~0.5s average at 200k TPS, under 1s up to 300k TPS with 10 nodes) explicitly not production metrics.

### F6.25 [D18] [S24] CONFIRMED

Injective's exchange module provides an on-chain order book (matching, execution, settlement) and 'enables traders to create and trade on arbitrary spot and derivative markets'; this is chain-native module code, not an app-owned program, and the page does not mention binary options or give a finality time. MegaETH advertises about 10 ms block times, with finality and mainnet status not stated on the page fetched.

- Lens: venues
- Source: [Injective docs: exchange module](https://docs.injective.network/developers-native/injective/exchange): "enables traders to create and trade on arbitrary spot and derivative markets"
- Source: [MegaETH docs](https://docs.megaeth.com/): "~10ms block times"
- Verification (2026-10-09): held: Injective exchange module page: on-chain orderbook, 'arbitrary spot and derivative markets', no binary options, no finality time. MegaETH docs: ~10ms block times; finality and mainnet status not stated.

### F6.26 [D18] [D4] [S24] CONFIRMED

Existing Solana CLOBs: the Phoenix legacy repo states its primary licence is MIT ('Phoenix Legacy'; a search snippet had said BUSL-1.1, which the primary page contradicts; the repo names no devnet program id or integration guide). Manifest is GPL-3.0, says it 'should be interacted with through a wrapper program' via CPI, links an audit PDF, reports Certora formal-verification property sets run daily, and prints no devnet program id or market-creation steps.

- Lens: venues
- Source: [Ellipsis-Labs/phoenix-v1 README](https://github.com/Ellipsis-Labs/phoenix-v1): "The primary license for Phoenix Legacy is the MIT License"
- Source: [CKS-Systems/manifest README](https://github.com/CKS-Systems/manifest): "should be interacted with through a wrapper program"
- Verification (2026-10-09): held: Phoenix README: primary license MIT, no devnet id. Manifest README: GPL-3.0, wrapper program via CPI, audit PDF link, Certora rerun daily, no devnet id.

### F6.27 [D18] [S24] CONFIRMED

Spec requirements for the chain: deploy to an L1 or L2 'with sub-second finality'; Solana recommended; EVM L2s acceptable 'but be prepared to justify how order book latency is handled'; functions 'must exist in your on-chain program'; the CLOB may be an existing on-chain CLOB (e.g. Phoenix) or a minimal book in your contract ('your smart contract handles minting, settlement, and redemption; the CLOB handles price discovery and matching').

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Must deploy to a blockchain (L1 or L2) with sub-second finality -- fast enough to support real-time order book trading"
- Verification (2026-10-09): held: Local spec: line 70 'sub-second finality', line 76 EVM L2 'be prepared to justify', line 133 existing CLOB e.g. Phoenix, line 139 contract handles minting/settlement/redemption, line 349 functions must exist in on-chain program.

### F6.28 [D18] [A2] [S24] SECONDARY

Search coverage of Solana outages found mainnet-beta halts only (June 2022 about 4.5 hours per Bloomberg, February 2023, February 2024 about 5 hours) and an August 2026 TeraSwitch routing failure that took validators with about 28.83% of stake offline without halting the chain. No devnet-specific halt or reset report turned up.

- Lens: technical
- Source: [Bloomberg: Solana blockchain restarts after bug causes 4 1/2-hour outage](https://www.bloomberg.com/news/articles/2022-06-02/solana-blockchain-restarts-after-bug-causes-4-1-2-hour-outage): "Solana Blockchain Restarts After Bug Causes 4 1/2-Hour Outage"
- Source: [SolanaFloor: Solana hit 86% of its halt threshold after a Teraswitch routing failure](https://solanafloor.com/news/solana-hit-86-of-its-halt-threshold): "Solana Hit 86% of Its Halt Threshold After a Teraswitch Routing Failure"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F6.29 [D18] [A2] [Q23] [S24] CONFIRMED

status.solana.com lists components Mainnet Beta, RPC nodes (US, EU, Asia), Explorer, solana.com and Break Solana; devnet is not a listed component, and the 2026-09-25 to 2026-10-09 window shows no incidents. So Solana publishes no official devnet uptime or incident record to cite. The Agave README calls devnet a 'stable public cluster for development ... Runs 24/7', which is a design statement, not a record.

- Lens: technical
- Source: [Solana Status](https://status.solana.com): "No incidents reported (components: Mainnet Beta, RPC nodes, Explorer, solana.com, Break Solana)"
- Source: [anza-xyz/agave README](https://github.com/anza-xyz/agave): "stable public cluster for development accessible via devnet.solana.com. Runs 24/7"
- Verification (2026-10-09): held: status.solana.com: components Mainnet Beta, RPC nodes (US/EU/Asia), Explorer, solana.com, Break Solana; devnet not listed; no incidents Sep 25 to Oct 9 2026. Agave README: 'stable public cluster for development ... Runs 24/7'.

### F6.30 [D18] [S24] CONFIRMED

The Solana installer script installs Rust, Solana CLI, Anchor CLI, Surfpool CLI, Node and Yarn, and the Anchor install page shows Solana CLI 4.1.2 and Anchor CLI 1.2.1 in its sample output; Anza's CLI page shows an Agave release v4.4.0-beta.0 in a Windows command.

- Lens: technical
- Source: [Solana docs: installation](https://solana.com/docs/intro/installation): "It installs Rust, the Solana CLI, Anchor CLI, Surfpool CLI, Node.js, and Yarn."
- Source: [Anchor docs: installation](https://www.anchor-lang.com/docs/installation): "Solana CLI 4.1.2 (Agave client), Anchor CLI 1.2.1"
- Verification (2026-10-09): held: Solana install page: installs Rust, Solana CLI, Anchor CLI, Surfpool CLI, Node.js, Yarn. Anchor install page sample shows solana-cli 4.1.2 and anchor-cli 1.2.1. Anza CLI v4.4.0-beta.0 detail has no listed source and was not checked.

### F6.31 [D18] [D4] [S24] UNCONFIRMED

Hyperliquid and Sui alternatives are only partly verified: Aptos, Sei, Monad finality figures and native order book status could not be fetched (a Monad docs URL returned 404, a Sei page was off-topic, and the web-search budget ran out), so any statement about them in the documentation must be sourced separately.

- Lens: user
- Source: [Sei docs (page fetched did not cover finality or order book)](https://docs.sei.io/learn/general-staking): "page covers delegation, redelegation, unbonding (21 days), jailing, and rewards"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.37 [D30] [Q23] [Q24] [S23] [S24] CONFIRMED

NYSE 2026: core hours 9:30 a.m.-4:00 p.m. ET; holidays on Jan 1, Jan 19, Feb 16, Apr 3, May 25, Jun 19, Jul 3, Sep 7, Nov 26, Dec 25; early closes at 1:00 p.m. ET on Nov 27 and Dec 24. The spec fixes settlement at 4:00 PM ET and does not mention early closes.

- Lens: venues
- Source: [NYSE: holidays and trading hours](https://www.nyse.com/markets/hours-calendars): "Early Closes (1:00 p.m. ET): Friday, November 27; Thursday, December 24"
- Verification (2026-10-09): held: NYSE page lists all ten 2026 holidays as claimed, early closes Fri Nov 27 and Thu Dec 24 at 1:00 p.m. ET, core hours 9:30-4:00. Spec's silence on early closes not checked (spec fixes 4:00 PM ET).

### F6.42 [A2] [Q23] [S24] CONFIRMED

SIMD-0047 adds a LastRestartSlot sysvar and syscall (sol_get_last_restart_slot) so programs can read the slot of the most recent cluster restart; status Implemented, in Anza's client since 1.17.0, Firedancer marked implemented. Its stated purpose includes outdated oracle prices after long restarts. The document gives no detection algorithm; storing the last seen value and comparing it is an inference.

- Lens: technical
- Source: [SIMD-0047: syscall and sysvar for last restart slot](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0047-syscall-and-sysvar-for-last-restart-slot.md): "fn sol_get_last_restart_slot() -> Slot"
- Verification (2026-10-09): held: SIMD-0047: sol_get_last_restart_slot syscall and sysvar, status Implemented, Anza 1.17.0, Firedancer implemented, purpose includes stale oracle prices after long restarts.

### F6.43 [A2] [Q23] [S24] CONFIRMED

RPC getGenesisHash returns the genesis hash of the connected cluster; the page says nothing about reset detection (comparing a stored value to detect a new chain is an inference). getBlockTime returns an estimate: the stake-weighted mean of validator vote timestamps, which can be null.

- Lens: technical
- Source: [Solana RPC: getGenesisHash](https://solana.com/docs/rpc/http/getgenesishash): "Genesis hash, as a base-58 encoded string"
- Source: [Solana RPC: getBlockTime](https://solana.com/docs/rpc/http/getblocktime): "Estimated production time, as Unix timestamp (seconds since the Unix epoch)."
- Verification (2026-10-09): held: getGenesisHash returns genesis hash as base-58 string; no mention of reset detection. getBlockTime: estimate from stake-weighted mean of vote timestamps, null possible.

### F6.44 [A2] [Q23] [S24] CONFIRMED

OpenTimestamps proves that data existed before a point in time, anchored to Bitcoin; stamping uses free calendar servers that need no registration or API key; the file is hashed locally; proofs can be verified offline. It proves existence, not truth of content.

- Lens: venues
- Source: [OpenTimestamps](https://opentimestamps.org/): "A timestamp proves that some data existed prior to some point in time."
- Verification (2026-10-09): held: opentimestamps.org: 'A timestamp proves that some data existed prior to some point in time', Bitcoin, free calendar servers with no registration or API key, hashed in browser. Page does not explicitly say proofs verify offline.

### F6.45 [A2] [S24] CONFIRMED

The spec forbids mainnet for the core submission ('Never use mainnet or real funds for the core submission') and calls mainnet deployment an optional bonus, so a verifiable record of a lost devnet day cannot rely on writing to Solana mainnet; it must use off-chain or other anchoring. Required: reproducible deploy and lifecycle scripts for devnet.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Never use mainnet or real funds for the core submission"
- Verification (2026-10-09): held: Local spec line 87 'Never use mainnet or real funds for the core submission'; line 83 reproducible devnet scripts; lines 511-516 mainnet is a bonus, not required.

### F6.46 [A2] [Q55] [S24] [S23] CONFIRMED

Public Solana RPC endpoints are shared, not meant for production, and can return 429 or 403; this means a failed call in the log may be the endpoint, not the cluster.

- Lens: technical
- Source: [Solana RPC docs](https://solana.com/docs/rpc): "These are shared and not meant for production. They can return rate-limit errors (429) or block traffic (403)."
- Verification (2026-10-09): held: Solana RPC docs: public endpoints are shared infrastructure not for production; 429 on rate limits, 403 on blocked traffic.

### F6.47 [A2] [S24] UNCONFIRMED

A user (grader) needs evidence they can check without trusting the author: transaction signatures that open in a public explorer, slot numbers, and a log that was committed or timestamped before the grading date. I found no source describing how other projects document devnet outages, so this is reasoning not a sourced practice.

- Lens: user
- Source: [OpenTimestamps](https://opentimestamps.org/): "Offline verification: proofs can be checked without contacting a server (page summary)"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F6.48 [Q23] [S24] CONFIRMED

The spec's liveness text has no exception for outages: 'Markets created before market open and settled within 10 minutes of market close every trading day'; success criteria: 'Settlement executes correctly via oracle within 10 minutes of market close'. The oracle-failure design is: retry every 30 seconds for up to 15 minutes, then alert, then admin override settle after an enforced delay (e.g. 1 hour); unredeemed tokens remain redeemable indefinitely.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Liveness: Markets created before market open and settled within 10 minutes of market close every trading day"
- Verification (2026-10-09): held: Local spec line 48 liveness text, line 500 success criterion, line 447 retry every 30 seconds up to 15 minutes then alert, line 368 admin override delay e.g. 1 hour, lines 329/346 redeemable indefinitely.

### F6.49 [Q23] [S24] CONFIRMED

Venue practice reference for outage accounting: Solana itself marks which components its status page covers and publishes no devnet incident history, so there is no neutral third-party record to cite for a devnet-lost trading day; the project must supply its own evidence.

- Lens: venues
- Source: [Solana Status](https://status.solana.com): "Its components are Mainnet Beta, RPC nodes (US, EU, Asia), Explorer, solana.com, and Break Solana."
- Verification (2026-10-09): held: status.solana.com lists no devnet component and no incident history for devnet; the absence-of-record claim is consistent with what was opened.

### F6.50 [Q23] [S24] UNCONFIRMED

I found no statement of how the Gauntlet graders treat a lost devnet day; asking them is the only way to learn it. The questions to ask: whether the 10-minute metric is measured on a clean run, whether outage days are excluded, and whether a late settle via the override path counts.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Settlement executes correctly via oracle within 10 minutes of market close"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
