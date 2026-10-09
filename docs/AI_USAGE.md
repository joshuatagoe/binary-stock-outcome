# AI usage log

How AI was used on this project: tools, what worked, where it misled us, and how we corrected course. Entries are dated and added in the same commit as the work they describe.

## Tools

- Claude Code (Opus) as the main session, with read-only research subagents.

## 2026-10-08 — Phase 0 (harness)

### Where AI misled us or we course-corrected

1. **A previous AI session listed deliverables the spec doesn't require.** Its plan included a demo video and an AI usage log as submission items; the spec names neither. The user caught it when asked to confirm them: the spec is what defines the submission. Correction: the status board's deliverable cards come only from the spec's own lists. Lesson: derive deliverables from the brief's text and quote it on each card.

## 2026-10-09 — Stage 1 decision review setup

### Where AI misled us or we course-corrected

2. **The AI exempted the user's own choices from the blind review.** Following the orchestrator guide, it marked five decisions (D11, D14, D16, D19, D26) as preferences that would get only a list of costs, no verdict. The user asked why preferences get no second opinion when they are the choices that depart from the spec. Correction: all five are researched blind and judged like every other decision; the judge's verdict table shows each decision's source (spec, user, or Claude's proposal) only as a reading aid. Lesson: the decisions with the least backing in the brief need the most independent checking; a verdict informs the user and never overrules them.

## 2026-10-09 — Stage 1 full run

### Where AI misled us or we course-corrected

3. **The AI designed one Haiku writer to copy every file of a run byte for byte.** It worked in the pilot (3 files), but in the full run it was handed about 1 MB of text and refused, writing nothing. The workflow then started the judges on reports that did not exist; the user's stop halted them about 30 seconds in. Correction: the 37 files were rebuilt from the run's journal with the script's own formatting code, the workflow now stops before judging when any file is missing, and saving moves out of the workflow (P10). Lesson: never route large exact text through a model when a script can produce it.
4. **The AI resumed the stopped run expecting every finished agent to replay from cache.** Cached calls replay only in their original order, and the checkers had started in the order the researchers finished, so all 9 checkers started again (about $2 wasted). It was stopped after a minute, before the writer, so no saved file changed. Correction: a judge-only mode reruns just the last stage. Lesson: check how a tool's resume matches cached work before relying on it.
