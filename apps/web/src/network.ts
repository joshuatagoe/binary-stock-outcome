// The website's network settings (ARCHITECTURE.md §11). No secrets: the site is plain files (D23). The RPC is
// devnet's public one: public/_headers lets the page talk to nothing else, and a keyed RPC would end up in the
// bundle.
export const RPC_URL = 'https://api.devnet.solana.com';
export const EXPLORER_CLUSTER = 'devnet';
// The banner on every page (D33, §11's devnet label).
export const NETWORK_LABEL = "Solana devnet · USDC here is Circle's test token, no real value";
