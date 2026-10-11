// Turns Config, as stored on devnet, into the status panel's words and links (ARCHITECTURE.md §5, §7).
// Every state has a word, so colour is never the only signal (USERS.md, Accessibility).
import { MERIDIAN_PROGRAM_ADDRESS, type Config } from '@meridian/client';
import { EXPLORER_CLUSTER } from './network.ts';

export type Link = { address: string; url: string };

export type ConfigPanel = {
  stocks: { symbol: string; status: 'Open for new markets' | 'Turned off' }[];
  trading: 'Open' | 'Paused';
  usdcMint: Link;
  program: Link;
  config: Link;
};

const link = (address: string): Link => ({
  address,
  url: `https://explorer.solana.com/address/${address}?cluster=${EXPLORER_CLUSTER}`,
});

export function describeConfig(config: Config, configAddress: string): ConfigPanel {
  return {
    stocks: config.tickers.map((t) => ({ symbol: t.symbol, status: t.enabled ? 'Open for new markets' : 'Turned off' })),
    trading: config.paused ? 'Paused' : 'Open',
    usdcMint: link(config.usdcMint),
    program: link(MERIDIAN_PROGRAM_ADDRESS),
    config: link(configAddress),
  };
}
