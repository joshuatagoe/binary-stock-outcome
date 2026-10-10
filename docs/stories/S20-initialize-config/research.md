# Research: S20 Sets up the tickers, oracle feeds and admin authority once

Append-only. A finding later shown wrong gets a dated correction line below it, never an edit.

## 2026-10-09 decision review (full), group 5: Platform

### F5.01 [D17] [S20] CONFIRMED

The twelve-factor method stores config in environment variables because they live outside the codebase and are unlikely to be checked in; config files kept out of version control are weaker because it is easy to check one in by mistake.

- Lens: technical
- Source: [The Twelve-Factor App: Config](https://12factor.net/config): "The twelve-factor app stores config in environment variables."
- Verification (2026-10-09): held: Opened 12factor.net/config. Says config is stored in environment variables; little chance of being checked in accidentally; config files outside VCS easy to check in by mistake.

### F5.02 [D17] [S20] CONFIRMED

OWASP warns that environment variables are broadly exposed (all processes, logs, system dumps) and advises them only when other injection methods are not possible; prefers mounted secret files or a secret store; recommends rotation, least privilege and different secrets per environment.

- Lens: technical
- Source: [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): "environment variables are generally accessible to all processes and may be included in logs or system dumps."
- Verification (2026-10-09): held: Opened OWASP Secrets Cheat Sheet. Env vars 'generally accessible to all processes and may be included in logs or system dumps'; 'not recommended unless other methods are not possible'; rotation, least privilege, per-environment secrets all present.

### F5.03 [D17] [S20] CONFIRMED

Anza's CLI documentation calls file-system keypairs the least secure way to hold SOL: the file holds an unencrypted keypair and a password only protects the seed phrase, not the file.

- Lens: venues
- Source: [Anza CLI: File System Wallet](https://docs.anza.xyz/cli/wallets/file-system): "File system wallets are the least secure method of storing SOL tokens."
- Verification (2026-10-09): held: Opened Anza file-system wallet page. 'least secure method of storing SOL tokens'; file holds unencrypted keypair; password applies to seed phrase, not file.

### F5.04 [D17] [D23] [Q26] [Q53] [S20] CONFIRMED

Since the Pyth Core upgrade on 26 Aug 2026 every Hermes user needs a Pyth API key (free trial, paid plans after), sent as a Bearer token to pyth.dourolabs.app/hermes or as an authorization header on hermes.pyth.network; requests without a key fail. So the 'oracle API key' in D17 is a real, mandatory secret.

- Lens: technical
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "Every Hermes user now needs a Pyth API Key ... Requests without a key fail with authentication errors."
- Source: [Pyth pull integration on Solana](https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana): "Hermes now requires an API key."
- Verification (2026-10-09): held: Opened Pyth upgrade/preparing: all Hermes users need an API key, upgrade 26 Aug 2026, Bearer header, pyth.dourolabs.app/hermes, calls without key fail with auth errors, free trial plus paid plans. Solana pull-integration page says Hermes requires an API key. Quote wording slightly different but substance matches.

### F5.05 [D17] [Q53] [S20] CONFIRMED

GitHub secret scanning scans full git history and, when a secret is found, the advice is to rotate the credential immediately; removing it from history is slow and often unnecessary once it is revoked. This shapes the operator runbook for a leaked key.

- Lens: user
- Source: [About secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning): "Rotate the affected credential immediately to prevent unauthorized access."
- Verification (2026-10-09): held: Opened GitHub about-secret-scanning. Scans entire git history all branches; rotate credential immediately; history removal 'time-intensive and often unnecessary if you've already revoked'.

### F5.06 [D17] [Q25] [S20] CONFIRMED

Squads documentation lists program upgrade authorities and admin keys among the on-chain assets a multisig can manage, so the admin key can be a multisig rather than a file on a server.

- Lens: venues
- Source: [Squads documentation](https://docs.squads.so/main): "Program upgrade authorities (as one of several onchain assets, alongside treasuries, admin keys, tokens, and validators)"
- Verification (2026-10-09): held: Opened docs.squads.so/main. Lists treasury, program upgrade authorities, admin keys, tokens, validators as onchain assets.

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

### F5.30 [D23] [D24] [D27] [S20] [S21] CONFIRMED

OpenBook v2's Market account separates roles: collect_fee_admin (required), open_orders_admin ('must sign off on all order creations', optional), consume_events_admin (optional), close_market_admin ('can set market expired, prune orders and close the market', optional), and a market_authority PDA for vault signing; oracle_a/oracle_b optional; time_expiry: 'Market will expire and no trading allowed after time_expiry'.

- Lens: venues
- Source: [OpenBook v2 market.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/state/market.rs): "Admin who can set market expired, prune orders and close the market"
- Source: [OpenBook v2 create_market.rs](https://raw.githubusercontent.com/openbook-dex/openbook-v2/master/programs/openbook-v2/src/instructions/create_market.rs): "open_orders_admin, consume_events_admin, close_market_admin: Optional."
- Verification (2026-10-09): held: Opened OpenBook v2 market.rs: collect_fee_admin, optional open_orders_admin, consume_events_admin, close_market_admin (expire, prune, close), market_authority PDA, optional oracle_a/b, time_expiry. create_market.rs does not contain the literal 'Optional.' text but code uses non_zero_key() making them optional; quote slightly off.

### F5.32 [D24] [S20] [S21] CONFIRMED

Solana token docs: the mint authority is optional and is the only party who can mint; with no mint authority the supply is fixed; the freeze authority is optional and can freeze token accounts.

- Lens: technical
- Source: [Solana: Create a token mint](https://solana.com/docs/tokens/basics/create-mint): "If no mint authority is present then the mint has a fixed supply and no further tokens may be minted."
- Verification (2026-10-09): held: Opened Solana create-mint docs: exact quote on fixed supply present; freeze authority optional and can freeze token accounts.

### F5.33 [D24] [S20] CONFIRMED

Anchor's mint creation example uses a PDA as mint::authority (and freeze_authority), noting that a PDA authority lets the program sign CPI instructions to mint; this is the standard way to make 'tokens can only be created via mint pair' true.

- Lens: technical
- Source: [Anchor: Create a token mint](https://www.anchor-lang.com/docs/tokens/basics/create-mint): "mint::authority = mint.key()"
- Verification (2026-10-09): held: Opened Anchor create-mint docs: mint::authority = mint.key(), freeze_authority same, PDA authority lets program sign CPI to mint. 'Standard way' framing is the author's gloss.

### F5.34 [D24] [S20] [S21] CONFIRMED

Gnosis ConditionalTokens (the design under Polymarket's outcome tokens) lets anyone call prepareCondition, but the oracle address is part of the condition ID so only that oracle can report payouts; a second report is blocked ('payout denominator already set'); mergePositions and redeemPositions only act on the caller's own balances.

- Lens: venues
- Source: [Gnosis ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "require(payoutDenominator[conditionId] == 0, "payout denominator already set");"
- Verification (2026-10-09): held: Opened ConditionalTokens.sol: prepareCondition has no caller restriction in listed requires; reportPayouts has 'payout denominator already set'; merge/redeem transfer to msg.sender. Oracle-in-conditionId is not visible in fetched excerpt but is consistent with the code.

### F5.37 [D17] [D23] [Q26] [S20] UNCONFIRMED

Inference: because Hermes needs a key, a browser that calls Hermes directly would ship the key in its bundle; so either the always-on service proxies prices to the site (then the site is no longer fully independent of the backend) or the key is treated as public and rate-limited. Not stated in any source; derived from the key requirement.

- Lens: technical
- Source: [Pyth Core upgrade: preparing](https://docs.pyth.network/price-feeds/core/upgrade/preparing): "Requests without a key fail with authentication errors."
- Verification (2026-10-09): not rechecked (UNCONFIRMED)

### F5.38 [D27] [D24] [S20] CONFIRMED

Venue practice for the pair lifecycle: Gnosis CTF has split (mint), merge (burn a full set for collateral at any time) and redeem; Polymarket's docs describe split, merge and redeem converting pUSD to and from YES/NO pairs. A merge-type function is the standard way to close a hold-both position before resolution.

- Lens: venues
- Source: [Polymarket CTF overview](https://docs.polymarket.com/developers/CTF/overview): "Merge: Converts a YES and NO pair back into pUSD."
- Source: [Gnosis ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "function mergePositions(IERC20 collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] calldata partition, uint amount) external"
- Verification (2026-10-09): held: Opened Polymarket CTF overview (split/merge/redeem; exact wording 'Convert a YES and NO token pair back into pUSD') and Gnosis mergePositions signature matches.

### F5.39 [D27] [Q44] [S20] [S21] CONFIRMED

In the Gnosis ConditionalTokens code opened, none of the listed require checks on mergePositions or redeemPositions involve a pause flag; redeem requires only that a payout has been reported. Excerpt-based, so contracts elsewhere in the repo were not audited.

- Lens: venues
- Source: [Gnosis ConditionalTokens.sol](https://raw.githubusercontent.com/gnosis/conditional-tokens-contracts/master/contracts/ConditionalTokens.sol): "require(den > 0, "result for condition not received yet");"
- Verification (2026-10-09): held: Opened ConditionalTokens.sol: merge and redeem requires have no pause flag; redeem requires den > 0 ('result for condition not received yet'). ERC1155 base not included, as claim already caveats.

### F5.40 [D27] [S20] CONFIRMED

Anchor's close constraint closes an account by sending its lamports to a target and resetting its data, which is the mechanism for rent reclaim in a close_market instruction; the spec's 'redeemable indefinitely' rule means the vault and mints cannot be closed while tokens are outstanding.

- Lens: technical
- Source: [Anchor account constraints](https://www.anchor-lang.com/docs/references/account-constraints): "Closes the account by sending lamports to target and resetting data."
- Verification (2026-10-09): held: Opened Anchor account-constraints: 'Closes the account by sending lamports to target and resetting data.' The vault-can't-close inference is the author's.

### F5.41 [D27] [S20] CONFIRMED

The spec's Sell No path says the user ends up 'holding both Yes + No = $1.00 worth of redeemable USDC, ... or the system handles the close automatically', and the invariants say 'Tokens can only be destroyed via the redeem function'. A pre-settlement pair-burn is implied by the first and contradicted by the second, so it needs either a new merge function or a reworded invariant.

- Lens: user
- Source: [Meridian project spec (local)](docs/spec/meridian_project.txt): "Tokens can only be destroyed via the redeem function"
- Verification (2026-10-09): held: Read local spec: line 188-190 Sell No holds Yes+No = $1.00; line 314-316 'or the system handles the close automatically'; line 391 'Tokens can only be destroyed via the redeem function'. Contradiction reading is analysis.

## 2026-10-10 architecture check C3: Initialize Config gate (D24)

One read-only research agent. No transaction was sent.

### AR.03 [D24] [S20] CONFIRMED (Anchor 1.1.2 docs; no 1.2.1 page found)

Anchor documents how to restrict an instruction to the program's upgrade authority:

- `#[account(constraint = program.programdata_address()? == Some(program_data.key()))] pub program: Program<'info, MyProgram>`
- `#[account(constraint = program_data.upgrade_authority_address == Some(authority.key()))] pub program_data: Account<'info, ProgramData>`
- `pub authority: Signer<'info>`

The example is marked "This example is not tested" ([anchor-lang 1.1.2 Program](https://docs.rs/anchor-lang/1.1.2/anchor_lang/accounts/program/struct.Program.html)). `programdata_address()` returns None unless the upgradeable loader owns the program ([program.rs](https://raw.githubusercontent.com/solana-foundation/anchor/master/lang/src/accounts/program.rs)). The 1.0.0 release notes mention no change to it.

Gotchas:

- Once the upgrade authority is removed, the check can never pass, so the config must be initialized first.
- A loader-v4 deployment returns None.
- LiteSVM's plain `add_program` may not create a ProgramData account; the docs point to the `litesvm-loader` crate for "upgrade authority behavior" (SECONDARY, from a search summary; to check at M0).
