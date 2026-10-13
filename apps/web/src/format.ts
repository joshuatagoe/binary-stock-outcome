// The wallet header's words (USERS.md F2).

/** "7xKX…9fQ2". */
export function shortAddress(address: string): string {
  return address.length <= 9 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** SOL from lamports: two decimals, or four when the amount is under 0.01 and not zero. */
export function formatSol(lamports: bigint): string {
  const sol = Number(lamports) / 1e9;
  return lamports !== 0n && sol < 0.01 ? sol.toFixed(4) : sol.toFixed(2);
}

const LOW_SOL = 3_000_000n; // about 0.003 SOL for fees and deposits
const FAUCET_SOL = 'https://faucet.solana.com';
const FAUCET_USDC = 'https://faucet.circle.com';

export type FundsNote = { id: 'sol' | 'usdc'; text: string; faucet: string };

export function fundsNotes(funds: { sol: bigint; usdc: bigint } | null): FundsNote[] {
  if (!funds) return [];
  const notes: FundsNote[] = [];
  if (funds.sol === 0n) {
    notes.push({
      id: 'sol',
      text: "You need a little devnet SOL for network fees, about 0.01 SOL. It's free at faucet.solana.com: choose Devnet and paste your address.",
      faucet: FAUCET_SOL,
    });
  } else if (funds.sol < LOW_SOL) {
    notes.push({
      id: 'sol',
      text: `You have ${formatSol(funds.sol)} SOL. Orders need about 0.003 SOL for fees and deposits. Get more at faucet.solana.com: choose Devnet and paste your address.`,
      faucet: FAUCET_SOL,
    });
  }
  if (funds.usdc === 0n) {
    notes.push({
      id: 'usdc',
      text: 'Get test USDC at faucet.circle.com: choose Solana Devnet and paste your address. It gives 20 USDC every 2 hours. This USDC has no value.',
      faucet: FAUCET_USDC,
    });
  }
  return notes;
}
