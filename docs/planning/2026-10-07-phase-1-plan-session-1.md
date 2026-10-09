# Plan: Meridian, Phase 1 (Problem space)

## Working agreement
- We're going through the full spec line by line. **Don't request plan approval (ExitPlanMode) until the user says the walk-through is done.** This plan is updated quietly as we go.
- **One section per message, plain words, the user steering.** Define each term the first time it appears. Answer what was asked, then stop.
- Keep a numbered list of open questions. Ask the remaining ones **in one batch** when the user says the discussion is done. No pickers before then.
- Running example (from the spec): **"META ≥ $680 today?", Yes at $0.65, No at $0.35.** Alice buys Yes, Bob buys No.

## Phase map (skill: prd-to-implementation)
| # | Phase | Output | Status |
|---|---|---|---|
| 0 | Harness | AGENTS.md, CLAUDE.md, status board, project skills, empty logs | **not done.** Ask in the batch whether to run it before writing Phase 1 files |
| 1 | Problem space | `docs/PROBLEM_SPACE.md`, `docs/DECISIONS.md`, `docs/AI_USAGE.md` | **this session** |
| 2 | Users and flows | `docs/USERS.md` | next session. Not touched now |
| 3 | Architecture | `docs/ARCHITECTURE.md` | later. Not touched now. Read workflow reports first |

## Sources
- Brief (pasted 2026-10-06): Gauntlet × Peak6 "Meridian", v1.
- **Full spec:** `C:\Users\joshu\Downloads\meridian_project.pdf`, 13 pages, read 2026-10-07. Once out of plan mode, copy it into `docs/` as a reference.

## Spec walk-through (line by line)
| § | Section (page) | Status |
|---|---|---|
| 1 | Project Overview (1) | done |
| 2 | Problem Statement and daily lifecycle (1) | done |
| 3 | Business Context and Key Impact Metrics (1–2) | done. Notes: max gain/loss shown before every trade; the decision log is graded (documentation metric); "every trading day" confirms holidays have no markets; settle starts ~4:05 with a 4:10 deadline |
| 4 | Technical Requirements: languages, chain, other (2–3) | **in progress.** Line-by-line done. **4a deep dive (user asked, 2026-10-07):** for each choice in §4, why the spec chose it, the alternatives, why they weren't chosen, and ambiguities the spec's author may have missed. Research first (4 lookups: chains, existing prediction markets, Solana program tooling, frontend and automation stack), then one choice per message |
| 5 | Core Concepts: contract, pricing, CLOB, oracle (3–4) | |
| 6 | One Book, Two Perspectives: four trade paths, UX, position constraints (4–5) | |
| 7 | Underlying Assets and Strike Selection (6–7) | |
| 8 | User Stories (7–8) | |
| 9 | Daily Lifecycle (8) | |
| 10 | Smart Contract Functions, Settlement Logic, Invariants (9–10) | |
| 11 | Oracle Integration (10) | |
| 12 | Frontend Application (10) | |
| 13 | Automation Service (11) | |
| 14 | Testing Requirements (11–12) | |
| 15 | Deployment and Success Criteria, mainnet bonus (12) | |
| 16 | Glossary (12–13) | |

## Decisions (become rows in docs/DECISIONS.md)
Source: **spec** = in the spec (page) · **user** = the user asked for it · **proposed** = suggested by Claude, not yet confirmed

| # | Decision | Source |
|---|---|---|
| D1 | A Yes token pays $1.00 if the close is **at or above** the strike; a No token pays $1.00 if below. (Corrects an earlier proposal of "strictly above".) | spec p3 |
| D2 | $1.00 invariant: vault = $1.00 × pairs minted, Yes + No payout = $1.00, tokens are created only by mint pair and destroyed only by redeem, and settlement is immutable. All enforced on-chain | spec p9–10 |
| D3 | Non-custodial. No KYC (identity checks), no margin (borrowing), no mainnet or real funds for the core submission | spec p1, p3 |
| D4 | Solana devnet with Anchor/Rust; TypeScript/React/Next.js frontend; TypeScript/Node automation service, all in one repo. HyperLiquid: not explored (one-line note in the docs) | spec p2–3, p11; proposed (HyperLiquid) |
| D5 | One order book per strike, trading Yes against USDC. The No side is the mirror. Four trade paths: Buy Yes, Buy No (mint, then sell Yes), Sell Yes, Sell No (buy Yes, then close the pair) | spec p4–5 |
| D6 | Strikes: ±3%, ±6%, ±9% of the previous close, rounded to the nearest $10, deduplicated, plus optionally the rounded close. Admin can add or adjust strikes. **Up to 7 per stock, so up to 49 markets a day** | spec p6–7 |
| D7 | Daily times: 8:00 read close · 8:30 create markets · 9:00 visible and minting open · 9:30 trading · 4:00 close · ~4:05 settle · redeem forever after | spec p8 |
| D8 | Settle only after 4:00 PM, with freshness and confidence checks. Automation retries every 30 s for up to 15 min, then alerts. Admin override only after an enforced delay (e.g. 1 h) | spec p9–11 |
| D9 | The UI blocks holding Yes and No on the same strike (enforced in the frontend) | spec p5 |
| D10 | Pages: Landing, Markets, Trade, Portfolio, History. Payoff line: "You pay $X. You win $1.00 if …" | spec p10 |
| D11 | Each market stores its own close time; a simulation mode with a fake clock and fake prices | user (simulation), proposed |
| D12 | Trading days come from the exchange's calendar (e.g. Oct 12 is open; Nov 26 closed; Nov 27 closes at 1 PM) | proposed |
| D13 | A transaction is never half-done; after reconnecting, the UI shows what actually happened | proposed |
| D14 | **The frontend always shows live prices** (raised by the user): the stock price, Yes/No prices, the order book, position value and P&L, and the market status/countdown. A price that isn't live is visibly marked ("reconnecting…", with its age) and never shown as current. **"Still because closed" is shown differently from "stale because disconnected":** after 4:00 PM, overnight and on holidays the stock price shows as "Market closed · closed at $X", not as a frozen live number. After a reconnect, the screen re-reads the current state rather than trusting what it had. Spec support: p2 real-time order book trading, p10 live prices on Landing and Markets and a real-time order book, p11 tests "real-time price display from oracle" and "order book rendering and updates", p12 success criterion "frontend displays real-time prices, order books…" | user, spec |
| D15 | A price can move between seeing it and signing. Every buy or sell carries a worst acceptable price ("you pay at most $0.66"). If the book has moved past it, the order fills partly or not at all, and the UI says so | proposed |
| D16 | **Browsers get all live data over SSE, including the order books** (user). Only our service talks to Solana (websocket) and the oracle; it sends each tab one SSE stream carrying order books, stock prices and market status. The browser needs no back-channel: which stock or strike it's watching goes in the stream URL, and orders go wallet → Solana directly. Every new or resumed stream starts with the **full current book, then changes**, so a reconnect can't leave a missed update on screen. Details go to Architecture.md (Q18) | user |
| D17 | Secrets (admin and automation wallet keys, oracle API key) live only in environment variables and are never committed. A `.env.example` lists every name with a placeholder value | spec p3 |
| A1 | Assumption: no protocol fees in V1 (the spec allows fees only in a separate account) | proposed |

## Open questions (ask in one batch at the end)
| # | Question | Status |
|---|---|---|
| Q1 | Use an existing CLOB (e.g. Phoenix) or build a minimal book in our program? | **research done.** See the CLOB notes. Phoenix and OpenBook are unmaintained; Manifest can't be stopped at 4 PM; our own book gives full control at the cost of build effort. The spec (p3) also says "avoid unnecessary third-party abstractions; justify all major dependencies", and an unmaintained external CLOB is hard to justify |
| Q2 | Which oracle has the 7 stocks on Solana devnet? | **research done (2026-10-07), see notes below.** Two candidates: Pyth (pull) and Chainlink Data Streams. Both need a key or sign-up |
| Q3 | **Staleness vs. closing price.** Pyth regular-session feeds stop updating at 16:00 (CONFIRMED). If staleness is measured against "now", a 16:00:00 price is already 5 minutes old at 16:05, so every retry until 16:20 fails a 5-minute check. **Proposed: measure against 16:00, i.e. require publish_time inside a window around 16:00:00.** Neither provider has an official-close field (CONFIRMED absent). The auction close can print just after 16:00 (inference) | open, strengthened |
| Q16 | **Oracle access cost (a spend decision for the user).** Pyth equity data appears to be a paid plan of about $5,000/month (SECONDARY), with sources disagreeing on a free trial (UNCONFIRMED). Chainlink Data Streams is "self-serve" sign-up, pricing not found. Decide: sign up for Chainlink, find Pyth's free or devnet access, or use a mock or self-run oracle with documented trade-offs | open, ask in the batch |
| Q17 | **Live stock price in the browser (from D14).** The oracle's streaming service needs an API key (CONFIRMED for Pyth Hermes), and a key inside website code is readable by anyone. Proposed: our own service holds the key and passes prices on to browsers. That's an Architecture.md question, tied to Q16 | open, for Architecture |
| Q18 | **How live data reaches the browser (raised by the user: SSE).** Option A: each browser opens its own websocket to a Solana RPC node for the order books, plus SSE from our service for the stock price. Option B: our service subscribes to the 49 books and the oracle once, then sends everything to each browser tab over one SSE stream. With 20 viewers that's 980 subscriptions on the public node under A versus 49 under B (computed). **Lean B:** the service has to exist anyway for the oracle key (Q17), SSE reconnects by itself, and there's one kind of connection for D14's live/reconnecting/closed states. Cost: one more always-on service, and every screen shows "reconnecting" if it goes down (trading still works, because orders go wallet → chain). Correctness isn't at risk: D15's price limit is checked on-chain | **direction set by the user: B (D16).** Architecture.md fills in the details |
| Q19 | **Test money.** Users need devnet SOL (fees) and devnet USDC (to trade). Circle's devnet USDC mint is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`; its public faucet gives **20 USDC per request, one request every 2 hours per address per chain** (CONFIRMED: faucet.circle.com FAQ, read 2026-10-07; this corrects an earlier "10 USDC/day" from a search summary). $20 buys 30 Yes at $0.65 (computed). A market maker minting 100 pairs needs 5 requests spread over 8 hours (computed). It's a web form, and whether a script can use it is unchecked, which matters for "reproducible scripts". Proposed: our own test-USDC mint with a "get test USDC" button for demos. The USDC mint address is a setting, so Circle's devnet USDC (or mainnet USDC for the bonus) can be swapped in | open, ask in the batch |
| Q4 | **Does trading stop at 4:00?** The spec doesn't say. Proposed yes (the Carol/Dave stale-order problem). With an external CLOB, can we enforce it? | open, depends on Q1 |
| Q5 | **Closing a Yes+No pair before settlement:** Sell No leaves the user holding both, but redeem is the only burn function. Proposed: redeem also accepts a matched pair at any time | open |
| Q6 | A Buy No limit order holds both tokens until it fills, which contradicts "both only transiently". Proposed: show it as a pending order, not a position | open |
| Q7 | Question wording says "close above" but the rule is "at or above". Proposed: the UI says "at or above" | open |
| Q8 | Include the optional 7th strike (rounded previous close)? Proposed yes, since it's the most-traded strike | open |
| Q9 | "User-determined percentage intervals": are they configurable? Proposed: in config, defaulting to 3/6/9 | open |
| Q10 | Who pays SOL fees and account rent? Users need devnet SOL. The automation wallet pays rent for ~49 markets a day: ~0.007 SOL each (Manifest) up to ~1.9 SOL each (OpenBook, so ~93 SOL/day, reclaimable) | open, depends on Q1 |
| Q11 | Out-of-order prices across a stock's strikes (raised by the user): prevent? The spec is silent | open |
| Q12 | "Sub-second finality": which confirmation level counts? | **mostly answered (2026-10-07).** Devnet switched to Alpenglow on 2026-09-25 (SECONDARY, several news sources; **CONFIRMED by direct RPC check: devnet confirmed = finalized slot, mainnet lags 31–33 slots**). The finality target is ~150 ms, one devnet reading was 322 ms, and "confirmed" and "finalized" become the same state. So on devnet, finalized is already sub-second. Mainnet hasn't switched and still takes ~12.8 s to finalize (SECONDARY), which matters only for the mainnet bonus. Proposed: wait for `finalized` on devnet |
| Q13 | The failure path (retry 15 min, override after 1 h) can't meet "settled within 10 minutes". Document it as a known limitation | proposed |
| Q14 | Early-close days: settle at 1:00 PM + 5 min? | open |
| Q15 | Phase 0 harness first? Status board (Notion?) | ask in batch |

## Research notes
**Oracle (2026-10-07)**
- **Pyth.** MAG7 feeds exist (SECONDARY). The Solana receiver program has the same ID on devnet and mainnet (CONFIRMED). Hermes and Benchmarks now need an API key (CONFIRMED). Exposes `conf` and `publish_time` (CONFIRMED). For a time window, fetch the historical update and check `publish_time` in our program (CONFIRMED). Regular-session feeds follow NYSE hours and holidays and stop after 16:00 (CONFIRMED). Extended hours moved to paid Pyth Pro (SECONDARY). Off-chain previous close: Benchmarks `/v1/updates/price/{ts}/{interval}` (CONFIRMED).
- **Chainlink Data Streams.** Regular, Extended and Overnight streams per ticker, plus `marketStatus` (CONFIRMED). Devnet verifier `Gt9S41…` (CONFIRMED). **No confidence field**: bid/ask can stand in for one (CONFIRMED schema v11). One devnet project uses the MAG7 streams (SECONDARY).
- **Switchboard, RedStone, Stork.** No confirmed MAG7 feeds on Solana (UNCONFIRMED).
- **Live data transport (2026-10-07).** Solana RPC "notify me on change" subscriptions are websocket-only, many per connection, default commitment `finalized` (CONFIRMED: solana.com/docs/rpc/websocket). Under Alpenglow on devnet, finalized ≈ confirmed and is sub-second (see Q12), so the default is fine. Pyth Hermes streams over SSE (`/v2/updates/price/stream`), and Pyth recommends that over its undocumented websocket (CONFIRMED docs; SECONDARY forum). Chainlink Data Streams is websocket with HMAC-signed headers, so it can't be called from a browser (CONFIRMED: docs.chain.link streams-direct-interface-ws). SSE is one-way, UTF-8 text, and reconnects by itself. It's limited to 6 connections per browser and domain over HTTP/1, about 100 streams over HTTP/2 (CONFIRMED: MDN). So use one stream per tab carrying everything.
- **SDK versions** need an Anchor compatibility check before choosing (pyth-solana-receiver-sdk 2.0.0 needs anchor-lang ^1.0.2, while the docs say 0.28–0.31.1: UNCONFIRMED).

**CLOB (2026-10-07)**

| Option | Maintained | Stop at 4 PM / pause | Rent per market | Notes |
|---|---|---|---|---|
| Phoenix ("Legacy") | No: code last changed 2023–24, team moved to perps (CONFIRMED/SECONDARY) | Yes: authority sets Paused/Closed; per-order expiry (CONFIRMED) | ~0.6–3 SOL (UNCONFIRMED) | Traders need an approved seat. SDK pins Solana <1.19, likely to clash with current Anchor (UNCONFIRMED). 5 devnet markets listed in the SDK config; whether they still work is UNCONFIRMED |
| OpenBook v2 | No: last release Feb 2024 (CONFIRMED) | Yes: `time_expiry` ends trading at a set time; `open_orders_admin` co-signs every order, so it works as a gate or pause; close-market reclaims rent (CONFIRMED) | **~1.9 SOL, so ~93 SOL/day for 49 markets** (computed from CONFIRMED sizes), reclaimable on close | Deployed on devnet per the repo (CONFIRMED). Has a CPI feature. Lot sizes are powers of 10, so a $0.01 tick works |
| Manifest | Yes: commits 2026-10-06 (CONFIRMED) | **No admin, pause or close**; only a per-order `last_valid_slot` (CONFIRMED) | ~0.007 SOL (CONFIRMED) | Devnet UNCONFIRMED. Designed to be called through a wrapper program |
| Our own minimal book | Ours | Full control | Our design | The spec calls this "more ambitious, demonstrates deeper understanding". Most build effort |

- **CPI limit (CONFIRMED):** an account can only grow by 10 KiB inside a CPI, so big book accounts must be created by top-level instructions in the client transaction. "Create Strike Market" therefore spans several instructions or transactions for external CLOBs.
- **Atomic mint-and-sell** (Buy No) doesn't need CPI. Our mint instruction and the CLOB order instruction can go in one transaction, which is all-or-nothing (inference, standard Solana).
- **Streaming:** websocket `accountSubscribe` (CONFIRMED). None of the three SDKs ships a subscription helper, so we decode updates ourselves.
- No prediction market was found built on these three. Ones to study: Monaco Protocol, Aver, Moonopol (SECONDARY).
- **Still to verify:** live devnet status (`solana program show <ID> --url devnet`) and devnet faucet limits (matter for OpenBook rent). Also check whether the free public devnet connection lets one browser watch ~49 order books at once (subscription and rate limits, NOT RESEARCHED yet); this matters for D14 on the Markets page.
- **Early lean (for Architecture.md, not decided):** our own minimal book is the only option that is maintained, cheap, and can stop at 4 PM and pause. Its cost is build effort. Fallback if time is short: OpenBook v2 (`time_expiry` plus admin gate), paying rent and reclaiming it.

**Chains (2026-10-07, §4a research 1 of 4)**
- **Solana:** 400 ms slots; devnet finality is sub-second (Alpenglow, CONFIRMED by RPC check), mainnet ~12.8 s (SECONDARY). Fees are 5,000 lamports per signature; blocks raised to 100M CU on 2026-07-29 (CONFIRMED). Manifest markets cost ~0.007 SOL (CONFIRMED). (This subagent said devnet was pending Alpenglow, which is wrong per the RPC check.)
- **EVM L2s (Arbitrum, Base):** ~200–450 ms *soft* confirmations from a single sequencer (trust it); real finality ~13–20 min via Ethereum (CONFIRMED/SECONDARY). Per-order gas for an on-chain book: not found. **Gap:** "sub-second finality" on an L2 means trusting the sequencer.
- **HyperLiquid:** has a **native binary product, HIP-4 "outcome markets"** (CONFIRMED official docs: daily binary on BTC mark price, split/merge). The deployer docs say testnet-only, validator-approved templates, **10 active outcomes and 50 deployments per day per deployer on testnet**, 183-day stake (CONFIRMED). Mainnet third-party deployment since 2026-08-29 is reported but not official (UNCONFIRMED). Bond is 500k HYPE (UNCONFIRMED; earlier reports said 1M). It settles on Hyperliquid perp prices, not the NYSE close (SECONDARY). **Gap:** the spec's "may not natively support this instrument" is out of date. HIP-4 exists, but its limits (10 active vs our 49/day, huge bond, perp-price settlement) still rule it out.
- **Injective:** a **native binary-options market type** in its exchange module, launchable instantly, orders $0.01–$0.99, no leverage, **USDT-quoted**, an optional admin can post the settlement price; price providers need a governance proposal (CONFIRMED docs). ~0.6 s blocks (CONFIRMED/SECONDARY). **Gap: not mentioned by the spec, yet the closest built-in match.** Why not: USDT not USDC, the oracle needs governance or a trusted admin, and the exchange module would do the minting, matching and settling we're graded on building.
- **Sui:** DeepBook v3 is a native CLOB (pool costs 500 DEEP); DeepBook Predict does BTC binaries against a liquidity pool, on testnet (CONFIRMED). **Aptos:** sub-second; Decibel perps. **Sei:** now EVM-only, its native oracle removed, its DEX closed (CONFIRMED/SECONDARY). **MegaETH/Monad:** young; GTE/Kuru books (SECONDARY).
- **Hybrid is the industry norm:** Polymarket matches off-chain and settles on-chain from signed orders (CONFIRMED). So do dYdX v4 (CONFIRMED) and Kalshi-on-Solana (SECONDARY). **Gap:** the spec requires an on-chain book, which most real products avoid for cost and latency.
- **Oracles (sharpens Q16):** Pyth plans: Free has no API; Starter $500/mo is crypto only; **Pro from $2,500/mo includes equities; a free Pro trial key needs no card** (CONFIRMED app.pyth.com/plans; the earlier $5,000 figure was SECONDARY, so prices conflict, UNCONFIRMED). Trial length unknown. Chainlink equity streams: testnet by request, ~$150 per stream per month reported (SECONDARY). **No free, keyless equity price on any testnet was found (UNCONFIRMED). The oracle, not the chain, is the biggest cost and availability risk.**

**Solana program tooling (2026-10-07, §4a research 3 of 4)**
- **Framework:** Anchor 1.2.1 (2026-10-06). The official docs say "for beginners, we recommend starting with Anchor" (CONFIRMED). 1.0.0 (2026-04-02) breaking changes: TS package `@anchor-lang/core`, Solana 3.x, IDL via Program Metadata Program, `dup` for twice-passed mutable accounts, `anchor test` runs on Surfpool, new projects get LiteSVM tests (CONFIRMED). **Pin ≥1.0.2:** 1.0.0–1.0.1 had CVE-2026-45137 (`Program<System>` accepted any program) (CONFIRMED). Pinocchio 0.11.2 is faster (~108 vs ~649 CU on a memo, SECONDARY) but has no built-in checks. Anchor v2 (Pinocchio-based) is alpha/rc; sources disagree (UNCONFIRMED). Quasar is beta and unaudited.
- **Windows:** the Anchor docs say to run Solana/Anchor in **WSL**, not PowerShell (CONFIRMED). The user is on Windows, so this goes in the Phase 0 harness setup.
- **Limits (CONFIRMED, solana.com docs):** 1.4M CU per transaction (200k default per instruction); 12M CU per writable account per block; **64 accounts per transaction** (a lookup table doesn't lift it); accounts up to 10 MiB but +10 KiB per instruction; **Anchor `init` capped at 10,240 bytes**, so bigger book accounts are client-created and use zero-copy `#[account(zero)]`. The v1 transaction format (4,096 bytes, live on devnet and mainnet since 2026-09-15) has no lookup tables, and its compute limit must be set in `transactionConfig` (it defaults to zero if unset).
- **Book layouts:** OpenBook v2 uses separate bid/ask/event-queue accounts and needs a crank to settle makers past 15. Phoenix and Manifest keep the book **and each trader's balances ("seats") in one account**, so a fill never needs the maker's own account and the 64-account limit doesn't bite; a per-order match limit caps work (CONFIRMED). Median CU per order: Manifest 1,010, Phoenix 6,748 (CONFIRMED, Manifest bench 2026-10-05). **Lesson for "our own book": copy the single-account + seats design.** Fills per transaction: tens is a guess (UNCONFIRMED).
- **Testing:** LiteSVM 0.17.0 (Anchor's default) can set the Clock and inject fake oracle accounts; Mollusk 0.16.0 likewise; Surfpool 1.6.0 has time travel and a pausable clock; Bankrun is deprecated (CONFIRMED). Set the clock explicitly (docs disagree on whether `warp_to_slot` moves `unix_timestamp`). This supports D11 (fake clock).
- **Devnet:** public RPC limits per IP are 100 requests/10 s, 40 per method, 40 concurrent connections; "may be subject to ledger resets" (CONFIRMED). **Halts and restarts in 2026: Jan 16, Apr 14–16, Jun 19** (SECONDARY). Faucet: 2 requests per 8 h, more with a GitHub login (CONFIRMED). Under Alpenglow: use `finalized` (`confirmed` is going away), and **`Clock.unix_timestamp` is set by the block leader within a bounded range, so treat it as coarse**: gate settlement on the oracle's publish time, not the chain clock (CONFIRMED guide; UNCONFIRMED advice).
- **Scheduling:** programs run only when a transaction calls them; Clockwork shut down in 2023 (SECONDARY); TukTuk (Helium) still needs off-chain crank bots (CONFIRMED). Idea for Architecture: **make settle callable by anyone once the 4:00 PM oracle price exists**, so a dead bot doesn't block settlement (check against spec §10 first).
- **Gaps for §4a:** (1) "every trading day" liveness is measured on devnet, which itself halted 3 times in 2026; the spec doesn't say how a devnet outage counts. (2) The spec's "existing order book infrastructure" reason is weak (see CLOB notes), but the existing designs are worth copying.

**Frontend and automation stack (2026-10-07, §4a research 4 of 4)**
- **Wallet/client:** Solana docs recommend `@solana/kit` 8.4.0 + `@solana/react` + `@solana/kit-plugin-wallet` 0.21.0 (pre-1.0, React ^19.3) on Wallet Standard (CONFIRMED). web3.js v1 is maintenance-only, wallet-adapter-react 0.15.x is legacy, and "framework-kit" (`@solana/client`) is listed as an earlier package to move off (CONFIRMED). Kit moves fast (v8.0 on 2026-08-21, 8.4 on 2026-09-28), so pin versions.
- **Clients from Anchor:** Codama generates Kit clients from the Anchor IDL, configured in `Anchor.toml [clients]` (CONFIRMED). Anchor 1.2.1 (2026-10-06); its TS client `@anchor-lang/core` still depends on web3.js v1 (CONFIRMED). Codama with Anchor 1.x is SECONDARY only, so **run a generation test in M0**.
- **Next.js vs Vite:** Next 16.4 route handlers can stream SSE (CONFIRMED), but serverless hosts cut long streams: Vercel Hobby 300 s, Netlify 60 s, Railway 15 min (CONFIRMED). Wallet code must run client-side (`'use client'`). Since D16 puts SSE in an always-on service, a Next.js server adds little; a Vite SPA or a Next.js static export is simpler (UNCONFIRMED inference). Next.js's plus: it's the official Solana tutorial.
- **Bot hosting/scheduling:** free schedulers are UTC-only and imprecise (Vercel Hobby: once a day, ±59 min; Railway: "a few minutes"); GitHub Actions supports a timezone but can delay or drop runs (CONFIRMED). Always-on options: Railway Hobby $5/mo, Fly ~$2.19/mo smallest machine, no free tier for new orgs (CONFIRMED). Render free spins down after 15 min idle (CONFIRMED), so it's unsuitable. Lean: run the scheduler inside the same always-on process as the D16 SSE relay, using `croner` with `America/New_York` (CONFIRMED features). **DST ends 2026-11-01** (8:00 ET moves from 12:00 to 13:00 UTC), so never hard-code a UTC offset.
- **Calendar:** NYSE publishes 2026–2028 holidays only as a press release/PDF (CONFIRMED, 2025-12-23). 2026 closed: Jan 1, Jan 19, Feb 16, Apr 3, May 25, Jun 19, Jul 3, Sep 7, Nov 26, Dec 25; early 1 PM closes Nov 27 and Dec 24. 2027 closed: Jan 1, Jan 18, Feb 15, Mar 26, May 31, Jun 18, Jul 5, Sep 6, Nov 25, Dec 24; early close Nov 26. Lean: a hard-coded table with a unit test (npm calendars are brand new, single-maintainer). Alpaca `/v2/calendar` is a cross-check (CONFIRMED via search only).
- **Bot language:** TypeScript is fine. It shares the Codama client with the frontend. Rust, Python and Go all have SDKs, but none gives a strong reason to switch (UNCONFIRMED judgement).
- **Gaps for §4a:** (1) the spec recommends Next.js without saying where things are hosted, and the obvious host (Vercel) can't hold SSE or run cron at 8:00/8:30/4:05; (2) the spec never says where the always-on automation runs, which is a liveness and spend question.

## Deliverables (status-board cards from day one)
Source code · technical documentation (chain and architecture rationale, trade-offs, alternatives) · demo video · deployment guide · test results · AI usage log · `.env.example` · risks/limitations note (no regulatory claims) · dependency justification · README with one-command setup (`make dev`) · reproducible devnet lifecycle scripts. Tests: contract unit, settlement edges, invariants, oracle validation, admin delay; integration (lifecycle, 4 paths, multi-user); frontend (wallet, orders, prices, both book views, position constraint, P&L, redeem). Bonus: mainnet.

## AI_USAGE.md: "where AI misled us" (so far)
1. Recommended an EVM L2 (Base Sepolia) before the full brief was read. The brief prefers Solana.
2. Proposed "strictly above, so a tie pays No". The spec says at-or-above pays Yes.
3. Said "35 markets a day" from an invented 5-strike example. The spec gives up to 49.
4. Described matching as a Yes bid plus a No bid minting a pair. The spec's mechanism is that the No buyer mints and sells Yes on the single Yes/USDC book (same economics).
5. The trading and settlement deep dives lost the user. Corrected to one idea per message.
6. Proposed a websocket from the browser for all live prices. The user suggested SSE, which fits the server-to-browser leg better: data only flows one way and it reconnects by itself. Websocket is still required on the Solana leg (see Q18).
7. Told the user Circle's devnet faucet gives 10 USDC a day (from a search summary). The faucet's own page says 20 USDC every 2 hours. Corrected in the next message.
8. A research subagent said Alpenglow wasn't on devnet yet. A direct RPC check (2026-10-07: devnet `confirmed` slot = `finalized` slot; mainnet gap 31–33) showed it is. Lesson: check chain facts against the chain itself.

## Steps
1. Finish the line-by-line walk-through (§1–16), updating this plan quietly. Fold in research results when we reach §5 and §11.
2. When the user says the discussion is done, ask the remaining open questions in one batch, including Q15 (harness first?).
3. Out of plan mode, run Phase 0 if the user agrees. Then write `docs/PROBLEM_SPACE.md` (template sections: problem · how it's judged · product principle · money model (META $680 example) · screens · demo data · metrics · integrity rules · quality areas · known limitations), `docs/DECISIONS.md` (decisions, assumptions, cuts) and `docs/AI_USAGE.md`. Copy the spec into `docs/`.
4. Grill the diff, then commit after the user answers. Push only with their OK.

## Verification
- Every spec section maps to PROBLEM_SPACE.md, DECISIONS.md or an explicit cut.
- Every number in the money model is checked by a short script (strike rounding and dedupe, Buy No cost = $1 − Yes bid, vault totals).
- Every open question is answered, assumed (A-row) or cut, so none disappears.
- The user confirms the problem, the money model and the scope.
