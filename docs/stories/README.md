# Stories

The 29 user stories from the approved Story map, frozen on 2026-10-09. S1 to S24 come from the Meridian spec; S25 to S29 are the stories it leaves out (Q40). Each story's folder gets its research in `research.md` from the stage 1 decision review.

Linked items are numbers only. A research agent gets each number as a neutral question in its group's input file, never the proposed answer. Spec excerpts are quoted from `docs/spec/meridian_project.txt`; arrows, ≥, ± and × that the text extraction dropped are restored from the PDF.

| ID | Folder | Who | Research group | Linked items | Legal lens (group 7) |
|---|---|---|---|---|---|
| S1 | [S01-learn-what-a-contract-pays](S01-learn-what-a-contract-pays/story.md) | Visitor | 1 Onboarding | D10, Q7, Q52 | Q50, Q51 |
| S2 | [S02-connect-wallet-see-usdc](S02-connect-wallet-see-usdc/story.md) | Trader | 1 Onboarding | Q54 | D3 |
| S3 | [S03-browse-contracts-and-prices](S03-browse-contracts-and-prices/story.md) | Trader | 1 Onboarding | D10, Q7, Q52 | Q50 |
| S4 | [S04-buy-yes](S04-buy-yes/story.md) | Trader | 2 Trading and liquidity | D5, D13, D15, D20, D21, A1, Q28, Q41 | Q46 |
| S5 | [S05-buy-no](S05-buy-no/story.md) | Trader | 2 Trading and liquidity | D5, D15, D25, Q38 |  |
| S6 | [S06-sell-yes](S06-sell-yes/story.md) | Trader | 2 Trading and liquidity | D5, A1 |  |
| S7 | [S07-sell-no](S07-sell-no/story.md) | Trader | 2 Trading and liquidity | D5, Q5, Q38 |  |
| S8 | [S08-position-constraint](S08-position-constraint/story.md) | Trader | 2 Trading and liquidity | D9, Q31 |  |
| S9 | [S09-live-order-book-and-countdown](S09-live-order-book-and-countdown/story.md) | Trader | 2 Trading and liquidity | D14, D16, D20, D21, Q11, Q17, Q18 | Q50 |
| S10 | [S10-market-maker-mint-and-quote](S10-market-maker-mint-and-quote/story.md) | Market maker | 2 Trading and liquidity | D25, Q21, Q29 |  |
| S11 | [S11-market-maker-dashboard](S11-market-maker-dashboard/story.md) | Market maker | 2 Trading and liquidity | D25 |  |
| S12 | [S12-morning-market-creation](S12-morning-market-creation/story.md) | Automation | 3 Daily cycle | D6, D12, D29, Q8, Q9, Q10, Q32, Q35, Q42 |  |
| S13 | [S13-daily-open-and-close](S13-daily-open-and-close/story.md) | Automation | 3 Daily cycle | D7, Q14 |  |
| S14 | [S14-admin-adds-strike](S14-admin-adds-strike/story.md) | Admin | 3 Daily cycle | D6, Q33, Q34 |  |
| S15 | [S15-automatic-settlement](S15-automatic-settlement/story.md) | Automation | 4 Settlement and payout | D1, D8, D26, D28, Q2, Q3, Q13, Q16, Q20, Q37, Q48 |  |
| S16 | [S16-admin-override-settle](S16-admin-override-settle/story.md) | Admin | 4 Settlement and payout | D8, Q43 | Q47 |
| S17 | [S17-see-outcome-and-redeem](S17-see-outcome-and-redeem/story.md) | Trader | 4 Settlement and payout | D1, Q39 |  |
| S18 | [S18-portfolio-and-history](S18-portfolio-and-history/story.md) | Trader | 4 Settlement and payout | Q27 |  |
| S19 | [S19-one-dollar-invariant](S19-one-dollar-invariant/story.md) | Everyone | 4 Settlement and payout | D2, A4, Q30, Q45 | D3 |
| S20 | [S20-initialize-config](S20-initialize-config/story.md) | Admin | 5 Platform | D17, D24, D27 |  |
| S21 | [S21-pause-and-unpause](S21-pause-and-unpause/story.md) | Admin | 5 Platform | D24, Q44 |  |
| S22 | [S22-mainnet-operations-bonus](S22-mainnet-operations-bonus/story.md) | Operator | 5 Platform | Q53 | Q49 |
| S23 | [S23-grader-runs-lifecycle](S23-grader-runs-lifecycle/story.md) | Grader | 6 Proof for the grader | D11, D30, Q24, Q55 |  |
| S24 | [S24-grader-reads-rationale](S24-grader-reads-rationale/story.md) | Grader | 6 Proof for the grader | D4, D18, Q23, A2 |  |
| S25 | [S25-get-test-money](S25-get-test-money/story.md) | Trader | 1 Onboarding | Q19, Q22, Q40 | Q51 |
| S26 | [S26-open-order-refunded-at-close](S26-open-order-refunded-at-close/story.md) | Trader | 2 Trading and liquidity | Q4, Q40 |  |
| S27 | [S27-buy-no-limit-pending](S27-buy-no-limit-pending/story.md) | Trader | 2 Trading and liquidity | Q5, Q6, Q40 |  |
| S28 | [S28-under-review-when-band-straddles](S28-under-review-when-band-straddles/story.md) | Trader | 4 Settlement and payout | D26, Q36, Q40 | Q47 |
| S29 | [S29-devnet-outage](S29-devnet-outage/story.md) | Everyone | 5 Platform | D19, Q40 |  |

**Cross-cutting, no single story:** D22, D23, Q12, Q25, Q26 (group 5). Their findings go to `docs/research/cross-cutting.md`.

**Not researched:** Q1 (decided: our own minimal order book) and Q15 (a process question, answered by phase 0).
