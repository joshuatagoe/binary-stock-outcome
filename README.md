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

- the commit guard's tests (<!-- count:hooks -->9<!-- /count --> tests), verify's own tests (<!-- count:verify -->46<!-- /count --> tests), the toolchain check's tests (<!-- count:toolchain -->10<!-- /count --> tests), the key export's tests (<!-- count:keys -->2<!-- /count --> tests), the smoke test's tests (<!-- count:smoke -->9<!-- /count --> tests), the backend's tests (<!-- count:backend -->29<!-- /count --> tests, Vitest), the website's unit tests (<!-- count:web -->5<!-- /count --> tests, Vitest) and its browser tests (<!-- count:web-e2e -->8<!-- /count --> tests, Playwright, after `npx playwright install chromium` once)
- a check that `rust-toolchain.toml`, `.nvmrc`, `Cargo.toml`, `Anchor.toml`, the build image and the backend's Node image agree with the pins in `scripts/toolchain/pins.sh`
- a check that every decision and finding cited in the docs exists
- a check that each skill's `.cursor` and `.claude` copies match
- a scan for committed keys and tokens
- a typecheck of each TypeScript project: the client, the devnet scripts, the backend and the website
- a check that every test count in this README matches the run
- a render of every diagram

## Build tools

The Solana program builds in WSL (Ubuntu) on Windows, or on Linux. The tools come from their official releases at the versions in [`scripts/toolchain/pins.sh`](scripts/toolchain/pins.sh), each checked against its recorded SHA-256. Solana's system packages need sudo once:

```sh
sudo apt-get update && sudo apt-get install -y build-essential pkg-config libudev-dev llvm libclang-dev protobuf-compiler libssl-dev
bash scripts/toolchain/install.sh      # Rust, Solana CLI, Anchor, Surfpool, solana-verify, Litestream, Node, flyctl
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

### On devnet

| | |
|---|---|
| Program | [`kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly`](https://explorer.solana.com/address/kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly?cluster=devnet) |
| Built from | commit [`423fa8c`](https://github.com/joshuatagoe/binary-stock-outcome/commit/423fa8c370d112e1fbc7197197825853b12e6edc) |
| The build's hash | `23a0d75100810ba9ceba22fede5653d7152336bda87c7cb7707a5bb89fcf1b46` |
| Devnet's hash on 2026-10-11 | `23a0d75100810ba9ceba22fede5653d7152336bda87c7cb7707a5bb89fcf1b46` |
| Upgrade key | `HCyLrwGeGMHAG7h8GGrUQjJf7hNjjWakqch6sTTWUVPt` |
| Config | [`Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e`](https://explorer.solana.com/address/Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e?cluster=devnet) |

To check that devnet runs this repository's code, in WSL or Linux with Docker and the pinned tools (`scripts/toolchain/install.sh`):

```sh
bash scripts/program/verified-build.sh 423fa8c370d112e1fbc7197197825853b12e6edc   # builds GitHub's copy; prints the build's hash
solana-verify get-program-hash -u devnet kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly   # prints devnet's hash
```

Matching hashes prove the code is the same, not that it is safe (D69). Whoever holds the upgrade key can replace the program, so a settled result is final only while that key is safe. The repository's owner (joshuatagoe on GitHub) holds it, in a key file on their laptop (D92). The program is deployed only from there, with `scripts/devnet/deploy-program.sh`, never from CI.

To time transactions on devnet from sending to "finalized" (D71), run `node scripts/devnet/time-sends.ts 50` in WSL. The operator key pays about 0.000005 SOL for each. On 2026-10-11 the median was 839 ms (M0.06).

The four key files (upgrade, admin, operator and program) live in WSL's `~/.config/solana`, never in the repository. To import the admin key into Phantom, or to back up a key, run this yourself in your own Ubuntu terminal. It prints only to a terminal, never into a pipe or a file:

```sh
node scripts/keys/export-key.mjs admin    # or upgrade, operator, program
```

## Backend

The backend is in [`apps/backend`](apps/backend), live at [meridian-devnet-backend.fly.dev](https://meridian-devnet-backend.fly.dev/api/health). CI deploys it from `main` once the checks pass, then runs `scripts/smoke/backend.mjs` to confirm the live commit (P26). So far it serves `GET /api/health`: its role, the build's commit, the time of its last check, the chain's progress, and whether the database answers with its migrations current (D132). Its SQLite store is the file in `DATABASE_PATH`, or `meridian.db` in the current folder, which git ignores. Settings are in [`config/devnet.json`](config/devnet.json), and every secret's name is in [`.env.example`](.env.example).

```sh
cp .env.example .env                                      # then fill in the values you have
node --env-file=.env apps/backend/src/main.ts             # serves http://localhost:8080/api/health
node --env-file=.env apps/backend/src/cli/test-alert.ts   # one test alert to Telegram (D117)
node --env-file=.env apps/backend/src/cli/test-check-in.ts  # one test check-in to Healthchecks.io (D118)
```

On Fly.io the store's backup is the volume's daily snapshot, kept 14 days (D134). The image can also run the backend under Litestream, copying the store to Cloudflare R2; that switches on when `R2_BUCKET` is set. The standby never runs Litestream (D98). The image is built from the repository's root:

```sh
docker build -f apps/backend/Dockerfile --build-arg GIT_COMMIT=$(git rev-parse HEAD) -t meridian-backend .
```

## Website

The website is in [`apps/web`](apps/web), live at [meridian-devnet-2qv.pages.dev](https://meridian-devnet-2qv.pages.dev). So far it shows the play-money banner (D33) and the live settings it reads from devnet in the browser: the 7 stocks, whether trading is paused, and the program's addresses (§7). It reads Solana directly, so it keeps working while the backend is down. CI builds it with the commit in a `<meta>` tag and deploys it to Cloudflare Pages once the checks pass on `main` (P17, P27).

```sh
npm run dev -w apps/web                  # the one dev server, http://localhost:5173
npm run test -w apps/web                 # unit tests
npx playwright install chromium          # once, for the browser tests
npm run e2e -w apps/web                  # browser tests, with devnet replaced by a recorded Config and public/_headers served
```

After each deploy, CI runs the smoke test against all three deployed parts: `scripts/smoke/program.mjs` (Config on devnet), `scripts/smoke/backend.mjs` (health at the deployed commit) and `scripts/smoke/website.mjs` (the page in a real browser, at the deployed commit, with its headers and no errors).

## Push

`npm run push` runs verify, then pushes the current branch to GitHub and GitLab. `main` is protected: changes reach it through a pull request after CI passes, and `npm run push -- --sync-main` then copies it to GitLab.
