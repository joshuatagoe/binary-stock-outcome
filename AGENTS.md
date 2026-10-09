# Agent harness

Read this file completely before changing the repo. Then read the sources below. Explore the code. Docs can be stale; the code and a check you ran are the evidence.

## Sources of truth

The brief is the Meridian spec in [docs/spec/](docs/spec/): `meridian_project.pdf`, with a text copy in `meridian_project.txt`. It is gitignored, so name the file path directly when you search it.

The agreed problem space will be in [docs/PROBLEM_SPACE.md](docs/PROBLEM_SPACE.md), users and UX flows in [docs/USERS.md](docs/USERS.md), and the design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Each is written in its own phase; a missing file means that phase hasn't happened. Do not create one early, even as a placeholder. Do not invent product behavior, a stack, or an architecture.

The design docs record design. Do not tick their checkboxes as status, and do not restate them in a new document.

Status lives only on the board named in [docs/status-board.md](docs/status-board.md). Do not create `IMPLEMENTATION.md` or any other kanban.

Past project lessons live in `C:\Users\joshu\.agents\workflow-reports`, not in this repo. Read the newest report for each project before architecture and before a new plan. Older reports stay. Do not rewrite them. A new report is a dated file in that folder, and the README index there is updated.

## Research agents

If you are a research agent in the decision review, read only your group's input file, `docs/spec/`, and your story folders under `docs/stories/`. Do not open `docs/DECISIONS.md` or any plan file: they hold the proposed answers, and the review is blind. Return findings to the workflow; do not write files unless your brief says you are the one writer.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED.

## Stories and research

A story file (`docs/stories/<id>/story.md`) is frozen once the story map is approved. It changes only through a logged decision, which adds a dated note under it.

`research.md` files are append-only. A finding shown wrong later gets a dated correction line below it, never an edit. One agent writes each file; no two agents write the same file.

Decisions live only in `docs/DECISIONS.md` and cite finding IDs. Story and research files hold evidence, not decisions.

## Submission logs

Required deliverables, from the spec's Technical Requirements and Deployment & Success Criteria:

- the Solana program (Rust, Anchor) on devnet: mint, order book trading, settlement, redemption, admin functions
- the frontend (TypeScript, React)
- the automation service (TypeScript, Node), in this repo
- reproducible scripts to deploy, create markets, and run the full lifecycle on devnet
- an end-to-end devnet demonstration: create, mint, trade, settle, redeem
- local tests that validate all key invariants
- a README with one-command setup (`make dev` or equivalent)
- `.env.example`, with every secret in environment variables
- a short risks and limitations note, with no regulatory or compliance claims
- documented rationale for the chain and architecture choices, trade-offs, alternatives, known limitations, and a justification for every major dependency

The mainnet deployment is a bonus, not required, and deferred. Each deliverable has a card on the status board.

When work makes a decision with a trade-off, cuts something, or corrects the AI, log it in the same commit as the work: decisions and cuts in `docs/DECISIONS.md`, AI corrections in `docs/AI_USAGE.md`. Do not rebuild these logs at the end.

## Skills

Follow the project skills. Each skill's source is `.cursor/skills/<name>/SKILL.md`, and `.claude/skills/<name>/SKILL.md` is an identical copy, because Claude Code loads skills only from `.claude/skills/`. Edit the `.cursor/` source first, then copy it. Once a `verify` script exists, it fails if the copies differ. A new skill goes in both places.

- `grill` before a card is seeded, and again before every commit. A skipped grill means no commit.
- `tdd-plan-implementer` when implementing a slice of the plan
- `parallel-delivery` when splitting that work across agents
- `frontend-engineer` when the slice has UI

## Working rules

If a routine technical choice is at least 80% certain, decide and proceed. Stop for scope, a public API, schema or data flow, auth, and spend. Stop again before every commit and run `grill` on the diff. Do not commit in that same message.

Solana, Anchor, and Rust commands run in WSL (Ubuntu), never in PowerShell.

Pushes go to both remotes this project uses, `origin` (GitHub) and `gitlab` (Gauntlet GitLab), with explicit commands, and only after the user approves.

Parallel agents share no files. The same file means one owner, in sequence. A slice with UI stays on the main checkout and uses the one dev server. A new session starts from the design docs and the board card, not from chat memory.
