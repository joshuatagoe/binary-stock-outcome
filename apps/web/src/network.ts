// The website's network settings (ARCHITECTURE.md §11). No secrets: the site is plain files (D23).
// The deployed site uses devnet's public RPC: public/_headers lets the page talk to nothing else, and a keyed RPC
// would end up in the bundle. `vite --mode localnet`, which make dev runs (D74), uses the local chain instead (Vite
// refuses "local" as a mode's name: it would clash with .env.local).
const LOCAL = import.meta.env.MODE === 'localnet';

// Devnet's RPC in every mode, for the wallet test, whose tokens are devnet mints (P28).
export const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
export const RPC_URL = LOCAL ? 'http://127.0.0.1:8899' : DEVNET_RPC_URL;

// The banner on every page (D33, §11's label for each network).
export const NETWORK_LABEL = LOCAL
  ? 'Local demo · fake prices and a fake clock'
  : "Solana devnet · USDC here is Circle's test token, no real value";

// The page's words for the chain it reads. The local chain has no USDC until M2 adds a test mint, so Config holds
// devnet's address there (config/program-local.json).
export const CHAIN = LOCAL
  ? {
      name: 'the local chain',
      heading: 'Live on the local chain',
      missing: 'make dev sets them up as it starts, so stop it and start it again.',
      usdc: "USDC (devnet's address; the local chain has no USDC yet)",
    }
  : {
      name: 'Solana devnet',
      heading: 'Live on devnet',
      missing: 'Devnet may have been reset; the program is set up again after a reset.',
      usdc: "USDC (Circle's test token)",
    };

// An address on Solana's Explorer, on devnet. Locally there is none: the Explorer, pointed at the local chain
// through its custom-cluster option, never finished loading in Chrome (M0.14).
export function explorerAddress(address: string) {
  return LOCAL ? null : `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
