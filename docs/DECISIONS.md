# Decisions

Key decisions, why we made them, and what they cost. A new decision is added in the same commit as the work it affects.

Status is **Accepted** (agreed with the user), **Proposed** (awaiting the user), or **Superseded** (replaced; the entry stays and points to its replacement).

Product decisions (D-numbers) are added only after the user answers the question round that follows the stage 1 decision review. Process decisions about how the project is run use P-numbers, so the two series never collide.

## Decision log

| # | Decision | Why | Trade-off | Status |
|---|---|---|---|---|

## Process decisions

| # | Decision | Why | Trade-off | Status |
|---|---|---|---|---|
| P1 | The status board is a Notion database, connected through Notion's hosted MCP server in `.mcp.json`. Link in `docs/status-board.md`. | Same board as the previous Gauntlet project; one board, outside the repo, so no second kanban grows in the docs. | Each machine signs in to Notion once (`/mcp`, OAuth). If Notion is unreachable, work that needs the board stops. | Accepted (2026-10-08) |
| P2 | The Meridian spec is kept in `docs/spec/` (PDF plus a `pdftotext -layout` text copy), gitignored, and copied into worktrees by `.worktreeinclude`. | The spec is Gauntlet and Peak6's document. The GitHub repo is private today, but this keeps it out of the history if the repo is ever made public. | A folder-wide search skips ignored files, so agents and input files name the spec's file path directly. | Accepted (2026-10-08) |
| P3 | The WSL toolchain (Rust, Solana CLI, Anchor, Node, Surfpool) is installed at M0, not in phase 0. WSL2 with Ubuntu is already present. | Stage 1 research doesn't need it, and the exact versions are pinned in Architecture. | Library reference skills, which need a snippet that has run, wait until then. | Accepted (2026-10-08) |
| P4 | `WebSearch` and `WebFetch` (all domains) are allowed in the shared `.claude/settings.json`. | Research runs (stages 1 and 3) would otherwise pause for approval on each fetch. | A misled agent could fetch any URL; P5 keeps local secrets out of reach. | Accepted (2026-10-08) |
| P5 | Reading `.env` is denied in the shared settings. | No agent needs the secrets' values, and denying the read stops them leaving through a fetch (P4). | Secret values can't be inspected through Claude Code; edit `.env` by hand. Checked 2026-10-08: the Read tool and `cat .env` were both refused. | Accepted (2026-10-08) |
| P6 | The phase 1 plans from the earlier sessions are kept as verbatim, dated snapshots in `docs/planning/`, committed, with an index. They are never edited there. | The user wants to be able to go back and review how the decisions were reached. The live plan files sit in a per-user folder outside the repo. | The snapshots hold the proposed answers, so research agents are told not to read the folder (AGENTS.md, researcher agent). That rule is an instruction, not a permission block. | Accepted (2026-10-09) |
| P7 | The decision-review workflow (`.claude/workflows/decision-review.js`) runs one source checker per group, started as soon as that group's researcher finishes, and one separate writer that saves every file. The orchestrator guide had a single verifier that also saves. Every decision is researched blind and judged the same way, including the user's own choices; the guide had exempted those from verdicts. The judge's verdict table shows each decision's source (spec, user, or Claude's proposal) as a reading aid only. | The user's own choices have no backing in the spec, so they need an independent check most; a verdict never overrules the user, who decides every item in the question round. The source column shows which decisions will need a written justification. One checker reopening every CONFIRMED source for all seven groups could run out of context. A single writer keeps "no two agents write the same file", because the legal group's findings land in every group's story folders. | More agents: the full run is 16 (7 researchers, 7 checkers, 1 writer, 1 judge) instead of the guide's 9; the pilot is 4. The writer copies text through a model, so saved files are checked against the run's journal afterwards. | Accepted (2026-10-09) |
| P8 | After the group 6 pilot: researchers run at high effort with up to 100 turns, must open at least two outside sources per item (at least one primary; the spec does not count) and retry every gap; groups 2 and 4 are each split across two researchers (finding IDs from .01 and .51); one Opus judge per group writes `decision-review-<run>-G<n>.md`, and a final cross-check pass writes `decision-review-<run>.md` with the full verdict table and the conflicts between groups. Partly supersedes P7's agent count. | The pilot researcher spent about 2 minutes on 8 items (7 searches, 7 page reads); 5 of its 12 CONFIRMED findings only quoted the spec, and its gaps listed things it could have looked up. One judge for all 86 items would write a report about ten times the pilot's. | More agents and cost: the full run is 27 agents (9 researchers, 9 checkers, 1 writer, 7 judges, 1 cross-check). | Accepted (2026-10-09) |
| P9 | The decision-review workflow takes `stage: "judge"` to rerun only the judges and the cross-check on group reports already saved, and it stops before judging when any file was not saved. | The full run's writer saved nothing, and the judges started on missing reports; a stopped run's resume re-ran the source checkers instead of replaying them. | A judge-only rerun trusts that the saved reports are the run's own; the save step must be checked first. | Accepted (2026-10-09) |

## Assumptions

## Cut, and what's next

| Cut | Why | Next, with more time |
|---|---|---|
