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
