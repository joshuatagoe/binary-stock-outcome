# Research: S29 Sees trading and settlement pause during a devnet outage, then catch up when it returns

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 5: Platform

### F5.08 [D19] [S29] CONFIRMED

A Solana transaction only lands if its blockhash is within about 150 blocks (roughly 60 to 90 seconds at 400 ms slots), so after a halt any queued transaction is dead and must be rebuilt with a fresh blockhash; durable nonces are the documented escape hatch when expiry cannot be avoided. Docs also say to use confirmed commitment for blockhash fetches.

- Lens: technical
- Source: [Solana: Transaction confirmation and expiration](https://solana.com/docs/core/transactions/confirmation): "a given blockhash can only be used by transactions for about 60 to 90 seconds."
- Verification (2026-10-09): held: Opened Solana confirmation page. Blockhash usable about 60-90 s, max age 150 (151 valid), durable nonces for hard-to-avoid expiry, confirmed commitment recommended. Quote paraphrased, substance matches.

### F5.09 [D19] [S29] CONFIRMED

Chainlink's guidance for L2 sequencer outages is to pause operations during downtime and wait a GRACE_PERIOD_TIME after the sequencer returns before acting, to ensure fair access and avoid distortions such as unfair liquidations. This is the closest published analogue for 'what to do when the chain comes back'.

- Lens: venues
- Source: [Chainlink L2 Sequencer Uptime Feeds](https://docs.chain.link/data-feeds/l2-sequencer-feeds): "wait for the GRACE_PERIOD_TIME to pass"
- Verification (2026-10-09): held: Opened Chainlink L2 sequencer page. 'wait for the GRACE_PERIOD_TIME to pass' and 'Ensure fair access ... by temporarily pausing operations'. Exact phrase 'unfair liquidations' absent, but 'mass liquidations' and 'unfair advantage' wording is there; substance holds.

### F5.10 [D19] [S29] CONFIRMED

Pyth's best practices say a protocol doing delayed settlement can fetch the price update for a specific timestamp from Hermes and parse it before submitting on-chain; they also say a too-wide confidence interval is a signal to pause new activity, and that current-price reads fail when the update is too old (getPriceNoOlderThan). Together: after an outage a 'no older than 5 minutes from now' check fails, but a timestamped close price can still be proven.

- Lens: technical
- Source: [Pyth best practices](https://docs.pyth.network/price-feeds/core/best-practices): "fetching a price update for a specific timestamp from Hermes, then parsing it with parsePriceFeedUpdates()"
- Verification (2026-10-09): held: Opened Pyth best practices. Delayed settlement: fetch price for order timestamp from Hermes and parse with parsePriceFeedUpdates(); pause on wide confidence; getPriceNoOlderThan staleness. The 'after outage' conclusion is the finding's inference.

### F5.11 [D19] [Q12] [S29] CONFIRMED

Devnet is a public test cluster that 'may be subject to ledger resets'; it usually runs the same release branch as mainnet-beta but may run a newer minor release; the public RPC is rate limited (100 requests per 10 s per IP, 40 per 10 s per single RPC). A reset wipes deployed programs and all market state.

- Lens: technical
- Source: [Solana: Clusters and public RPC endpoints](https://solana.com/docs/references/clusters): "may be subject to ledger resets"
- Source: [Anza: Available Solana Clusters](https://docs.anza.xyz/clusters/available): "Devnet may be subject to ledger resets."
- Verification (2026-10-09): held: Opened solana.com clusters and Anza available clusters. 'Devnet may be subject to ledger resets'; same release branch as mainnet-beta, maybe newer minor; 100 req/10 s per IP, 40 per method. Wipe-of-state consequence is inference.

### F5.12 [D19] [S29] SECONDARY

Historical mainnet-beta full outages lasted from about 4.5 hours to about 19 hours (latest listed: Feb 2024, almost 5 hours) and restarts need at least 80 percent of stake online; Helius says there was no full halt for over a year as of writing. No devnet-specific halt history was found.

- Lens: technical
- Source: [A Complete History of Solana Outages (Helius)](https://www.helius.dev/blog/solana-outages-complete-history): "February 2024 | Almost 5 hours | Infinite recompile loop in the JIT cache"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F5.13 [D19] [Q53] [S29] CONFIRMED

The official Solana status page lists mainnet components (cluster, RPC nodes) with no incidents from 25 Sep to 9 Oct 2026 and shows no devnet component at all, so there is no official devnet incident feed to subscribe to; the app must detect a stall itself.

- Lens: technical
- Source: [Solana Status](https://status.solana.com): "No incidents reported today"
- Verification (2026-10-09): held: Opened status.solana.com. No incidents 25 Sep to 9 Oct 2026, 'No incidents reported today', components are Mainnet Beta etc.; devnet not listed.

### F5.14 [D19] [Q53] [S29] [S22] CONFIRMED

The getHealth RPC method returns 'ok' or a -32005 error 'Node is behind by N slots' with data.numSlotsBehind; the payload is marked UNSTABLE. A halted node would fall behind but the docs do not say how a halted cluster is reported, so a halt detector should also watch that the slot number actually advances.

- Lens: technical
- Source: [Solana RPC: getHealth](https://solana.com/docs/rpc/http/gethealth): "Node is behind by 42 slots"
- Verification (2026-10-09): held: Opened getHealth docs. Error -32005, 'Node is behind by 42 slots' example, numSlotsBehind, payload marked UNSTABLE.

### F5.15 [D19] [D23] [S29] CONFIRMED

Pyth lists US equity sessions as regular 9:30 AM to 4:00 PM ET, post-market 4:00 to 8:00 PM, pre-market 4:00 to 9:30 AM and overnight 8:00 PM to 4:00 AM, closed on weekends and NYSE holidays. A late settlement must therefore select the print at the 4:00 PM close, not a later after-hours print.

- Lens: technical
- Source: [Pyth market hours](https://docs.pyth.network/price-feeds/core/market-hours): "Post-market: Weekdays, 4:00 PM to 8:00 PM ET."
- Verification (2026-10-09): held: Opened Pyth market hours. Regular 9:30-4 ET, pre-market 4-9:30, post-market 4-8 PM, overnight 8PM-4AM (Sun-Thu start), no weekends, NYSE holidays. Exact quote wording differs slightly; substance matches.

### F5.16 [D19] [D24] [D27] [S29] [S20] [S21] CONFIRMED

The spec's own wording: the settlement job retries every 30 seconds for up to 15 minutes then alerts the admin; Admin Settle must enforce a time delay (e.g. 1 hour after close); Settle Market may only be called after 4:00 PM ET and must validate oracle freshness and confidence; the invariant list says tokens are only destroyed via redeem and the settlement outcome is immutable once written; it also says 'Staleness check: Reject prices older than a defined threshold (e.g., 5 minutes)'.

- Lens: technical
- Source: [Meridian project spec (local)](docs/spec/meridian_project.txt): "Settlement job (~4:05 PM ET): For each open contract, call settle market. If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes."
- Verification (2026-10-09): held: Read local spec docs/spec/meridian_project.txt: line 446-448 settlement job retry 30 s up to 15 min then alert admin; 365-369 Settle after 4 PM ET with freshness/confidence and Admin Settle time delay 1 hour; 391 tokens only destroyed via redeem; 402 staleness check 5 minutes.

### F5.17 [D19] [D23] [D24] [S29] [S20] CONFIRMED

On Solana, Pyth price update accounts are created by anyone ('ephemeral accounts that can be created, overwritten, and closed by any party'); the program reads them with get_price_no_older_than relative to the on-chain clock plus a feed ID check, and PriceUpdateV2 guarantees a verified price for a feed at some point in time. So settlement can be permissionless as far as oracle data goes, and a freshness rule tied to now will fail after a halt unless replaced by a window around the close time (design inference).

- Lens: technical
- Source: [Pyth pull integration on Solana](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana): "PriceUpdateV2 guarantees that the account contains a verified price for some price feed at some point in time."
- Verification (2026-10-09): held: Opened Pyth Solana pull integration. Price update accounts are ephemeral, anyone can create/overwrite/close; get_price_no_older_than with feed ID check; PriceUpdateV2 quote verbatim. Design inference part is flagged as such.

### F5.62 [Q44] [D19] [S21] [S29] CONFIRMED

Chainlink frames pausing during an outage as protecting fair access: uneven access can distort applications, such as liquidations, so operations are paused until after a grace period. The same fairness logic applies to a Meridian pause that lasts past the close.

- Lens: user
- Source: [Chainlink L2 Sequencer Uptime Feeds](https://docs.chain.link/data-feeds/l2-sequencer-feeds): "ensure fair access to services by temporarily pausing operations during sequencer failures"
- Verification (2026-10-09): held: Opened Chainlink L2 sequencer page: 'Ensure fair access to services by temporarily pausing operations during sequencer failures' present; liquidation distortion framing is paraphrase. Application to Meridian is the author's inference.
