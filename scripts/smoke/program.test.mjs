// The program's smoke test: Config on devnet holds what config/program-devnet.json initialized (D133, M0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDecoder } from '../../clients/ts/src/generated/index.ts';
import { judgeConfig } from './program.mjs';

const repo = join(import.meta.dirname, '..', '..');
const values = JSON.parse(readFileSync(join(repo, 'config', 'program-devnet.json'), 'utf8'));
const recorded = JSON.parse(readFileSync(join(repo, 'apps', 'web', 'test', 'fixtures', 'config-account.json'), 'utf8'));
const account = { owner: recorded.value.owner, config: getConfigDecoder().decode(Buffer.from(recorded.value.data[0], 'base64')) };

test('the recorded Config matches config/program-devnet.json', () => {
  assert.deepEqual(judgeConfig(account, values), []);
});

test('a missing Config, or one owned by another program, fails', () => {
  assert.match(judgeConfig(null, values)[0] ?? '', /no Config/);
  assert.match(judgeConfig({ ...account, owner: '11111111111111111111111111111111' }, values)[0] ?? '', /owned by/);
});

test('a different USDC mint, receiver list or ticker fails, naming it', () => {
  const swap = (patch) => judgeConfig({ ...account, config: { ...account.config, ...patch } }, values)[0] ?? '';
  assert.match(swap({ usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }), /USDC/);
  assert.match(swap({ pythReceivers: account.config.pythReceivers.slice(0, 1) }), /receivers/);
  const tickers = account.config.tickers.map((t, i) => (i === 6 ? { ...t, feedId: new Uint8Array(32) } : t));
  assert.match(swap({ tickers }), /TSLA/);
});
