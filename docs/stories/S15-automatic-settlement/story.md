# S15: Settles every contract at about 4:05 after staleness and confidence checks, retrying for up to 15 minutes

- **Who:** Automation
- **Research group:** 4 Settlement and payout
- **Source:** Spec: Settlement job, oracle integration
- **Linked items:** D1, D8, D26, D28, Q2, Q3, Q13, Q16, Q20, Q37, Q48

## Spec excerpt

> Settle Market -- Reads the oracle closing price and writes the binary outcome (Yes wins or No wins) to the contract. Can only be called after 4:00 PM ET. Must validate oracle data freshness and confidence.
>
> Settlement job (~4:05 PM ET): For each open contract, call settle market. If oracle confidence is too wide, retry every 30 seconds for up to 15 minutes. If still failing, alert admin for manual override.
>
> Staleness check: Reject prices older than a defined threshold (e.g., 5 minutes)
>
> Confidence check: Reject prices where the oracle's reported confidence band is too wide (configurable threshold)
>
> Failure handling: If the oracle is unavailable or unreliable at settlement time, the automation service retries for a defined window (e.g., 15 minutes). If still failing, admin uses the override settle function with a manual price and enforced time delay.

---

Frozen 2026-10-09 when the Story map was approved. Changes only through a logged decision, added as a dated note below.
