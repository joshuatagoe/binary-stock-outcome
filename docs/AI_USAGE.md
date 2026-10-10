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

## 2026-10-09 — Price-source check and USERS.md (phase 2)

### Where AI misled us or we course-corrected

7. **The review turned Pyth's listed schedule into a claim about what Pyth publishes.** F4.07 read `Equity.US` feeds' "09:30-16:00" schedule from Hermes, and three accepted decisions (D8, D57, D59) then said the regular-session feed publishes nothing after 16:00. The on-chain check found Pyth-signed `Equity.US` prices stamped from 06:20 to 19:59:59 ET, moving after hours. Correction: a dated line under F4.07 and finding PS.05 in S15's research; the rules themselves (use the last price at or before the close) still hold. Lesson: a schedule in metadata says when a session is, not when signed prices stop; check the data itself when it is one query away.
8. **While writing PS.02 the AI typed the legacy Wormhole receiver's address from memory, and it was wrong** (the data had shown only its first six characters). It was caught by checking the cached transactions before the file was used. Lesson: copy every address and signature from data, never from recall.

## 2026-10-10 — Architecture checks and section 1 (phase 3)

### Where AI misled us or we course-corrected

9. **The hold rate in D26, D60 and PROBLEM_SPACE ("about 1 trading day in 17") rested on a ±5¢ band the AI assumed,** while real closing bands were already in the price-source check's cache. Measured, the band at 4:00 PM has a median of 2.53 bps (META ±$0.20), and the same model then gives about 1 day in 10 (AR.04). The model reproduces 1 in 17 when given the assumed band, so the error was the input, not the model. Correction: dated notes on D26, D60 and PROBLEM_SPACE. Lesson: when an "illustrative" figure depends on one input and that input is one query away, measure it before the figure enters a document. Earlier the same day, lesson 7 had to be learned on publish times.
10. **A research agent reported Solana finality as "about 12.8 s" and a Permissioned Burn mainnet status as "conflicting".** The first came from a page written for 400 ms slots; a direct measurement gave 7.06 s at today's slot length (AR.01). The second was settled by reading the deployed program binary on both networks (AR.02). Neither reached a decision uncorrected. Lesson: a figure about a chain that changes every few weeks needs a dated measurement, and release notes are weaker evidence than the deployed program.
11. **A diagram passed validation while drawn wrong.** The AI's lifecycle diagram had a label containing a semicolon, which Mermaid reads as the end of a statement, so the rest of the label rendered as stray boxes. mermaid-cli reported no error. The AI caught it by looking at the rendered image before showing it, and `scripts/arch/check-diagrams.mjs` now fails on any semicolon in a diagram (seen failing on the broken diagram, then passing on ARCHITECTURE.md). Lesson: "it renders" is not "it is right"; look at each diagram, and turn each miss into a check.
12. **The AI recommended ntfy for alerts because it needs no sign-up, and weighed too lightly that its own docs call a topic "essentially a password".** When the user asked why ntfy beat a Telegram bot, the comparison showed that anyone who learned the topic name could post fake alerts, while only our bot can post to a Telegram chat. Correction: the recommendation changed to Telegram (D117). Lesson: for an alert channel, the first question is whether an alert can be trusted, and only then how easy it is to set up.
