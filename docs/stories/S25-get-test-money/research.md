# Research: S25 Gets devnet SOL and test USDC, clearly labelled as play money with no value

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 1: Onboarding

### F1.01 [Q19] [Q22] [Q40] [Q52] [S25] CONFIRMED

Solana's cluster docs say devnet has a token faucet, devnet tokens are not real, devnet may be reset, and the public devnet RPC is rate limited (100 requests per 10 seconds per IP; 40 per 10 seconds for a single RPC).

- Lens: technical
- Source: [Solana clusters and endpoints](https://solana.com/docs/core/clusters): "Devnet tokens are not real"
- Verification (2026-10-09): held: Opened solana.com/docs/core/clusters. Says devnet has a token faucet, 'Devnet tokens are not real', ledger resets possible, and rate limits of 100 requests/10s per IP and 40/10s per IP for a single RPC.

### F1.02 [Q19] [S25] CONFIRMED

The official web faucet limits users to 2 requests every 8 hours, offers a higher limit after GitHub sign-in (accounts are validated and some fail), does not state an amount on the page, says AI agents should not use it, and lists programmatic alternatives (CLI airdrop, a proof-of-work faucet, a local validator with no rate limits).

- Lens: technical
- Source: [Solana Faucet](https://faucet.solana.com): "Maximum of 2 requests every 8 hours"
- Verification (2026-10-09): held: Opened faucet.solana.com. 'Maximum of 2 requests every 8 hours'; GitHub sign-in raises the limit and accounts are validated (some fail); AI agents should not use it; alternatives: CLI airdrop, devnet-pow PoW faucet, local validator with no rate limits. No default amount on the page.

### F1.03 [Q19] [S25] CONFIRMED

Solana CLI basics: switch to devnet, run 'solana airdrop 2'; each airdrop request is capped at 5 SOL; if rate-limited, use the web faucet.

- Lens: technical
- Source: [Solana CLI basics](https://solana.com/docs/intro/installation/solana-cli-basics): "Each airdrop request is capped at 5 SOL"
- Verification (2026-10-09): held: Opened Solana CLI basics. Switch to devnet via solana config set -ud/--url devnet, solana airdrop 2, 5 SOL cap per request, use web faucet if rate limited.

### F1.04 [Q19] [S25] CONFIRMED

Solana's faucet guide lists devnet SOL sources: CLI/web3.js requestAirdrop, web faucets (faucet.solana.com, SolFaucet, QuickNode, DevnetFaucet.org, others), RPC-provider faucets (Helius, QuickNode, Triton), a proof-of-work faucet ('cargo install devnet-pow', maintained by Ellipsis Labs per the guide), and Discord bots. The guide gives no amounts or quotas and does not mention USDC.

- Lens: technical
- Source: [How to get Solana devnet SOL](https://solana.com/developers/guides/getstarted/solana-token-airdrop-and-faucets): "cargo install devnet-pow"
- Verification (2026-10-09): held: Opened the faucet guide. Lists CLI/web3.js airdrop, web faucets (faucet.solana.com, SolFaucet, QuickNode, DevnetFaucet.org, others), RPC provider faucets (Helius, QuickNode, Triton), devnet-pow 'maintained by Ellipsis Labs', Discord bots. No USDC mention; only amount is the 2 SOL example.

### F1.05 [Q19] [S25] CONFIRMED

Circle's public faucet lists Solana Devnet, gives 20 USDC per request, limits one request per asset per test network every 2 hours (per address, per blockchain), is protected by reCAPTCHA, describes no API, and points to Circle's Discord for more.

- Lens: technical
- Source: [Circle Faucet](https://faucet.circle.com): "Developers can request 20 USDC on testnet every 2 hours, per address, and per blockchain."
- Verification (2026-10-09): held: Opened faucet.circle.com. Lists Solana Devnet, 'Send 20 USDC', 20 USDC every 2 hours per address per blockchain, reCAPTCHA, no API mention, Circle Discord for more.

### F1.06 [Q19] [S25] CONFIRMED

Circle's API reference documents POST https://api.circle.com/v1/faucet/drips with a bearer key, body fields address, blockchain (SOL-DEVNET is listed), native, usdc and eurc flags; it states the call requires upgrading to mainnet (an account tier) and gives no rate limit.

- Lens: technical
- Source: [Request testnet tokens - Circle Docs](https://developers.circle.com/api-reference/wallets/programmable-wallets/request-testnet-tokens): "Calling the /v1/faucet/drips API requires upgrading to mainnet."
- Verification (2026-10-09): held: Opened Circle API reference. POST /v1/faucet/drips, bearer auth, fields address, blockchain (SOL-DEVNET valid), native/usdc/eurc booleans, 'requires upgrading to mainnet', no rate limit mentioned.

### F1.07 [Q19] [Q22] [S25] CONFIRMED

Circle's contract address page gives the Solana devnet USDC mint as 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU and says testnet USDC has no financial value and is not backed by real dollars.

- Lens: technical
- Source: [USDC contract addresses - Circle Docs](https://developers.circle.com/stablecoins/usdc-contract-addresses): "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
- Verification (2026-10-09): held: Opened Circle USDC contract addresses. Solana devnet mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU; testnet USDC 'have no financial value, and are not backed by real US dollars'.

### F1.08 [Q19] [S25] CONFIRMED

Circle's Solana Gateway quickstart says to get testnet USDC from the Circle Faucet and testnet SOL from the Console Faucet (needs a Circle Developer Console account) or faucet.solana.com; the wallet that creates token accounts needs SOL.

- Lens: technical
- Source: [Quickstart: Create and transfer a unified USDC balance on Solana](https://developers.circle.com/gateway/quickstarts/unified-balance-solana): "Use the Circle Faucet to get test USDC."
- Verification (2026-10-09): held: Opened Circle Gateway Solana quickstart (fetch covered first ~100k of ~248k chars). Testnet USDC from Circle Faucet; testnet SOL from Console Faucet (needs Console account) or faucet.solana.com; submitting wallet needs SOL for the associated token account. Exact quote wording differs slightly from the stated quote but substance matches.

### F1.09 [Q19] [Q22] [S25] UNCONFIRMED

Inference, not opened at a primary source: because a token's mint authority alone can create supply, a script cannot mint Circle's devnet USDC, while Meridian could create its own SPL mint and drip tokens to users; that token would not be Circle's mint address.

- Lens: technical
- Source: [SPL Token Program Architecture: A Technical Overview](https://andreyobruchkov1996.substack.com/p/spl-token-program-architecture-a): "Mint authority: the account permitted to mint new tokens and increase the total supply."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F1.10 [Q22] [S25] CONFIRMED

Phantom's help center says a banner at the top of the app confirms Testnet Mode is on, and that tokens on test networks have no real value.

- Lens: venues
- Source: [Turn on devnet or testnet mode in Phantom](https://help.phantom.com/hc/en-us/articles/5997313271699-Turn-on-devnet-or-testnet-mode-in-Phantom): "Tokens on test networks have no real value."
- Verification (2026-10-09): held: Opened Phantom help center article. 'A banner at the top of the app confirms when testnet mode is on' and 'Tokens on test networks have no real value.'

### F1.11 [Q22] [Q19] [S25] CONFIRMED

Phantom's developer docs describe Testnet Mode (Settings, Developer Settings) and link to faucet.solana.com for devnet SOL, but do not mention a banner or say the tokens have no value.

- Lens: venues
- Source: [Testnet mode - Phantom developer documentation](https://docs.phantom.com/developer-powertools/testnet-mode): "Testnet mode allows you to connect to blockchain test networks for development and testing purposes."
- Verification (2026-10-09): held: Opened Phantom developer docs. Quote present; path Settings > Developer Settings > Testnet Mode; links faucet.solana.com; no banner or no-value statement.

### F1.12 [Q22] [Q52] [S25] CONFIRMED

Aave's testing guide reaches its Sepolia test market by enabling testnet mode in the top right of app.aave.com, and test tokens come from a Faucet tab; the page does not itself say the tokens have no value.

- Lens: venues
- Source: [Testing & Debugging - Aave](https://aave.com/docs/aave-v3/smart-contracts/testing-and-debugging): "Use the Faucet tab to acquire test tokens available in the market."
- Verification (2026-10-09): held: Opened Aave testing guide. Sepolia, testnet mode in top right, 'Use the Faucet tab to acquire test tokens'; no statement that tokens have no value.

### F1.13 [Q22] [S25] SECONDARY

Search results report that Aave's faucet pages and FAQ state testnet assets are not real and have no economic value; I could not open those pages (403 or 404).

- Lens: venues
- Source: [Aave faucet (search result)](https://app.aave.com/faucet/): "assets on a testnet are not real, meaning they have no monetary value"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.14 [Q22] [S25] SECONDARY

Search results report that Uniswap's support articles describe a Testnet mode toggle in the wallet/extension (gear, Advanced) that lets users try features without real funds; I could not open the page (403).

- Lens: venues
- Source: [Testnets on Uniswap](https://support.uniswap.org/hc/en-us/articles/14580495154445-Testnets-on-Uniswap): "testnet mode lets you try the app and its features without real funds"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F1.15 [Q22] [S25] CONFIRMED

Kalshi's API docs describe a separate demo environment with 'mock funds' for testing (the page does not say 'not real money').

- Lens: venues
- Source: [Kalshi demo environment](https://docs.kalshi.com/getting_started/demo_env): "mock funds"
- Verification (2026-10-09): held: Opened Kalshi demo env docs. Describes 'mock funds'; does not say 'not real money'; also notes separate credentials and demo prices may not reflect real markets.

### F1.16 [Q22] [S25] CONFIRMED

Manifold's FAQ calls mana a play-money currency that cannot be converted to cash and writes amounts with an M prefix (for example M1000).

- Lens: venues
- Source: [Manifold FAQ](https://docs.manifold.markets/faq): "cannot be converted to cash"
- Verification (2026-10-09): held: Opened Manifold FAQ. Mana is play-money, 'cannot be converted to cash', amounts written like M1000.

### F1.44 [Q19] [S25] SECONDARY

A third-party comparison reports other faucet limits (Solana Foundation 2 SOL per 8 hours; QuickNode 1 SOL per 12 hours with a mainnet-balance requirement that may be outdated) and warns limits change; not confirmed at source.

- Lens: technical
- Source: [How to get free Solana devnet SOL in 2026: 5 methods compared](https://dev.to/jumpbit/how-to-get-free-solana-devnet-sol-in-2026-5-methods-compared-39ji): "Limits may change over time."
- Verification (2026-10-09): not rechecked (SECONDARY)

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

### F7.01 [D3] [Q51] [S2] [S25] CONFIRMED

Solana's docs say devnet tokens are not real, devnet has a faucet for application testing, and it may be subject to ledger resets.

- Lens: legal
- Source: [Solana Clusters and Public RPC Endpoints](https://solana.com/docs/references/clusters): "Devnet tokens are not real"
- Verification (2026-10-09): held: Opened solana.com/docs/references/clusters (primary). Devnet section says tokens are not real, has a faucet for application testing airdrops, and may be subject to ledger resets.

### F7.02 [D3] [Q46] [Q51] [S2] [S25] [S4] CONFIRMED

The Solana faucet is for development, does not distribute mainnet SOL, is limited to 2 requests every 8 hours (GitHub sign-in raises the limit), checks GitHub accounts for fair use, and tells AI agents not to use it. The page does not itself say devnet tokens have no value. No geoblock text was seen.

- Lens: legal
- Source: [Solana Faucet](https://faucet.solana.com/): "designed for development purposes and does not distribute mainnet SOL; Maximum of 2 requests every 8 hours"
- Verification (2026-10-09): held: Opened faucet.solana.com. Says development purposes / no mainnet SOL, max 2 requests every 8 hours, GitHub sign-in raises limit, accounts validated, AI agents should not use it. No geoblock text, no statement on devnet token value, as the claim says.

### F7.03 [D3] [Q46] [Q51] [S2] [S25] [S4] CONFIRMED

Circle's testnet faucet limits to 20 USDC per address per blockchain every 2 hours, describes testnets as letting developers test without risking assets with real-world value, and says testnet tokens can be freely obtained from faucets. It does not say outright that testnet USDC has no value, and the page does not mention Solana devnet.

- Lens: legal
- Source: [Circle Faucet](https://faucet.circle.com/): "without risking assets with real-world value; 20 USDC on testnet per address, per blockchain, every 2 hours"
- Verification (2026-10-09): held: Opened faucet.circle.com (primary). Says testnets avoid risking assets with real-world value, 20 USDC per address per blockchain every 2 hours, testnet tokens freely obtained from faucets. No Solana devnet mention. Quote's wording is a stitched paraphrase but substance matches.

### F7.17 [Q49] [Q51] [S22] [S1] [S25] CONFIRMED

Polymarket's geoblock docs list fully blocked OFAC-sanctioned regions (Iran, Syria, Cuba, North Korea, Crimea/Donetsk/Luhansk) where no new orders and no closing are possible, a longer 'close-only' list including the United States and United Kingdom, and an endpoint that checks the requesting IP's eligibility. The docs list North Korea in both groups.

- Lens: legal
- Source: [Polymarket Docs: Geoblock](https://docs.polymarket.com/api-reference/geoblock): "It checks the geographic eligibility of the requesting IP address."
- Verification (2026-10-09): held: Opened Polymarket geoblock docs (primary). Fully blocked: IR, SY, CU, KP, Crimea/Donetsk/Luhansk. Close-only list includes US and UK and North Korea (appears in both). Endpoint checks eligibility of requesting IP; exact quoted sentence differs slightly ('Check the geographic eligibility of the requesting IP address:'), substance matches.

### F7.18 [Q49] [Q51] [S22] [S1] [S25] CONFIRMED

Polymarket's terms page shows a banner stating trading is blocked in the United States on polymarket.com and points US users to polymarket.us. The terms body (eligibility, KYC) was not displayed in my fetch.

- Lens: legal
- Source: [Polymarket Terms of Use (header)](https://polymarket.com/tos): "Trading is blocked in the United States on polymarket.com."
- Verification (2026-10-09): held: Opened polymarket.com/tos. Banner 'Trading is blocked in the United States on polymarket.com' and redirect to polymarket.us present. Terms body not seen, as the claim says.

### F7.31 [Q49] [Q51] [S22] [S25] CONFIRMED

OFAC published 'Sanctions Compliance Guidance for the Virtual Currency Industry' (Oct 2021) and updated FAQs 559 and 646. The announcement exists; I could not read the brochure PDF, so I make no claim about what it says on geolocation, wallet screening or strict liability.

- Lens: legal
- Source: [OFAC Recent Actions 15 Oct 2021](https://ofac.treasury.gov/recent-actions/20211015): "highlights sanctions compliance best practices tailored for the virtual currency industry"
- Verification (2026-10-09): held: Opened OFAC recent actions 15 Oct 2021 (primary). Announces Sanctions Compliance Guidance for the Virtual Currency Industry, updated FAQs 559 and 646, 'highlights sanctions compliance best practices tailored for the virtual currency industry'.

### F7.33 [Q51] [S1] [S25] CONFIRMED

Treasury delisted Tornado Cash in March 2025 in light of the Van Loon filing, citing novel legal and policy issues in sanctioning on-chain activity. It shows sanctions policy toward permissionless smart contracts is unsettled; the press release does not mention immutable smart contracts or the Fifth Circuit.

- Lens: legal
- Source: [Treasury press release on Tornado Cash delisting](https://home.treasury.gov/news/press-releases/sb0057): "novel legal and policy issues raised by use of financial sanctions against financial and commercial activity"
- Verification (2026-10-09): held: Opened Treasury sb0057 (primary), dated 21 March 2025. Tornado Cash delisted per Van Loon filing, quote about novel legal and policy issues present; no mention of immutable smart contracts or Fifth Circuit, as the claim says.

### F7.34 [Q51] [S1] [S25] CONFIRMED

Chainalysis Address Screening is offered as a product via demo request with API integration; the page does not state chain coverage, Solana support, or a free tier. Wallet screening therefore carries a vendor cost and integration effort.

- Lens: legal
- Source: [Chainalysis Address Screening](https://www.chainalysis.com/free-cryptocurrency-sanctions-screening-tools/): "integrated via high-reliability, low-latency APIs for real-time screening"
- Verification (2026-10-09): held: Opened Chainalysis page (vendor's own site). 'Request a demo' buttons, APIs for real-time screening, no chain list, no Solana mention, no free tier stated ('network agnostic' wording only). Vendor cost inference is the author's.

### F7.35 [Q51] [S1] [S25] SECONDARY

Search coverage reports Polymarket's restricted-region list has grown in 2026 (30+ countries) with two tiers (fully blocked vs close-only); counts vary by report and are secondary to the official page in F7.17.

- Lens: legal
- Source: [Portugal Orders Polymarket Shutdown, but Platform Remains Active](https://finance.yahoo.com/news/portugal-orders-polymarket-shutdown-platform-150142393.html): "restrictions in over 30 countries (search-result summary)"
- Verification (2026-10-09): not rechecked (SECONDARY)
