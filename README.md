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

- the commit guard's tests (<!-- count:hooks -->9<!-- /count --> tests) and verify's own tests (<!-- count:verify -->32<!-- /count --> tests)
- a check that every decision and finding cited in the docs exists
- a check that each skill's `.cursor` and `.claude` copies match
- a scan for committed keys and tokens
- a check that every test count in this README matches the run
- a render of every diagram

`npm run push` runs verify, then pushes the current branch to GitHub and GitLab. `main` is protected: changes reach it through a pull request after CI passes, and `npm run push -- --sync-main` then copies it to GitLab.
