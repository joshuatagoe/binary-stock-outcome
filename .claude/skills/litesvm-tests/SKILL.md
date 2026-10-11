---
name: litesvm-tests
description: LiteSVM 0.16.0 program tests as written in programs/meridian/tests. Use when writing or fixing a Rust test that runs the program, especially one that needs an upgrade key, a signer or a custom error.
---

# LiteSVM 0.16.0 tests in Meridian

Pinned: `litesvm` and `litesvm-loader` 0.16.0, released 2026-08-24 ([crate](https://crates.io/crates/litesvm/0.16.0)), as dev-dependencies of `programs/meridian`. They compile with anchor-lang 1.2.0: both use `solana-address` 2.x and `solana-instruction` 3.x. Checked in this repo on 2026-10-10 (M0 slice c).

## Run

```sh
wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && source scripts/program/env.sh && anchor build && cargo test -p meridian"
```

The tests load the built program with `include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/meridian.so"))`, so build first.

## A program with an upgrade key

`svm.add_program` creates the program and its ProgramData with **no** upgrade key (read in LiteSVM's source: `upgrade_authority_address: None`). `litesvm_loader::deploy_upgradeable_program` sets one, but it needs the program's own secret key, which only the laptop has. So the tests write the key into ProgramData's 45-byte header: a 4-byte tag, an 8-byte slot, then 1 byte for "some" and the 32-byte key. From `tests/initialize_config.rs`:

```rust
svm.add_program(meridian::id(), bytes).unwrap();
let address = Pubkey::find_program_address(&[meridian::id().as_ref()], &bpf_loader_upgradeable::ID).0;
let mut account = svm.get_account(&address).unwrap();
account.data[12] = 1;
account.data[13..45].copy_from_slice(upgrade_key.pubkey().as_ref());
svm.set_account(address, account).unwrap();
```

## Patterns used

- Check a custom error with `format!("{:?}", result.unwrap_err().err).contains(&format!("Custom({})", e as u32 + ERROR_CODE_OFFSET))`.
- An event shows up as a `Program data: ` line in `meta.logs`.
- `svm.expire_blockhash()` after each send gives the next transaction a fresh blockhash.
- `Config::INIT_SPACE` needs `use anchor_lang::Space` in a test file.
- `cargo test` hides a passing test's output; add `-- --nocapture` to see a `println!`, such as the account size.
