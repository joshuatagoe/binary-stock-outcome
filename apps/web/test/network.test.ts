// The website reads devnet when deployed and the local chain under make dev (D74, §11). Vite's mode decides which.
import { afterEach, describe, expect, it, vi } from 'vitest';

async function network(mode: string) {
  vi.stubEnv('MODE', mode);
  vi.resetModules();
  return import('../src/network.ts');
}

afterEach(() => vi.unstubAllEnvs());

describe('the network settings', () => {
  it('read devnet in every mode but make dev’s', async () => {
    for (const mode of ['production', 'development']) {
      const n = await network(mode);
      expect(n.RPC_URL).toBe('https://api.devnet.solana.com');
      expect(n.NETWORK_LABEL).toBe("Solana devnet · USDC here is Circle's test token, no real value");
      expect(n.CHAIN.heading).toBe('Live on devnet');
      expect(n.explorerAddress('Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e')).toBe(
        'https://explorer.solana.com/address/Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e?cluster=devnet',
      );
    }
  });

  it('read the local chain under make dev, say so, and link nothing to the Explorer', async () => {
    const n = await network('localnet');
    expect(n.RPC_URL).toBe('http://127.0.0.1:8899');
    expect(n.NETWORK_LABEL).toBe('Local demo · fake prices and a fake clock');
    expect(n.CHAIN.heading).toBe('Live on the local chain');
    expect(n.CHAIN.name).toBe('the local chain');
    // The wallet test's tokens are devnet mints (config/m0-wallet-test.json), so it stays on devnet.
    expect(n.DEVNET_RPC_URL).toBe('https://api.devnet.solana.com');
    // Solana's Explorer, pointed at the local chain, never finished loading in Chrome (M0.14).
    expect(n.explorerAddress('Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e')).toBeNull();
  });
});
