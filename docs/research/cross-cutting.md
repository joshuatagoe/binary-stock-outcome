# Cross-cutting research

Findings that serve no single story. Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 1: Onboarding

### F1.29 [Q40] SECONDARY

Per search summaries of SEC material, the limit up-limit down mechanism pauses a stock for five minutes after it sits at its price band edge for more than 15 seconds, with a re-opening auction at the primary listing exchange; whether a halt near 4:00 PM changes the official close was not found.

- Lens: technical
- Source: [SEC news digest on limit up-limit down (search result)](https://www.sec.gov/news/digest/2012/dig060112.htm): "limit up-limit down"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.30 [Q40] SECONDARY

Per search summaries, Polymarket's stock rules handle stock splits (split-adjusted prices), missing oracle data (fall back to the exchange's official close) and no-trade days (50-50) explicitly; the rules bodies did not render when I opened them.

- Lens: venues
- Source: [PLTR above market (search result)](https://polymarket.com/event/pltr-above-on-august-21-2026): "split-adjusted prices as displayed on Pyth"
- Verification (2026-10-09): not rechecked (SECONDARY)

## 2026-10-09 decision review (full), group 5: Platform

### F5.18 [D22] CONFIRMED

The Anchor GitHub releases feed (otter-sec/anchor, the repo the Anchor docs link to) shows v1.2.1 marked Latest on 6 Oct 2026, v1.2.0 on 4 Sep 2026, v1.1.x and v1.0.x lines in May and June 2026 and patch releases of 0.32, 0.31 and 0.30 on 14 Sep 2026. The changelog dates 1.0.0 as 2026-04-02 and 1.2.1 as 2026-10-05.

- Lens: technical
- Source: [Anchor releases (redirected to otter-sec/anchor)](https://github.com/solana-foundation/anchor/releases): "v1.2.1 | 06 Oct 2026 | Marked Latest"
- Source: [Anchor CHANGELOG](https://raw.githubusercontent.com/otter-sec/anchor/master/CHANGELOG.md): "1.0.0 (2026-04-02)"
- Verification (2026-10-09): held: Opened GitHub anchor releases page (otter-sec/anchor): v1.2.1 06 Oct 2026 Latest, v1.2.0 04 Sep, 0.32.2/0.31.2/0.30.2 14 Sep, v1.1.x and v1.0.x in May/June. CHANGELOG dates 1.0.0 as 2026-04-02 and 1.2.1 as 2026-10-05. Minor: page showed no explicit redirect; some links point to solana-foundation/anchor.

### F5.19 [D22] CONFIRMED

Anchor 1.0.0 was a breaking release: moved to Solana 3.0, renamed npm packages from @coral-xyz/anchor to @anchor-lang/core, made a LiteSVM test template the default for anchor init, made Surfpool the default runner for anchor test and localnet, and changed IDL handling. 1.2.0 added --arch and --tools-version flags to anchor build; 1.2.1 added Solana v4 crate support behind a solana-v4 feature.

- Lens: technical
- Source: [Anchor CHANGELOG](https://raw.githubusercontent.com/otter-sec/anchor/master/CHANGELOG.md): "npm packages were renamed from @coral-xyz/anchor to @anchor-lang/core"
- Verification (2026-10-09): held: Opened Anchor CHANGELOG (first 100k chars). 1.0.0: Solana 3.0, rename to @anchor-lang/core, litesvm default for anchor init, Surfpool default for test/localnet; 1.2.0 --arch/--tools-version; 1.2.1 solana-v4 feature. IDL change not specifically verified.

### F5.20 [D22] CONFIRMED

The Anchor TypeScript client @anchor-lang/core is only compatible with the legacy web3.js v1 and is not stated to work with @solana/kit, so a Kit-based frontend or backend needs a different client generator.

- Lens: technical
- Source: [Anchor TypeScript client docs](https://www.anchor-lang.com/docs/clients/typescript): "only compatible with the legacy version (v1) of @solana/web3.js"
- Verification (2026-10-09): held: Opened Anchor TS client docs. '@anchor-lang/core is only compatible with the legacy version (v1) of @solana/web3.js'; not compatible with v2; @solana/kit not mentioned.

### F5.21 [D22] CONFIRMED

Codama converts an Anchor IDL into a Codama IDL and @codama/renderers-js generates a JavaScript client compatible with Solana Kit, maintained by Anza; a Rust renderer exists too. The Solana Foundation's templates category 'Kit' uses @solana/kit.

- Lens: technical
- Source: [Codama](https://github.com/codama-idl/codama): "@codama/renderers-js generates a JavaScript client compatible with Solana Kit, maintained by Anza."
- Source: [solana-foundation/templates](https://github.com/solana-foundation/templates): "Kit: modern templates using @solana/kit"
- Verification (2026-10-09): held: Opened Codama README: renderers-js generates JS client compatible with Solana Kit, maintained by Anza; Rust renderer exists; Anchor IDL converted to Codama IDL. templates repo has kit/nextjs example. The 'Kit: modern templates using @solana/kit' quote text not individually confirmed on the fetched page, but the Kit/nextjs structure is.

### F5.22 [D22] CONFIRMED

Solana's installation docs say Windows requires WSL (wsl --install, then run the installer in Ubuntu), and the automated installer sets up Rust, Solana CLI, Anchor CLI, Surfpool, Node and Yarn. The Anchor docs say the same for Windows and install Anchor through AVM from the otter-sec/anchor repo. Neither page mentions native Windows support.

- Lens: user
- Source: [Solana: Installation](https://solana.com/docs/intro/installation): "Windows requires WSL"
- Source: [Anchor: Installation](https://www.anchor-lang.com/docs/installation): "Install WSL first, then run the installation steps from the Linux section inside the Ubuntu terminal."
- Verification (2026-10-09): held: Opened Solana installation and Anchor installation. 'Windows requires WSL', installer sets up Rust, Solana CLI, Anchor CLI, Surfpool, Node, Yarn; Anchor says install WSL first; AVM from otter-sec/anchor; no native Windows. Anchor quote is a paraphrase.

### F5.23 [D22] CONFIRMED

Pinocchio is an Anza Rust library for writing Solana programs with no external dependencies, no_std, zero-copy parsing to reduce compute units and binary size; README examples use version 0.11 and it states no stability or production-readiness level; a lazy entrypoint avoids parsing all input up front.

- Lens: technical
- Source: [anza-xyz/pinocchio](https://github.com/anza-xyz/pinocchio): "Create Solana programs with no external dependencies attached."
- Verification (2026-10-09): held: Opened pinocchio README. Tagline, no_std, zero-copy, examples use version 0.11, lazy entrypoint, no stability/production statement.

### F5.24 [D22] CONFIRMED

LiteSVM is an in-process Solana VM test library (Rust crate plus a Node wrapper on npm) with an anchor-litesvm crate for Anchor programs; Mollusk (Anza) is a minimal SVM harness for single instructions with compute-unit benchmarking where you supply every account. Anchor's docs list both under Testing, plus fuzzing. Neither page mentions Windows.

- Lens: technical
- Source: [LiteSVM](https://github.com/LiteSVM/litesvm): "a fast and lightweight library for testing Solana programs"
- Source: [Mollusk](https://github.com/anza-xyz/mollusk): "a lightweight test harness for Solana programs"
- Verification (2026-10-09): held: Opened LiteSVM README (in-process VM, Node wrapper on npm, anchor-litesvm, no Windows mention) and Mollusk README (lightweight harness, CU benchmarking, no Windows mention). Claim that Anchor docs list both under Testing was not opened.

### F5.25 [D22] CONFIRMED

Anchor's installation page shows anchor-cli 1.2.1 and says Node and Yarn are needed only for the TypeScript test templates, not for the default litesvm template.

- Lens: technical
- Source: [Anchor: Installation](https://www.anchor-lang.com/docs/installation): "The default litesvm template doesn't need them for everyday development."
- Verification (2026-10-09): held: Opened Anchor installation page: anchor-cli 1.2.1 example output; default litesvm template does not run TS tests so Node/Yarn not needed day to day (still needed for init per page). Quote is a paraphrase.

### F5.26 [D22] UNCONFIRMED

The repo lives under a OneDrive-synced Windows folder; building Rust and WSL tooling inside a synced folder or across /mnt/c is likely slow and error-prone, so the project may need to be built from the WSL filesystem. This is an inference from the environment, not a sourced fact.

- Lens: user
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F5.27 [D23] CONFIRMED

Phoenix (Ellipsis Labs) is an on-chain order book 'that operates without a crank', MIT licensed, audited by OtterSec, with a Solana Verify path to check the deployed program against the repo; the README does not say whether the program is upgradeable or who holds the authority.

- Lens: venues
- Source: [Ellipsis-Labs/phoenix-v1](https://github.com/Ellipsis-Labs/phoenix-v1): "an on-chain orderbook that operates without a crank"
- Verification (2026-10-09): held: Opened phoenix-v1 README: 'on-chain orderbook that operates without a crank', MIT, OtterSec audit in repo, Solana Verify command; no upgradeability or authority mention.

### F5.28 [D23] [Q26] CONFIRMED

A Next.js static export (output: 'export') produces an out folder of HTML/CSS/JS that can be hosted on any static web server; Server Components run at build time, Client Components fetch data in the browser; Server Actions, cookies, rewrites, redirects, headers, ISR and default image optimization are unsupported. Docs v16.4.0, last updated 2026-08-09.

- Lens: technical
- Source: [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports): "it can be deployed and hosted on any web server that can serve HTML/CSS/JS static assets."
- Verification (2026-10-09): held: Opened Next.js static exports page: version 16.4.0, lastUpdated 2026-08-09; out folder; Server Components run at build; unsupported list includes Server Actions, cookies, rewrites, redirects, headers, ISR, default image loader.

### F5.29 [D23] CONFIRMED

GitHub Actions scheduled workflows can be delayed under load, run at most every 5 minutes, only run on the default branch and are disabled after 60 days of repo inactivity in public repos, so cron-in-Actions cannot replace an always-on keeper for a 30-second retry loop.

- Lens: technical
- Source: [GitHub Actions: events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): "The shortest interval you can run scheduled workflows is once every 5 minutes."
- Verification (2026-10-09): held: Opened GitHub events docs: shortest schedule interval 5 minutes; can be delayed under high load; default branch only; disabled after 60 days inactivity in public repos.

### F5.31 [D23] CONFIRMED

OpenBook v2 deployed version v1.7 exists on mainnet, devnet and testnet with the same program ID (opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb), so an existing CLOB is available on devnet; Phoenix's devnet availability was not checked.

- Lens: venues
- Source: [openbook-dex/openbook-v2](https://github.com/openbook-dex/openbook-v2): "v1.7 on mainnet, devnet, and testnet"
- Verification (2026-10-09): held: Opened openbook-v2 README: Deployed versions table lists v1.7 for mainnet, devnet and testnet with program ID opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb. Literal quote phrase is a table paraphrase.

### F5.42 [Q12] CONFIRMED

Solana's RPC docs define the levels: processed ('newest view, but it can still be rolled back'), confirmed ('directly voted on by a supermajority of stake, meaning more than two-thirds'), finalized ('recognizes as finalized with maximum lockout'); the default when omitted is typically finalized.

- Lens: technical
- Source: [Solana RPC docs](https://solana.com/docs/rpc): "A block directly voted on by a supermajority of stake, meaning more than two-thirds of the network's active stake."
- Verification (2026-10-09): held: Opened Solana RPC docs: processed can be rolled back; confirmed quote exact; finalized with maximum lockout; default typically finalized.

### F5.43 [Q12] SECONDARY

Typical times per Helius: processed about 0.4 s (highest rollback risk), confirmed about 0.6 s (very low risk, 'No confirmed block has reverted in Solana's five-year history'), finalized about 13 s (often 10 to 20 s). Vendor blog, written when slots were 400 ms; not independently verified here.

- Lens: technical
- Source: [Solana commitment levels (Helius)](https://www.helius.dev/blog/solana-commitment-levels): "Finalized | ~13 s (often 10-20 s) | Effectively none."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F5.44 [Q12] CONFIRMED

Solana's Alpenglow page: current TowerBFT finality is about 12.8 seconds; the Alpenglow target is about 150 ms, described as 'an expectation, not a constant' that varies with stake distribution; block time is separately being cut from 400 ms to 200 ms. The page lists mainnet and devnet activation as planned for Q3 2026 without a confirmed date, and says testnet 'will soon' be testable. A cluster can be checked with getAgGenesisCert (null means still TowerBFT).

- Lens: technical
- Source: [Solana: Alpenglow](https://solana.com/upgrades/alpenglow): "Current (TowerBFT): About 12.8 seconds."
- Verification (2026-10-09): held: Opened Alpenglow page: TowerBFT about 12.8 s, target roughly 150 ms varying with stake distribution, block time 400ms to 200ms, Q3 2026 mainnet and devnet planned, getAgGenesisCert null means TowerBFT. Page said block-time stages finished October 2026, a bit more current than claim's 'being cut'. 'Testnet will soon' detail not confirmed.

### F5.45 [Q12] SECONDARY

A news report dated after the 28 Sep target says Alpenglow has not launched on mainnet, has run on testnet since 22 Sep 2026, SIMD-0326 is still pending mainnet activation, the next mainnet feature-activation window starts 9 Nov 2026, and devnet feature activations resume 7 Oct. An earlier Solana Compass piece described 28 Sep as the target; the two disagree on whether that date meant Alpenglow.

- Lens: venues
- Source: [Solana Alpenglow: No Mainnet Launch on September 28](https://cryptoticker.io/en/solana-alpenglow-mainnet-date-missed/): "Alpenglow has not launched on Solana mainnet. It has run on testnet since September 22, 2026."
- Source: [Agave 4.3 release schedule (Solana Compass)](https://solanacompass.com/news/anza-publishes-agave-43-release-schedule-alpenglow-consensus-targets-september-28-mainnet-activation): "Anza published the Agave 4.3 release schedule ... targeting September 28 for mainnet activation."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F5.46 [Q12] SECONDARY

Agave 4.2 halves slot time from 400 ms to 200 ms in four 50 ms steps; the Solana page says the last step took effect at the start of epoch 1053 on 9 Oct 2026 (the page is dated August, so this is inconsistent) and a Solana Compass sidebar headline says the same. Devnet slot time is not stated.

- Lens: technical
- Source: [Agave 4.2 release overview](https://solana.com/upgrades/agave-4-2-release-overview): "at the start of epoch 1053 on October 9, 2026"
- Source: [Agave 4.2 ships ... 200ms slots (Solana Compass)](https://solanacompass.com/news/agave-42-ships-90-rent-reduction-33x-larger-transactions-200ms-slots-and-a-50000-sol-bug-bounty): "Solana's 200ms Slot Time Is Live on Mainnet at Epoch 1053"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F5.47 [Q25] CONFIRMED

Solana docs: the upgrade authority is 'the account that has permission to update or close the program', by default the CLI wallet; set-upgrade-authority --new-upgrade-authority transfers it; --final removes it and 'Once a program is immutable, it can never be updated or closed'. A program that can be updated can change the code that enforces 'outcome immutable once written'.

- Lens: technical
- Source: [Solana: Deploying programs](https://solana.com/docs/programs/deploying): "Once a program is immutable, it can never be updated or closed."
- Verification (2026-10-09): held: Opened Solana deploying docs: upgrade authority definition, set-upgrade-authority --new-upgrade-authority, --final, 'Once a program is immutable, it can never be updated or closed.'

### F5.48 [Q25] CONFIRMED

Squads documents moving a program's upgrade authority to the Squad (direct transfer or Safe Authority Transfer) and upgrading through a buffer proposal approved by the threshold; the programs page describes no time lock, and a GitHub Action can create the buffer and proposal from CI.

- Lens: venues
- Source: [Squads: Programs](https://docs.squads.so/main/navigating-your-squad/developers-assets/programs.md): "Squads lets your team manage program upgrades through a multisig, so no single person controls the authority."
- Verification (2026-10-09): held: Opened Squads programs page: multisig program upgrades, Safe Authority Transfer, buffer proposal, GitHub Action, no time lock mention. Quoted sentence is a paraphrase of 'collectively manage program upgrades ... via multisig'.

### F5.49 [Q25] CONFIRMED

Squads time locks delay execution of approved Squad transactions by 1 hour, 1 day, 1 week or a custom duration, and the docs warn against very long locks; the developer reference for SetTimelock does not say whether program upgrades are covered, so that must be tested.

- Lens: venues
- Source: [Squads: Time locks](https://docs.squads.so/main/navigating-your-squad/settings/time-locks.md): "Time locks let Squad members delay when an approved transaction executes"
- Source: [Squads developer reference: Time-locks](https://docs.squads.so/main/development/reference/time-locks.md): "newTimeLock"
- Verification (2026-10-09): held: Opened Squads time-locks page (1 hour/1 day/1 week/custom, warning on very long locks) and dev reference (SetTimelock, newTimeLock, no mention of program upgrades). Quote wording slightly different ('allow ... to defer').

### F5.50 [Q25] CONFIRMED

Squads v4 README: multiple independent audits (OtterSec, Neodyme, Certora, Trail of Bits listed); warns that a compromised config_authority can change threshold or members; warns users may set long or permanent time locks; build verification uses the Ellipsis Labs verifiable build tool.

- Lens: venues
- Source: [Squads-Protocol/v4](https://github.com/Squads-Protocol/v4): "If the config_authority of a multisig is compromised, an attacker can change multisig settings"
- Verification (2026-10-09): held: Opened Squads v4 README: audits by OtterSec, Neodyme, Certora, Trail of Bits; compromised config_authority can change settings; users may set long/permanent time locks; Ellipsis Labs solana-verify.

### F5.51 [Q25] CONFIRMED

Solana verified builds prove the deployed hash matches a public source build, but 'a verified build is not more secure than an unverified one'; only the upgrade authority can create the verification PDA; programs made immutable before a PDA exists need OtterSec's help; an upgrade marks the program unverified until the PDA and a remote job are updated.

- Lens: technical
- Source: [Solana: Verified builds](https://solana.com/docs/programs/verified-builds): "Only the upgrade authority can create or update it."
- Verification (2026-10-09): held: Opened Solana verified builds: not more secure than unverified; only upgrade authority creates/updates PDA; immutable programs need OtterSec; upgrade unverifies program.

### F5.52 [Q25] CONFIRMED

Pyth's program-authority-escrow is a stateless program for two-step upgrade-authority transfer (propose, then accept or revert) so a transfer to a wrong key can be undone, with a tutorial for moving authority from a keypair to a Squads v3 multisig; the README states no audit.

- Lens: venues
- Source: [pyth-network/program-authority-escrow](https://github.com/pyth-network/program-authority-escrow): "A stateless Solana program for safe program authority transfers."
- Verification (2026-10-09): held: Opened pyth program-authority-escrow README: stateless program for safe authority transfers; propose/accept/revert; Squads v3 tutorial; no audit statement.

### F5.53 [Q26] CONFIRMED

React's docs recommend starting new apps with a framework (Next.js App Router, React Router v7, Expo), and say all of them 'support client-side rendering, single-page apps, and static-site generation' deployable to a CDN without a server; building from scratch with Vite is positioned as the exception.

- Lens: venues
- Source: [React: Creating a React App](https://react.dev/learn/creating-a-react-app): "If you want to build a new app or website with React, we recommend starting with a framework."
- Verification (2026-10-09): held: Opened react.dev creating-a-react-app: framework recommendation quote exact; Next.js, React Router v7, Expo; CSR/SPA/SSG deployable to CDN; Vite is from-scratch option.

### F5.54 [Q26] CONFIRMED

Vite builds to dist and deploys to GitHub Pages, Cloudflare Pages, Netlify or Vercel; vite preview is not a production server; SPA fallback routing must be configured per host (only a Firebase example is given).

- Lens: technical
- Source: [Vite: Deploying a static site](https://vite.dev/guide/static-deploy): "vite preview is intended for previewing the build locally and not meant as a production server."
- Verification (2026-10-09): held: Opened Vite static deploy: vite preview not a production server; dist; GitHub Pages, Cloudflare Pages, Netlify, Vercel; only Firebase has SPA rewrite example.

### F5.55 [Q26] CONFIRMED

The Solana Foundation's official templates repo has a Kit category (@solana/kit) whose only named path is kit/nextjs; the page names no Vite template (full list in TEMPLATES.md, not opened).

- Lens: venues
- Source: [solana-foundation/templates](https://github.com/solana-foundation/templates): "kit/nextjs"
- Verification (2026-10-09): held: Opened solana-foundation/templates: kit/nextjs appears as the usage example, no Vite template named, full list deferred to TEMPLATES.md.

### F5.56 [Q26] CONFIRMED

Cloudflare's Next.js guide recommends vinext on Workers for full-stack Next.js and sends static exports to its Static site guide; its React guide says Pages assumes a single-page application by default (build command npm run build, directory dist).

- Lens: venues
- Source: [Cloudflare: Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/): "Cloudflare recommends vinext on Workers for full-stack Next.js applications."
- Source: [Cloudflare Pages: Deploy a React site](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/): "By default, Cloudflare Pages assumes you are developing a single-page application."
- Verification (2026-10-09): held: Opened both Cloudflare pages: vinext recommendation for full-stack Next.js, static export pointed to Static site guide; React guide says Pages assumes SPA, npm run build, dist.

### F5.57 [Q26] CONFIRMED

In a static export, wallet and browser-only APIs (window, localStorage) must be accessed only on the client (for example inside useEffect), because Client Components are prerendered to HTML at build time.

- Lens: technical
- Source: [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports): "you need to safely access these APIs only when running in the browser."
- Verification (2026-10-09): held: Opened Next.js static exports page, Browser APIs section: window/localStorage must be accessed only in the browser, example uses useEffect.

## 2026-10-10 architecture checks (main session, read-only)

Run before ARCHITECTURE.md, with the user's OK. Method: JSON-RPC reads against `api.devnet.solana.com` and `api.mainnet-beta.solana.com` only. No transaction was sent.

### AR.01 [D71] [Q12] CONFIRMED

Devnet runs Alpenglow; mainnet does not. On 2026-10-10 at 14:43 UTC, `getAgGenesisCert` on devnet (solana-core 4.4.0-beta.0, feature set 1855282951) returned a certificate for slot 504148999, whose block time is 2026-09-25 19:54:25 UTC. That matches Anza's "completed on 25 September" (F6.20) and contradicts Solana's "planned" (F5.44). On mainnet (solana-core 4.3.0) it returned null. `getSlot` was sampled at "confirmed" and "finalized" once a second for 180 seconds. On devnet the gap was 0 slots at the median (max 2), and every confirmed slot was finalized by the next 1-second sample (max 1.007 s). On mainnet the gap was 31 to 33 slots, and a confirmed slot took 7.06 s to finalize at the median (p90 8.08 s). Slot length from `getRecentPerformanceSamples`: devnet 238 to 246 ms, mainnet 218 to 229 ms. Not measured: the time from sending our own transaction to "finalized", which needs a funded key (moved to M0).

## 2026-10-10 architecture research for section 1 (scale), two read-only agents

### AR.07 [D95] CONFIRMED where marked

Usage of the closest real markets, fetched 2026-10-09 to 10.

- **Kalshi overall** (DeFi Rate aggregator, [kalshi volume](https://www.defirate.com/prediction-markets/volume/kalshi/), CONFIRMED as what the aggregator shows): from Sep 10 to Oct 9, 2026, "Kalshi traded $68.7B in contracts ($16.3B in dollars paid)". That was 381.0M trades, 12.7M a day, with weekday days at $1.6B to $2.6B of face value. The Finance category was $877M over the same 30 days (1.3%).
- **Kalshi's S&P 500 above/below event closing 4:00 PM ET on 2026-10-09** (Kalshi API `markets?event_ticker=KXINXU-26OCT09H1600`, CONFIRMED): 1,893,297 contracts across the 52 markets the agent could read (more exist), and open interest 845,273. The busiest strike (T7809.9999) traded 797,376 contracts. Its hourly candlesticks put 363,932 of them in the bar ending 16:00 ET, which is 45.6%.
- **The same day's S&P range event** (KXINX-26OCT09H1600): 51,978 contracts across 30 markets.
- **Single-stock daily markets on Kalshi:** none found in the part of the series list the agent read (UNCONFIRMED that none exist).
- **Polymarket overall** (DeFi Rate, [polymarket volume](https://defirate.com/prediction-markets/volume/polymarket/)): about 1.4M trades a day; Finance was $29M over 30 days (0.6%).
- **Polymarket's stock events closing 2026-10-09** (Gamma API, `tag_slug=stocks`, CONFIRMED): single-stock events took $121 to $27,591 each (GOOGL "closes above ___" $27,591, META $2,131, TSLA $505), and SPY "Up or Down" took $16,826.
- **Robinhood** (Q2 2026 8-K exhibit 99.1, [SEC](https://www.sec.gov/Archives/edgar/data/0001783879/000178387926000113/q22026robinhoodexhibit991.htm), CONFIRMED): "Event Contracts Traded increased over 10x year-over-year to a record 13.6 billion".
- **Not found:** order or cancel counts, or an order-to-trade ratio, for any prediction market; trader counts for financial markets.

### AR.08 [D95] [D16] [D56] [D75] CONFIRMED where marked

Solana's limits and web targets, as of 2026-10-10.

- **Block compute limit:** 100M CU on mainnet since 2026-07-29, raised from 60M ([solana.com 100M CU blocks](https://solana.com/upgrades/100m-cu-blocks), SIMD-0286; CONFIRMED).
- **Per-writable-account limit per block:** UNCONFIRMED, because sources conflict. solana.com says it "stays at 12M" ([compute budget](https://solana.com/docs/core/fees/compute-budget)). Agave master has `MAX_WRITABLE_ACCOUNT_UNITS: u64 = 24_000_000` ([block_cost_limits.rs](https://raw.githubusercontent.com/anza-xyz/agave/master/cost-model/src/block_cost_limits.rs)), and SIMD-0306 ("status: Review") proposes 40% of the block limit.
- **Per transaction** ([fees](https://solana.com/docs/core/fees), CONFIRMED): a default of 200,000 CU per instruction and a maximum of 1,400,000 CU.
- **Slot time:** "slot time is now 200ms, down from 400ms", with mainnet's last step on 2026-10-09 ([reduced slot times](https://solana.com/upgrades/reduced-slot-times), CONFIRMED). AR.01 measured 218 to 229 ms on mainnet.
- **Alpenglow on mainnet:** listed for "Q3 2026" and not announced live ([alpenglow](https://solana.com/upgrades/alpenglow)), which agrees with AR.01's null certificate on mainnet.
- **Transaction size:** v1 transactions of up to 4,096 bytes are "now live on mainnet, testnet, and devnet", against 1,232 bytes for legacy and v0 ([larger transactions](https://solana.com/upgrades/larger-transaction-sizes), CONFIRMED). The limit of 64 accounts per transaction is unchanged ([transactions](https://solana.com/docs/core/transactions)).
- **Token transfer cost:** classic SPL Token `TransferChecked` costs 6,200 CU ([SIMD-0266](https://raw.githubusercontent.com/solana-foundation/solana-improvement-documents/main/proposals/0266-efficient-token-program.md), CONFIRMED). No Token-2022 figure was found.
- **Order-book compute:** Manifest's benchmark shows PHX_50/95/99 at 6,748/8,819/10,866 CU and MFX_50/95/99 at 1,010/1,284/1,819 CU, workload undefined ([bench data](https://bonasa-tech.github.io/manifest/dev/bench/data.js), 2026-10-08; claimed by Manifest's authors). OpenBook v2's `BookSide` is 90,944 bytes per side, holding 1,024 tree nodes of 88 bytes ([bookside.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/state/orderbook/bookside.rs), CONFIRMED). In Manifest, one resting order or seat takes an 80-byte block (constants.rs, CONFIRMED).
- **Public RPC limits** ([clusters](https://solana.com/docs/references/clusters), CONFIRMED, the same for devnet and mainnet): "Maximum number of requests per 10 seconds per IP: 100", 40 per single RPC method, and 40 concurrent connections per IP.
- **Free RPC tiers, as read:** Helius 1M credits a month, 10 RPC requests a second and 1 `sendTransaction` a second. Chainstack 25 requests a second and 3M a month. Alchemy 30M CU a month, about 15 requests a second. Devnet access isn't confirmed for any of them.
- **Web targets** (CONFIRMED): TTFB is good at "0.8 seconds or less" ([web.dev TTFB](https://web.dev/articles/ttfb)), LCP at 2.5 s or less ([LCP](https://web.dev/articles/lcp)) and INP at 200 ms or less ([INP](https://web.dev/articles/inp)). Lighthouse fails a main document that takes more than 600 ms ([server response time](https://developer.chrome.com/docs/lighthouse/performance/server-response-time)).
- **SSE** (CONFIRMED): over HTTP/1.1 the browser limit per domain is "very low (6)", while over HTTP/2 streams are negotiated and "default to 100" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)). On reconnect the browser sends `Last-Event-ID` ([HTML spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)).

### AR.11 [D22] [D21] [D107] SECONDARY (search summaries of two primary pages)

A program can create an account itself through one cross-program call only up to 10,240 bytes. Two pages give the figure, read through search summaries:

- Anchor's zero-copy docs ([anchor-lang.com zero-copy](https://www.anchor-lang.com/docs/features/zero-copy)) cap their `init` example at 10240 bytes, which they attribute to this per-call limit. The 8-byte discriminator comes out of that total.
- Solana's constants reference ([constants reference](https://solana.com/docs/core/constants-reference)) lists `MAX_PERMITTED_DATA_INCREASE` as 10,240 bytes, the most a single call can grow an account.

So a 6,728-byte book can be created inside Create Market, but a 13,384-byte book has to be created first by the client, which is D22's original plan.

### AR.13 [D70] [D75] [D117] [D118] [D119] CONFIRMED where marked

Watchdogs, alert channels and free devnet RPC tiers. Sources: one read-only research agent, plus two pages the main session fetched on 2026-10-10. The fetch tool summarises pages, so quotes are near-verbatim.

**Watchdogs**

- **Healthchecks.io.** The free Hobbyist plan is "Monitor 20 jobs" ([pricing](https://healthchecks.io/pricing/), CONFIRMED). The service is "free for hobby use" ([about](https://healthchecks.io/about/), CONFIRMED). Checks take cron expressions with a per-check time zone and a grace time ([configuring checks](https://healthchecks.io/docs/configuring_checks/), CONFIRMED), and weekdays can be written as `1-5` ([cron](https://healthchecks.io/docs/cron/), CONFIRMED).
  - The pricing page names no alert integrations for the free plan. Only SMS, WhatsApp and phone-call credits appear, and only under paid plans. Whether Telegram is free is therefore UNCONFIRMED.
  - It is run by one person, and its about page says "multi-hour outages are possible".
- **Better Stack.** The free plan is "10 monitors & heartbeats" with "Slack & e-mail alerts" ([pricing](https://betterstack.com/pricing), CONFIRMED). Its heartbeat monitor is set by "Expect a heartbeat every" an interval plus a grace period. The page says nothing about time zones ([heartbeat docs](https://betterstack.com/docs/uptime/cron-and-heartbeat-monitor/), CONFIRMED by the main session).
- **Cronitor.** "5 monitors", with email and Slack alerts on the free plan (CONFIRMED).
- **Dead Man's Snitch.** One check free (CONFIRMED).
- **UptimeRobot.** Interval-based (CONFIRMED).

**Alert channels**

- **ntfy.** No sign-up: "the topic is essentially a password" ([publish docs](https://docs.ntfy.sh/publish/), CONFIRMED).
- **Telegram.** Free. A bot should "avoid sending more than one message per second" in a single chat ([bots FAQ](https://core.telegram.org/bots/faq), CONFIRMED).
- **Pushover.** "$4.99 USD one-time purchase", with 10,000 messages a month ([pricing](https://pushover.net/pricing), CONFIRMED).
- **Discord webhooks.** Free, with limits returned in the response headers (CONFIRMED).

**Free devnet RPC tiers**

- **Alchemy.** The free plan is "30M CU per month", about 15 requests a second, covering "All mainnets & testnets" ([pricing](https://www.alchemy.com/pricing), CONFIRMED). It has a devnet endpoint, `solana-devnet.g.alchemy.com` ([Solana quickstart](https://www.alchemy.com/docs/reference/solana-api-quickstart), CONFIRMED).
  - Its published costs: getSlot 20 units, getBlockHeight 20, getGenesisHash 10, getTransaction 40, getProgramAccounts 20 ([compute-unit costs](https://www.alchemy.com/docs/reference/compute-unit-costs), CONFIRMED).
- **Chainstack.** "On Solana Devnet, … 25" requests a second on the free Developer plan, but "getProgramAccounts" is "available only on the paid plans" ([limits](https://docs.chainstack.com/docs/limits), CONFIRMED).
- **Helius.** The free plan is 1M credits a month at 10 requests a second (CONFIRMED). Whether devnet is included free is UNCONFIRMED.
- **QuickNode.** A one-month trial only (CONFIRMED).
- **Triton.** No free tier (CONFIRMED).

### AR.14 [D22] [D30] [D69] [D74] [D125] CONFIRMED where marked

The program toolchain as of 2026-10-10. Release dates are from crates.io, GitHub releases and npm, read by one research agent and by the main session.

**Anchor.** 1.2.1 was created on crates.io on 2026-10-06; 1.2.0 on 2026-09-04 ([crates.io anchor-lang](https://crates.io/api/v1/crates/anchor-lang), CONFIRMED).
- 1.2.0 says "Return an error instead of panicking when zero-copy account data is undersized" ([CHANGELOG](https://raw.githubusercontent.com/solana-foundation/anchor/master/CHANGELOG.md), CONFIRMED). 1.2.1 adds "support for Solana v4 crates using the solana-v4 feature".
- 1.1.1 sets anchor-lang's minimum supported Rust version to 1.89.
- The 1.2.0 release notes say "The recommended Solana version is 4.1.2" ([release notes](https://www.anchor-lang.com/docs/updates/release-notes/1-2-0), CONFIRMED).
- CVE-2026-45137 affects anchor-lang 1.0.0 up to, but not including, 1.0.2 ([advisory](https://api.github.com/advisories?cve_id=CVE-2026-45137), CONFIRMED).

**Agave.** v4.3.0 is "a stable release suitable for Testnet, Devnet and Mainnet Beta", released 18 September ([release](https://github.com/anza-xyz/agave/releases/tag/v4.3.0), CONFIRMED). Solana's upgrades page lists Agave 4.4 with an "sBPFv3 program requirement for new deployments" (CONFIRMED). Devnet ran 4.4.0-beta.0 on 2026-10-10 (AR.01).

**Rust.** 1.98.0 is dated 2026-08-20 and 1.99.0 is dated 2026-10-01 ([Rust release channel](https://static.rust-lang.org/dist/channel-rust-1.98.0.toml), CONFIRMED by the main session).

**Codama.** codama 1.11.0, @codama/nodes-from-anchor 1.5.6 and @codama/renderers-js 2.5.0 were all released 2026-09-15. renderers-js 2.5.0's generated code needs `@solana/kit` ^8.3.0 (CONFIRMED). Support for Anchor 1.x IDLs is UNCONFIRMED.

**Token-2022 clients.**
- `spl-token-2022-interface` 3.0.0 added Permissioned Burn; 3.1.2 is dated 2026-09-23 (CONFIRMED).
- `@solana-program/token-2022` 0.19.0 (npm, 2026-09-21) ships `getPermissionedBurnInstruction` and `getPermissionedBurnCheckedInstruction`. The main session confirmed this by unpacking the package.

**LiteSVM and Mollusk.**
- `litesvm` and `litesvm-loader` 0.16.0 are dated 2026-08-24; 0.17.0 (2026-09-28) moved to Agave 4.3 crates; 0.18.0 (2026-10-09) needs Rust 1.97.1. `mollusk-svm` 0.15.1 is dated 2026-08-29. All CONFIRMED.
- Whether their bundled Token-2022 includes Permissioned Burn is UNCONFIRMED.

**Surfpool.** 1.6.0 is dated 18 September. Its time travel is forward-only: "a past target is rejected" ([time travel](https://solana.com/docs/tools/surfpool/sdk/time-travel), CONFIRMED). Anchor 1.x's `anchor test` uses Surfpool by default. Support for WSL is UNCONFIRMED.

**Fuzzers.**
- Trident's last stable release is 0.12.0 (2025-11-27), with 0.13.0-rc.4 (2026-05-14) after it.
- Crucible v0.2.1 (4 August) added an Anchor integration in v0.2.0. Anchor's docs describe `anchor fuzz` as "Coverage-guided fuzzing for Solana programs using Crucible" ([fuzzing](https://www.anchor-lang.com/docs/testing/fuzzing), CONFIRMED).

**Verified builds.** solana-verify 0.5.2 is dated 2026-09-21. Solana's docs say "Remote verification through the OtterSec API works only on mainnet" ([verified builds](https://solana.com/docs/programs/verified-builds), CONFIRMED).

**Pyth.** pyth-solana-receiver-sdk 2.0.0 (2026-06-15) depends on anchor-lang 1.0.2. By default its `declare_id!` is the legacy receiver `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ`; the `pro-compatible` feature switches it to the upgraded receiver. An `Account<PriceUpdateV2>` therefore checks a single owner ([source](https://docs.rs/crate/pyth-solana-receiver-sdk/2.0.0/source/src/lib.rs), CONFIRMED).

### AR.15 [D72] [D75] [D95] [D124] CONFIRMED where marked

The web, backend and hosting choices as of 2026-10-10. One research agent read the sources, and the main session checked npm release dates with `npm view <package> time`.

**Next.js static export.** It does not support "Rewrites, Redirects, Headers, Proxy … Server Actions … Route Handlers that rely on the Request". Client components are prerendered at build time, when "browser APIs like `window` are not available" ([static exports](https://nextjs.org/docs/app/guides/static-exports), CONFIRMED).

**Templates.** Solana lists a `react-vite` template ("React and Vite with Tailwind") and a `nextjs` template ([templates](https://solana.com/developers/templates), CONFIRMED). Solana's docs recommend `@solana/kit` with its plugins and `@solana/kit-plugin-wallet` for wallets ([frontend kit](https://solana.com/docs/frontend/kit), CONFIRMED).

**npm versions released before 2026-09-26** (newest version in brackets):

| Package | Version | Released | Newest |
|---|---|---|---|
| vite | 8.3.1 | 2026-09-24 | 8.3.4 |
| react | 19.3.0 | 2026-09-09 | |
| react-router | 8.4.0 | 2026-09-15 | |
| next | 16.3.6 | 2026-09-22 | |
| @solana/kit | 8.3.0 | 2026-09-09 | 8.4.0, 2026-09-28 |
| @solana/kit-plugin-wallet | 0.20.0 | 2026-09-10 | |
| @wallet-ui/react | 4.3.0 | 2026-08-19 | |
| hono | 4.13.9 | 2026-09-24 | |
| @hono/node-server | 2.1.1 | 2026-08-14 | |
| better-sqlite3 | 13.0.3 | 2026-08-05 | |
| pino | 10.3.1 | 2026-02-09 | |
| zod | 4.6.5 | 2026-09-13 | |
| typescript | 6.0.3 | 2026-04-16 | 7.0.2, 2026-07-08 |
| vitest | 5.0.2 | 2026-09-25 | |
| @playwright/test | 1.63.0 | 2026-09-04 | |
| @axe-core/playwright | 4.13.0 | 2026-08-11 | |

@wallet-ui/react 4.3.0 needs `@solana/kit` ^6.1.0 or ^7.0.0. @solana/kit-plugin-wallet 0.20.0 needs `@solana/kit` ^8.2.0.

**Node.** v24 is long-term support until 2028-04-30, and v26 becomes long-term support on 2026-10-28 ([previous releases](https://nodejs.org/en/about/previous-releases), CONFIRMED). The newest v24 before the cutoff is 24.21.0, dated 2026-09-07 ([dist index](https://nodejs.org/dist/index.json), CONFIRMED). `node:sqlite` is a "release candidate" in v24 (CONFIRMED).

**Hosts and storage.**
- Fly.io: shared-cpu-1x with 256 MB costs $2.19 per 30 days, and volumes cost $0.15 per GB-month. It runs in Secaucus, NJ (ewr). Its proxy serves clients over HTTP/2 ([pricing](https://docs.fly.io/about/pricing), [services](https://docs.fly.io/networking/services), CONFIRMED).
- Northflank: its Sandbox is "Always-on-compute – no sleeping" (allowances not stated), and the smallest paid plan is $2.70 a month ([pricing](https://northflank.com/pricing), CONFIRMED).
- Railway ends a request at "up to 15 minutes if data keeps transferring" ([limits](https://docs.railway.com/networking/public-networking/specs-and-limits), CONFIRMED).
- Render's free services sleep after 15 minutes and can't use disks ([free](https://render.com/docs/free), CONFIRMED).
- Oracle's Always Free VMs are reclaimed when idle over 7 days (CONFIRMED).
- Hetzner's US CPX11 price rose from June 2026 (CONFIRMED).
- Cloud Run requests time out after at most 60 minutes (CONFIRMED).
- Neon's free plan always auto-suspends after 5 minutes and caps compute at 100 CU-hours a month. Supabase's free projects pause "after 1 week of inactivity" (CONFIRMED).
- Cloudflare Pages without a 404 page "serves the root (/) for any incoming path" and supports `_headers` ([serving pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), CONFIRMED).
- Vercel Hobby is for "non-commercial personal use only" (CONFIRMED).
- Cloudflare R2's free tier is 10 GB-month with free egress (CONFIRMED).
- Litestream v0.5.17 is dated 31 August, and "Windows is NOT an officially supported platform" (CONFIRMED).

## 2026-10-10 workflow prep (phase 4): three read-only agents and two main-session checks

The agents read pages through the fetch tool, which summarises them, so quotes are near-verbatim. The main session ran WP.04 and WP.05 itself.

### WP.01 [P11] [P13] [P14] [P15] CONFIRMED where marked

Claude Code 2.1.296's own docs.

- **Subagents and skills.** A subagent definition's `skills` field injects each named skill's full SKILL.md at startup; without it, a subagent can only call skills through the Skill tool, and leaving Skill out of `tools` blocks that ([sub-agents](https://code.claude.com/docs/en/sub-agents), CONFIRMED). Other fields include `disallowedTools`, `permissionMode`, `maxTurns`, `hooks`, `effort` and `isolation` (CONFIRMED).
- **Worktrees.** `isolation: worktree` branches "by default from your default branch rather than the parent session's HEAD"; the setting `worktree.baseRef` is `"fresh"` (the remote's default branch, the default) or `"head"` (the local HEAD). Worktrees live in `.claude/worktrees/<name>/`. `.worktreeinclude` copies gitignored files that match it. A subagent's worktree is removed if it made no changes ([worktrees](https://code.claude.com/docs/en/worktrees), CONFIRMED). `WorktreeCreate` and `WorktreeRemove` hooks exist, but a `WorktreeCreate` hook replaces Claude's own creation and skips `.worktreeinclude` ([hooks](https://code.claude.com/docs/en/hooks), CONFIRMED). From 2.1.277 a worktree without `.claude/skills` reads the main checkout's skills and agents (CONFIRMED).
- **Permission rules.** `*` matches any text anywhere in the command. Within a level, deny, then ask, then allow are checked, and a deny at any level beats an allow at any other. Deny and ask rules apply if any part of a compound command matches; an allow rule must match every part. A prefix is not a boundary: `Bash(curl *)` does not catch `sh -c 'curl …'`, and `wsl` is not stripped as a wrapper ([permissions](https://code.claude.com/docs/en/permissions), CONFIRMED). So an allow rule for `wsl *` would very likely run `wsl -e bash -lc "git push …"` without a prompt (SECONDARY, inferred from those rules). A rule can't see inside a script that the rule allows.
- **Hooks.** A PreToolUse hook that exits with code 2 blocks the tool call, and stderr is shown as the reason. A matcher of `Bash|PowerShell` covers both shells. On Windows, hook commands run in Git Bash when it is installed (CONFIRMED). The docs have no example that blocks commits on `main`.
- **Orchestration.** `claude --bg` starts a background session that moves into its own worktree before editing; `claude agents` lists them ([agent view](https://code.claude.com/docs/en/agent-view), CONFIRMED). Workflow scripts run up to 16 agents at once by default. The documented `agent()` options don't include worktree isolation (UNCONFIRMED that it exists) ([workflows](https://code.claude.com/docs/en/workflows)). `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` turns off subagents spawning subagents (CONFIRMED).
- **WSL.** Claude Code runs inside WSL with the Linux installer, "WSL setups do not need Git for Windows", and sandboxing works on WSL2 but not on native Windows ([setup](https://code.claude.com/docs/en/setup), [sandboxing](https://code.claude.com/docs/en/sandboxing), CONFIRMED).

### WP.02 [P11] [P16] CONFIRMED where marked

The development machine: WSL, OneDrive, git, Surfpool, the Solana toolchain and Cursor.

- **Where files live.** Microsoft: "We recommend against working across operating systems with your files"; for speed in a Linux command line, keep files in the WSL filesystem, such as `/home/<user>/Project` ([WSL file systems](https://learn.microsoft.com/en-us/windows/wsl/filesystems), CONFIRMED). No published `cargo build` timing on `/mnt/c` was found; WP.04 measures the cost directly.
- **Two git installs, one repository.** Worktree links are absolute paths by default; `worktree.useRelativePaths` changes that ([git-worktree](https://git-scm.com/docs/git-worktree), CONFIRMED). A worktree made by Windows git (`gitdir: C:/…`) can't be used by Linux git (SECONDARY, [Git Extensions docs](https://git-extensions-documentation.readthedocs.io/worktrees.html) and a Claude Code issue summary). Microsoft advises installing git separately on each side and keeping line endings consistent with `.gitattributes` ([WSL git](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-git), CONFIRMED).
- **OneDrive.** It can't exclude a folder by pattern (only "Choose folders"), it doesn't support symlinks, and it recommends at most about 300,000 synced items ([restrictions](https://support.microsoft.com/en-us/office/restrictions-and-limitations-in-onedrive-and-sharepoint-64883a5d-228e-48f5-b3d2-eb39e07630fa), CONFIRMED). Reports of OneDrive corrupting `.git` folders are anecdotal (SECONDARY, [Microsoft forum](https://techcommunity.microsoft.com/discussions/onedriveforbusiness/onedrive-is-corrupting-my-git-repositories/3898283)). On this machine the OneDrive client wasn't running on 2026-10-10, but `C:\Users\joshu\OneDrive` is still a cloud-files folder (reparse tag 0x9000701a, checked by the main session).
- **Editors.** VS Code's WSL extension runs the editor on Windows and the code, git and extensions inside the distro ([WSL with VS Code](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode), CONFIRMED). Cursor's WSL support is UNCONFIRMED.
- **Surfpool.** `surfpool start` defaults to RPC port 8899, WebSocket 8900 and Studio 18488 on 127.0.0.1, set by `--port`, `--ws-port` and `--studio-port`, with `--no-studio` to turn Studio off ([Surfpool CLI](https://solana.com/docs/tools/surfpool/toolchain/cli), CONFIRMED). Two instances with different ports is UNCONFIRMED until tried. A Windows browser reaches a WSL server through `localhost` in the default NAT mode ([WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking), CONFIRMED).
- **Toolchain install.** Solana's one-line installer sets up Rust, Agave, Anchor, Surfpool and Node inside Ubuntu ([installation](https://solana.com/docs/intro/installation), CONFIRMED). The manual route is rustup, then `https://release.anza.xyz/<tag>/install`, then `avm` ([Anchor installation](https://www.anchor-lang.com/docs/installation), CONFIRMED). The Linux packages are `build-essential pkg-config libudev-dev llvm libclang-dev protobuf-compiler libssl-dev` (CONFIRMED). Whether `avm` offers 1.2.0 is UNCONFIRMED.
- **Cursor skills.** Cursor loads `.agents/skills/` and `.cursor/skills/`, and "for compatibility" also `.claude/skills/` ([Cursor skills](https://cursor.com/docs/context/skills), CONFIRMED). Whether the identical copies in both folders show up twice is UNCONFIRMED.

### WP.03 [P17] CONFIRMED where marked

Deploying at M0.

- **Fly.io.** "All organizations … require a credit card on file". The trial is at most 2 hours of machine time or 7 days ([pricing](https://docs.fly.io/about/pricing), CONFIRMED). GitHub Actions deploys use an app-scoped token (`fly tokens create deploy`), saved as `FLY_API_TOKEN`, and `flyctl deploy --remote-only` ([continuous deployment](https://docs.fly.io/launch/continuous-deployment-with-github-actions), CONFIRMED). Health checks go under `[[http_service.checks]]`; a check expects a 2xx and doesn't follow redirects. `auto_stop_machines = "off"` keeps a machine running ([fly.toml](https://docs.fly.io/reference/configuration), CONFIRMED).
- **Litestream.** `litestream replicate -exec "<app>"` runs the app under Litestream ([Docker guide](https://litestream.io/guides/docker/), CONFIRMED). Restoring when the volume is empty at boot (`restore -if-db-not-exists -if-replica-exists`) is UNCONFIRMED for 0.5.x.
- **Cloudflare Pages.** A Direct Upload project can't be switched to Git integration later. Direct Upload from CI needs a token with Pages Edit, saved as `CLOUDFLARE_API_TOKEN` along with `CLOUDFLARE_ACCOUNT_ID`, and runs `wrangler pages deploy` ([Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), CONFIRMED). A `_headers` file can set `X-Robots-Tag: noindex` ([headers](https://developers.cloudflare.com/pages/configuration/headers/), CONFIRMED). Preview deployments are public, and already carry `noindex` ([previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/), CONFIRMED).
- **R2.** It needs "an R2 subscription", started from the dashboard ([get started](https://developers.cloudflare.com/r2/get-started/), CONFIRMED). Whether that requires a card is UNCONFIRMED. Access keys can be limited to one bucket with Object Read & Write ([tokens](https://developers.cloudflare.com/r2/api/tokens/), CONFIRMED).
- **Northflank.** The free tier has 2 services and is "Always-on-compute – no sleeping" ([pricing](https://northflank.com/pricing), CONFIRMED). Whether it needs a card, whether it builds a Dockerfile from GitHub, and whether it offers a persistent volume are all UNCONFIRMED.
- **GitHub.** Protected branches in private repositories are listed under GitHub Pro, not Free ([plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), CONFIRMED). For public repositories on Free, the sources conflict (UNCONFIRMED). Standard runners are free for public repositories; a private one on Free gets 2,000 minutes a month ([Actions billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions), CONFIRMED).
- **Search engines.** A page blocked by robots.txt is never crawled, so its `noindex` is never seen. Use the header or meta tag without a Disallow ([block indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing), CONFIRMED).
- **Healthchecks.io and Telegram.** No first-party page states whether the free plan includes the Telegram integration (UNCONFIRMED, as in AR.13). The [Telegram integration page](https://healthchecks.io/integrations/telegram/) shows no plan restriction.

### WP.04 [P11] CONFIRMED (measured)

A small-file workload, run by the main session on 2026-10-10 in WSL2 (Ubuntu, kernel 6.18.33.2, 16 cores, 7 GB). It extracts 20,000 files of 2 KB in 200 folders from a tar file, reads them all, stats them all, then deletes them. It stands in for `npm install` and for cargo filling `target/` (script in the session scratchpad, `fsbench.sh`).

| Where | Write | Read | Stat | Delete |
|---|---|---|---|---|
| WSL's own disk (`/home/joshu`, ext4) | 0.63 s | 0.36 s | 0.57 s | 0.26 s |
| The Windows drive (`/mnt/c/…/Temp`, 9P) | 55.17 s | 78.28 s | 34.40 s | 20.82 s |

The Windows drive was 60 to 220 times slower. Also on 2026-10-10: WSL had no Rust, Solana CLI, Anchor, Node or Surfpool yet, and had git 2.53.0; Windows had git 2.55.0.

### WP.05 [P13] CONFIRMED (checked)

A harness check, run by the main session on 2026-10-10. The `implementer` agent, as defined in phase 0 (`tools: Read, Edit, Write, Bash, Grep, Glob`, with no `skills` field), was asked what it had in context. It reported:
- no text of `tdd-plan-implementer` or `grill`;
- no Skill tool;
- no AGENTS.md;
- only the two CLAUDE.md files.

Its worktree was removed afterwards (`git worktree list` showed only the main checkout).

After adding the `skills` field and new instructions:
- The same question in the **same** session still got the old answer. The agent even quoted the old first line, "Follow tdd-plan-implementer". So a session keeps the agent definitions it loaded at start.
- A **fresh** headless session (`claude -p`) that spawned the agent got:
  - `# TDD plan implementer` and `# Grill` quoted from context;
  - its new first instruction, "Read `AGENTS.md` first, including its Lanes section".
- The new `web-implementer` agent, checked the same way, quoted the headings of `tdd-plan-implementer`, `grill` and `frontend-engineer`, and reported running on Sonnet.
- Running the definition as a main session (`claude -p --agent implementer`) did not preload the skills. The `skills` field applies to subagents.

### WP.06 [P11] CONFIRMED (checked)

Two checks of running WSL commands from Claude Code on Windows, by the main session on 2026-10-10. The scripts are `lf.sh` and `crlf.sh` in the session scratchpad.
- **Git Bash rewrites paths.** From Git Bash, `wsl -e bash /mnt/c/…/lf.sh` failed with `bash: C:/Program Files/Git/mnt/c/…/lf.sh: No such file or directory`. Git Bash had turned the bare `/mnt/c/…` argument into a Windows path. The same script ran when the path sat inside a quoted command: `wsl -e bash -lc "cd /mnt/c/… && bash lf.sh"`.
- **CRLF breaks scripts quietly.** A script saved with CRLF line endings printed `set: -: invalid option` for its first line, `set -e`, then carried on and exited 0. So it ran without its stop-on-error switch.
- **This repository.** Git for Windows sets `core.autocrlf=true` system-wide. `git ls-files --eol` showed every file LF in the index, with 10 working-copy files in CRLF and 2 mixed.

## 2026-10-10 M0 measurements (main session)

### M0.01 [P11] [D123] [D125] CONFIRMED (measured)

The build tools were installed in WSL on 2026-10-10 by `scripts/toolchain/install.sh` (Ubuntu 26.04.1 LTS, kernel 6.18.33.2, 16 cores, 7 GB). Sudo was needed only once, for Solana's apt prerequisites (build-essential, pkg-config, libudev-dev, llvm, libclang-dev, protobuf-compiler, libssl-dev, from [Solana's install guide](https://solana.com/docs/intro/installation/dependencies)), which the user ran.

`node scripts/toolchain/check.mjs` then reported:

| Tool | Version |
|---|---|
| rustc | 1.98.0 (88d9e12ae 2026-08-18) |
| solana-cli | 4.3.0 (src:825efd18; feat:c9ad34d2, client:Agave) |
| anchor-cli | 1.2.0 |
| surfpool | 1.6.0 |
| solana-verify | 0.5.2 |
| litestream | 0.5.17 |
| node | v24.21.0 |

- **Hashes.** Every release file's SHA-256 matched the hash recorded in `scripts/toolchain/pins.sh` before it was unpacked. Litestream's `checksums.txt` and solana-verify's `.sha256` file equal GitHub's digest for the same assets. With Litestream's hash set to zeros, the script stopped with "SHA-256 mismatch … got cfb37117…" and installed nothing.
- **Time.** A first install took about 60 s. A rerun skips every pin already installed.
- **Platform tools.** The first `anchor build` downloaded Solana's platform tools v1.57 to `~/.cache/solana`.
- **Node on Windows.** Windows Node 24.21.0 came from nodejs.org's installer, with its SHA-256 and OpenJS Foundation signature checked, because winget's newest was 24.20.0.

### M0.02 [P11] CONFIRMED (measured)

P11's three setups, timed on 2026-10-10 by `scripts/toolchain/time-builds.sh`, on the same machine as M0.01. The program is a clean `anchor build` of Anchor 1.2.0's starter (`anchor init starter --no-install --no-git`), with the crates and platform tools already downloaded. Run 1 started at about 23:10 UTC (from its files' timestamps) and run 2 at 23:33 UTC. Run 1's script was edited while it ran (AI_USAGE 16); each of its times below was checked before use.

| Setup | Run 1 | Run 2 |
|---|---|---|
| 1. Everything in the Windows folder (`/mnt/c/dev/…`) | 773.9 s | — |
| 2. The Windows folder, with `CARGO_TARGET_DIR` on WSL's disk | 140.0 s | 164.0 s |
| 3. A copy on WSL's disk | 172.4 s | 163.2 s |
| A clean build on WSL's disk (run 2's warm-up, with the caches full) | — | 170.8 s |

`npm ci` of this repository's lockfile (190 packages), with a warm cache:

| Where | Time |
|---|---|
| The Windows folder, Windows npm 11.19.0 | 28.4 s |
| A copy on WSL's disk, WSL npm 11.19.0 | 29.8 s |

- **P11's rule.** The better Windows setup (2) averaged 152.0 s against 167.8 s for the copy on WSL's disk: 0.91 times, and 2.5 minutes for a clean build. The rule moves the repository only at more than 3 times or over 5 minutes, so the repository stays at `C:\dev\binary-stock-outcome`.
- **Where the build output goes.** Anchor 1.2.0 honours `CARGO_TARGET_DIR`. Setup 2's `starter.so` appeared only under it, and the Windows folder's copy kept setup 1's timestamp.
- **What to avoid.** Building with the output in the Windows folder (setup 1) took 12.9 minutes, 4.6 times the copy on WSL's disk.

### M0.03 [D50] [D107] [D125] CONFIRMED (measured)

The first program (Initialize Config only), built on 2026-10-10 with `anchor build` from Anchor 1.2.0 and Agave 4.3.0's platform tools v1.57, in WSL.

- **Program format.** `anchor build --help` gives `--arch` "[default: v3]", and the built `meridian.so` has ELF `e_flags` 3, so it is sBPFv3. Devnet answered `getVersion` with `solana-core 4.4.0-beta.0` the same day. Whether devnet accepts the program is checked at its deploy.
- **Config.** The full Config of ARCHITECTURE.md §5 (D133) takes 647 bytes in LiteSVM, including Anchor's 8-byte discriminator, against `accounts.mjs`'s estimate of 682. `solana rent 647` gives a deposit of 0.003937 SOL.
- **The program.** `meridian.so` is 192,376 bytes. Its ProgramData account (a 45-byte header plus the program) needs a deposit of 0.97814892 SOL (`solana rent 192421`).
- **Addresses.** Config's address is `Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e`, from both `solana find-program-derived-address kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly string:config` and the generated client's `findConfigPda()`.
- **Upgrade key in tests.** LiteSVM 0.16.0's `add_program` leaves ProgramData's upgrade key empty (`upgrade_authority_address: None`, in its source), as AR.03 suspected. The tests write the key into ProgramData's header instead (the `litesvm-tests` skill).

### M0.04 [D22] [D125] CONFIRMED (measured)

Codama with Anchor 1.2.0's IDL, on 2026-10-10. `codama` 1.11.0 with `@codama/nodes-from-anchor` 1.5.6 read `clients/idl/meridian.json` (IDL spec 0.1.0). `@codama/renderers-js` 2.5.0 then generated the account with its decoder, the PDA helper, the instruction, the 7 errors, the event and both types for `@solana/kit` 8.3.0.

The result typechecks under TypeScript 6.0.3 (`tsc -p clients/ts`, exit 0) and, with `erasableSyntax` and `.ts` import extensions, runs directly on Node 24.21.0. `clients/ts/examples/config-address.ts` printed Config's address and a 231-byte Initialize Config.

Two things needed handling:
- The instruction's one struct argument is flattened into top-level fields.
- The generated errors read `process.env`, so the typecheck needs `@types/node`.

## 2026-10-11 M0 devnet deploy (main session)

### M0.05 [D69] [D125] [P24] CONFIRMED (measured)

The first program on devnet, on 2026-10-11. Devnet answered `solana cluster-version` with 4.4.0-beta.0, in epoch 1180.

- **sBPFv3 isn't required yet.** `solana feature status -u devnet --display-all` lists "SIMD-0178, SIMD-0189 and SIMD-0377: Enable deployment and execution of SBPFv3 programs" as active since epoch 1069, and "SIMD-0500: Disable deployment of SBPF v0, v1 and v2 programs" as inactive. Agave 4.4's requirement (AR.14) takes effect only when a cluster switches SIMD-0500 on, so on this date devnet would still take the older formats.
- **The verified build.** `solana-verify build` 0.5.2 defaults to `--arch v0`; with `--arch v3`, in `solanafoundation/solana-verifiable-build:4.3.0` pinned by digest (`sha256:12fd4c0a…`), it built commit `423fa8c370d112e1fbc7197197825853b12e6edc` as a 192,376-byte program with ELF `e_flags` 3. Three builds gave the same hash, `23a0d75100810ba9ceba22fede5653d7152336bda87c7cb7707a5bb89fcf1b46`: one from a `git archive` of the commit (93 s) and two of GitHub's download of it (78 s and 73 s). The image is 5 GB (`docker image ls`) and took 65 s to download.
- **The deploy.** `solana program deploy` with the upgrade key as payer and authority finished in transaction `67AMBYX5SnjzJfH8LJYQyssZdCdxsjXEhTZspYtDorwLDUSt92oiiFh82ZzcQ8p3w8kx5iPpmDS6szPwaDGewNoG` (finalized). `solana-verify get-program-hash` read the same hash back from devnet. `solana program show` gives ProgramData `DDGT42eGBiu4pqCLqzNwTDk5LR3uQqmy5y3u1nSu93qB`, authority `HCyLrwGeGMHAG7h8GGrUQjJf7hNjjWakqch6sTTWUVPt`, a 0.97814892 SOL deposit, as M0.03 computed. The balance went from 5 to 4.02004296 SOL, and the buffer account was closed.
- **Initialize Config.** `scripts/devnet/init-config.ts` finished in transaction `3AFeheSrpGXa3WKAi9tKhrbEhjwot9kyNnyEk7FeFkZH7uY3Au3xE9VRBmLZJx1AdW34PD4b5JGF5hESExgrEZWy` (finalized). Config `Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e` holds 0.003937 SOL, is owned by the program, and reads back the admin, operator, devnet USDC, both receivers and the 7 tickers from `config/program-devnet.json`.
- **Tool behaviour.** Given `.` as its folder, solana-verify 0.5.2 dropped every dot from the manifest's path ("`/build//programs/meridian/Cargotoml` does not exist"); a full path works. Without `[workspace.metadata.cli] solana` in `Cargo.toml` it printed "Program Solana version: v0.0.0". Its container compiles with its own Rust, 1.97.1. Without `--buffer`, `solana program deploy` prints the recovery phrase of the buffer account's key (AI_USAGE 17).
- Correction (2026-10-11): the missing `[workspace.metadata.cli]` entry did not cause "Program Solana version: v0.0.0". solana-verify 0.5.2 prints that whenever `--base-image` is given, because it then skips looking up the version (`src/main.rs` at v0.5.2). Commit `e101e44f7d26caa7b169e02c0593d80cd4f3d899`, which has the entry, printed it too and built the same hash, `23a0d751…1b46`. The tool's own table maps Agave 4.3.0 to the digest pinned in `VERIFY_IMAGE`, `sha256:12fd4c0a…` (`src/image_config.rs`), so a plain `solana-verify build` picks the same image (AI_USAGE 19).

## 2026-10-11 M0 timed sends (main session)

### M0.06 [D71] [AR.01] CONFIRMED (measured)

Fifty of our own transactions on devnet, from 15:56 UTC on 2026-10-11, timed by `scripts/devnet/time-sends.ts 50` from WSL on the user's laptop through the public endpoint `https://api.devnet.solana.com`. Devnet answered `getVersion` with solana-core 4.4.0-beta.0, feature set 1855282951, and `getAgGenesisCert` still returned the certificate for slot 504148999, so it runs Alpenglow (AR.01).

- **The transactions.** Each moved n lamports (n = 1 to 50) from the operator key `AXwqBeBHE8S7YgngNQmudHYijxNpvQMPEkTymR59ZZXY` to the upgrade key, one at a time. Before each send, the script opened signature subscriptions at "confirmed" and "finalized" and was already reading them. All 50 succeeded. With one earlier single-transaction run, they cost 0.000256276 SOL: fees of 5,000 lamports each plus 1,276 lamports moved.
- **The send call** returned in a median 175 ms (min 164, p90 203, max 319).
- **From the send to "finalized":** median 839 ms, p90 1,199 ms, min 591 ms, max 3,069 ms. "Confirmed" was the same within 2 ms for every transaction (median 838 ms), so on devnet the wait for "finalized" costs nothing extra.
- **Before funding,** the first run failed at simulation with "Attempt to debit an account but found no record of a prior credit"; the operator key then received 0.01 SOL from the upgrade key.
- Not measured: mainnet, where AR.01 found a confirmed slot takes about 7 seconds to finalize, and a paid RPC provider.

## 2026-10-11 M0 backend, local (main session)

### M0.07 [D124] [P17] [P25] CONFIRMED (measured locally; Fly.io, R2 and Northflank not yet)

The backend skeleton, run on the laptop on 2026-10-11 before any host account existed.

- **Against devnet, on Windows.** `node apps/backend/src/main.ts` answered `GET /api/health` with 200, chain slot 509,956,739 and migration `0001_heartbeats_alerts` current (camelCase fields then; snake_case after the review). It stored a heartbeat with genesis hash `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` and answered an unknown path with 404 and `{code, message}`.
- **The image.** `docker build -f apps/backend/Dockerfile` took 26 s in WSL's Docker and made a 672 MB image. `/app/node_modules` is 194 MB, of which `@solana` is 137 MB and `typescript`, a peer of Kit, is 24 MB; Litestream is 38 MB. Litestream's download matched `pins.sh`'s SHA-256 inside the build.
- **Memory.** About 30 seconds after start, `docker stats` gave 76.75 MiB for the container, with Litestream and the app idle. That is one idle reading on the laptop, not the measurement on Fly.io that D124 asks for.
- **Litestream, with a file replica standing in for R2.** The first container stored a heartbeat, and Litestream logged "snapshot complete". On `docker stop`, Litestream passed SIGTERM to the app, which logged its `stop` step before Litestream shut down. The data folder was then emptied, and a second container restored the store from the replica. Its migrate step applied nothing, and the first run's heartbeat (slot 509,957,369) was there beside the new one.
- **After a fresh-context review** (AI_USAGE 21), on the rebuilt image: with the RPC pointed at an address that never answers, `/api/health` answered in 448 ms with `last_pass_at` null, and the pass ended after 10 s with "no answer within 10000 ms". As `standby` it ran without Litestream. The first standby run, with no volume, exited with "Cannot open database because the directory does not exist", so the image now creates `/data`. The primary's backup and restore test passed again.
- **On Linux,** a clean copy on WSL's disk ran `npm ci` in 21 s with no unreviewed install scripts, and the backend's tests and typecheck passed.
- **Not yet tested:** R2 itself, Fly.io's build, volume and health check, the Telegram and Healthchecks calls with real accounts, and the standby.

## 2026-10-11 M0 accounts and backups (main session)

### M0.08 [D117] [D118] [D134] CONFIRMED (checked)

- **Telegram (D117).** With the user's bot token and chat ID in `.env`, `node --env-file=.env apps/backend/src/cli/test-alert.ts` printed "Sent and recorded: Meridian test alert from primary at commit 2099a41, 2026-10-11T17:55:03.372Z". The Bot API accepted the message. A second alert at 18:17:53Z also went through, and the user confirmed it arrived in their chat with the bot.
- **Healthchecks.io (D118).** A new check showed "monitoring is paused" until its first ping. `apps/backend/src/cli/test-check-in.ts` then printed "Checked in: Meridian test check-in at commit 2099a41, 2026-10-11T18:06:33.614Z", and Healthchecks accepted it. On the free plan, the Telegram integration connected through @HealthchecksBot, and its Test button delivered a sample "The check TEST is DOWN" message to the user. That settles D118's open question: the free plan includes Telegram alerts.
- **Fly.io's volume snapshots (D134).** Fly.io's docs: "We automatically take daily snapshots of all Fly Volumes. We store snapshots for 5 days by default, but you can set volume snapshot retention from 1 to 60 days", and a snapshot restores into a new volume with `fly volumes create <name> --snapshot-id <id>` ([snapshots](https://fly.io/docs/volumes/snapshots/), CONFIRMED). `fly.toml` takes `snapshot_retention` and `scheduled_snapshots` under `[mounts]` ([configuration](https://fly.io/docs/reference/configuration/), CONFIRMED). Snapshots cost $0.08 per GB-month after the first 10 GB a month, which are free ([pricing](https://fly.io/docs/about/pricing/), CONFIRMED).
- **The switch.** The rebuilt image with no R2 settings logged "start.sh: Litestream is off (no R2_BUCKET); Fly.io's daily volume snapshots back the store up (D134)" and answered `/api/health` with 200. With `R2_BUCKET` set, it took the Litestream path ("database already exists, skipping", then "initialized db").

## 2026-10-11 M0 backend on Fly.io (main session)

### M0.09 [D124] [D132] [P26] CONFIRMED (measured)

- **Created.** `fly apps create meridian-devnet-backend --org personal`, then `fly volumes create meridian_data --region ewr --size 1 --snapshot-retention 14`: volume `vol_4ql7oz390kymm96r`, encrypted, 14-day snapshots, scheduled snapshots on.
- **The first deploy,** from a `git archive` of `main` at `5b897c12db71e8dee195d2994430e7636c0fe8ec`, with `fly deploy --local-only --build-arg GIT_COMMIT=<that commit>`: 64 s, a 672 MB image, one machine (`850dedb4e12748`) in ewr, a shared IPv4 address and a dedicated IPv6 one. The logs show "start.sh: Litestream is off", then the migrate and listen steps. Fly's health check failed once at 18:44:44, three seconds before the app was listening, within the 30 s grace period, and has passed since.
- **Live.** `https://meridian-devnet-backend.fly.dev/api/health` answered 200 in 0.29 s as the primary at commit `5b897c1…`, with devnet slot 509,996,713 and its migration current. `http://` redirects with 301, and an unknown path answers 404. `scripts/smoke/backend.mjs` passed for that commit and failed, naming both commits, when told to expect `e4b663a…`.
- **Memory (D124).** Through `fly ssh console`, `/proc/meminfo` gave MemTotal 212,228 kB and MemAvailable 112,836 kB: about 97 MiB in use of 207 MiB, with the app idle and Litestream off. The volume held 108 KB.
- **Secrets and the account tests.** Three `.env` values went into `fly secrets set` without being printed: lengths 46, 10 and 56. On the machine, `node /app/apps/backend/src/cli/test-alert.ts` printed "Sent and recorded: Meridian test alert from primary at commit 5b897c12…, 2026-10-11T18:46:33.597Z", and `test-check-in.ts` printed "Checked in: … 2026-10-11T18:46:35.757Z".
- **flyctl** 0.4.108 reports "flyctl v0.4.108 linux/amd64 Commit: 598c8d785986ef71fcb6b964b90f920b8936cd8e BuildDate: 2026-09-24T16:27:10Z". Its tarball's SHA-256 is the same in its `checksums.txt` and in GitHub's digest.

## 2026-10-11 M0 website, local (main session)

### M0.10 [P27] [D116] [M0.04] CONFIRMED (measured locally)

- **The generated client in a browser.** On Vite's dev server, the page crashed with "process is not defined": the client's error messages read `process.env["NODE_ENV"]` (M0.04). The production build replaced the expression, so the five browser tests, which ran against the build, passed. Defining `process.env` as `{ NODE_ENV }` in `vite.config.ts` fixed it. A dev-server run of the main test failed without the definition and passed with it.
- **Accessibility.** axe 4.13.0 reported "region: All page content should be contained by landmarks" for the play-money banner, which sat outside the header. Inside `<header>` the scan passes. The page reflows at 320 px with no sideways scroll, and the first Tab reaches "Skip to content".
- **Against real devnet,** on the dev server: the stocks appeared 185 to 611 ms after navigation, in light and dark. With devnet blocked, the page showed "Solana devnet didn't answer…" and Try again.
- **Smoke checks, locally.** `scripts/smoke/program.mjs` printed "ok: Config Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e matches config/program-devnet.json". `website.mjs`, pointed at the dev server, flagged the missing deploy headers and commit, as expected there, and found the 7 stocks with no console errors.
- **After a fresh-context review** (AI_USAGE 23): with the time limit removed from `readConfig`, its unit test hung until Vitest stopped it at 3 s; with the limit it passes. With devnet's address taken out of the served Content-Security-Policy, five browser tests failed, since the page could no longer read Config; restored, all eight pass. Without the focus call, the keyboard test failed on `toBeFocused`. `scripts/smoke/website.mjs`, run against a local `vite preview` of a build carrying commit `651218c…`, printed "attempt 1: ok": every header matched `public/_headers`, the 7 stocks came from real devnet, and the console had no errors.
- **Packages.** `@axe-core/playwright` 4.13.0 takes `playwright-core` as a peer (">= 1.0.0"), and npm gave it the 1.57.0 that `@zenuml/core` (inside the diagram tool) requires exactly. An npm `overrides` entry left it "invalid" rather than nesting 1.63.0, so it was removed. Installing a new workspace's dependencies before npm knew the workspace recorded nothing ("no workspace folder present"), as with the backend; a second install did.

## 2026-10-11 M0 first full deploy (main session)

### M0.11 [P17] [P26] [P27] [D132] CONFIRMED (measured)

The merge of slice e (`c6506c847f5a6f764087fb4517a5ea4a48f503c0`) was the first run of every deploy and of the three-part smoke test (CI run 38181270895).

- **The Pages project.** `wrangler pages project create meridian-devnet` succeeded, and the deploy printed "Deployment complete! Take a peek over at https://59276c6e.meridian-devnet-2qv.pages.dev". `meridian-devnet.pages.dev` already belonged to someone else: it serves a Next.js page (`/_next/static/…`). Cloudflare gave our project `meridian-devnet-2qv.pages.dev`, which answered 200 with `x-robots-tag: noindex`, the Content-Security-Policy of `public/_headers`, and `<meta name="meridian-commit" content="c6506c8…">`.
- **The smoke job.** The program check printed "ok: Config Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e matches config/program-devnet.json". The backend check printed "attempt 1: ok". The website check failed all 12 attempts against the other site, with "locator.getAttribute: Timeout 30000ms exceeded" because that page has no commit tag. The checks now read the tag at once and report "commit null".
- **Against the real address,** from the laptop: `node scripts/smoke/website.mjs https://meridian-devnet-2qv.pages.dev c6506c8…` printed "attempt 1: ok": the commit, every header of `public/_headers`, the 7 stocks read from devnet in Chromium, and no console errors.

## 2026-10-11 M0 account sizes and the first wallet results (main session)

### M0.12 [D50] [D94] [D107] [D108] [P28] CONFIRMED (measured)

- **Mints.** `scripts/devnet/m0-mints.ts` created "META 680+ Yes 10/08 (TEST)" (`9XqLMoYz4iteiumAiKb5Myv98efzpfYWpFSLb1KvJRGG`) and "META 680+ No 10/08 (TEST)" (`6GCpoXjvhbBcUFVdo9HeAa2pnzPnrrYQNzx7imkaDufN`): Token-2022, 0 decimals, Permissioned Burn, a metadata pointer to itself and a name. They take 383 and 381 bytes, holding 0.00259588 and 0.00258572 SOL, exactly `getMintSize` and `getMinimumBalanceForRentExemption`. §5 estimated 422 bytes and 0.0038 SOL.
- **A holder's token account** (associated, with ImmutableOwner) takes 170 bytes and 0.00151384 SOL. §5 estimated 165 bytes and 0.0020 SOL for the vault.
- **Rent.** Both devnet and mainnet (solana-core 4.3.0) answer `getMinimumBalanceForRentExemption(647)` with 3,937,000 lamports, which is 5,080 lamports per byte counting the 128-byte overhead. F3.11, and the budgets built on it (D50, D107, D108), used 6,960, so every deposit is about 27% smaller than planned. A 6,728-byte book needs 0.03482848 SOL, not 0.0477; a 165-byte vault 0.00148844; Config 0.003937, as M0.03 found.
- **Permissioned Burn (D94).** A holder that isn't the burn authority, burning its own token with a plain `BurnChecked`, was refused by Token-2022: `{"InstructionError":["0",{"Custom":"12"}]}`, log "Error: Invalid instruction". The same burn as `PermissionedBurnChecked`, co-signed by the burn authority, succeeded (`22GzFbPg8q8jYGLhK9ZC6BQ8ha7QesnGpMhXwG7jseZVfWHSHHQvyK3CQoHLQrcNtXryZ4Y9uv7kFAQD2buXNFsN`). A holder can't destroy a token alone.
- **Wallets, before any picture file.** The user's new Phantom account (`8RMY2j97tFTnti9y4inVUBrtMXTX3MetNhAVREM7ZLuU`) and new Solflare wallet (`AosjHTC511siSq4f5sCeJTErqvNXSCFtbZ4RqHuwTNzK`) each received 0.05 SOL and 5 of each test token; `getTokenAccountsByOwner` confirmed the balances. Both wallets, on devnet, showed the 0.05 SOL. Neither showed the tokens in its list: Phantom's "Manage token list" held only SOL and Ethereum, and Solflare's activity showed "+5 Unknown" for each arrival. A control token made the same way but without Permissioned Burn ("META 680+ Yes 10/08 (CONTROL)", `F7TfzURtZmwZJcjo7N3jHEYYLRN3PJjjWav4xJidg8rZ`, 5 to each wallet) behaved the same, so Permissioned Burn is not what hides them. Solflare's search didn't find the control's address. Solscan's devnet page showed its stored name and symbol, "META 680+ Yes 10/08 (CONTROL) (CTRL)", Token-2022, with a placeholder where a picture would be. All three tokens had an empty `uri`.

## 2026-10-12 M0 wallet test (main session, with the user at the keyboard)

### M0.13 [D66] [D94] [D108] [D110] [D115] [P28] CONFIRMED (measured)

The user ran `/wallet-test` on the dev server with a new Phantom account (`8RMY2j97tFTnti9y4inVUBrtMXTX3MetNhAVREM7ZLuU`) and a new Solflare wallet (`AosjHTC511siSq4f5sCeJTErqvNXSCFtbZ4RqHuwTNzK`) in desktop Chrome, on 2026-10-12 between 00:55 and 01:07 UTC. Every signature below was looked up on devnet with `getSignatureStatuses`: all "finalized", with no error.

- **Versions each wallet reports** (Kit's wallet plugin, `supportedTransactionVersions`): Phantom "legacy" and 0; Solflare "legacy", 0 and 1.
- **Token display (D108, D94).** A second Yes/No pair, linked to its name-and-picture file from creation (`BeGsxbF1MYU5UVaptoas4ayzz6ddMDJVHLWcFS2rNxrB`, `Ba5zKqsknmzH8aCVm5pYSmXGzr9SNTUadWWqVboVx9Ay`; 439 and 436 bytes, 0.0029 SOL each), and the first pair after its link was added, behaved like the bare tokens of M0.12: Phantom listed none of them, and Solflare showed each arrival as "+5 Unknown". The control without Permissioned Burn behaved the same. The user reports that other Gauntlet challengers saw the same (UNCONFIRMED: a report, not checked here).
- **Sending a Permissioned Burn token (D94).** 1 Yes token, from each wallet to the test authority: Phantom `QoR6wrUbCGoUeodddVtd6gsza7hPNPPWpuptFRvrTSCmRf2R5Vq9pt7fGmVM3tuEpFBTmArTYSQANmuazN6rNnA`, Solflare `24nCAQYxbH7UZ2gGyFU5yiLJKGCNNLnxSSMDr4CpAgmWpMHjFLxdPAQmGqqDM6fcdto3H1tYrsz1DupR6FeQPP9U`.
- **A wallet set to Mainnet (D115).** Phantom, with Testnet Mode off, signed the devnet transaction without warning, and the page sent it to devnet, where it landed (`5Rcf8yLpkpVwVKHd62Vx6KyJcjCVr4p128ytkwJEoKH8GF5uYFDR8bwx7KsvcWAcgiPdgcFM8JQN4Skh61dU4o2k`). Solflare, set to Mainnet, opened a dialog: "Network mismatch. Your current network is set to mainnet but this transaction is for devnet. Switch to the correct network before signing." Closing it returned `JsonRpcError` "Transaction cancelled", code 4001, the same code as closing the wallet window. Phantom's -32003 never appeared.
- **Three transactions in one request (D66).** Each wallet showed one approval and returned all three signed: Phantom `45Ga6Wjw…`, `4d2pidVs…`, `5PeDevo5…`; Solflare `5Gnky9mH…`, `2rZqi8XH…`, `58bxk8Wq…`.
- **A version 1 transaction (D110).** The first attempt failed in devnet's simulation, before any wallet saw it: "MaxLoadedAccountsDataSizeExceeded". A v1 transaction states its own limits; with 64 KiB of loaded account data and 10,000 compute units, devnet's simulation passed (150 units, 206 bytes loaded). Then Phantom failed with "Reached end of buffer unexpectedly" and showed no approval window: it couldn't read the transaction. Solflare signed it, and it landed as version 1 (`5u1pAM8F2DdCqTEYDtPXsVqn7zDCymWyntrMVVEEkmYwVxkHjcdXLWEAYDZLN8ZZWjz2FUxWePiT4Zg2vBUxJ7dB`, `getTransaction` "version": 1).

## 2026-10-12 M0 make dev (main session)

### M0.14 [D74] [D125] [P11] [P16] [P29] CONFIRMED (measured)

- **Loading the program without a deploy.** Surfpool 1.6.0, started with `--offline`, takes the program through `surfnet_writeProgram(program, bytes as hex, offset, upgrade authority)`. A `0x` prefix is refused. The 192,376-byte program went in as three 64 KiB pieces in about 0.1 s. Surfpool made the program account with its ProgramData `DDGT42eGBiu4pqCLqzNwTDk5LR3uQqmy5y3u1nSu93qB`, set the local upgrade key as authority, and logged "Program cache update deferred … invalid account data for instruction" until the last piece, after which the program was executable. The program's own Initialize Config, signed by that local key, then succeeded. No program key file was needed.
- **Ports.** Surfpool listens on 127.0.0.1 for its RPC (8899), its websocket (8900) and Studio (18488), the last one even with `--no-studio`. A second Surfpool on 28899 and 28900, started while the first held 18488, logged "Failed to start subgraph and explorer server: Address already in use (os error 98)", carried on, and answered `getSlot`. With port 8080 taken, `make dev` stopped before starting anything: "port 8080, for the backend, is in use; stop whatever runs there first". A local chain's websocket is on the RPC's port plus one, so `init-config.ts`, which swapped `http` for `ws` on the same port as devnet allows, failed with "WebSocket failed to connect" until it took `ws://127.0.0.1:8900`.
- **WSL and Windows.** Windows reached Surfpool's RPC in WSL 718 ms after starting it, and its websocket at once, through WSL's localhost forwarding. Killing the `wsl.exe` that started it ended Surfpool. Inside WSL, the Windows-installed packages fail at Vite's bundler, "Cannot find native binding" (only `@rolldown/binding-win32-x64-msvc` is installed), while better-sqlite3 loads, since it ships a linux-x64 prebuild.
- **Vite.** Vite 8.3.1 refuses a mode named "local": "conflicts with the .local postfix for .env files". The root `node_modules` holds Vite 8.3.4, which Vitest brought in; the website's pinned 8.3.1 is in `apps/web/node_modules`, and the first runs started the wrong one.
- **Timings.** On the laptop, from a checkout on the Windows drive, `npm run dev -- --check`: ready in 2.9 to 3.0 s with the program already built (build 0.0 s, keys 0.1 to 0.2, chain 0.6 to 0.9, program 0.1, config 0.6 to 0.8, backend 0.5, website 0.6). After touching the program's source, ready in 21.7 s, 18.1 s of it the build. From a copy of the same files in WSL's home folder, with the tools already installed: `npm ci --ignore-scripts` took 23 s, then `make dev-check`, with a new build folder, was ready in 115.3 s, 112.1 s of it the build; a second run was ready in 2.3 s.
- **Checks.** The website at http://127.0.0.1:5173 showed "Local demo · fake prices and a fake clock" and the 7 stocks read from the local chain, with no console errors. Its first Explorer links, `cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899`, opened Solana's Explorer in Chrome, which showed "Loading" for over 10 s and logged a bare "Error", so the local page now shows addresses without links. Surfpool answered the browser's preflight from that origin. The backend's health answered 200 with the local chain's slot. Killing the backend made `make dev` print "backend stopped by itself" and stop the rest: no Surfpool left in WSL, and ports 8899, 8900, 8080 and 5173 free.
- **Stopping.** On Windows, force-killing `make dev` itself also ended the backend, the website and Surfpool. On Linux, SIGTERM after ready stopped everything. SIGTERM during start-up left Surfpool running, because Surfpool ignores a SIGTERM that arrives in its first 0.3 s or so: sent at 0.3 s it was still running 10 s later, while sent at 1 s or 3 s it stopped in 0.11 s. `make dev` now forces whatever hasn't stopped after 5 s, and the same check then left no Surfpool and every port free.
- **The build's key.** A plain `anchor build --ignore-keys` in a new build folder left a random `deploy/meridian-keypair.json`; after `make dev`'s build, `deploy/` held only `meridian.so`.
- **Not yet measured:** the run on a second, fresh Ubuntu that D74 asks for.

## 2026-10-12 M0 make dev on a fresh Ubuntu (main session)

### M0.15 [D74] [P29] CONFIRMED (measured)

- **The machine.** A second Ubuntu next to the main one, installed with `wsl --install Ubuntu --name meridian-fresh --no-launch` in 35 s: Ubuntu 26.04.1 LTS, with none of our tools on its PATH (no `node`, `cargo` or `anchor`), and 16 CPUs and 7 GB of memory for WSL. A user named `meridian` stood in for the first-launch prompt: in the sudo group, with no password and sudo without one. The image had `git` and `curl`; `make` came with `build-essential`.
- **The README's steps, in order,** from `main` at 1890941:
  - the apt packages from Build tools: 33 s;
  - `git clone`: 1 s;
  - `bash scripts/toolchain/install.sh`: 43 s, ending with every tool at its pin (rustc 1.98.0, solana 4.3.0, anchor 1.2.0, surfpool 1.6.0, solana-verify 0.5.2, litestream 0.5.17, node 24.21.0, flyctl 0.4.108);
  - `npm ci`, in a new login shell: 40 s for 486 packages, with npm reporting "5 low severity vulnerabilities";
  - `make dev-check`: "ready in 209.6 s (build 206.5 s, keys 0.1 s, chain 0.5 s, program 0.0 s, config 1.0 s, backend 0.5 s, website 0.8 s)", then "Every part answered". Cargo timed the program's compile at 1 min 07 s and the interface build at 38.8 s.
- **From nothing to ready:** 327 s, about 5½ minutes, plus 35 s to install the Ubuntu. No step needed anything the README doesn't say, so D74's container isn't needed.
- The Ubuntu was removed afterwards with `wsl --unregister meridian-fresh`. The main Ubuntu was untouched.

## 2026-10-12 M1 order-book spike (main session)

### M1.01 [D21] [D62] [D90] [D99] [D107] [D137] [D138] [P30] CONFIRMED (measured)

- **Set-up.** Mollusk 0.15.1 ran Place order, in its M1-a form, against a full book: 64 offers at 36¢ to 99¢ and 64 bids at 1¢ to 35¢, one of each from 64 traders, 1 Yes each, so each fill reached a different maker. The taker's Market order reached 0 to 61 resting orders. The tests loaded devnet's own token programs, saved at slots 510160184 (classic, 108,600 bytes) and 510160185 (Token-2022, 711,008 bytes), with their SHA-256 in `programs/meridian/tests/fixtures/token-programs.json`. Devnet's classic token program is now upgradeable, and a USDC transfer costs 105 compute units, the same as the copy bundled with Mollusk.
- **Compute,** from `cargo test -p meridian --test book_compute -- --nocapture`. The worst case adds what Mint pairs will (P30):

  | Fills | Buy | Sell | Worst case with Mint pairs | Share of 1,400,000 |
  |---|---|---|---|---|
  | 0 | 18,012 | 18,002 | 30,520 | 2.2% |
  | 1 | 26,265 | 26,252 | 38,773 | 2.8% |
  | 10 | 42,282 | 42,242 | 54,790 | 3.9% |
  | 32 | 80,898 | 80,792 | 93,406 | 6.7% |
  | 61 | 131,757 | 131,564 | 144,265 | 10.3% |

  A fill costs about 1,754 units, its Fill event included. A call into a token program costs about 2,137, a Token-2022 mint 2,119, and Mint pairs adds about 12,508 in all. Not in the table, and small against the margin: a taker already in the trader table (its ID check scans the resting orders) and a resting remainder with its OrderPlaced event.
- **What caps the fills.** With Anchor's `emit_cpi!`, an order ran out of memory at its 43rd fill: "memory allocation failed, out of memory". Each event allocated new buffers in the program's 32 KB heap, which is never freed during an instruction, and a fill then cost 2,882 units. A writer that reuses one buffer and sends the same bytes (a unit test compares them with what `emit_cpi!` builds) cut a fill to about 1,750 units and moved the ceiling to 61 fills. There the order fails with `MaxInstructionTraceLengthExceeded`: a transaction holds at most 64 instructions, and 61 events, two token transfers and the order itself make 64. So a full book's 4:00 sweep, 128 cancel events, can't be one transaction (D99), and a bot batch across several books (D111) shares the same 64.
- **The gate: pass.** At 10 fills the worst case is 3.9% of a transaction's compute, under the 75% pass mark. The fill limit is 32: its worst case, 93,406 units, stays under the 200,000 an instruction gets without asking for more, so no wallet needs to raise its budget, and it uses about half of the 64 instructions, leaving room for Buy No's extra calls (M2).
- **Self-trades and events, in LiteSVM.** A taker offering 2 Yes at 35¢ who buys 1 at up to 36¢ gets its 2 Yes back in the same transaction and buys a maker's 1 (D90). The transaction's event calls, decoded with the program's own types, read "cancel order 9 (2x35¢, SelfTrade)" and then "fill 1x1 at 36¢": the order reached. A Limit buy of 5 at 37¢ against offers at 36¢ to 39¢ records two fills, then "placed order 1 (3x37¢)".
- **A donation.** A test that gave the book's USDC account one unit more than it owes kept trading. With the check set to "equal", as §5 said, the same test failed (D137).
- **Each check seen failing.** With the pause check removed, the duplicate-account check removed, the book check removed, or "equal" in place of "at least", exactly the matching test failed. Trading at the taker's price failed four matching tests; a 64-byte trader entry failed the layout test; an extra header byte failed to compile ("derive(Pod) was applied to a type with padding"); an event without Anchor's tag failed the byte comparison.

## 2026-10-12 M1 the money core (main session)

### M1.02 [D50] [D53] [D56] [D64] [D94] [D108] [D139] [D140] [P30] CONFIRMED (measured)

- **What a market costs,** from `cargo test -p meridian --test market_costs -- --nocapture`, with Mollusk's rent set to devnet's 5,080 lamports a byte (Mollusk starts at the older 6,960). The test pins each size:

  | Account | Bytes | Deposit (lamports) | |
  |---|---|---|---|
  | Market | 258 | 1,960,880 | kept |
  | Yes mint, named | 412 | 2,743,200 | kept |
  | No mint, named | 410 | 2,733,040 | kept |
  | Vault | 165 | 1,488,440 | kept |
  | Book | 6,728 | 34,828,480 | returned |
  | Book USDC, Book Yes | 165 each | 1,488,440 each | returned |

  So 8,925,560 lamports (0.0089 SOL) are kept for good per market and 37,805,360 (0.0378 SOL) go out and come back; §5 had estimated 0.0130 and 0.0518. Each account holds exactly its deposit. Token-2022 accepted a 165-byte account for the book's Yes: these mints need no account extension.
- **Compute:** Create market 126,200 units; Mint pairs 30,283; Redeem pairs 31,877, or 37,679 when it also closes the holder's two emptied accounts. The test asserts each fits the 200,000 an instruction gets without asking for more, so the 8:30 job needs no larger budget. A standalone Mint pairs is the spike's per-instruction base (about 18,000, M1.01) plus about 12,300, in line with M1.01's estimate of 12,508 for what Mint pairs adds to Buy No.
- **The mints,** read back with spl-token-2022-interface: decimals 0, the market's address as mint authority and as Permissioned Burn authority, no freeze authority, a close authority held by the market (D140), a metadata pointer to the mint itself, and the names "META 680+ Yes 10/08" and "META 680+ No 10/08", symbols YES and NO, no link. Each deposit covers the size after the name is written. A holder's plain burn of a Yes token is refused by Token-2022.
- **A pre-funded address.** With 1 lamport sent first to the future Yes mint, vault and book Yes addresses, Create market still succeeded and the accounts belong to the right programs. With the plain create path forced instead, it failed with `Custom(0)`, the system program's "already in use" (D139).
- **Wrong signers and accounts.** Eve can't pay with Dave's USDC (the token program refuses), mint into another wallet's account or redeem Dave's tokens (NotYourAccount), swap Yes and No (the token program refuses), use META 690's vault or mints (ConstraintSeeds), a USDC mint other than Config's (ConstraintAddress), or pass one account twice (DuplicateAccount). A Yes account whose close authority is another key stays open, empty, after its last pair is redeemed, while the No account closes.
- **Events, in LiteSVM:** three transactions recorded "created META 20261008 68000", "minted 10" and "redeemed Pairs 4 for 4000000".
- **Each check seen failing.** Nineteen breaks, one at a time, each failed exactly its own test: a stock turned off accepted, no strike check, no order of times, creation after the open, no vault check, no supply check, minting before 9:00, minting after orders close, minting while paused, pairs closed once settled, emptied accounts left open, closing pairs stopped by the pause, the plain create path on a pre-funded address, minted tokens to anyone's accounts, redeeming from or to anyone's accounts, closing every emptied account, the creator not recorded, the holder's Yes passed as its No, and the mints without a close authority. In one batch run, creation after the open and the pre-funded address were reported as passing; run alone, each failed as expected, so that batch had tested an older build. Later batches touch the test files after each build so they recompile against it.
