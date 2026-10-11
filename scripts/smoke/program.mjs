// The program's smoke test (M0): Config on devnet exists, is owned by our program, and holds what
// config/program-devnet.json initialized: the USDC mint, the Pyth receivers and the tickers with their feed IDs.
//   node scripts/smoke/program.mjs
// Each read gives up after 15 seconds, and a failed read is retried up to 5 times, so one devnet blip doesn't
// fail a good deploy. SOLANA_RPC_URL overrides the public devnet endpoint.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSolanaRpc } from '@solana/kit';
import { fetchMaybeConfig, findConfigPda, MERIDIAN_PROGRAM_ADDRESS } from '../../clients/ts/src/generated/index.ts';

const hex = (bytes) => Buffer.from(bytes).toString('hex');

// account: { owner, config } as read from devnet, or null if there is none.
export function judgeConfig(account, values) {
  if (!account) return ['there is no Config account on devnet'];
  const problems = [];
  if (account.owner !== MERIDIAN_PROGRAM_ADDRESS) problems.push(`Config is owned by ${account.owner}, not ${MERIDIAN_PROGRAM_ADDRESS}`);
  const c = account.config;
  if (c.usdcMint !== values.usdcMint) problems.push(`the USDC mint is ${c.usdcMint}; expected ${values.usdcMint}`);
  if (c.pythReceivers.join() !== values.pythReceivers.join()) problems.push(`the Pyth receivers are ${c.pythReceivers.join(', ')}`);
  const want = values.tickers.map((t) => `${t.symbol}:${t.feedId}:${t.strikeStepCents}:${t.enabled}`);
  const got = c.tickers.map((t) => `${t.symbol}:${hex(t.feedId)}:${t.strikeStepCents}:${t.enabled}`);
  for (let i = 0; i < Math.max(want.length, got.length); i++) {
    if (want[i] !== got[i]) problems.push(`ticker ${i + 1} is ${got[i] ?? 'missing'}; expected ${want[i] ?? 'none'}`);
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const values = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'config', 'program-devnet.json'), 'utf8'));
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com');
  const [address] = await findConfigPda();
  let problems = ['not tried'];
  for (let attempt = 1; attempt <= 5; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 5000));
    try {
      const maybe = await fetchMaybeConfig(rpc, address, { commitment: 'confirmed', abortSignal: AbortSignal.timeout(15_000) });
      problems = judgeConfig(maybe.exists ? { owner: maybe.programAddress, config: maybe.data } : null, values);
      break;
    } catch (error) {
      problems = [`devnet didn't answer: ${error.message}`];
      console.log(`attempt ${attempt}: ${problems[0]}`);
    }
  }
  console.log(problems.length ? problems.join('\n') : `ok: Config ${address} matches config/program-devnet.json`);
  process.exit(problems.length ? 1 : 0);
}
