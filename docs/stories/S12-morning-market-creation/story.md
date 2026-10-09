# S12: Reads the previous close at 8:00, computes strikes and creates every market by 8:30

- **Who:** Automation
- **Research group:** 3 Daily cycle
- **Source:** Spec: Daily lifecycle, morning job
- **Linked items:** D6, D12, D29, Q8, Q9, Q10, Q32, Q35, Q42

## Spec excerpt

> 8:00 AM ET: Automation service reads previous close from oracle, calculates strikes
>
> 8:30 AM ET: Creates contracts and order books for each strike
>
> Morning job (~8:00 AM ET): For each of the 7 stocks, read previous close from oracle, calculate strikes, call create strike market for each. Log results. Alert on failure. Retry with backoff.
>
> Generate strikes at ±3%, ±6%, and ±9% from the previous close, rounded to the nearest $10
>
> This produces 6 strikes per stock (3 above, 3 below), plus optionally the rounded previous close itself as a 7th strike

---

Frozen 2026-10-09 when the Story map was approved. Changes only through a logged decision, added as a dated note below.
