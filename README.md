# Meridian

Binary stock-outcome contracts on Solana devnet, for the Gauntlet × Peak6 Meridian project.

Each market asks one question about one trading day, for example "Will META close at or above $680 today?" A **Yes** token pays $1.00 if it does and a **No** token pays $1.00 if it doesn't. Traders buy and sell both on an order book inside our own Solana program, and each market settles from Pyth's closing price after 4:00 PM New York time. It uses test USDC on devnet: play money only.

**Status:** the design is finished and the build has started, at milestone M0 (a deployed skeleton and the checks every change must pass). Nothing trades yet. [ARCHITECTURE.md §12](docs/ARCHITECTURE.md#12-build-order) lists the milestones.

## Read

- [Problem space](docs/PROBLEM_SPACE.md): the problem, the money model and the scope
- [Users and flows](docs/USERS.md): who uses it, and each flow step by step
- [Architecture](docs/ARCHITECTURE.md): the design, with diagrams, the data model, contracts and build order
- [Decisions](docs/DECISIONS.md): every decision, why it was made, and what it cost
- [AI usage](docs/AI_USAGE.md): how AI was used, and where it was corrected

## Check

Needs Node 24.21.0 (`.nvmrc`).

```sh
npm ci
npm run verify
```

`npm run verify` is the same command locally and in CI. It runs:

- the commit guard's tests (<!-- count:hooks -->9<!-- /count --> tests), verify's own tests (<!-- count:verify -->38<!-- /count --> tests) and the toolchain check's tests (<!-- count:toolchain -->6<!-- /count --> tests)
- a check that `rust-toolchain.toml` and `.nvmrc` agree with the pins in `scripts/toolchain/pins.sh`
- a check that every decision and finding cited in the docs exists
- a check that each skill's `.cursor` and `.claude` copies match
- a scan for committed keys and tokens
- a check that every test count in this README matches the run
- a render of every diagram

## Build tools

The Solana program builds in WSL (Ubuntu) on Windows, or on Linux. The tools come from their official releases at the versions in [`scripts/toolchain/pins.sh`](scripts/toolchain/pins.sh), each checked against its recorded SHA-256. Solana's system packages need sudo once:

```sh
sudo apt-get update && sudo apt-get install -y build-essential pkg-config libudev-dev llvm libclang-dev protobuf-compiler libssl-dev
bash scripts/toolchain/install.sh      # Rust, Solana CLI, Anchor, Surfpool, solana-verify, Litestream, Node
node scripts/toolchain/check.mjs       # every tool at its pin
```

On Windows, keep Rust's build output on WSL's disk (`CARGO_TARGET_DIR`): a clean build takes about 2.5 minutes there and 13 minutes in the Windows folder ([M0.02](docs/research/cross-cutting.md)).

## Program

The Solana program is in [`programs/meridian`](programs/meridian), at `kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly`. So far it has one instruction, Initialize Config (ARCHITECTURE.md §6). Build and test it in WSL, then regenerate the TypeScript client on Windows:

```sh
bash scripts/program/build.sh          # in WSL: builds and refreshes clients/idl/meridian.json
cargo test -p meridian                 # in WSL, after `source scripts/program/env.sh`: the LiteSVM tests
npm run client                         # on Windows: regenerates clients/ts from the IDL
```

## Push

`npm run push` runs verify, then pushes the current branch to GitHub and GitLab. `main` is protected: changes reach it through a pull request after CI passes, and `npm run push -- --sync-main` then copies it to GitLab.
