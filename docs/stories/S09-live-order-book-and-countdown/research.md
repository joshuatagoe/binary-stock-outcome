# Research: S9 Watches the order book live from both sides, with a countdown to 4:00 PM ET

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 2: Trading and liquidity

### F2.01 [D20] [S4] [S9] CONFIRMED

Polymarket's CTF Exchange is a hybrid: an operator matches orders off-chain and settlement is atomic, on-chain and non-custodial. The repository is now archived with a pointer to a V2 repository.

- Lens: venues
- Source: [Polymarket/ctf-exchange README](https://raw.githubusercontent.com/Polymarket/ctf-exchange/main/README.md): "there is an operator that provides offchain matching services while settlement happens on-chain, non-custodially. ... This repository has been archived and is no longer maintained."
- Verification (2026-10-09): held: Opened the ctf-exchange README. Both quotes are verbatim, and it points to Polymarket/ctf-exchange-v2.

### F2.02 [D20] [D13] [S4] [S9] UNCONFIRMED

In Polymarket's lifecycle, orders are signed off-chain, matched by an operator and settled on-chain later; settlement is atomic, and failed settlements show as RETRYING or FAILED. Positions change only at CONFIRMED.

- Lens: venues
- Source: [Order Lifecycle - Polymarket Documentation](https://docs.polymarket.com/concepts/order-lifecycle): "Orders are created offchain, matched by an operator, and settled onchain through smart contracts. ... either the entire trade succeeds or nothing happens."
- Source: [Polymarket CLOB introduction](https://docs.polymarket.com/developers/CLOB/introduction): "Your order matched, but its trade settles on-chain asynchronously."
- Verification (2026-10-09): downgraded from CONFIRMED: Opened order-lifecycle and the CLOB intro. Confirmed: offchain create, operator match, onchain settle, 'entire trade succeeds or nothing happens', RETRYING/FAILED/CONFIRMED statuses, and the 'settles on-chain asynchronously' line. Not confirmed: 'positions change only at CONFIRMED'. The page says balances update at the Confirmation step but never says 'only'. Drop or soften that clause.

### F2.03 [D20] [S4] [S9] CONFIRMED

Hyperliquid matches orders on its own L1 with no off-chain order book: median end-to-end latency 0.2 s, about 200k orders/s. It is a purpose-built chain, not a program on a general chain.

- Lens: venues
- Source: [Hyperliquid Docs - HyperCore overview](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/overview): "HyperCore does not rely on the crutch of off-chain order books. ... end-to-end latency has a median 0.2 seconds and 99th percentile 0.9 seconds."
- Verification (2026-10-09): held: Opened the HyperCore overview. It says no off-chain order books, median 0.2 s and p99 0.9 s latency, and about 200k orders/s.

### F2.04 [D20] [D21] [S4] [S9] CONFIRMED

The spec asks for an on-chain order book in several places and names two routes: an existing on-chain CLOB, or a minimal book inside the contract. It also requires admin pause of minting and trading. Context only; not counted as an outside source.

- Lens: technical
- Source: [Meridian spec](docs/spec/meridian_project.txt): "Users trade two complementary token types -- Yes and No -- on an on-chain order book. ... Use an existing on-chain CLOB ... Build a minimal order book as part of your smart contract ... Pause / Unpause -- Admin can pause minting and trading in an emergency"
- Verification (2026-10-09): held: Grepped docs/spec/meridian_project.txt. It has the on-chain order book wording (lines 13, 21), existing on-chain CLOB (Phoenix, line 133), minimal order book (136) and Pause/Unpause (372). Spec text, not an outside source.

### F2.05 [D20] [D13] [S4] [S9] CONFIRMED

Solana slots are about 400 ms; a transaction's blockhash stays valid for 150 blocks, about 60 to 90 seconds, after which the transaction cannot land.

- Lens: technical
- Source: [Solana docs - Transaction confirmation and expiration](https://solana.com/docs/core/transactions/confirmation): "With ~400ms slots, a blockhash stays usable for about 60 to 90 seconds"
- Verification (2026-10-09): held: Opened Solana confirmation docs. It says about 150 blocks, ~400ms slots, about 60 to 90 seconds.

### F2.06 [D21] [D20] [D5] [S4] [S9] CONFIRMED

Manifest's README compares creation rent: Manifest about 0.007 SOL, OpenBook 2 SOL, Phoenix 3+ SOL (a competitor's figure; Phoenix's real rent and whether it is reclaimable were not confirmed). It also lists Manifest as crankless, feeless, GPL, 8 swap accounts (OpenBook 16, Phoenix 8), Phoenix as business-licensed (now stale, see F2.11).

- Lens: technical
- Source: [CKS-Systems/manifest README](https://raw.githubusercontent.com/CKS-Systems/manifest/main/README.md): "Creation Rent | 2 SOL | 3+ SOL | .007 SOL ... Swap accounts | 16 | 8 | 8"
- Verification (2026-10-09): held: Opened the Manifest README table. Creation rent: Manifest .007 SOL, OpenBook 2 SOL, Phoenix 3+ SOL. Swap accounts 16/8/8 for OpenBook/Phoenix/Manifest. Feeless: Manifest yes. License: Manifest and OpenBook GPL, Phoenix Business. Crankless is also listed.

### F2.07 [D21] [S4] [S9] CONFIRMED

Manifest is actively developed (commits on 2026-10-08 and 2026-10-09), licensed GPL-3.0, has an audit report and daily Certora formal verification, and is upgradeable by a 4-of-5 Squads multisig.

- Lens: venues
- Source: [CKS-Systems/manifest recent commits (GitHub API)](https://api.github.com/repos/CKS-Systems/manifest/commits?per_page=3): "2026-10-09 17:37 UTC: Export quote volume by aggregator and originating protocol (#753)"
- Source: [CKS-Systems/manifest](https://github.com/CKS-Systems/manifest): "the core program's upgrade authority is a Squads multisig with a 4-of-5 threshold ... daily formal verification with the Certora prover"
- Verification (2026-10-09): held: The GitHub API shows commits on 2026-10-09 (#753, 17:37 UTC) and 2026-10-08. The repo page confirms the Squads 4-of-5 upgrade authority, daily Certora verification, an audit report link, and GPL-3.0.

### F2.08 [D21] [D9] [S4] [S9] CONFIRMED

Manifest has no pause, close-market or market-authority instruction (instructions: CreateMarket, ClaimSeat, Deposit, Withdraw, Swap, Expand, BatchUpdate, Global*, SwapV2), and CreateMarket checks no authority, so anyone can create a market and anyone can trade it.

- Lens: technical
- Source: [Manifest instruction.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/instruction.rs): "0: CreateMarket, 1: ClaimSeat, 2: Deposit, 3: Withdraw, 4: Swap, 5: Expand, 6: BatchUpdate ... 13: SwapV2"
- Source: [Manifest create_market.rs](https://raw.githubusercontent.com/CKS-Systems/manifest/main/programs/manifest/src/program/processor/create_market.rs): "No authority check appears in this function. Any payer who supplies valid accounts can create a market."
- Verification (2026-10-09): held: instruction.rs has variants 0-13 as listed, with no pause, close or authority instruction. create_market.rs does no authority check; the quoted sentence is a paraphrase, not literal text. CreateMarketContext::load (loaders.rs) only requires a payer signer plus account/vault address checks, with no authority account.

### F2.11 [D21] [D20] [S4] [S9] CONFIRMED

Phoenix v1 is now called Phoenix Legacy: renamed in Feb 2026, relicensed from BUSL to MIT in May 2026, newest commit (2026-10-09) only edits SECURITY.md; OtterSec audit and a bug bounty exist; the SDK last had a real commit in Aug 2024 aside from the Feb 2026 rename.

- Lens: venues
- Source: [Ellipsis-Labs/phoenix-v1 recent commits (GitHub API)](https://api.github.com/repos/Ellipsis-Labs/phoenix-v1/commits?per_page=3): "2026-10-09 Update SECURITY.md; 2026-05-11 Change license from BUSL to MIT (#51); 2026-02-04 Rename Phoenix to Phoenix Legacy in docs (#50)"
- Source: [Phoenix Legacy SECURITY.md](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/SECURITY.md): "Phoenix Legacy Bug Bounty Program ... Critical (up to $200,000)"
- Source: [Ellipsis-Labs/phoenix-sdk recent commits (GitHub API)](https://api.github.com/repos/Ellipsis-Labs/phoenix-sdk/commits?per_page=3): "2026-02-04 Rename Phoenix references to Phoenix Legacy (#182); 2025-03-19 Update README.md (#180)"
- Verification (2026-10-09): held: phoenix-v1 commits: 2026-10-09 Update SECURITY.md, 2026-05-11 BUSL to MIT (#51), 2026-02-04 rename (#50). The SDK commits show the 2026-02-04 rename, 2025-03-19, then 2024-08-26. The README says 'audited by OtterSec'. SECURITY.md has a bounty up to $200,000 for critical, administered by Ellipsis and OtterSec; the exact label 'Critical (up to $200,000)' is not literal. The SDK's last real commit is 2024-08-26 as claimed (the 2025-03-19 one is a README edit).

### F2.12 [D21] [S4] [S9] [S26] CONFIRMED

Phoenix has market-level controls: ChangeMarketStatus must be signed by the market_authority; statuses Active, PostOnly, Paused (reductions and withdrawals only) and Closed (market authority can forcibly cancel all orders); authority can be handed to a successor (so it could be a program PDA).

- Lens: technical
- Source: [Phoenix status.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/status.rs): "Closed: Reductions and withdrawals only. The market authority can forcibly cancel all orders."
- Source: [Phoenix instruction.rs](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-v1/master/src/program/instruction.rs): "ChangeMarketStatus (103): The market_authority signer must sign to change market status."
- Verification (2026-10-09): held: status.rs has Active, PostOnly, Paused (reductions and withdrawals only) and Closed ('The market authority can forcibly cancel all orders'). instruction.rs says market_authority must sign ChangeMarketStatus (103). NameSuccessor (102) and ClaimAuthority (101) show hand-over to a successor.

### F2.15 [D21] [S4] [S9] [S26] UNCONFIRMED

OpenBook v2 looks dormant: default branch master last pushed 2024-07-15 (last commit 2024-06-23), GPL, deployed v1.7 on mainnet, devnet and testnet. It has close_market, set_market_expired, prune_orders, settle_funds_expired (close_market_admin), consume_events (needed to process fills), maker/taker fee parameters and time_expiry.

- Lens: venues
- Source: [openbook-dex/openbook-v2 repo metadata (GitHub API)](https://api.github.com/repos/openbook-dex/openbook-v2): "default_branch: master; pushed_at: 2024-07-15T22:16:49Z; archived: false"
- Source: [OpenBook v2 lib.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/lib.rs): "create_market takes name, oracle_config, quote_lot_size, base_lot_size, maker_fee, taker_fee, and time_expiry ... close_market_admin: close_market, set_market_expired, prune_orders, settle_funds_expired"
- Source: [openbook-dex/openbook-v2](https://github.com/openbook-dex/openbook-v2): "v1.7 on mainnet, devnet, and testnet (program ID opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb)"
- Verification (2026-10-09): downgraded from CONFIRMED: The API confirms default_branch master, pushed_at 2024-07-15T22:16:49Z, archived false. lib.rs confirms create_market params (name, oracle_config, lot sizes, maker_fee, taker_fee, time_expiry), close_market, set_market_expired, prune_orders, settle_funds_expired (all close_market_admin), consume_events and sweep_fees. The README confirms v1.7 on mainnet, devnet and testnet. Two problems: the repo README says 'majority MIT, some parts GPL' and the API license is NOASSERTION, so plain 'GPL' is imprecise (only the Manifest README calls it GPL). The 2024-06-23 last-commit date was not visible on the page.

### F2.16 [D21] [S4] [S9] UNCONFIRMED

Whether Phoenix or Manifest have a public Solana devnet deployment could not be confirmed. Phoenix's SDK example connects to the public devnet RPC but gives no program ID; Manifest's README gives no devnet ID. Self-deployment of the open-source program is the likely route (Phoenix MIT; Manifest GPL-3.0).

- Lens: technical
- Source: [Phoenix Legacy SDK README](https://raw.githubusercontent.com/Ellipsis-Labs/phoenix-sdk/master/README.md): "cargo run --bin sample -- -r $YOUR_DEVNET_RPC_ENDPOINT"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.51 [Q17] [D16] [D14] [S9] CONFIRMED

Since the Pyth Core upgrade on 2026-08-26, all Hermes users need a Pyth API key sent as an 'Authorization: Bearer' header; hermes.pyth.network now requires authentication; the early-upgrade path moves to pyth.dourolabs.app/hermes. The page does not mention browser use. The FAQ entry on REST/SSE use lists the question but its answer was not retrievable.

- Lens: technical
- Source: [Completing the Pyth Core upgrade](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "All Hermes users need a Pyth API Key ... Add the `Authorization: Bearer $PYTH_API_KEY` header"
- Verification (2026-10-09): held: Opened docs.pyth.network upgrade/preparing. Says all Hermes users need a Pyth API key, Authorization: Bearer header, hermes.pyth.network requires auth, completed Aug 26 2026, early-upgrade endpoint pyth.dourolabs.app/hermes. No browser mention; FAQ REST/SSE answer not retrievable, as claimed.

### F2.52 [Q17] [S9] CONFIRMED

Pyth's plans page lists a Free plan at $0 with view-only Terminal access, no API access and no redistribution rights, 10-second updates; Starter at $500/month (crypto, display rights, no redistribution); US equities appear only under Pro (from $2,500/month) with limited redistribution rights. No rate or connection limits are stated.

- Lens: venues
- Source: [Pyth plans](https://app.pyth.com/plans): "Free ... no API access ... Starter ($500/month) ... Pro (from $2,500/month): Included [US equities]"
- Verification (2026-10-09): held: Opened app.pyth.com/plans. Free $0, no API access, view-only Terminal, 10s updates, no redistribution; Starter $500 crypto, display, no redistribution; Pro from $2,500 lists equities, limited redistribution. No rate limits listed. Page says 'equities' not 'US equities' specifically.

### F2.53 [Q17] [S9] UNCONFIRMED

Sources disagree on whether a free trial exists: the upgrade docs say Pyth Terminal signup includes a free trial; the plans page lists a $0 Free plan with no API access and no mention of a trial; the Pyth blog says 'Plans start at $500/month' and mentions neither a free tier nor a trial. Treat availability of a free Hermes key for equities as unknown.

- Lens: venues
- Source: [Completing the Pyth Core upgrade](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "Sign up at Pyth Terminal: a free trial is included, paid plans cover ongoing use."
- Source: [The Pyth Core Upgrade](https://www.pyth.network/blog/the-pyth-core-upgrade): "accessing any Pyth Price Feeds API will require a Pyth data plan"
- Source: [Pyth plans](https://app.pyth.com/plans): "Free ... no API access"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.54 [Q17] [S9] CONFIRMED

In Next.js, environment variables without the NEXT_PUBLIC_ prefix are available only on the server; NEXT_PUBLIC_ values are inlined into the JavaScript bundle at build time and sent to every browser. A secret oracle key must therefore stay in server code such as a route handler or the Node automation service.

- Lens: technical
- Source: [How to use environment variables in Next.js](https://nextjs.org/docs/app/guides/environment-variables): "Non-`NEXT_PUBLIC_` environment variables are only available in the Node.js environment, meaning they aren't accessible to the browser"
- Verification (2026-10-09): held: Opened nextjs.org env var guide. Quote matches verbatim; NEXT_PUBLIC_ values inlined into JS bundle at build time; defaults server-only.

### F2.55 [Q17] [Q18] [D16] [S9] CONFIRMED

Polymarket splits its live data: the market WebSocket channel is public (subscription frame has no credentials), while its equity and crypto reference-price stream requires authentication with CLOB API credentials. This is the relay pattern: the venue holds credentials server-side and the public channel carries the shared view.

- Lens: venues
- Source: [Polymarket WebSocket overview](https://docs.polymarket.com/market-data/websocket/overview): "Reference price subscriptions require authentication."
- Verification (2026-10-09): held: Opened Polymarket WebSocket overview. Market topic works with PublicClient; 'Reference price subscriptions require authentication' with CLOB API credentials (key, secret, passphrase) sent in an auth message.

### F2.56 [Q17] [S9] CONFIRMED

Alpaca's free Basic market-data plan gives real-time equities limited to the IEX exchange, 30 equity symbols over WebSocket, and requires an API key and secret in request headers. Such a feed is a separate source from the settlement oracle and still keeps its key server-side. The page does not state redistribution terms.

- Lens: venues
- Source: [About Market Data API (Alpaca)](https://docs.alpaca.markets/docs/about-market-data-api): "Real-time equities: Limited to the IEX exchange ... WebSocket symbol limits: 30 equity symbols"
- Verification (2026-10-09): held: Opened Alpaca About Market Data API. Basic plan: equities IEX only, 30 equity symbols WebSocket, APCA-API-KEY-ID and APCA-API-SECRET-KEY headers. Redistribution not addressed, as claimed.

### F2.57 [Q17] [D14] [S9] UNCONFIRMED

Pyth sponsors Solana push-feed accounts (shard 0), readable on the frontend by account address without a Hermes fetch step. The push-feeds page says listed feeds are sponsored on both mainnet and devnet and that most update every 55 seconds or on a 0.5% move; it lists some equity feeds (SPY, QQQ, AMD and others) but does not confirm AAPL/MSFT/GOOGL/AMZN/NVDA/META/TSLA. A push feed is therefore not a tick-by-tick display source.

- Lens: technical
- Source: [Solana push feeds (Pyth)](https://docs.pyth.network/price-feeds/core/push-feeds/solana): "Most feeds (61) update every 55 seconds, or when the price moves 0.5%"
- Source: [Pyth pull integration on Solana](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana): "The Pyth Data Association sponsors price updates for a subset of commonly used price feeds on shard 0."
- Verification (2026-10-09): downgraded from CONFIRMED: Pull-integration page confirms the shard 0 sponsorship quote. Push-feeds page: 61 feeds default 55s / 0.5% confirmed, but the fetched content did not show the feed table or a mainnet-and-devnet sponsorship statement; SPY/QQQ/AMD appear only in changelog entries, not the sponsored list. AAPL etc. absent. Core point likely true but the devnet/mainnet and listed-equity statements could not be verified.

### F2.58 [Q18] [Q21] [D16] [S9] [S10] CONFIRMED

Public devnet RPC limits per IP: 100 requests per 10 s, 40 per 10 s for a single RPC method, 40 concurrent connections, 40 new connections per 10 s, 100 MB per 30 s. The page does not say whether connection limits cover WebSocket.

- Lens: technical
- Source: [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters): "Maximum number of requests per 10 seconds per IP: 100 ... for a single RPC: 40 ... Maximum concurrent connections per IP: 40"
- Verification (2026-10-09): held: Opened solana.com/docs/references/clusters. Devnet limits 100/10s, 40 single method, 40 concurrent connections, 40 connection rate, 100 MB per 30s all listed. Page does not mention WebSocket, as claimed.

### F2.59 [Q18] [D16] [S9] CONFIRMED

Solana says public RPC endpoints are not intended for production applications, rate limits may change without notice, and high-traffic websites may be blocked; it advises dedicated or private RPC for launches.

- Lens: technical
- Source: [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters): "The public RPC endpoints are not intended for production applications."
- Verification (2026-10-09): held: Same clusters page: 'not intended for production applications', 'dedicated/private RPC servers when you launch', 'rate limits may change without prior notice', 'high-traffic websites may be blocked'.

### F2.60 [Q18] [Q21] [S9] [S10] CONFIRMED

Helius's Free plan allows 10 RPC requests/s, 1 sendTransaction/s, and 5 concurrent WebSocket connections (LaserStream connections up to 1,000 subscriptions each; LaserStream is not available on Free, devnet LaserStream starts at Developer). A keyed RPC used by browsers would share these caps across all viewers.

- Lens: technical
- Source: [Helius rate limits](https://www.helius.dev/docs/billing/rate-limits): "RPC: 10 requests/s. sendTransaction: 1/sec ... 5 concurrent connections"
- Verification (2026-10-09): held: Opened Helius rate-limits. Free: 10 RPC req/s, sendTransaction 1/sec, 5 concurrent connections (listed in the LaserStream WebSocket table as Standard type; no separate standard-WebSocket figure), 1,000 subscriptions per connection, LaserStream not on Free, devnet first at Developer. Minor ambiguity over which connection type the 5 applies to.

### F2.61 [D16] [Q18] [S9] CONFIRMED

A Solana WebSocket provider (Helius) documents a 10-minute inactivity timer, ping at least once per minute, mandatory reconnection logic (exponential backoff with jitter), and restoring subscriptions on reopen; it does not describe replay of missed messages for standard WebSockets.

- Lens: technical
- Source: [Helius WebSocket docs](https://www.helius.dev/docs/rpc/websocket): "WebSockets have a 10-minute inactivity timer ... Production applications must implement reconnection logic"
- Verification (2026-10-09): held: Opened Helius WebSocket docs. 10-minute inactivity timer, ping at least once per minute, reconnector with exponential backoff and jitter, resubscribe on open. Replay is only attributed to LaserStream, not standard WebSockets.

### F2.62 [D16] [D14] [S9] CONFIRMED

Solana's accountSubscribe docs describe notifications with context.slot and a subscription ID but say nothing about reconnection, missed updates or idle timeouts, so the client must resubscribe and re-read state itself.

- Lens: technical
- Source: [accountSubscribe (Solana RPC)](https://solana.com/docs/rpc/websocket/accountsubscribe): "Subscribe to notifications when an account's lamports or data change."
- Verification (2026-10-09): held: Opened Solana accountSubscribe. Documents context.slot and subscription ID; nothing on reconnection, missed updates or idle timeouts. Intro quote matches.

### F2.63 [D16] [Q18] [S9] CONFIRMED

SSE over HTTP/1.1 is limited to 6 open connections per browser and domain across all tabs (marked Won't fix in Chrome and Firefox); under HTTP/2 the limit is negotiated (default 100 streams). EventSource restarts a closed connection by default and honours a server-set 'retry' interval in milliseconds.

- Lens: technical
- Source: [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events): "When not used over HTTP/2, SSE suffers from a limitation to the maximum number of open connections ... (6)"
- Verification (2026-10-09): held: Opened MDN SSE page. 6-connection limit per browser+domain, Won't fix in Chrome and Firefox, HTTP/2 streams negotiated default 100, auto-restart on close, retry field in ms.

### F2.64 [D16] [S9] CONFIRMED

The browser WebSocket interface has no backpressure (a fast sender can fill memory or pin the CPU); the MDN WebSockets page does not document automatic reconnection, so reconnect logic is the app's job.

- Lens: technical
- Source: [WebSockets API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API): "it doesn't support backpressure"
- Verification (2026-10-09): held: Opened MDN WebSockets API. 'doesn't support backpressure' with memory fill / 100% CPU text; no automatic reconnection documented on that page.

### F2.65 [D16] [Q18] [S9] CONFIRMED

Vercel Functions serve WebSockets natively in public beta (since June 22, 2026); every connection closes at the function's max duration (300 s Hobby, 800 s Pro, 1,800 s beta); a connection is pinned to one instance and new connections may land on a different one, so shared state needs an external store. Vercel recommends SSE for one-way server-to-client data, noting EventSource reconnects automatically.

- Lens: technical
- Source: [Do Vercel Functions support WebSocket connections?](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections): "Every WebSocket connection on Vercel closes when the function reaches its maximum duration"
- Verification (2026-10-09): held: Opened Vercel KB guide. Public beta June 22 2026, closes at max duration, pinned to the instance, external store advised, EventSource reconnects automatically. SSE is recommended specifically when data flows server-to-client only, which matches the claim's one-way wording. Durations: Hobby 300, Pro 800, 1800 beta.

### F2.66 [D16] [S9] CONFIRMED

For Vercel request handlers, max duration includes streamed responses; exceeding it returns a 504. With Fluid compute the defaults are 300 s (Hobby max 300 s; Pro max 800 s, extended 1,800 s beta).

- Lens: technical
- Source: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations): "For request handlers, this includes time spent processing the request and sending the response, including streamed responses."
- Verification (2026-10-09): held: Opened vercel.com/docs/functions/limitations. Max duration includes streamed responses, 504 FUNCTION_INVOCATION_TIMEOUT, defaults 300s, Hobby max 300, Pro 800, extended 1800 beta.

### F2.67 [D16] [Q18] [S9] CONFIRMED

Polymarket's public market WebSocket channel: connect to wss://ws-subscriptions-clob.polymarket.com/ws/market, send a subscription frame with asset ids, add or remove ids on the open connection, send the text frame PING every 10 seconds (server replies PONG). Event types include book, price_change, last_trade_price and tick_size_change.

- Lens: venues
- Source: [Polymarket market channel](https://docs.polymarket.com/market-data/websocket/market-channel): "Send the text frame `PING` every 10 seconds."
- Verification (2026-10-09): held: Opened Polymarket market channel. Endpoint, assets_ids subscription, subscribe/unsubscribe operation on open connection, PING every 10s with PONG, event types book, price_change, last_trade_price, tick_size_change.

### F2.68 [D16] [D14] [S9] CONFIRMED

Kalshi streams the order book as an orderbook_snapshot followed by orderbook_delta messages with a sequence number (seq) the client should check to know it received every message; a get_snapshot action refreshes a snapshot without changing the subscription. Kalshi sends WebSocket Ping frames every 10 seconds. The page does not say what to do after a gap. Market ticker updates are event-driven, so a quiet gap alone does not mean stale data; compare ts_ms with the local clock.

- Lens: venues
- Source: [Kalshi orderbook updates](https://docs.kalshi.com/websockets/orderbook-updates.md): "Sequential number that should be checked if you want to guarantee you received all the messages."
- Source: [Kalshi connection keep-alive](https://docs.kalshi.com/websockets/connection-keep-alive.md): "Kalshi sends Ping frames (`0x9`) every 10 seconds with body `heartbeat`"
- Source: [Kalshi market ticker](https://docs.kalshi.com/websockets/market-ticker.md): "Use ts_ms"
- Verification (2026-10-09): held: Opened three Kalshi pages. seq quote verbatim, snapshot then delta, get_snapshot without modifying subscription, no gap-recovery guidance; Ping frames every 10s body heartbeat; ticker updates on change with ts_ms. The 'compare with local clock' is the claim's advice; the page gives no clock-skew guidance.

### F2.69 [D14] [Q4] [S9] [S26] CONFIRMED

Kalshi's exchange status separates exchange_active (false if the core exchange takes no state changes) from trading_active (true during trading hours, false outside them), plus an estimated resume time during maintenance; the exchange schedule gives standard hours and maintenance windows and says 'Outside of these times trading will be unavailable.'

- Lens: venues
- Source: [Kalshi Get Exchange Status](https://docs.kalshi.com/api-reference/exchange/get-exchange-status.md): "False if the core Kalshi exchange is no longer taking any state changes at all."
- Source: [Kalshi Get Exchange Schedule](https://docs.kalshi.com/api-reference/exchange/get-exchange-schedule.md): "Outside of these times trading will be unavailable."
- Verification (2026-10-09): held: Opened Kalshi exchange status and schedule. exchange_active quote matches, trading_active true during trading hours, estimated resume time for maintenance; schedule says 'Outside of these times trading will be unavailable.'

### F2.70 [Q4] [Q29] [Q41] [D14] [S26] [S4] [S9] [S10] CONFIRMED

Kalshi market lifecycle: initialized ('Created but not yet open for trading', active when open_time passes), active, inactive (paused), closed ('Past close_time. No new orders accepted. Awaiting determination.'), determined, finalized. At close, 'Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels'; once close_time passes all order operations including cancellations are rejected with MARKET_INACTIVE; resting orders are also cancelled when an inactive market is reactivated.

- Lens: venues
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "Resting orders are cancelled shortly after close, and cancellation updates are published on the usual user channels."
- Verification (2026-10-09): held: Opened Kalshi market lifecycle. All six statuses with matching descriptions, resting orders cancelled shortly after close, MARKET_INACTIVE for all order operations incl. cancellations after close, resting orders cancelled on reactivation.

### F2.71 [Q4] [D14] [S26] [S9] CONFIRMED

Kalshi pauses: during a scheduled trading pause (Thursday 3:00 to 5:00 AM ET) only cancelling is allowed; during an exchange pause nothing is allowed. Resting orders stay on the book unless the per-order CancelOrderOnPause flag is set (default false).

- Lens: venues
- Source: [Kalshi Maintenance and Pauses](https://docs.kalshi.com/getting_started/maintenance_and_pauses.md): "Order remains resting on the book and resumes when activity reopens"
- Verification (2026-10-09): held: Opened Kalshi maintenance and pauses. Thursday 3-5 AM ET pause is cancel-only, exchange pause blocks all, resting orders remain unless CancelOrderOnPause set, default false.

### F2.72 [D14] [Q11] [S9] CONFIRMED

Polymarket displays the midpoint of the bid-ask spread as the price, but uses the last traded price when the spread is over $0.10. Its API returns a 0.5 placeholder for a never-traded token with an empty book.

- Lens: venues
- Source: [How are prices calculated? (Polymarket Help)](https://help.polymarket.com/en/articles/13364488-how-are-prices-calculated): "unless that spread is over $0.10, in which case the last traded price is used."
- Source: [Polymarket order book](https://docs.polymarket.com/trading/orderbook): "When a token has never traded and its order book is empty, the API returns the "0.5" placeholder."
- Verification (2026-10-09): held: Polymarket Help: midpoint displayed, last trade price when spread over $0.10. Polymarket orderbook docs: '0.5' placeholder for never-traded empty-book token (SDKs return null/None).

### F2.83 [Q41] [D14] [Q17] [S4] [S9] CONFIRMED

Pyth publishes US equity feeds in sessions: pre-market 4 AM to 9:30 AM ET, regular 9:30 AM to 4 PM ET, post-market 4 PM to 8 PM ET, overnight Sunday to Thursday 8 PM to 4 AM ET. The page does not say what the feed does outside these hours.

- Lens: technical
- Source: [Pyth market hours](https://docs.pyth.network/price-feeds/core/market-hours): "Pre-market: Every weekday from 4AM ET to 9.30AM ET."
- Verification (2026-10-09): held: Opened Pyth market-hours. Pre-market 4-9:30, regular 9:30-4, post 4-8, overnight Sun-Thu 8PM-4AM ET. Off-hours behaviour not stated.

### F2.84 [D14] [S9] CONFIRMED

Pyth's best-practices page says 'US equity markets only trade during certain hours, and outside those hours, it's not clear what an equity's price is'; SDKs fail a price read when the last update is too old (configurable threshold); integrators are advised to pause new positions when updates stall or the confidence interval widens.

- Lens: technical
- Source: [Pyth best practices](https://docs.pyth.network/price-feeds/core/best-practices): "outside those hours, it's not clear what an equity's price is"
- Verification (2026-10-09): held: Opened Pyth best practices. Equity quote verbatim, SDK staleness failure with configurable threshold, advice to pause new position openings when updates stall or confidence widens.

### F2.85 [D14] [S9] CONFIRMED

Solana RPC getHealth returns 'ok' when the node is within a configured slot distance of the cluster tip and a -32005 error (e.g. 'Node is behind by 42 slots') otherwise; the docs mark the error payload UNSTABLE and do not give the default distance.

- Lens: technical
- Source: [getHealth (Solana RPC)](https://solana.com/docs/rpc/http/gethealth): "The exact error payload is UNSTABLE and may change"
- Verification (2026-10-09): held: Opened getHealth. 'ok' when healthy, -32005 'Node is behind by 42 slots', payload UNSTABLE, default slot distance not given.

### F2.86 [D14] [S9] CONFIRMED

slotSubscribe sends a slotNotification each time the validator processes a slot, so absence of slot notifications is a usable chain-liveness signal separate from absence of book updates (the docs do not state a frequency; using it as a heartbeat is an inference).

- Lens: technical
- Source: [slotSubscribe (Solana RPC)](https://solana.com/docs/rpc/websocket/slotsubscribe): "The newly processed slot."
- Verification (2026-10-09): held: Opened slotSubscribe: 'Subscribe to notifications when the validator processes a new slot'; no frequency stated. Heartbeat use is the claim's own inference, flagged as such.

### F2.87 [D14] [S9] CONFIRMED

Nielsen Norman Group's 'visibility of system status' principle: systems should keep users informed 'through appropriate feedback within reasonable time', and silent changes (items vanishing from a list without explanation) cost user trust; it does not address stale data directly.

- Lens: user
- Source: [Visibility of System Status (NN/g)](https://www.nngroup.com/articles/visibility-system-status/): "keep users informed about what is going on, through appropriate feedback within reasonable time"
- Verification (2026-10-09): held: Opened NN/g article. Definition quote verbatim; wish-list items disappearing with no explanation damages trust; stale data not named directly.

### F2.88 [Q11] [S9] SECONDARY

A cash-or-nothing binary call pays one unit if spot is above strike; its value is the negative of the derivative of the vanilla call price with respect to strike, and in Black-Scholes e^(-rT)Φ(d2) falls as strike rises. So Yes price should be non-increasing in strike.

- Lens: technical
- Source: [Binary option (Wikipedia)](https://en.wikipedia.org/wiki/Binary_option): "pays out one unit of cash if the spot is above the strike at maturity"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F2.89 [Q11] [S9] CONFIRMED

A 2025 paper analysing on-chain Polymarket order-book data found mispricing across logically related markets (combinatorial arbitrage) and estimated about $40 million of realized profit extracted, showing cross-market inconsistencies do occur on real venues and are corrected by traders, not by the venue.

- Lens: venues
- Source: [Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets](https://arxiv.org/abs/2508.03474): "Combinatorial Arbitrage, which spans across multiple markets"
- Verification (2026-10-09): held: Opened arXiv 2508.03474 abstract page (Aug 2025). On-chain Polymarket order-book data, Market Rebalancing and Combinatorial Arbitrage, 'realized estimate of 40 million USD of profit extracted'. 'Corrected by traders, not the venue' is interpretation.

### F2.90 [Q11] [S9] UNCONFIRMED

Derivation, not sourced: with the at-or-above rule, for strikes K1 < K2 the Yes(K1) payoff is at least the Yes(K2) payoff in every outcome, so a bid on K2 above an ask on K1 is a riskless profit (buy K1 at $0.55, sell K2 at $0.60 gains $0.05 and cannot lose). Nothing in a one-book-per-strike design links the books, and no document opened shows Kalshi or Phoenix enforcing cross-market order. Kalshi's event docs define strike fields per market and describe no ladder constraint.

- Lens: technical
- Source: [Kalshi Get Event](https://docs.kalshi.com/api-reference/events/get-event.md): "Netting applies within this event, not across all events in its series."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.100 [Q21] [Q18] [S10] [S9] UNCONFIRMED

Derivations from sourced limits, not sourced themselves: (a) 49 books x ($100 minted + $45 bid collateral) is about $7,100, which at 20 USDC per 2-hour faucet request is about 355 requests, roughly 30 days; (b) a 49-market requote at one transaction per market is at least 12 s under the public-devnet 40-per-method cap, realistically about 20 s after blockhash and confirmation calls share the 100-per-10-s cap, and about 49 s on Helius's free 1 send/s; (c) 49 accountSubscribe calls in a burst would exceed the 40-per-method figure if subscribes count against it (unknown). Whether the program accepts a self-minted test USDC is unknown.

- Lens: technical
- Source: [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters): "Maximum number of requests per 10 seconds per IP for a single RPC: 40"
- Source: [Circle Faucet](https://faucet.circle.com/): "20 USDC on testnet every 2 hours"
- Source: [Helius rate limits](https://www.helius.dev/docs/billing/rate-limits): "sendTransaction: 1/sec"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F2.104 [D14] [Q4] [Q41] [S4] [S9] [S26] UNCONFIRMED

A trader needs to be told which of several different situations they are in (market not yet open, trading closed, order cancelled at close, feed lagging, chain down) because each calls for a different action (wait, nothing, re-place, refresh, do not sign). Kalshi separates these as distinct states and publishes cancellation updates to users; the principle matches NN/g visibility of system status. This is a design inference from those sources, not a measured user need.

- Lens: user
- Source: [Kalshi Market Lifecycle](https://docs.kalshi.com/getting_started/market_lifecycle.md): "cancellation updates are published on the usual user channels"
- Source: [Visibility of System Status (NN/g)](https://www.nngroup.com/articles/visibility-system-status/): "keep users informed about what is going on"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

### F7.22 [Q49] [Q50] [S22] [S1] [S3] [S9] CONFIRMED

Pyth's published plans: Free is view-only in the Pyth Terminal with no API access and no redistribution rights; Starter ($500/month) has display rights, no redistribution, crypto symbols only; Pro (from $2,500/month) lists equities, display and non-display rights and limited redistribution rights. The page does not mention delayed data or non-professional status.

- Lens: legal
- Source: [Pyth plans](https://app.pyth.com/plans): "Pro ... Display and non-display rights ... Limited redistribution rights"
- Verification (2026-10-09): held: Opened app.pyth.com/plans (primary). Free: view-only Terminal, no API, no redistribution. Starter $500/mo: display rights, no redistribution, crypto symbols. Pro from $2,500/mo: equities, display and non-display, limited redistribution. No mention of delayed data or non-professional status.

### F7.23 [Q49] [Q50] [S22] [S1] [S3] [S9] CONFIRMED

Pyth is an approved external distributor of Nasdaq Basic; any client who wants Pyth as its Nasdaq Basic provider needs prior written approval from Nasdaq and licenses directly with Nasdaq.

- Lens: legal
- Source: [Pyth External Distributor of Nasdaq Basic](https://www.pyth.network/blog/pyth-external-distributor-of-nasdaq-basic): "must have prior, written approval from Nasdaq before consuming the feed"
- Verification (2026-10-09): held: Opened Pyth blog post (Pyth's own announcement of a Nasdaq arrangement). Pyth approved as external distributor of Nasdaq Basic; clients need prior written approval from Nasdaq and may license directly with Nasdaq.

### F7.25 [Q50] [S1] [S3] [S9] CONFIRMED

Pyth's website terms say nothing in them grants any title, licence or right to use or reproduce price feed data (including asset prices, confidence intervals, metadata); the licence is for the site, for private non-commercial informational purposes; scraping or unauthorised API access and bypassing rate limits are prohibited; content is 'as is' and not financial advice. These are website terms; the Hermes/Core API terms were not found.

- Lens: legal
- Source: [Pyth Network Terms of Use](https://www.pyth.network/legal/terms-conditions): "price feed data (including asset prices, confidence intervals, or related metadata)"
- Verification (2026-10-09): held: Opened pyth.network/legal/terms-conditions (primary). No title/licence/right in price feed data; narrow licence for private non-commercial informational use; scraping, unauthorised API access and rate-limit bypass prohibited; as-is and not financial advice. Fetch summary did not reproduce the parenthetical 'confidence intervals, or related metadata' wording verbatim, but the substance matches.

### F7.26 [Q50] [S1] [S3] [S9] CONFIRMED

Pyth's docs state 'Hermes now requires an API Key', and that Pyth Core feed IDs differ from Pyth Pro feed IDs. The Core price-feed page lists equity index feeds (e.g. Equity.Index.SPY/USD) but my fetch did not confirm single-stock feeds such as AAPL. US equities feeds are available in regular, pre-, post- and overnight sessions.

- Lens: legal
- Source: [Pyth docs: Price feed IDs](https://docs.pyth.network/price-feeds/core/price-feeds/price-feed-ids): "Hermes now requires an API Key."
- Source: [Pyth docs: Market hours](https://docs.pyth.network/price-feeds/core/market-hours): "Weekdays, 9:30 AM to 4:00 PM ET"
- Verification (2026-10-09): held: Opened Pyth docs price-feed-ids: 'Hermes now requires an API Key' present, Core IDs differ from Pro IDs, Equity.Index.SPY/USD listed, AAPL not seen. Market-hours page lists regular, pre, post, and overnight sessions; its regular-hours wording is 'Every weekday from 9.30AM ET to 4PM ET' rather than the quoted string, but the content matches.

### F7.27 [Q50] [S1] [S3] [S9] SECONDARY

Search results for Nasdaq's Display Requirements Policy say distributors of delayed data must show a Prominent Delay Message, and Nasdaq Basic products need a Prominent Attribution Message; Nasdaq has a Digital Media License for Nasdaq Basic display to the general investing public. The policy page and the SEC filing could not be read (timeout and unparseable PDF), so exact terms, including whether delayed display needs an agreement or a fee, are unconfirmed.

- Lens: legal
- Source: [Nasdaq Display Requirements Policy (search result)](https://www.nasdaq.com/content/AdministrationSupport/Policy/DisplayRequirementsPolicy): "Prominent Delay Message on all Delayed Data Products"
- Source: [SEC filing SR-NASDAQ-2020-080 (search result)](https://www.sec.gov/files/rules/sro/nasdaq/2020/34-90616.pdf): "monthly media enterprise license"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.28 [Q50] [S1] [S3] [S9] SECONDARY

Pyth announced (2 April 2026) that Polymarket uses Pyth as resolution source for daily markets on more than a dozen single-name US equities, and a separate report says it is Pyth Pro data over WebSocket. These show a commercial precedent for Pyth Pro-sourced single-stock event markets; neither source describes licence terms. Business Wire returned 403 to my fetch.

- Lens: legal
- Source: [Pyth press release on Polymarket integration (search result)](https://www.businesswire.com/news/home/20260402971400/en): "more than a dozen single-name U.S. equities"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.29 [Q50] [S1] [S3] [S9] CONFIRMED

The spec asks for 'live prices' on the landing and markets pages and 'real-time price display from oracle' in frontend tests, and a Yes/No price display from the project's own order book is an alternative that does not itself redistribute exchange quotes.

- Lens: legal
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Markets -- Grid of 7 stocks with live prices and active contract counts"
- Verification (2026-10-09): held: Opened the local spec file via grep. Line 419 'Markets -- Grid of 7 stocks with live prices and active contract counts', line 418 landing 'live prices', line 473 'Real-time price display from oracle'. The alternative about Yes/No display from the own order book is the author's inference, not spec text.

### F7.32 [Q50] [S1] [S3] [S9] UNCONFIRMED

Pyth Pro marketing says it offers licensing 'designed for downstream systems to consume, process, and display data to end users'. This is marketing language, not contract text, and conflicts in emphasis with the Site terms in F7.25, so display rights for a free public app remain unconfirmed.

- Lens: legal
- Source: [Pyth blog: Built for the next 50 billion market data users](https://www.pyth.network/blog/built-for-the-next-50-billion-market-data-users): "rights designed for downstream systems to consume, process, and display data to end users"
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
