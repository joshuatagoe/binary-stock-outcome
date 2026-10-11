// The backend's settings: config/<network>.json, with no secrets (ARCHITECTURE.md §11). Secrets come from the
// environment, which .env.example lists (D17).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Config = {
  network: string;
  rpc: { public: string };
  checkEverySecs: number;
  heartbeatEverySecs: number;
};

const ROOT = join(import.meta.dirname, '..', '..', '..');

export function loadConfig(network: string, root = ROOT): Config {
  if (!/^[a-z]+$/.test(network)) throw new Error(`MERIDIAN_NETWORK must be a network's name, like devnet; it is "${network}"`);
  const config = JSON.parse(readFileSync(join(root, 'config', `${network}.json`), 'utf8')) as Config;
  if (config.network !== network) throw new Error(`config/${network}.json is for "${config.network}"`);
  for (const key of ['checkEverySecs', 'heartbeatEverySecs'] as const) {
    if (!(Number.isInteger(config[key]) && config[key] > 0)) throw new Error(`config/${network}.json: ${key} must be a whole number of seconds`);
  }
  new URL(config.rpc.public);
  return config;
}

// The store's file: DATABASE_PATH, which the image sets to the volume, or meridian.db in the current folder,
// which git ignores.
export const databasePath = (env: NodeJS.ProcessEnv = process.env) => env.DATABASE_PATH || 'meridian.db';

// A required secret from the environment.
export function required(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set; .env.example says what it holds`);
  return value;
}
