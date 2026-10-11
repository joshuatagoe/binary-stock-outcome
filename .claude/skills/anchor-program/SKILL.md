---
name: anchor-program
description: Anchor 1.2.0 as used in this repo (programs/meridian). Use when building, changing or adding an instruction, account or error to the Solana program, or when anchor build fails.
---

# Anchor 1.2.0 in Meridian

Pinned: anchor-cli and anchor-lang 1.2.0, released 2026-09-04 ([release](https://github.com/solana-foundation/anchor/releases/tag/v1.2.0), [anchor-lang docs](https://docs.rs/anchor-lang/1.2.0/anchor_lang/)). Agave 4.3.0 and Rust 1.98.0 come from `scripts/toolchain/pins.sh` (P22). Every fact below was checked in this repo on 2026-10-10 (M0 slice c).

## Build

Run in WSL, from the checkout's root (P11). The script puts the program's fixed key in place first, then builds and copies the IDL to `clients/idl/meridian.json`:

```sh
wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/program/build.sh"
npm run client   # then, on Windows: regenerate the TypeScript client
```

`scripts/program/env.sh` sends Rust's output to `~/.cache/meridian-target/<checkout>`, on WSL's disk. A clean build there takes about 2.5 minutes; in the Windows folder it takes 13 (M0.02).

## Facts that cost time

- `anchor build` passes `--arch v3` by default (platform tools v1.57), so the program is sBPFv3, which devnet's Agave 4.4 requires for new deploys. The ELF's `e_flags` read 3.
- `anchor build` honours `CARGO_TARGET_DIR`: the `.so` and the IDL land under it.
- Building the IDL compiles the test targets too, so a test that doesn't compile fails `anchor build` with "Building IDL failed".
- `pub use config::*;` in `lib.rs` re-exports a handler named like the instruction (`initialize_config`), which clashes with what `#[program]` generates (`ambiguous_glob_reexports`). Name handlers `handle_<instruction>`, as Anchor's starter does.
- Custom errors reach a client as `Custom(6000 + n)`, where n is the variant's position (`anchor_lang::error::ERROR_CODE_OFFSET`).
- Anchor builds with `target/deploy/meridian-keypair.json`. Without our key there, it makes a new one, which means a new program address. `build.sh` copies `~/.config/solana/meridian-program.json` there first.

## The upgrade-key gate (AR.03)

From `programs/meridian/src/config.rs`. The tests cover a stranger and a program with no upgrade key:

```rust
#[account(constraint = program.programdata_address()? == Some(program_data.key()) @ MeridianError::NotUpgradeAuthority)]
pub program: Program<'info, crate::program::Meridian>,
#[account(constraint = program_data.upgrade_authority_address == Some(authority.key()) @ MeridianError::NotUpgradeAuthority)]
pub program_data: Account<'info, ProgramData>,
```

Once the upgrade key is removed from a program, this check can never pass, so Config must be initialized first.
