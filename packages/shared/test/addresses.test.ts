import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROGRAM_ADDRESS, marketAccounts, marketAddress, marketSeeds } from '../src/index.ts';

describe('market addresses (D139)', () => {
  it('uses the program address in Anchor.toml', () => {
    const toml = readFileSync(new URL('../../../Anchor.toml', import.meta.url), 'utf8');
    expect(toml).toContain(`meridian = "${PROGRAM_ADDRESS}"`);
  });

  it('the market seeds are the word, the ticker bytes, a 4-byte little-endian day and an 8-byte little-endian strike', () => {
    const seeds = marketSeeds('META', 20261008, 68000n);
    expect(seeds.length).toBe(4);
    expect(Array.from(seeds[0]!)).toEqual(Array.from(new TextEncoder().encode('market')));
    expect(Array.from(seeds[1]!)).toEqual([0x4d, 0x45, 0x54, 0x41]);
    // 20261008 = 0x01352890, written least significant byte first
    expect(Array.from(seeds[2]!)).toEqual([0x90, 0x28, 0x35, 0x01]);
    // 68000 = 0x109A0
    expect(Array.from(seeds[3]!)).toEqual([0xa0, 0x09, 0x01, 0, 0, 0, 0, 0]);
  });

  it('a known value: META 680, 8 Oct 2026', async () => {
    const m = await marketAddress('META', 20261008, 68000n);
    expect(m).toBe('85EQ3tbpqT9gjjW8qKRz6oHpy1V6zZFnAqawghHx7659');
  });

  it('is deterministic and changes with every input', async () => {
    const a = await marketAddress('META', 20261008, 68000n);
    expect(await marketAddress('META', 20261008, 68000n)).toBe(a);
    expect(await marketAddress('AAPL', 20261008, 68000n)).not.toBe(a);
    expect(await marketAddress('META', 20261009, 68000n)).not.toBe(a);
    expect(await marketAddress('META', 20261008, 69000n)).not.toBe(a);
  });

  it('known values for the six linked accounts of that market (a one-off script with Node Buffers, not this code)', async () => {
    const a = await marketAccounts(await marketAddress('META', 20261008, 68000n));
    expect(a).toEqual({
      yesMint: '8hDf4WfhCE1Y7zzW9Yck9gibcWmPDnJJJznBomyT7EcL',
      noMint: 'FAsfCpPNV2947Nqn7PbZi3ATeJh21JzqarFLzEyax5uJ',
      vault: '6o86U1RRFWkHX5YsvVU9E5r2fhMCcz4DHEHJJ4ENGsGq',
      book: 'ASsemutV7jjJhdWhikzVHZwtAWzreisfBFGHp2qwqaHo',
      bookUsdc: 'AwFjFRZBH6BKStV2dUhM31WTTqKHrADWELkoHEVTV6rf',
      bookYes: '4pqvkC81Tw1WgiqH461goMYDAoPPhFABY7bCFP5Kw2BB',
    });
  });

  it('derives the six linked accounts from their words and the market address', async () => {
    const market = await marketAddress('META', 20261008, 68000n);
    const a = await marketAccounts(market);
    const all = [a.yesMint, a.noMint, a.vault, a.book, a.bookUsdc, a.bookYes];
    expect(new Set(all).size).toBe(6);
    expect(all).not.toContain(market);
    const other = await marketAccounts(await marketAddress('META', 20261008, 69000n));
    expect(other.vault).not.toBe(a.vault);
  });

  it('refuses a strike or day that does not fit its width', () => {
    expect(() => marketSeeds('META', 2 ** 32, 1n)).toThrow();
    expect(() => marketSeeds('META', 20261008, -1n)).toThrow();
    expect(() => marketSeeds('META', 20261008, 2n ** 64n)).toThrow();
  });
});
