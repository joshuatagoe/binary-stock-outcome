// The status panel's words come from Config as stored on devnet (ARCHITECTURE.md §5, §7).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDecoder, MERIDIAN_PROGRAM_ADDRESS } from '@meridian/client';
import { describe, expect, it } from 'vitest';
import { describeConfig } from '../src/describe-config.ts';

const repo = join(import.meta.dirname, '..', '..', '..');
const recorded = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'config-account.json'), 'utf8'));
const config = getConfigDecoder().decode(Buffer.from(recorded.value.data[0], 'base64'));
const values = JSON.parse(readFileSync(join(repo, 'config', 'program-devnet.json'), 'utf8'));
const CONFIG = 'Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e';
const explorer = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;

describe('the Config panel', () => {
  it("lists the stocks in Config's order, as initialized from config/program-devnet.json", () => {
    const panel = describeConfig(config, CONFIG);
    expect(panel.stocks.map((s) => s.symbol)).toEqual(values.tickers.map((t: { symbol: string }) => t.symbol));
    expect(panel.stocks.every((s) => s.status === 'Open for new markets')).toBe(true);
  });

  it('says whether trading is open, and links each address to the Explorer on devnet', () => {
    const panel = describeConfig(config, CONFIG);
    expect(panel.trading).toBe('Open');
    expect(panel.usdcMint).toEqual({ address: values.usdcMint, url: explorer(values.usdcMint) });
    expect(panel.program).toEqual({ address: MERIDIAN_PROGRAM_ADDRESS, url: explorer(MERIDIAN_PROGRAM_ADDRESS) });
    expect(panel.config).toEqual({ address: CONFIG, url: explorer(CONFIG) });
  });

  it('puts a word on a paused market and a turned-off stock, never colour alone', () => {
    const tickers = config.tickers.map((t, i) => (i === 0 ? { ...t, enabled: false } : t));
    const panel = describeConfig({ ...config, paused: true, tickers }, CONFIG);
    expect(panel.trading).toBe('Paused');
    expect(panel.stocks[0]).toEqual({ symbol: 'AAPL', status: 'Turned off' });
  });
});
