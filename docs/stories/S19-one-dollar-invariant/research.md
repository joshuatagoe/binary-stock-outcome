# Research: S19 Can rely on every pair being backed by exactly $1, and on outcomes never changing

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 4: Settlement and payout

### F4.56 [D1] [A4] [S15] [S17] [S19] CONFIRMED

Pyth prices are fixed-point integers with a shared exponent for price and confidence (actual value = integer x 10^exponent; example AAPL/USD exponent -5, price 12276250, conf 1500 = $122.7625 with a $0.015 interval). An exact tie is therefore an integer equality after bringing strike and price to the same exponent. The confidence interval is meant for 95% coverage, and the docs say protocols may pause activity when the interval is too wide relative to the price.

- Lens: technical
- Source: [Pyth price feeds best practices](https://docs.pyth.network/price-feeds/core/best-practices): "This interval is intended to achieve 95% coverage."
- Verification (2026-10-09): held: Pyth best-practices page: interval 'intended to achieve 95% coverage'; AAPL exponent -5, price 12276250 = $122.7625, conf 1500 = $0.015; protocols can pause new activity if the interval is too wide. The integer-equality tie point is the author's inference from the format.

### F4.57 [D2] [Q45] [S19] CONFIRMED

On the SPL Token program only the source account's owner must sign a Transfer; the destination's owner does not. So anyone holding USDC can send it into the program's vault token account, and the raw vault balance can exceed pairs x $1. A literal 'exact' equality on the raw balance cannot be guaranteed.

- Lens: technical
- Source: [Solana Program Library: Token program docs](https://www.solana-program.com/docs/token): "The owner of the source Account must be present as a signer in the `Transfer` instruction."
- Verification (2026-10-09): held: SPL Token docs: 'The owner of the source Account must be present as a signer in the Transfer instruction.' The page names only the source owner and never says the destination owner must sign. Anyone being able to deposit into the vault is an inference.

### F4.58 [D2] [Q30] [S19] SECONDARY

A mint's freeze authority can freeze token accounts so they cannot be transferred or burned. A third-party token API shows the mainnet USDC mint has a freeze authority set (decimals 6), so the issuer could freeze a USDC vault. I did not open a Circle primary document on this.

- Lens: technical
- Source: [Solana docs: Tokens](https://solana.com/docs/tokens): "preventing them from being transferred or burned"
- Source: [Jupiter token API: mainnet USDC mint](https://lite-api.jup.ag/tokens/v2/search?query=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v): "freezeAuthority: 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.59 [D2] [S19] CONFIRMED

An upgradeable Solana program can be replaced by whoever holds the upgrade authority; only 'solana program set-upgrade-authority --final' makes it immutable. So 'settlement outcome is immutable' is enforceable in program logic but is only as strong as the upgrade authority.

- Lens: technical
- Source: [Solana docs: Deploying programs](https://solana.com/docs/programs/deploying): "Once a program is immutable, it can never be updated or closed."
- Verification (2026-10-09): held: Solana deploying docs: 'Once a program is immutable, it can never be updated or closed.' The page covers the upgrade authority and 'set-upgrade-authority --final' removing it.

### F4.60 [D2] [Q30] [S19] CONFIRMED

A token account's owner or approved delegate can burn tokens by signing the Burn instruction, with no involvement from the Meridian program; a Token-2022 permanent delegate can also authorise burns.

- Lens: technical
- Source: [Solana docs: Burn tokens](https://solana.com/docs/tokens/basics/burn-tokens): "The token account owner or an approved delegate signs the transaction."
- Verification (2026-10-09): held: Burn docs: the token account owner or an approved delegate signs. They also say a permanent delegate can authorise a burn under Token Extensions, if the extension is enabled on the mint.

### F4.61 [Q30] [D2] [S19] CONFIRMED

Token-2022 has a Permissioned Burn extension: while a burn authority is set, standard Burn and BurnChecked fail and burns must be signed by both the burn authority and the account owner or delegate. The page does not say whether a PDA can be the burn authority, does not mention wallet support, and says the legacy @solana/spl-token package does not support it yet. Whether the order-book program accepts Token-2022 mints with extensions is unknown.

- Lens: technical
- Source: [Solana docs: Permissioned Burn extension](https://solana.com/docs/tokens/extensions/permissioned-burn): "signed by both the burn authority and the token account's owner or delegate"
- Verification (2026-10-09): held: Permissioned Burn page: burns must be signed by both the burn authority and the owner or delegate. Standard Burn and BurnChecked fail while the authority is set. The legacy @solana/spl-token package lacks support. The page does not mention PDAs or wallets, as the claim says.

### F4.62 [Q30] [S19] CONFIRMED

Other Token-2022 extensions bear on burning: Pausable aborts all transfers, mints and burns while paused; Non-Transferable tokens can still be burned by the owner; Permanent Delegate can burn or transfer any amount from any holder (so it hands the issuer power over holders). A frozen account fails token instructions until thawed.

- Lens: technical
- Source: [Token-2022 extensions](https://www.solana-program.com/docs/token-2022/extensions): "burn or transfer any amount of tokens"
- Source: [Solana Program Library: Token program docs](https://www.solana-program.com/docs/token): "Token instructions that include a frozen account will fail until the Account is thawed."
- Verification (2026-10-09): held: Token-2022 extensions page: Permanent Delegate can 'burn or transfer any amount of tokens'; Pausable aborts transfers, mints and burns; Non-Transferable tokens can still be burned. The SPL Token page says frozen-account instructions fail until the account is thawed.

### F4.63 [Q30] [D2] [S19] UNCONFIRMED

Design reasoning, not a sourced fact: a holder who burns their own tokens only reduces outstanding supply and gives up their own claim, so the vault stays at least as large as the amount owed. The supply-versus-counter check should therefore be written as supply <= pairs_outstanding rather than equality, and redeem must not assume yes_supply == no_supply.

- Lens: user
- Source: [Solana docs: Burn tokens](https://solana.com/docs/tokens/basics/burn-tokens): "The token account owner or an approved delegate signs the transaction."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F4.64 [A4] [S19] SECONDARY

Circle lists the Solana devnet USDC mint as 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU and states devnet tokens have no value; the page gives no decimals. Mainnet USDC decimals of 6 come only from a third-party token API. Devnet USDC decimals were not confirmed.

- Lens: technical
- Source: [Circle: USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses): "Solana Devnet | 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
- Source: [Jupiter token API: mainnet USDC mint](https://lite-api.jup.ag/tokens/v2/search?query=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v): "decimals: 6"
- Verification (2026-10-09): not rechecked (SECONDARY)

### F4.65 [A4] [D1] [S15] [S19] CONFIRMED

The Pyth Solana receiver SDK stores price as i64, conf as u64, exponent as i32 and publish_time as i64 in PriceUpdateV2. get_price_no_older_than requires VerificationLevel::Full, a matching feed_id, and publish_time + maximum_age >= the clock.

- Lens: technical
- Source: [pyth_solana_receiver_sdk price_update.rs](https://raw.githubusercontent.com/pyth-network/pyth-crosschain/main/target_chains/solana/pyth_solana_receiver_sdk/src/price_update.rs): "VerificationLevel::Full"
- Verification (2026-10-09): held: Opened price_update.rs on GitHub. Price fields are i64 price, u64 conf, i32 exponent, i64 publish_time. get_price_no_older_than uses VerificationLevel::Full, checks the feed_id, and requires publish_time + maximum_age >= the clock's unix_timestamp. The PriceFeedMessage struct is imported, so the types come from the Price struct it maps into.

### F4.66 [A4] [S19] CONFIRMED

Pyth's current docs say Pythnet is being shut down as part of the Pyth Core sunset, and the Pyth Pro payload carries price as a non-zero i64 mantissa, exponent as i16 (actual_price = mantissa x 10^exponent) and confidence as an i64. The oracle price format and field widths can therefore change with the oracle choice, so code should read the exponent from each update.

- Lens: technical
- Source: [Pyth docs: price aggregation](https://docs.pyth.network/price-feeds/core/how-pyth-works/price-aggregation): "Pythnet is being shut down as part of the Pyth Core sunset"
- Source: [Pyth Pro payload reference](https://docs.pyth.network/price-feeds/pro/payload-reference): "actual_price = mantissa x 10^exponent"
- Verification (2026-10-09): held: Price-aggregation page contains 'Pythnet is being shut down as part of the Pyth Core sunset'. Pro payload reference: price is a non-zero optional i64, exponent is i16, confidence is i64. The formula is worded 'decimal_price = price x 10^exponent' rather than 'actual_price = mantissa x ...', which is the same formula.

### F4.84 [Q45] [A4] [S19] CONFIRMED

Anchor offers account constraints token::mint, token::authority and associated_token::mint/authority to validate that a token account (such as the vault) has the expected mint and owner, and a close constraint that sends lamports to a target and resets data. The constraint reference I opened does not cover reloading an account after a CPI.

- Lens: technical
- Source: [Anchor docs: account constraints](https://www.anchor-lang.com/docs/references/account-constraints): "Create or validate token accounts with specified mint and authority."
- Verification (2026-10-09): held: Anchor account-constraints page: token::* is 'Create or validate token accounts with specified mint and authority', with token::mint and token::authority. It also lists associated_token::mint and authority, and a close constraint that sends lamports to the target and resets data. No mention of reload, as the claim says.

### F4.85 [Q45] [D2] [S19] CONFIRMED

The spec's invariant says 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate account)' and its tests require the vault balance invariant 'after every mint and redeem operation'. The spec also describes a user holding Yes + No as able to redeem them for $1.00 before settlement, so 'total pairs minted' must mean pairs outstanding for the equality to survive redemptions.

- Lens: user
- Source: [Meridian project spec (local file)](file:///C:/Users/joshu/OneDrive/Documents/Gauntlet/binary-stock-outcome/docs/spec/meridian_project.txt): "Vault balance invariant after every mint and redeem operation"
- Verification (2026-10-09): held: Local spec: line 386 'Vault balance = $1.00 x total pairs minted (exact -- fees, if any, must go to a separate...' and line 459 'Vault balance invariant after every mint and redeem operation'. Lines 189 and 314 say Yes + No can be redeemed for $1.00. The 'pairs outstanding' reading is the author's inference.

## 2026-10-09 decision review (full), group 7: Legal and compliance lens

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

## 2026-10-10 architecture check C2: Token-2022 burn authority (D67)

One read-only research agent (docs and source) plus on-chain reads by the main session. No transaction was sent.

### AR.02 [D67] [D2] [Q30] [S19] CONFIRMED (wallet handling UNCONFIRMED)

A holder of a classic SPL Token can burn their own tokens and then close the emptied account, with no involvement from the mint authority. `process_burn` checks only the owner or delegate and never reads `mint_authority`, and `process_close_account` requires only a zero balance ([token processor.rs](https://raw.githubusercontent.com/solana-program/token/main/program/src/processor.rs)).

Token-2022's Permissioned Burn extension "requires a configured burn authority to co-sign every burn for the mint". While it is set, the standard Burn and BurnChecked fail with `TokenError::InvalidInstruction`, and burns go through `PermissionedBurnInstruction::Burn` or `::BurnChecked` ([solana.com permissioned burn](https://solana.com/docs/tokens/extensions/permissioned-burn.md); [token-2022 processor.rs](https://raw.githubusercontent.com/solana-program/token-2022/main/program/src/processor.rs): "Standard burns cannot be used when the permissioned burn"). The authority is checked only for signer status and address ("if !approver_ai.is_signer()"), so a program-derived address signing through `invoke_signed` qualifies; this is a source reading, not tested on-chain. Transfers are unaffected. CloseAccount still needs a zero balance, so a holder cannot empty an account without the co-signer.

The config is `PermissionedBurnConfig { authority: MaybeNull<Address> }` ([interface source](https://raw.githubusercontent.com/solana-program/token-2022/main/interface/src/extension/permissioned_burn/mod.rs)). That makes such a mint an estimated 202 bytes, against 82 for a classic mint: rent of 0.0022968 SOL each against 0.0014616 SOL (computed; measured at M0 per D50).

Deployed: the Token-2022 program binary (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, programdata `DoU57AYuPFu2QU514RktNPG22QhApEjnKxnBcu4BHDTY`) contains `PermissionedBurnInstruction::InitializePermissionedBurn`, `::Burn` and `::BurnChecked`. That holds on devnet (last deployed 2026-09-23 22:03 UTC, slot 503153936) and on mainnet (last deployed 2026-06-17 20:57 UTC, slot 427147035), read with `getAccountInfo` on 2026-10-10. This settles the release notes' conflict: v11.0.0 says "available on all networks", v11.1.0 says "devnet and testnet".

Tooling: anchor-spl 1.2.1 has no `permissioned_burn` module ([docs.rs](https://docs.rs/anchor-spl/1.2.1/anchor_spl/token_2022_extensions/index.html)). It depends on `spl-token-2022-interface` ^2 and ^3 (crates.io). docs.rs has a `permissioned_burn` module for 3.x and none for 2.x, so the instruction builders exist in 3.x.

Option B (DefaultAccountState set to Frozen): a frozen account cannot transfer, receive or burn, but can be closed once empty. A program would thaw, transfer and re-freeze within each instruction ([default-state docs](https://solana.com/docs/tokens/extensions/default-state)).

Wallets: Phantom's Token-2022 page lists the extensions it supports and warns on Permanent Delegate. It says nothing about Permissioned Burn, Default Account State or frozen accounts ([Phantom docs](https://docs.phantom.com/developer-powertools/solana-token-extensions-token22)). No Solflare or Backpack documentation was found (UNCONFIRMED).
