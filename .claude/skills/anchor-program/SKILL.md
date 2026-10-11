---
name: anchor-program
description: Anchor 1.2.0 as used in this repo (programs/meridian). Use when building, changing or adding an instruction, account or error to the Solana program, or when anchor build fails.
---

# Anchor 1.2.0 in Meridian

Pinned: anchor-cli and anchor-lang 1.2.0, released 2026-09-04 ([release](https://github.com/solana-foundation/anchor/releases/tag/v1.2.0), [anchor-lang docs](https://docs.rs/anchor-lang/1.2.0/anchor_lang/)). Agave 4.3.0 and Rust 1.98.0 come from `scripts/toolchain/pins.sh` (P22). Every fact below was checked in this repo on 2026-10-10 or 2026-10-11 (M0 slice c).

## Build

Run in WSL, from the checkout's root (P11). The script puts the program's fixed key in place first, then builds and copies the IDL to `clients/idl/meridian.json`:

```sh
wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/program/build.sh"
npm run client   # then, on Windows: regenerate the TypeScript client
```

`scripts/program/env.sh` sends Rust's output to `~/.cache/meridian-target/<checkout>`, on WSL's disk. A clean build there takes about 2.5 minutes; in the Windows folder it takes 13 (M0.02).

## Facts that cost time

- `anchor build` passes `--arch v3` by default (platform tools v1.57), so the program is sBPFv3. The ELF's `e_flags` read 3. Devnet will require sBPFv3 for new deploys once it switches on SIMD-0500; on 2026-10-11 the switch was off (`solana feature status -u devnet --display-all`) and the sBPFv3 program deployed (M0.05).
- `anchor build` honours `CARGO_TARGET_DIR`: the `.so` and the IDL land under it.
- Building the IDL compiles the test targets too, so a test that doesn't compile fails `anchor build` with "Building IDL failed".
- `pub use config::*;` in `lib.rs` re-exports a handler named like the instruction (`initialize_config`), which clashes with what `#[program]` generates (`ambiguous_glob_reexports`). Name handlers `handle_<instruction>`, as Anchor's starter does.
- Custom errors reach a client as `Custom(6000 + n)`, where n is the variant's position (`anchor_lang::error::ERROR_CODE_OFFSET`).
- Without our program key (as in CI), `anchor build` makes a random one, warns "Program ID mismatch detected" and still builds with the address in `declare_id!`; `--ignore-keys` skips the check (seen in CI on 2026-10-11).
- Anchor builds with `target/deploy/meridian-keypair.json`. Without our key there, it makes a new one, which means a new program address. `build.sh` copies `~/.config/solana/meridian-program.json` there first.

## Verified build and deploy (D69, D125, P24)

Run in WSL with Docker Desktop's WSL integration on. The build needs no keys, so anyone can rerun it; the deploy uses the upgrade key, so an agent asks the user before every run (P14):

```sh
bash scripts/program/verified-build.sh <40-character commit>   # a pushed commit, from GitHub, in the pinned image
bash scripts/devnet/deploy-program.sh <40-character commit>    # builds, deploys that file, compares devnet's hash
```

- `solana-verify build` defaults to `--arch v0`; the script passes `--arch v3` and refuses a `.so` whose ELF `e_flags` isn't 3.
- Give it a full path. With `.` as the folder, solana-verify 0.5.2 dropped every dot from the manifest's path: "manifest path `/build//programs/meridian/Cargotoml` does not exist".
- The image is pinned by digest (`VERIFY_IMAGE` in `scripts/toolchain/pins.sh`), the same digest solana-verify 0.5.2's own table gives Agave 4.3.0 (`src/image_config.rs`). Anchor 1.x programs don't depend on `solana-program`, so a plain `solana-verify build` finds the version only in `Cargo.toml`'s `[workspace.metadata.cli] solana`. With `--base-image` the tool skips that lookup and always prints "Program Solana version: v0.0.0"; that line means nothing.
- The container compiles with its own Rust ("Using container Rust toolchain: 1.97.1"), not `rust-toolchain.toml`'s, so the hash depends on the image.
- The container writes `target/` as root; the script removes an old build through Docker.
- If every `docker` call answers "500 Internal Server Error", Docker Desktop's engine has stopped: run `docker desktop restart` on Windows.

## The upgrade-key gate (AR.03)

From `programs/meridian/src/config.rs`. The tests cover a stranger and a program with no upgrade key:

```rust
#[account(constraint = program.programdata_address()? == Some(program_data.key()) @ MeridianError::NotUpgradeAuthority)]
pub program: Program<'info, crate::program::Meridian>,
#[account(constraint = program_data.upgrade_authority_address == Some(authority.key()) @ MeridianError::NotUpgradeAuthority)]
pub program_data: Account<'info, ProgramData>,
```

Once the upgrade key is removed from a program, this check can never pass, so Config must be initialized first.
