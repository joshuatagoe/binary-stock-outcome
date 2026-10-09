# Research: S2 Connects a wallet and sees the USDC balance

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 1: Onboarding

### F1.31 [Q54] [S2] CONFIRMED

Sign In With Solana replaces connect-plus-signMessage with one signIn request; the wallet builds a message with domain and address, the backend checks it with verifySignIn, and optional nonce, issuedAt (within 10 minutes), expiration and requestId fields limit replay. The repo says it is currently supported only on the Phantom extension, version 23.11.0 or later.

- Lens: technical
- Source: [Sign In With Solana (Phantom)](https://github.com/phantom/sign-in-with-solana): "currently supported only on the Phantom extension"
- Verification (2026-10-09): held: Opened phantom/sign-in-with-solana repo. Says SIWS 'only supported on Phantom extension (version >=23.11.0)' (wording differs slightly from quote); verifySignIn, optional nonce, issuedAt within +-10 minutes, expirationTime, requestId all present.

### F1.32 [Q54] [S2] CONFIRMED

A Phantom discussion shows SIWS sign-in failing with Ledger hardware wallets; a maintainer said in January 2024 it needs work with no ETA, and no fix is posted (the thread is old, so current status is unknown).

- Lens: user
- Source: [SIWS with Phantom Ledger Sign #139](https://github.com/orgs/phantom/discussions/139): "some work to do"
- Verification (2026-10-09): held: Opened Phantom discussion 139. Maintainer in January 2024: 'We have some work to do in order to support SIWS and Ledger. But I don't have an ETA'; no fix posted.

### F1.33 [Q54] [S2] CONFIRMED

Anchor's constraint reference: #[account(signer)] checks the account signed; has_one checks a stored field matches the passed account's key; constraint = expr is a custom check.

- Lens: technical
- Source: [Anchor account constraints](https://www.anchor-lang.com/docs/references/account-constraints): "Checks the given account signed the transaction."
- Verification (2026-10-09): held: Opened Anchor account constraints reference. signer: 'Checks the given account signed the transaction.'; has_one checks stored field matches key; constraint = expr is a custom check.

### F1.34 [Q54] [S2] CONFIRMED

Solana's program-security course says has_one only compares keys and does not verify the authority account signed; use Anchor's Signer type or the signer constraint.

- Lens: technical
- Source: [Signer authorization - Solana program security course](https://github.com/solana-foundation/developer-content/blob/main/content/courses/program-security/signer-auth.md): "there is no verification that the `authority` account actually authorized the transaction"
- Verification (2026-10-09): held: Opened Solana Foundation program-security signer-auth lesson. 'there is no verification that the authority account actually authorized the transaction'; has_one only compares keys; fix via Signer type or signer constraint.

### F1.35 [Q54] [S2] CONFIRMED

Squads Protocol v4 (multisig on Solana, deployed on devnet) lists time locks, spending limits and roles, has independent audits (OtterSec, Neodyme, Certora, Trail of Bits), and warns that a compromised config authority can change thresholds and members and that long time locks can lock funds. Squads' own docs home describes use for admin keys and upgrade authorities.

- Lens: technical
- Source: [Squads Protocol v4](https://github.com/Squads-Protocol/v4): "If the config_authority of a multisig is compromised, an attacker can change multisig settings"
- Verification (2026-10-09): held: Opened Squads v4 README. config_authority compromise warning, time locks, spending limits, roles, audits by OtterSec, Neodyme, Certora, Trail of Bits, devnet deployment, long time locks can block funds. The Squads docs-home sentence about admin keys/upgrade authorities was not opened.

### F1.36 [Q54] [S2] CONFIRMED

Next.js's authentication guide says UI restrictions alone are not sufficient, checks belong close to the data source, and Proxy should only do optimistic checks and 'should not be your only line of defense'.

- Lens: technical
- Source: [How to implement authentication in Next.js](https://nextjs.org/docs/app/guides/authentication): "client-side UI restrictions alone are not sufficient for security"
- Verification (2026-10-09): held: Opened Next.js authentication guide. Contains 'client-side UI restrictions alone are not sufficient for security', checks close to data source, and Proxy 'should not be your only line of defense' with optimistic-checks-only guidance.

### F1.37 [Q54] [S2] CONFIRMED

Solana wallet-adapter discovers wallets that implement the Wallet Standard or Mobile Wallet Adapter automatically and exposes publicKey and sendTransaction through hooks; the quick-start does not cover signIn or signMessage.

- Lens: technical
- Source: [Wallet Adapter app setup](https://github.com/anza-xyz/wallet-adapter/blob/master/APP.md): "Wallets that implement either of these standards will be available automatically."
- Verification (2026-10-09): held: Opened wallet-adapter APP.md. 'Wallets that implement either of these standards will be available automatically'; useWallet gives publicKey and sendTransaction; no signIn or signMessage mention.

### F1.39 [Q40] [Q52] [D10] [S1] [S3] [S2] CONFIRMED

Gaps in the spec's own text: the five-page list has no admin or market-maker page though the contract has Add Strike, Pause and Admin Settle and a market-maker dashboard story; the countdown is to 4:00 PM while settlement is about 4:05 PM; tokens 'can only be destroyed via the redeem function' yet Sell No says Yes+No is redeemable for $1.00 before settlement; the Buy No limit order leaves the user holding both tokens, which the position constraint otherwise forbids; the payoff sentence is given only for Yes; and the spec requires a risks and limitations note with no page for it.

- Lens: user
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Tokens can only be destroyed via the redeem function"
- Verification (2026-10-09): held: Read the local spec. Verified: five pages (Landing, Markets, Trade, Portfolio, History) with no admin page; Add Strike/Pause/Admin Settle exist; countdown to 4:00 PM vs settlement ~4:05 PM; 'Tokens can only be destroyed via the redeem function' vs Sell No holding Yes+No redeemable for $1.00; payoff sentence only for Yes; risks/limitations note required (line 91) with no page. The market-maker dashboard story and the Buy No limit-order detail were not individually checked.

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

### F7.04 [D3] [Q49] [S2] [S19] [S22] CONFIRMED

CFTC order (Sept 2022) against Blockratize/Polymarket: off-exchange event-based binary options on blockchain smart contracts were treated as swaps needing DCM or SEF registration; $1.4M penalty; the CFTC said DeFi and technology are no exemption. The case involved a real-money platform.

- Lens: legal
- Source: [CFTC Orders Event-Based Binary Options Markets Operator to Pay $1.4 Million Penalty](https://www.cftc.gov/PressRoom/PressReleases/8478-22): "All derivatives markets must operate within the bounds of the law regardless of the technology used."
- Verification (2026-10-09): held: Opened CFTC release 8478-22. Event contracts are swaps, charged for failing DCM/SEF registration, $1.4M penalty, smart contracts on blockchain, McGonagle quote 'regardless of the technology used', DeFi referenced. I did not verify the 'Sept 2022' date text, but the release number matches.

### F7.05 [D3] [S2] [S19] CONFIRMED

The federal UIGEA definition of 'bet or wager' (31 U.S.C. 5362) is 'the staking or risking by any person of something of value'. The statute excludes securities activity, transactions on registered commodity exchanges, over-the-counter derivative instruments, and games in which players risk nothing of value beyond effort or internet access. This supports reading the no-value token design as outside the 'something of value' trigger, but it is one federal definition; state gambling laws and other regimes were not reviewed.

- Lens: legal
- Source: [31 U.S. Code 5362 - Definitions](https://www.law.cornell.edu/uscode/text/31/5362): "the staking or risking by any person of something of value upon the outcome of a contest of others"
- Verification (2026-10-09): held: Opened Cornell LII 31 USC 5362. Definition quote present; exclusions for securities laws activity, registered entity transactions, OTC derivatives, and games risking only effort/internet access/sponsor points all present. Cornell is a reproduction of the statute; text is the primary law.

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

### F7.30 [D3] [Q49] [S2] [S19] [S22] CONFIRMED

The spec itself says 'Never use mainnet or real funds for the core submission' and asks for 'a short risks/limitations note (no regulatory or compliance claims)'; the mainnet deployment is a bonus 'not required to pass'.

- Lens: legal
- Source: [Meridian spec (local file)](C:\Users\joshu\OneDrive\Documents\Gauntlet\binary-stock-outcome\docs\spec\meridian_project.txt): "Include a short risks/limitations note (no regulatory or compliance claims)"
- Verification (2026-10-09): held: Opened the local spec file via grep. Line 87 'Never use mainnet or real funds for the core submission', line 91 'Include a short risks/limitations note (no regulatory or compliance claims)', line 516 'This is not required to pass but demonstrates production readiness' for the mainnet bonus.
