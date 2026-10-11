// Prints one of the key files in WSL's ~/.config/solana as the base58 text that Phantom imports (D92):
// the admin key goes into its own Phantom account, and the admin and upgrade keys into a backup.
// Run it yourself, in your own Ubuntu terminal, never through an AI agent:
//   cd /mnt/c/dev/binary-stock-outcome && node scripts/keys/export-key.mjs admin
// It prints only to a terminal, so a pipe, a file or an agent's tool output gets nothing.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createKeyPairSignerFromBytes, getBase58Decoder } from '@solana/kit';

const NAMES = ['admin', 'upgrade', 'operator', 'program'];
const name = process.argv[2];
if (!NAMES.includes(name)) {
  console.error(`usage: node scripts/keys/export-key.mjs <${NAMES.join('|')}>`);
  process.exit(2);
}
if (!process.stdout.isTTY) {
  console.error('This prints a secret key, so it prints only to a terminal. Run it yourself in your own Ubuntu terminal.');
  process.exit(1);
}

const bytes = new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', `meridian-${name}.json`), 'utf8')));
// Refuses a file whose public half doesn't belong to its secret half.
const signer = await createKeyPairSignerFromBytes(bytes);
console.log(`meridian-${name}, address ${signer.address}. Its secret key:`);
console.log(getBase58Decoder().decode(bytes));
console.log('Paste it into Phantom (Add account, Import private key) or your password manager, then close this terminal.');
