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
