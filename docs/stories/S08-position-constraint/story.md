# S8: Is stopped from holding Yes and No on one strike, and shown how to exit first

- **Who:** Trader
- **Research group:** 2 Trading and liquidity
- **Source:** Spec: Position constraints
- **Linked items:** D9, Q31

## Spec excerpt

> A user should not be able to Buy Yes if they already hold No tokens for the same strike without first selling (closing) their No position. Holding both Yes and No simultaneously is only a transient state during the mint-pair operation -- it should not be a persistent user position from the trading UI.
>
> Similarly, a user should not Buy No if they already hold Yes tokens for the same strike without first selling their Yes position.
>
> The frontend should enforce this by checking the user's token balances before presenting trade options and guiding them to exit their current position first.

---

Frozen 2026-10-09 when the Story map was approved. Changes only through a logged decision, added as a dated note below.
