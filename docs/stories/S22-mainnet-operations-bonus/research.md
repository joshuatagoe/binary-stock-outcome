# Research: S22 Runs it on mainnet with monitoring and alerts (bonus only)

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 5: Platform

### F5.14 [D19] [Q53] [S29] [S22] CONFIRMED

The getHealth RPC method returns 'ok' or a -32005 error 'Node is behind by N slots' with data.numSlotsBehind; the payload is marked UNSTABLE. A halted node would fall behind but the docs do not say how a halted cluster is reported, so a halt detector should also watch that the slot number actually advances.

- Lens: technical
- Source: [Solana RPC: getHealth](https://solana.com/docs/rpc/http/gethealth): "Node is behind by 42 slots"
- Verification (2026-10-09): held: Opened getHealth docs. Error -32005, 'Node is behind by 42 slots' example, numSlotsBehind, payload marked UNSTABLE.

### F5.63 [Q53] [S22] CONFIRMED

OWASP Logging Cheat Sheet: exclude access tokens, session IDs, passwords, connection strings, encryption keys and other primary secrets, sensitive personal data and PII (or remove, mask, hash or encrypt them); always log authorization failures, startup/shutdown, application errors and use of higher-risk functionality including break-glass accounts and key use; alert on serious events and detect when logging has stopped.

- Lens: technical
- Source: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): "Encryption keys and other primary secrets"
- Verification (2026-10-09): held: Opened OWASP Logging Cheat Sheet: exclusions list including 'Encryption keys and other primary secrets', PII; always log authz failures, start/shutdown, break-glass accounts; alerting; detect stopped logging.

### F5.64 [Q53] [S22] CONFIRMED

Healthchecks.io works as a dead man's switch: jobs ping a URL and it alerts when an expected ping does not arrive; supports /start and /fail signals, a grace time, cron schedules, and alerts via email, webhooks, SMS, Slack, PagerDuty. This covers the failure mode 'the 4:05 PM job never ran'. Free-plan limits were not found.

- Lens: user
- Source: [Healthchecks.io docs](https://healthchecks.io/docs/): "alerts you when an expected ping doesn't arrive"
- Verification (2026-10-09): held: Opened healthchecks.io docs: dead man's switch, alerts when ping does not arrive on time, /start /fail, grace time, cron schedules, integrations email/webhooks/SMS/Slack/PagerDuty. Quote paraphrased slightly.

### F5.65 [Q53] [S22] CONFIRMED

Helius webhooks notify on transactions involving monitored addresses but promise no guaranteed delivery; retries can cause duplicates; each event costs a credit; webhooks with a 95 percent failure rate are auto-disabled (24 hours on free, 7 days on paid).

- Lens: venues
- Source: [Helius webhooks](https://www.helius.dev/docs/webhooks): "disables webhooks with a failure rate of 95% or higher"
- Verification (2026-10-09): held: Opened Helius webhooks docs: retries may cause duplicates, no delivery guarantee stated, 1 credit per event, auto-disable at >=95% failure over 24h (free) or 7 days (paid). Wording is '>= 95%' rather than the quoted phrase.

### F5.66 [Q53] [S22] CONFIRMED

Anchor events: emit!() writes base64 'Program data' via sol_log_data and the docs warn 'Ensure the RPC provider you use does not truncate the program logs'; emit_cpi!() puts event data in a self-CPI's instruction data (needs the event-cpi feature, #[event_cpi], extra compute) and cannot be subscribed to directly: fetch the transaction and decode inner instructions.

- Lens: technical
- Source: [Anchor: Events](https://www.anchor-lang.com/docs/features/events): "Ensure the RPC provider you use does not truncate the program logs from the transaction data."
- Verification (2026-10-09): held: Opened Anchor events docs: emit! uses sol_log_data base64 Program Data; truncation warning exact; emit_cpi! needs event-cpi feature and #[event_cpi], extra compute, cannot be subscribed directly, decode inner instructions from fetched transaction.

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

### F7.04 [D3] [Q49] [S2] [S19] [S22] CONFIRMED

CFTC order (Sept 2022) against Blockratize/Polymarket: off-exchange event-based binary options on blockchain smart contracts were treated as swaps needing DCM or SEF registration; $1.4M penalty; the CFTC said DeFi and technology are no exemption. The case involved a real-money platform.

- Lens: legal
- Source: [CFTC Orders Event-Based Binary Options Markets Operator to Pay $1.4 Million Penalty](https://www.cftc.gov/PressRoom/PressReleases/8478-22): "All derivatives markets must operate within the bounds of the law regardless of the technology used."
- Verification (2026-10-09): held: Opened CFTC release 8478-22. Event contracts are swaps, charged for failing DCM/SEF registration, $1.4M penalty, smart contracts on blockchain, McGonagle quote 'regardless of the technology used', DeFi referenced. I did not verify the 'Sept 2022' date text, but the release number matches.

### F7.06 [D3] [Q49] [S2] [S19] [S22] CONFIRMED

FinCEN's regulation defines money transmission as accepting currency, funds or other value that substitutes for currency from one person and transmitting it. The money transmitter definition therefore turns on accepting and transmitting value. A non-custodial program where the operator never receives user funds is the architecture point most relevant to 'no custody'.

- Lens: legal
- Source: [31 CFR 1010.100 - General definitions](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-31?part=1010&section=1010.100): "the acceptance of currency, funds, or other value that substitutes for currency from one person and the transmission of currency, funds, or other value that substitutes for currency"
- Verification (2026-10-09): held: Opened eCFR 31 CFR 1010.100. Money transmission defined as acceptance of currency, funds, or other value that substitutes for currency from one person and transmission to another location or person. The 'no custody' point is the author's inference, flagged as such.

### F7.07 [D3] [Q49] [S2] [S19] [S22] SECONDARY

Search-summary description of FinCEN's 2019 CVC guidance (FIN-2019-G001): users who obtain virtual currency for their own use are not money transmitters; providers of unhosted wallets generally are not MSBs; commentary says DApp owner-operators that accept and transmit value may be treated like kiosk operators. The guidance PDF could not be parsed by my tools, so I did not read the text myself.

- Lens: legal
- Source: [FinCEN FIN-2019-G001 (landing page; PDF not readable)](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models): "Application of FinCEN's Regulations to Certain Business Models Involving Convertible Virtual Currencies (FIN-2019-G001, May 9, 2019)"
- Source: [Stanford RegTrax entry on FIN-2019-G001 (search result)](https://regtrax.law.stanford.edu/usa/fin-2019-g001-application-of-fincens-regulations-to-certain-business-models-involving-convertible-virtual-currencies): "Because the accountholder in an unhosted CVC wallet retains independent control over the value associated with the account, providers of these wallets generally will not be considered MSBs."
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.09 [Q46] [Q47] [Q49] [S4] [S16] [S28] [S22] CONFIRMED

The CFTC's March 2026 ANPRM on prediction markets (published 16 March 2026, RIN 3038-AF65) asks: Q2.e how position limits across similar event contracts should be aggregated and whether event contracts need different limits; Q2.b what dispute-resolution rules should apply to how an event contract is resolved; Q30-31 about manipulation; Q2.h about blockchain-based prediction markets. It proposes no rules. The CFTC also withdrew its 2024 event contracts proposal on 4 Feb 2026.

- Lens: legal
- Source: [CFTC ANPRM: Prediction Markets (2026-05105)](https://www.cftc.gov/LawRegulation/FederalRegister/proposedrules/2026-05105.html): "how position limits across similar event contracts should be aggregated"
- Source: [CFTC Seeks Public Comment on ANPRM Relating to Prediction Markets](https://www.cftc.gov/PressRoom/PressReleases/9194-26): "This begins the process of new rulemaking grounded in a rational and coherent interpretation of the Commodity Exchange Act."
- Source: [CFTC withdraws Event Contracts proposal](https://www.cftc.gov/PressRoom/PressReleases/9179-26): "does not intend to issue final rules with respect to the proposal"
- Verification (2026-10-09): held: Opened ANPRM 2026-05105: RIN 3038-AF65, published 16 March 2026, Q2.e aggregation quote present, Q2.b disputes over resolution, Q30-31 manipulation, Q2.h blockchain-based; no rules proposed. Release 9194-26 has the quoted sentence (release dated 12 March). Release 9179-26 is dated 4 Feb 2026 and withdraws the June 2024 Event Contracts proposal; actual wording is 'The CFTC does not intend to issue final rules with respect to the proposal'.

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

### F7.19 [Q49] [S22] CONFIRMED

The CFTC and SEC issued a joint request for comment on 18 June 2026 on definitions of swaps and security-based swaps, mixed swaps, novel products, and alternative compliance. Atkins: 'Clarification is long overdue on Title VII definitional issues, including event-based products.' A search result says the comment deadline was 24 Aug 2026, with commenters split (secondary). No resolution of single-stock event contracts was found.

- Lens: legal
- Source: [CFTC, SEC Seek Public Comment to Further Clarify and Harmonize Derivatives Product Definitions](https://www.cftc.gov/PressRoom/PressReleases/9258-26): "Clarification is long overdue on Title VII definitional issues, including event-based products."
- Verification (2026-10-09): held: Opened CFTC release 9258-26. Dated 18 June 2026, joint CFTC/SEC request on swap and security-based swap definitions, mixed swaps, novel products, alternative compliance; Atkins quote exact. Page gives no explicit deadline (60 days from FR publication, ~23-24 Aug); the 24 Aug date and split commenters are correctly flagged as secondary.

### F7.20 [Q49] [S22] SECONDARY

Law-firm commentary says a swap based on a single security or single-issuer event falls within the security-based swap definition under SEC jurisdiction; security-based swaps outside an exchange are limited to eligible contract participants and 'cannot be offered to retail investors'; security options are excluded from the swap definitions and regulated by the SEC; Nasdaq has proposed listing binary 'Outcome-Related Options'; the CFTC ANPRM acknowledged some event contracts may fall under SEC jurisdiction. These are secondary summaries; the statutes and filings were not opened.

- Lens: legal
- Source: [Cleary Gottlieb: Prediction Markets for Those Who Don't Predict (and Those Who Do)](https://www.clearygottlieb.com/news-and-insights/publication-listing/prediction-markets-for-those-who-dont-predict-and-those-who-do): "cannot be offered to retail investors"
- Source: [Bradley: Is the SEC entering the fight over prediction market oversight?](https://www.bradley.com/insights/publications/2026/06/is-the-sec-entering-fight-over-prediction-market-oversight): "falls within the definition of a security-based swap subject to SEC jurisdiction"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F7.21 [Q49] [S22] CONFIRMED

CFTC DMO advisory (28 Aug 2025) reaffirmed that non-US platforms wanting to give people physically in the US direct access should use existing registration categories (FBOT or DCM), and applies to digital asset markets.

- Lens: legal
- Source: [CFTC press release on FBOT registration framework advisory](https://www.cftc.gov/PressRoom/PressReleases/9111-25): "the CFTC's existing registration categories are the simplest and fastest solution"
- Verification (2026-10-09): held: Opened CFTC release 9111-25, dated 28 Aug 2025, DMO advisory on FBOT framework for non-US exchanges giving direct access to people in the US, covers digital assets. Actual quote begins 'the CFTC's existing registration categories...'; the claim's quote omits 'the CFTC's' (trivial). The page frames FBOT vs DCM; claim's gloss is accurate.

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

### F7.24 [Q49] [S22] CONFIRMED

Operational cost: the only published equities tier on Pyth's plans is Pro from $2,500/month. A mainnet deployment with production oracle feeds for equities would carry this or a comparable data cost, subject to what the on-chain Pyth Core feeds cover (not confirmed for these tickers).

- Lens: legal
- Source: [Pyth plans](https://app.pyth.com/plans): "Pro (starting at $2,500/month)"
- Verification (2026-10-09): held: Opened app.pyth.com/plans: Pro 'starting at $2,500/month' and is the only tier listing equities. The on-chain Core coverage caveat is stated in the claim as unconfirmed; the cost inference is the author's.

### F7.30 [D3] [Q49] [S2] [S19] [S22] CONFIRMED

The spec itself says 'Never use mainnet or real funds for the core submission' and asks for 'a short risks/limitations note (no regulatory or compliance claims)'; the mainnet deployment is a bonus 'not required to pass'.

- Lens: legal
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Include a short risks/limitations note (no regulatory or compliance claims)"
- Verification (2026-10-09): held: Opened the local spec file via grep. Line 87 'Never use mainnet or real funds for the core submission', line 91 'Include a short risks/limitations note (no regulatory or compliance claims)', line 516 'This is not required to pass but demonstrates production readiness' for the mainnet bonus.

### F7.31 [Q49] [Q51] [S22] [S25] CONFIRMED

OFAC published 'Sanctions Compliance Guidance for the Virtual Currency Industry' (Oct 2021) and updated FAQs 559 and 646. The announcement exists; I could not read the brochure PDF, so I make no claim about what it says on geolocation, wallet screening or strict liability.

- Lens: legal
- Source: [OFAC Recent Actions 15 Oct 2021](https://ofac.treasury.gov/recent-actions/20211015): "highlights sanctions compliance best practices tailored for the virtual currency industry"
- Verification (2026-10-09): held: Opened OFAC recent actions 15 Oct 2021 (primary). Announces Sanctions Compliance Guidance for the Virtual Currency Industry, updated FAQs 559 and 646, 'highlights sanctions compliance best practices tailored for the virtual currency industry'.
