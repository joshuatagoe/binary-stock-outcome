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

## 2026-10-09 — Question round (stage 2)

### Where AI misled us or we course-corrected

5. **The AI recommended issuing our own test-dollar token, carrying over the review's "effectively required" (F2.98).** That conclusion assumed the market-maker bot quotes 100 contracts in every market, about $4,900 or more. The user asked whether real devnet USDC could be used instead. Recomputed with 5-contract quotes, the bot locks at most $388 to $458, 20 to 23 faucet claims, and the money comes back at each day's redeem. Correction: Circle's devnet USDC, with our own token as the fallback (D32). Lesson: before recommending a departure from the spec because something is "required", check the sizing assumption behind "required".
6. **The stage 1 review called the plan's three 2026 devnet outages "uncorroborated" and recommended dropping them (F6.28; group 6 judge).** When the user asked how often devnet goes down, one search found the providers' status pages: QuickNode's records the Foundation halting devnet on 19 June 2026, and Helius's records a planned restart on 14 to 15 April 2026. Correction: a dated correction line under F6.28 in S24's research, and D75 cites the sources. Lesson: "not found" from one search is weak evidence; outage history lives on infrastructure providers' status pages, not only in news.
