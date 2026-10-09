# S7: Sells No; the app buys a Yes and closes the pair

- **Who:** Trader
- **Research group:** 2 Trading and liquidity
- **Source:** Spec: Sell No story
- **Linked items:** D5, Q5, Q38

## Spec excerpt

> Sell No -- The user buys a Yes token from the ask side of the book. Since they already hold a No token, holding both Yes + No = $1.00 worth of redeemable USDC, which closes their No exposure.
>
> User selects their No position and clicks "Sell No"
>
> Under the hood, this buys a Yes token from the ask side of the order book
>
> The user now holds Yes + No, which can be redeemed for $1.00, or the system handles the close automatically
>
> Portfolio updates with realized P&L
>
> To the user, this feels like simply selling their No token -- the Yes-buy mechanic is abstracted away

---

Frozen 2026-10-09 when the Story map was approved. Changes only through a logged decision, added as a dated note below.
