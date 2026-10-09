# Research: S18 Tracks positions, entry price, P&L and every past trade

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 4: Settlement and payout

### F4.74 [Q27] [S18] CONFIRMED

Public Solana RPC endpoints allow, per IP, 100 requests per 10 seconds in total, 40 per 10 seconds to a single method, 40 concurrent connections and 100 MB per 30 seconds, and are 'not intended for production applications'. Devnet tokens are not real and devnet 'may be subject to ledger resets'.

- Lens: technical
- Source: [Solana docs: Clusters](https://solana.com/docs/references/clusters): "The public RPC endpoints are not intended for production applications."
- Verification (2026-10-09): held: Clusters page lists 100 requests per 10s, 40 per 10s per method, 40 concurrent connections and 100 MB per 30s per IP. It says the public endpoints are 'not intended for production applications', 'Devnet tokens are not real' and devnet 'may be subject to ledger resets'.

### F4.75 [Q27] [S18] CONFIRMED

getSignaturesForAddress returns at most 1,000 signatures per call, newest first, paged with before/until; each trade then needs a separate transaction fetch to read prices, so rebuilding a wallet's history through the public RPC costs one call per 1,000 signatures plus one per transaction.

- Lens: technical
- Source: [Solana RPC: getSignaturesForAddress](https://solana.com/docs/rpc/http/getsignaturesforaddress): "between 1 and 1,000"
- Verification (2026-10-09): held: getSignaturesForAddress docs: limit 'between 1 and 1,000', results ordered newest to oldest, with before and until params. The per-transaction fetch cost is a reasoning step the page does not state.

### F4.76 [Q27] [S18] CONFIRMED

Helius Free plan: 1M credits, 10 req/s RPC, 2 req/s DAS and Enhanced APIs, $0 a month; devnet gRPC starts with the Developer plan ($49 a month). Paid tiers are Developer $49, Business $499, Professional $999.

- Lens: technical
- Source: [Helius billing plans](https://www.helius.dev/docs/billing/plans): "Devnet gRPC starts with the Developer plan"
- Verification (2026-10-09): held: Helius plans page: Free is $0 with 1M credits, 10 RPC req/s, 2 DAS and 2 Enhanced req/s. Paid tiers are $49, $499 and $999. The page says 'Devnet is available on Developer and above' for gRPC. The exact quote string was not seen verbatim but the meaning matches.

### F4.77 [Q27] [S18] CONFIRMED

Anchor emit! writes events to program logs, which 'may be truncated by data providers'; emit_cpi! puts the event in a self-CPI instruction, is less likely to be truncated and costs extra compute, but cannot be subscribed to directly and must be read by fetching the transaction. For robust event handling Anchor points to geyser gRPC services.

- Lens: technical
- Source: [Anchor docs: Events](https://www.anchor-lang.com/docs/features/events): "program logs may be truncated by data providers in some cases"
- Verification (2026-10-09): held: Anchor events page: emit! writes to logs and providers may truncate them. emit_cpi! uses a self-CPI, is less likely to be truncated and costs extra compute. CPI events cannot be subscribed to directly and need a transaction fetch. It recommends geyser gRPC services (Triton, Helius).

### F4.78 [Q27] [S18] UNCONFIRMED

The Phoenix repository describes an on-chain orderbook that 'operates without a crank' and points to GitBook for documentation. I could not retrieve a page that defines its tick size, lots, price units or fill-event format (the GitBook returned 401), so the data source for fills is unconfirmed.

- Lens: venues
- Source: [Ellipsis-Labs/phoenix-v1 README](https://github.com/Ellipsis-Labs/phoenix-v1): "Phoenix Legacy is an on-chain orderbook that operates without a crank."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)
