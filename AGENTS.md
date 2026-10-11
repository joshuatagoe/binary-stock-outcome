# Agent harness

Read this file completely before changing the repo. Then read the sources below. Explore the code. Docs can be stale; the code and a check you ran are the evidence.

## Sources of truth

The brief is the Meridian spec in [docs/spec/](docs/spec/): `meridian_project.pdf`, with a text copy in `meridian_project.txt`. It is gitignored, so name the file path directly when you search it.

The agreed problem space will be in [docs/PROBLEM_SPACE.md](docs/PROBLEM_SPACE.md), users and UX flows in [docs/USERS.md](docs/USERS.md), and the design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Each is written in its own phase; a missing file means that phase hasn't happened. Do not create one early, even as a placeholder. Do not invent product behavior, a stack, or an architecture.

The design docs record design. Do not tick their checkboxes as status, and do not restate them in a new document.

Status lives only on the board named in [docs/status-board.md](docs/status-board.md). Do not create `IMPLEMENTATION.md` or any other kanban.

Past project lessons live in `C:\Users\joshu\.agents\workflow-reports`, not in this repo. Read the newest report for each project before architecture and before a new plan. Older reports stay. Do not rewrite them. A new report is a dated file in that folder, and the README index there is updated.

## Research agents

If you are a research agent in the decision review, read only your group's input file, `docs/spec/`, and your story folders under `docs/stories/`. Do not open `docs/DECISIONS.md`, `docs/planning/`, or any other plan file: they hold the proposed answers, and the review is blind. Return findings to the workflow; do not write files unless your brief says you are the one writer.

Every claim carries a label and a link: CONFIRMED (primary source opened), SECONDARY, or UNCONFIRMED.

## Stories and research

A story file (`docs/stories/<id>/story.md`) is frozen once the story map is approved. It changes only through a logged decision, which adds a dated note under it.

`research.md` files are append-only. A finding shown wrong later gets a dated correction line below it, never an edit. One agent writes each file; no two agents write the same file.

Decisions live only in `docs/DECISIONS.md` and cite finding IDs. Story and research files hold evidence, not decisions.

The decision review runs in three steps, each started only with the user's OK because each spends money: (1) the `decision-review` workflow with `{date, label, groups}` runs the research and the source checks; (2) `node scripts/save-review.mjs <that run's transcript dir> '<the same args>'` lists the files, and the same command with `--write` saves them exactly from the run's journal (no agent copies them); (3) the workflow again with the same args plus `stage: "judge"` runs the judges and the cross-group check.

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

Follow the project skills. Each skill's source is `.cursor/skills/<name>/SKILL.md`, and `.claude/skills/<name>/SKILL.md` is an identical copy, because Claude Code loads skills only from `.claude/skills/`. Edit the `.cursor/` source first, then copy it. `npm run verify` fails if the copies differ. A new skill goes in both places.

- `grill` before a card is seeded, and again before every commit. A skipped grill means no commit.
- `tdd-plan-implementer` when implementing a slice of the plan
- `parallel-delivery` when splitting that work across agents
- `frontend-engineer` when the slice has UI
- Library reference skills, each written from commands that ran (P3): `anchor-program` for the program, `litesvm-tests` for its tests, and `codama-client` for the TypeScript client

## Working rules

If a routine technical choice is at least 80% certain, decide and proceed. Stop for scope, a public API, schema or data flow, auth, and spend. Stop again before every commit and run `grill` on the diff. Do not commit in that same message.

**Where things run (P11).**
- The working copy is `C:\dev\binary-stock-outcome`. The old copy under OneDrive is stale; don't open it.
- On Windows: Claude Code, git, npm and Node, which covers the website, the backend and their tests.
- In WSL (Ubuntu), never in PowerShell: Solana, Anchor, Rust, Surfpool and Litestream. Run them as `wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && <command>"`. Rust's build output goes on WSL's disk (`CARGO_TARGET_DIR=/home/joshu/.cache/meridian-target/<checkout>`).
- Keep WSL paths inside that quoted command. Git Bash rewrites a bare `/mnt/c/…` argument into a Windows path.
- Text files are LF everywhere (`.gitattributes`). A CRLF script run in WSL quietly loses `set -e`.
- Never run git inside WSL: Windows git makes the worktrees, and Linux git can't open them.
- M0 timed the builds (M0.02): with Rust's output on WSL's disk, this folder builds as fast as a copy on WSL's disk, so the repository stays here. Never build with the output in this folder; that took 12.9 minutes instead of 2.5.
- `bash scripts/toolchain/install.sh` (in WSL) installs every tool at its pin in `scripts/toolchain/pins.sh`, and `node scripts/toolchain/check.mjs` checks them (P22).

Every commit is on a branch. A hook refuses `git commit` on `main` (D128, P15).

Pushes go to both remotes this project uses, `origin` (GitHub) and `gitlab` (Gauntlet GitLab), with explicit commands, and only after the user approves.

Parallel agents share no files. The same file means one owner, in sequence. A slice with UI stays on the main checkout and uses the one dev server. A new session starts from the design docs and the board card, not from chat memory.

## Lanes

Until the end of M1, one session builds M0 and M1 in order. After that, three lanes run at once (P12).

**Frozen at the end of M1.** A change to any of these is a logged decision, and every lane stops and rebases:
- all 23 instructions, declared with their accounts, arguments, events and errors (bodies not yet built return `NotImplemented`);
- the IDL and the generated client in `clients/ts/`;
- `packages/shared/`: strikes, calendar, units, event and stream message types, and API bodies;
- `packages/golden/`;
- USERS.md's status words.

| Lane | Builds | Where | Agent and model | Owns |
|---|---|---|---|---|
| Coordinator | M0, M1, then merges and cards | This main session, main checkout | The main session | Root files and lockfiles, `.github/`, `.claude/`, `.cursor/`, `scripts/`, `docs/`, `AGENTS.md`, `packages/shared/`, `packages/golden/`, `clients/ts/` |
| Program | M2, M3 | A worktree on `lane/program-<slice>` | `implementer`, run on Opus | `programs/meridian/`, `fuzz/` |
| Backend | M4 | A worktree on `lane/backend-<slice>` | `implementer` (Sonnet) | `apps/backend/`, `config/` |
| Website | M5 | The main checkout on `lane/web-<slice>`, with the one dev server | `web-implementer` (Sonnet) | `apps/web/` |

M6 and M7 are split when M5 merges, under the same rule: one owner per file.

**A slice, start to finish.**
1. The coordinator runs `grill` with the user and seeds the card: owned files, branch, test command.
2. It starts the lane's agent with a `parallel-delivery` brief, including the model in the table.
3. The agent ends with its grill report. The coordinator shows it to the user and waits.
4. After the answer, the coordinator commits on the lane branch, pushes to both remotes with the user's OK, and opens a pull request. It merges once CI passes (D128).
5. The card closes with three-part evidence.

**Dependencies.** Every version pinned in ARCHITECTURE.md §9 is installed by the end of M1, so no lane edits a lockfile. A lane that needs a new dependency stops and reports.

**Order inside the lanes.** The backend and website build the parts that don't need the real program first, then pick up M2 and M3 as they merge. Their devnet checks wait for M3 on devnet.

**Parallel safety (P16).**
- A test that needs a database opens its own SQLite file in a fresh temporary folder.
- Each checkout's local chain has its own ports. The main checkout uses Surfpool's defaults (8899, 8900); a worktree uses the ports in its brief, with Studio off.
- Backend tests listen on port 0, a free port the system picks.
- Only the main checkout runs the website's dev server.
- Vitest, TypeScript, Playwright and Cargo ignore `.claude/worktrees/`, as git does.
- Each worktree runs `npm ci` and has its own Rust build folder on WSL's disk.
- No lane runs `anchor keys sync`, a deploy or a push (P14).

**Evidence (P19).**
- A card whose "Done when" names devnet records the local pass and the devnet pass on separate lines. It is Done only with the devnet pass.
- Before submission, `git branch -r --no-merged origin/main` and `git worktree list` show only `main`. That output goes on the submission card.
