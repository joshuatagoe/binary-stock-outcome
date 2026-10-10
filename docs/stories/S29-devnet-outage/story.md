# S29: Sees trading and settlement pause during a devnet outage, then catch up when it returns

- **Who:** Everyone
- **Research group:** 5 Platform
- **Source:** Q40, with D19
- **Linked items:** D19, Q40

## Spec excerpt

None. The spec has no story for this.

---

Frozen 2026-10-09 when the Story map was approved. Changes only through a logged decision, added as a dated note below.

- **2026-10-09, D35:** this story also covers a devnet reset, where the network is wiped rather than halted. What the system does after a reset is decided with D19 (group 5).

- **2026-10-09, D19:** after a reset, scripts rebuild the program, config and markets from nothing, the backend keeps its own records of fills and settlements, and the site says the network was reset and that positions from before it are gone (play money). If the chain returns during trading hours, the admin pauses briefly so stale orders can be cancelled first.
