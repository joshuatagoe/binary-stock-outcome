// Reads Config straight from Solana, not through our backend, so this stays right while the backend is
// down (ARCHITECTURE.md §7). A read gives up after 10 seconds, as the backend's do (P25), so a devnet that
// accepts the connection and goes quiet can't leave the page loading forever.
import { fetchMaybeConfig, findConfigPda } from '@meridian/client';
import { createSolanaRpc } from '@solana/kit';
import { describeConfig, type ConfigPanel } from './describe-config.ts';
import { CHAIN, RPC_URL } from './network.ts';

export const READ_TIMEOUT_MS = 10_000;

// The chain answered, but Config isn't there: after a devnet reset (D19), until the program is set up again, or
// on a local chain that make dev hasn't finished setting up.
export class ConfigMissing extends Error {}

export const chainRpc = createSolanaRpc(RPC_URL);

type Rpc = Parameters<typeof fetchMaybeConfig>[0];

export async function readConfig(rpc: Rpc, signal: AbortSignal, timeoutMs = READ_TIMEOUT_MS): Promise<ConfigPanel> {
  const abortSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  const [address] = await findConfigPda();
  const account = await fetchMaybeConfig(rpc, address, { abortSignal, commitment: 'confirmed' });
  if (!account.exists) throw new ConfigMissing(`Config ${address} is not on ${CHAIN.name}`);
  return describeConfig(account.data, address);
}
