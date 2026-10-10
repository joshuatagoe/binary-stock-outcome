# S31: Checks that the daily jobs ran on devnet and acts on alerts

- **Who:** Operator
- **Research group:** none; added after the stage 1 review by D35
- **Source:** Q40, through D35 (2026-10-09)
- **Linked items:** D29, D32, Q40, Q53

## Spec excerpt

> Morning job (~8:00 AM ET): For each of the 7 stocks, read previous close from oracle, calculate strikes, call create strike market for each. Log results. Alert on failure. Retry with backoff.
>
> Settlement job (~4:05 PM ET): For each open contract, call settle market. If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes. If still failing, alert admin for manual override.

---

Added 2026-10-09 by D35, after the Story map was frozen. The only other operator story, S22, is tied to the mainnet bonus. Changes only through a logged decision, added as a dated note below.
