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

## 2026-10-10 — Workflow prep (phase 4)

### Where AI misled us or we course-corrected

13. **The phase 0 harness told the `implementer` agent to follow two skills it could never see.** Its tools had no Skill tool, and its definition didn't preload any skill, so "Follow tdd-plan-implementer" pointed at nothing. It never read AGENTS.md either. Asked what it had in context, it named only the two CLAUDE.md files (WP.05). Correction: the `skills` field now preloads both skills (P13). A fresh session confirmed the fix; the same session still used the cached old definition. Lesson: check what an agent actually has in its context; a name in its instructions is not the text.
14. **The AI offered a choice of where the repository lives before explaining what WSL is.** The user asked "where is the WSL?" and then "I still don't understand the purpose of WSL". The explanation that worked was concrete: where Linux's disk sits on the C: drive, the same folder seen from both sides, and a measured 55 s versus 0.6 s. The user then chose to keep the Windows tools in a folder outside OneDrive, with builds in WSL (P11), rather than the AI's recommendation to move everything into WSL. Lesson: the user's standing rule to explain before asking covers tooling too, not only finance and blockchain.

## 2026-10-10 — M0 slice a (the safety net)

### Where AI misled us or we course-corrected

15. **A check passed only because it couldn't fail.** Before the repository went public, the AI checked whether the spec's text had been copied in by matching every spec line of 120 characters or more. It reported no matches, but the spec's text file has no lines that long, so it compared nothing. Redone by sentence, 31 of the spec's 71 long sentences appear in the docs as quoted requirements (540 of its 3,420 words); the spec file itself was never committed. Lesson: a check reports how much it examined, not only what failed. Each line of `npm run verify` now says how many files, tests or diagrams it covered.

## 2026-10-10 — M0 slice b (the WSL toolchain)

### Where AI misled us or we course-corrected

16. **The AI edited a script while bash was running it, and corrupted the run.** During the first build-timing run, the AI tightened a check in `scripts/toolchain/time-builds.sh`. Bash reads a script as it runs, so the edit shifted the text under it: line 48 became a syntax error, the `npm ci` part never ran, and the run still exited 0. The same review found that setup 2's success check would also have passed on setup 1's leftover output. That run's output was confirmed on WSL's disk by its timestamps, so its time stands. Corrections: the script's body is now one function called on the last line, so bash reads the whole file before running anything; setup 1's output is deleted before setup 2; and the missing steps were rerun. Lessons: never edit a script while it runs, and an exit code of 0 doesn't prove every step ran.

## 2026-10-11 — M0 slice c (the first program on devnet)

### Where AI misled us or we course-corrected

17. **The AI's deploy script let the Solana CLI print a recovery phrase into the session.** `solana program deploy` writes the program through a temporary buffer account. Given no key file for it, the CLI makes one and prints its 12-word recovery phrase, so a stopped deploy can be resumed. The AI hadn't read that part of `--help`, so the phrase reached the chat transcript, against the rule that keys never enter chat. The phrase controlled only that buffer, which the successful deploy emptied and closed: devnet answered `AccountNotFound` for it, and no buffers were left. Corrections: the phrase was removed from the deploy log on WSL's disk; `scripts/devnet/deploy-program.sh` now makes the buffer's key file itself with `solana-keygen new --silent`, which prints only the file's path, and passes it with `--buffer`. Lesson: before running a command that handles keys, read its help for what it prints.
18. **The design treated a release's feature as a cluster's rule.** ARCHITECTURE.md §9 and D125 said devnet, running Agave 4.4, requires sBPFv3 for new deployments, and part 1's `anchor-program` skill repeated it. The source (AR.14) was Solana's upgrades page listing the requirement under Agave 4.4. But a requirement like this takes effect only when a cluster switches on its feature, and `solana feature status -u devnet` showed SIMD-0500 still off (M0.05). Nothing broke, because the program is sBPFv3 anyway. Corrections: §9, D125's status, the skill and P24 now say what was measured. Lesson: to learn what a cluster enforces, read its active features, not its software version.
19. **The AI wrote down a cause it hadn't tested.** It saw solana-verify print "Program Solana version: v0.0.0", guessed that the missing `[workspace.metadata.cli]` entry in `Cargo.toml` was the cause, added the entry, and recorded the guess in M0.05 and the `anchor-program` skill without building again. A later build, run for another reason, still printed v0.0.0, and solana-verify's source shows the line is always v0.0.0 when the image is passed with `--base-image`. The entry still matters, for a plain `solana-verify build`. Corrections: a dated correction line under M0.05, and the skill. Lesson: rerun the check after a fix before writing down why it failed.

## 2026-10-11 — M0 slice d (the backend skeleton)

### Where AI misled us or we course-corrected

20. **The AI overwrote a committed file without reading it.** Writing the backend's secrets list, it replaced `.env.example` without first checking whether one existed. Slice a had made it, with names only, and `npm run verify` refused the new version straight away: it gave values to nine names. The AI had also invented `HEALTHCHECKS_TEST_URL` beside the existing `HEALTHCHECKS_PING_URL`. Corrections: the file was restored from git and gained only the two new names Litestream needs, `R2_ACCOUNT_ID` and `R2_BUCKET`, and the check-in command uses the existing name. Lesson: read a file before writing it, even one that seems new.
21. **A fresh-context review found seven defects in the AI's backend skeleton, two of them against P25's own claims.** The checker kept the first genesis hash forever, so a devnet reset would never show. A read had no time limit and the server started only after the first pass, so a silent devnet could fail Fly's health check, although P25 said it couldn't. Health refused a database holding a newer build's migration, which is exactly the state after a rollback. A fetch error could carry the ping URL into a message, although P25 said none did. The test alert sent before opening the store, so a retry sent it twice. A local run left `meridian.db` where it would block `npm run push`. And the standby would have restored and overwritten the primary's backup. Each fix came with a test that failed first, and the image was rerun; the rerun found an eighth, `/data` missing without a volume. Lesson: a reviewer that reads the design next to the code finds what tests written by the same author don't.

## 2026-10-11 — M0 slice e (the website skeleton)

### Where AI misled us or we course-corrected

22. **The AI's browser tests checked only the built site, which hid a crash in the dev server.** All five passed, but the page crashed on `npm run dev` with "process is not defined": the generated client reads `process.env`, which Vite's build replaces and its dev server doesn't. The frontend skill's rule, to check the page in a browser on the dev server before calling it done, caught it on the first screenshot. Corrections: `vite.config.ts` defines `process.env` as `{ NODE_ENV }`, a second Playwright project runs the main test against the dev server, and that test failed without the fix (M0.10). Lesson: test the page in the mode developers and graders run, not only the one that ships.
23. **A fresh-context review found thirteen gaps in the AI's website slice.** The ones that mattered: the Config read had no time limit, so a quiet devnet would leave the page loading forever; every failure said "devnet didn't answer", even a missing Config after a reset; the Cloudflare token was in the environment while `npx` installed wrangler's unlocked dependencies; the Content-Security-Policy was first exercised in production, because `vite preview` didn't serve `_headers`; one devnet blip in the program's smoke check would skip the other two; Try again dropped keyboard focus; and the Open pill used the "done" colour instead of the accent (§7). Each fix that changed behaviour came with a test that failed first (M0.10). Lesson, again: review against the design before calling a slice done.
24. **The AI's wallet test page needed four fixes while the user was running it.** The page was blank: the dev server had been running since before the `process.env` fix and never picked it up, so a fresh server fixed it (and a server started after a config change is now the rule). Clicks seemed to do nothing, because results appeared only at the bottom and a failed connection showed no message. Each step now shows its own result, and Connect shows its progress or error. Once Phantom was connected, there was no way to connect Solflare; every wallet now stays listed. And the v1 transaction failed devnet's own simulation, because it didn't state its limits (M0.13). It was also a token-funding script, not the user, that ran the operator key below its rent minimum; the scripts now top it up first. Lesson: run a page meant for someone else's hands through every step yourself first, with a real wallet where possible.

## 2026-10-12 — M0 slice f (make dev)

### Where AI misled us or we course-corrected

25. **The AI's plan for `make dev` on Windows would not have run.** It planned to rerun the whole script inside WSL, as D74's wording suggests. But npm on Windows installs only the Windows build of Vite's bundler, so the website can't start inside WSL from the Windows checkout. A short probe before building showed it, and only the Solana tools now run in WSL (P29). The first full runs then failed on three more of the AI's assumptions: that a local chain's websocket shares the RPC's port, as devnet's does; that "local" could name a Vite mode; and that the root folder's Vite was the website's (it was Vitest's 8.3.4, not the pinned 8.3.1, caught from the version Vite printed). Each failure was seen before its fix (M0.14). Lesson: check where packages were installed before deciding where code runs, and read the versions the tools report.
26. **A fresh-context review found gaps the AI's own runs hadn't.** The AI had run only the Windows path, while the README told Linux users to run `make dev`. Five more:
    - the wallet test page would have pointed its devnet tokens at the local chain;
    - the keys step hid a `solana-keygen` failure behind "no local admin key";
    - stopping during start-up printed a false time-out;
    - on Linux, a SIGTERM would have left the chain, backend and website running;
    - in a new build folder, `anchor build` left a random program key, which would have stopped `build.sh` from putting the real one there (D92).

    The README also listed four steps where there are seven and overstated what `.local/` holds. And P29 said the Explorer showed the local chain, which the AI had never tried; opened, the Explorer never finished loading, so the local page no longer links it. Each was fixed, and the Linux path was run from a copy in WSL's home folder. Running the review's SIGTERM case found one more: Surfpool ignores a SIGTERM in about its first 0.3 s, so `make dev` now forces any part that hasn't stopped after 5 s (M0.14). Lesson, as in 23: review against the design before calling a slice done, and run each claim before writing it down.
