// Saves devnet's two token programs for the program tests, so they run what devnet runs (ARCHITECTURE.md §9, AR.14):
// Token-2022 with Permissioned Burn, which the copies bundled with Mollusk and LiteSVM may predate, and the classic
// token program for USDC. Read-only: two RPC reads per program.
//   node scripts/program/dump-token-programs.mjs
// Writes programs/meridian/tests/fixtures/<name>.so and, in token-programs.json, the slot, size and SHA-256 of each.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAddressDecoder } from '@solana/kit';

const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const PROGRAMS = {
  spl_token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  spl_token_2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
};
const OUT = join(import.meta.dirname, '..', '..', 'programs', 'meridian', 'tests', 'fixtures');

async function account(address) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'base64', commitment: 'finalized' }] }),
  });
  const body = await res.json();
  if (body.error || !body.result?.value) throw new Error(`${address}: ${JSON.stringify(body.error ?? 'not found')}`);
  return { slot: body.result.context.slot, owner: body.result.value.owner, data: Buffer.from(body.result.value.data[0], 'base64') };
}

// An upgradeable program's account holds a 4-byte tag and the address of its ProgramData account, whose first 45
// bytes are the loader's header (tag, slot, upgrade authority); the program's ELF follows.
mkdirSync(OUT, { recursive: true });
const record = {};
for (const [name, address] of Object.entries(PROGRAMS)) {
  const program = await account(address);
  if (program.owner !== 'BPFLoaderUpgradeab1e11111111111111111111111') throw new Error(`${name}: unexpected owner ${program.owner}`);
  const programData = await account(getAddressDecoder().decode(program.data.subarray(4, 36)));
  const elf = programData.data.subarray(45);
  if (elf.subarray(0, 4).toString('latin1') !== '\x7fELF') throw new Error(`${name}: ProgramData does not hold an ELF`);
  writeFileSync(join(OUT, `${name}.so`), elf);
  record[name] = { program: address, slot: programData.slot, bytes: elf.length, sha256: createHash('sha256').update(elf).digest('hex') };
}
record.savedAt = new Date().toISOString();
writeFileSync(join(OUT, 'token-programs.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(record);
