// The wallet header's words (USERS.md F2): "7xKX…9fQ2 · 0.42 SOL · 20.00 USDC", and the low-funds notes.
import { describe, expect, it } from 'vitest';
import { fundsNotes, shortAddress, formatSol } from '../src/format.ts';

const usdc = (d: number) => BigInt(Math.round(d * 1_000_000));

describe('the wallet header', () => {
  it('shortens an address to its first and last four letters', () => {
    expect(shortAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU9fQ2')).toBe('7xKX…9fQ2');
  });
  it('writes SOL with two decimals, and four when it is small', () => {
    expect(formatSol(420_000_000n)).toBe('0.42');
    expect(formatSol(0n)).toBe('0.00');
    expect(formatSol(300_000n)).toBe('0.0003');
  });
});

describe('what a wallet is told it lacks (F2)', () => {
  it('no SOL: the faucet words', () => {
    expect(fundsNotes({ sol: 0n, usdc: usdc(20) })).toEqual([
      { id: 'sol', text: "You need a little devnet SOL for network fees, about 0.01 SOL. It's free at faucet.solana.com: choose Devnet and paste your address.", faucet: 'https://faucet.solana.com' },
    ]);
  });
  it('low SOL: how much, and what orders need', () => {
    expect(fundsNotes({ sol: 300_000n, usdc: usdc(20) }).map((n) => n.text)).toEqual([
      'You have 0.0003 SOL. Orders need about 0.003 SOL for fees and deposits. Get more at faucet.solana.com: choose Devnet and paste your address.',
    ]);
  });
  it('no USDC: the Circle faucet words', () => {
    expect(fundsNotes({ sol: 500_000_000n, usdc: 0n }).map((n) => n.text)).toEqual([
      'Get test USDC at faucet.circle.com: choose Solana Devnet and paste your address. It gives 20 USDC every 2 hours. This USDC has no value.',
    ]);
  });
  it('enough of both: nothing to say', () => {
    expect(fundsNotes({ sol: 500_000_000n, usdc: usdc(1) })).toEqual([]);
  });
  it('unknown balances: nothing to say', () => {
    expect(fundsNotes(null)).toEqual([]);
  });
});
