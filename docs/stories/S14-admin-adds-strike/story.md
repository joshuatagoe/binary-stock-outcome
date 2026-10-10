# S14: Adds a strike during the trading day

- **Who:** Admin
- **Research group:** 3 Daily cycle
- **Source:** Spec: Add Strike
- **Linked items:** D6, Q33, Q34

## Spec excerpt

> Add Strike -- Admin function to add extra strikes for a stock intraday
>
> Admin can add or adjust strikes before or during the trading day

---

Frozen 2026-10-09 when the Story map was approved. Changes only through a logged decision, added as a dated note below.

- **2026-10-09, D54:** after a big overnight jump the bot also adds strikes on its own: at about 9:35, if no strike sits within 3% of a stock's price, it adds that price rounded to $10 plus the ±3% strikes around it, once per stock per day, and alerts the admin. The admin can still add strikes by hand.
