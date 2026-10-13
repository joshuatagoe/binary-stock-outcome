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

## 2026-10-12 — M1 slice a (the order-book spike)

### Where AI misled us or we course-corrected

27. **The AI's architecture let anyone freeze a market with a one-cent donation.** §5 said the book's token accounts must equal what its orders lock plus its owners' free balances, checked after every instruction. Anyone can send tokens to any account, so one extra unit would have made every later order, cancel and return fail. D64 had already made the vault's check "at least" for this reason; the AI didn't carry it over to the book. A donation test caught it: with "equal" it failed, with "at least" it passed (D137, M1.01). Lesson: when a rule is fixed in one place, look for the same rule elsewhere.
28. **A fresh-context review of the spike found the AI had named the wrong limit, and three gaps.**
    - The AI wrote that the heap capped an order at 61 fills. The review asked whether that failure was really out of memory; checking it showed `MaxInstructionTraceLengthExceeded`, Solana's 64-instruction limit, which also rules out a one-transaction sweep (M1.01).
    - Self-trade cancels left the tokens in the book, as D99's general rule says, though D90 says they go back to the wallet in the same transaction.
    - Events came out grouped by kind, not in the order the book was reached.
    - No test showed that events reach the chain, and the sell side of a self-trade was untested. Both now are, in LiteSVM and in the book's tests.

    Lesson: check what a failure actually is before naming a limit, and when a specific decision and a general one meet, build the specific one.

## 2026-10-12 — M1 slice b (the money core)

### Where AI misled us or we course-corrected

29. **A fresh-context review of the money core found four gaps in the AI's design and tests.**
    - The market didn't record who paid its deposits, though Close book, which anyone may send, must return them to the payer, and the operator key can change (D50). A `creator` field was added before the layout freezes (D139).
    - Mint pairs and Redeem took any token accounts, so their events could name a wallet that didn't get the tokens. They now use the signer's own accounts.
    - Redeem's automatic close would have failed, and undone the whole redeem, for an account whose close authority is another key: a way out blocked (D68). It now skips that close.
    - The card's negative cases for Mint pairs and Redeem (wrong signer, swapped and duplicate accounts) had no tests. Twelve were added, and each new check was seen failing first (M1.02).

    Lesson, as in 23, 26 and 28: review against the design before calling a slice done.

## 2026-10-12 — M1 slices c and d (trading and the freeze)

### Where AI misled us or we course-corrected

30. **The agent building `packages/shared` found two errors in the AI's design docs.** §10 and the decisions dated the 2027 clock change 8 March; US daylight time starts on the second Sunday of March, 14 March 2027, and the calendar tests now check it. D52's $499.995 example (480 against 490) was left over from the half-up proposal D52 replaced; under the final rule it gives 510 and 540 against 520 and 550 when rounded to cents first. Both are corrected, and the golden strikes freeze the right numbers. Lesson: compute a worked example from the rule as finally written, not from the draft before it.
31. **A fresh-context review of the freeze found two contracts that couldn't have been built as declared.** Record close had no way to learn a market's close time (only the market stores it, and early-close days differ), so a later after-hours price would have "improved" the record and then failed settlement. And the 4:00 sweep could never close a Buy No offer's pairs, as USERS.md says it does, because their No sat in the trader's wallet where the operator can't sign. Record close now takes a market of that stock and day, which also keeps its feed (D139), and paired offers keep their No in the book (D142). The review also found missing accounts, errors and event fields, a shared event list with 7 of 21 events, and a health type that didn't match the live backend; all fixed, and a test now fails if the shared events drift from the program's. Lesson: before freezing a contract, check that each declared instruction can actually do what the design says, account by account.
32. **The backend lane's agent worked from memory in places; checks caught each one.** It took NYSE's holidays and Anchor's event tag from memory. The coordinator checked both against their sources (nyse.com, and Anchor 1.2's `EVENT_IX_TAG_LE`); both were right, and nyse.com supplied 2028, which §11 asks for. It first stored events with `INSERT OR IGNORE`, which also swallows rows the table's rules refuse, so bad data would have vanished silently; a test caught it. It assumed the generated client decodes enums as names, but they are numbers. Lesson: a fact recalled from memory is checked against its source before it is committed, even when it turns out right.
33. **A fresh-context review of M4-a found the reader and the send queue could lose or double things in cases the fakes didn't model.** A node that answers an unknown `before` with an empty list (Agave does), or a short page, would have ended a catch-up and moved the reader past history it never read. Catch-up never returned on a busy day. The queue signed before taking its rate-limit slot, and could give up on a job while a copy it had sent could still land: the double landing D56 warns about. Strike planning also used one price source where D82 doesn't allow it. All fixed with tests seen failing first, and the fake node now answers as Agave does. Lesson: a fake has to copy the real service's awkward answers (empty pages, short pages, timeouts that may have succeeded), or the tests prove only the easy path.
34. **The freeze gave each trader a No balance but left the rule for reusing a trader entry unchanged.** D142 added `free_no`, but `free_trader_index` still called an entry free once its USDC, Yes and open orders were zero. Once Buy No exists, an owner whose paired offer sold and whose USDC came back holds only No, and the next new trader would have taken that entry along with the No. The M2-a agent found it while building Buy No; the reuse rule now counts No, and a book test fails without the fix. Lesson: when a record gains a balance, check every rule that reads the others.
35. **The lane plan assumed agents in their own worktrees could run WSL; they can't.** Claude Code checks each shell command an agent in an isolated worktree runs, to be sure it can't run git, and a `wsl` call hands text to a shell it can't inspect, so it refuses every one. The program agent wrote M2-a's code and 37 tests without compiling them, and the backend agent couldn't start a local chain. With the user's OK for that session, a second agent without isolation, in a worktree the coordinator made, built and tested it: every test passed on the first compile, and a review then found what a compile can't (AGENTS.md now says how lanes get WSL). A refusal test written without running asserted only that the instruction failed, so it passed against the NotImplemented stub; it now names its error. Lesson: run one real command of each kind in an agent's actual sandbox before planning a lane around it, and make every refusal test name its error.
36. **AI_USAGE 31 said a test now fails if the shared events drift from the program's; it checked only the events' names.** Adding `no` to BalanceReturned for D144 left every test green until a consumer's types broke. The shared package now exports its field table, and a test compares every event's fields with `events.rs`; it failed first on BalanceReturned. Lesson: say exactly what a drift test compares, and make it compare what consumers depend on.

## 2026-10-13 — M5-a close-out

### Where AI misled us or we course-corrected

37. **The coordinator told the website agent that the Trade page had no accessibility scans at 320 px and 200% zoom; they existed.** Its search had piped the matches through `head -15`, and the Trade page's scans were further down the list. The agent checked before writing anything, found the scans passing, added no test, and said plainly that it had seen no failure first rather than inventing one. Lesson, as in 15: a search cut short is not evidence that something is missing; read the full result, or search the one file in question, before asking for work.

## 2026-10-13 — M4-b (the reader wired in)

### Where AI misled us or we course-corrected

38. **The backend agent expected the live chain to expose bugs in M4-a's reader; every live test passed first time.** "Seen failing first" then couldn't come from the tests alone, so it broke the code on purpose for each negative case (a frontier written on the first page, an unknown event skipped, the failed flag dropped, the reader unwired) and saw the right test fail with the right error before restoring it. Two smaller slips: a Python text-mode write turned LF into CRLF on Windows, caught by git's warning; and `pkill -f 'surfpool …'` killed its own shell, because the pattern was in its own command line (`[s]urfpool` fixes it). Lesson: when a test can't be red before the code exists, a deliberate mutation is the honest way to show it can fail.

## 2026-10-13 — M2-b (returns, quotes and the sweep)

### Where AI misled us or we course-corrected

39. **The design's lists for M2-b's instructions were incomplete, and the coordinator's brief asked for a check that didn't exist.**
    - §6 gave Replace quotes only OrderCancelled and OrderPlaced. But a quote that crosses the book fills, and the balance it collects needs an event, or the events can't rebuild the book's balances (D62). It now also writes Fill and BalanceReturned (D146).
    - §5 said pause is checked only in Mint pairs, Place order, Buy No and Sell No, while §6 pauses Replace quotes too. The program follows §6, and §5 is corrected.
    - The brief asked for clippy to be clean "as the anchor-program skill says", but the skill gives no clippy command, and `cargo clippy --all-targets -- -D warnings` already failed at the start: 2 library lints, now fixed, and 4 in older test files, left alone.
    - A deliberate break showed why Replace quotes' extra accounts need explicit address checks: without them another market's book USDC account was accepted, because Anchor checks only the accounts it declares.

    Lesson: when the design lists what an instruction writes or where a check sits, check that list against every path the instruction can take; and a brief should cite only checks that exist.

## 2026-10-13 — M5-b (Buy No and Sell No on the site)

### Where AI misled us or we course-corrected

40. **The website agent's first Buy No words took the amount from the wallet's USDC change.** Reading the program showed that Buy No refunds the trader's own cancelled bids into the same wallet (D143), so a self-trade would have made the No look cheaper, or the amount negative. The words now come from the Fill events, with the balances only as a cross-check, and a mutation that zeroed the refund failed two tests. Its first browser-test expectations also guessed the book and the "at most" price wrongly, which Playwright caught. Chrome's permission prompt went unanswered, so the coordinator checked the wallet panel on the dev server with a headless browser instead. Lesson: word a money result from what the program says happened, and use the wallet's balances to check it, not to compute it.

## 2026-10-13 — M3-a (record the close and settle)

### Where AI misled us or we course-corrected

41. **The coordinator's brief expected the 4:00 PM fixtures to come from Zach's posts; his accounts can't hold one after 4:05.** Push accounts keep only their latest price (PS.03); read at 6:10 PM, they held a 6:06 PM after-hours price. The real 4:00:00 PM close in the tests is a classmate's post through the upgraded receiver (PS.06), found by scanning both receivers for META's feed; Zach's account serves as the legacy-receiver fixture, and a real partly verified post as the unverified case. The card also placed the band check in Settle while §6's error table lists BandTooWide under Record close; both now check it (D147). Lesson: before naming a fixture, check that the account still holds the moment the test needs.
