// What the site says when a wallet or the program refuses (D13, D115, D136; ARCHITECTURE.md §6, "Errors, in USERS.md's words").
import type { TradeAction } from '@meridian/shared';

export type FailureKind =
  | 'closed'
  | 'wrong-network'
  | 'failed'
  | 'refused'
  | 'orders-closed'
  | 'not-implemented'
  | 'not-enough-usdc'
  | 'no-sol'
  | 'expired'
  | 'already-placed';

export type Failure = { kind: FailureKind; message: string };

export const WALLET_WORDS = {
  // Code 4001 is a closed window, and also what Solflare returns when it refuses a devnet transaction while set to
  // Mainnet (M0.13), so these words cover both (D136).
  closed: "Nothing was sent. If your wallet said the network doesn't match, switch it to Solana Devnet and try again.",
  wrongNetwork: 'Your wallet seems to be on Mainnet. Switch it to Solana Devnet, then try again.',
  noWallet: 'No Solana wallet found. Install one (for example Phantom), then reload this page.',
} as const;

function show(value: unknown): string {
  try {
    return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? `${v}` : v)) ?? String(value);
  } catch {
    return String(value);
  }
}

/** The simulation on devnet failed: carries the transaction error devnet returned. */
export class SimulationFailed extends Error {
  readonly simulationErr: unknown;
  constructor(simulationErr: unknown) {
    super(`devnet's simulation failed: ${show(simulationErr)}`);
    this.simulationErr = simulationErr;
  }
}

/** Wallets put their code (4001, -32003, ...) on the error or on its cause. */
export function walletCode(error: unknown): number | undefined {
  let e = error as { code?: unknown; cause?: unknown } | undefined;
  for (let depth = 0; e && typeof e === 'object' && depth < 5; depth++, e = e.cause as typeof e) {
    if (typeof e.code === 'number') return e.code;
  }
  return undefined;
}

export function describeWalletFailure(error: unknown): Failure {
  const code = walletCode(error);
  if (code === 4001) return { kind: 'closed', message: WALLET_WORDS.closed };
  if (code === -32003) return { kind: 'wrong-network', message: WALLET_WORDS.wrongNetwork };
  const said = error instanceof Error ? error.message : String(error);
  return { kind: 'failed', message: `Your wallet didn't sign: ${said}. Nothing was sent.` };
}

/** A wallet that did not connect: a closed pop-up shows the same words as a closed signing window (F2, D136). */
export function describeConnectFailure(error: unknown): Failure {
  const code = walletCode(error);
  if (code === 4001) return { kind: 'closed', message: WALLET_WORDS.closed };
  const said = error instanceof Error ? error.message : String(error);
  return { kind: 'failed', message: `The wallet didn't connect: ${said}` };
}

/** The program's error number, or the instruction error's name, from a transaction error. */
function instructionError(err: unknown): { custom?: number; name?: string; index?: number } {
  const ie = (err as { InstructionError?: [number, unknown] } | null)?.InstructionError;
  if (!ie) return {};
  const detail = ie[1];
  const index = Number(ie[0]);
  if (typeof detail === 'string') return { name: detail, index };
  // Kit hands transaction error numbers back as bigint.
  const custom = (detail as { Custom?: number | bigint } | null)?.Custom;
  return typeof custom === 'number' || typeof custom === 'bigint' ? { custom: Number(custom), index } : { index };
}

const done = (action: TradeAction) => (action === 'buyYes' || action === 'buyNo' ? 'bought' : 'sold');

// The program's errors that read the same before and after sending (ARCHITECTURE.md §6).
function programWords(custom: number | undefined): string | null {
  switch (custom) {
    case 6021:
      return 'Opens 9:30 AM ET';
    case 6012:
      return 'Trading is paused by the admin. You can still cancel orders, close pairs and redeem.';
    case 6009:
      return "This market's order book is full.";
    default:
      return null;
  }
}

const notImplemented = (action: TradeAction): Failure => ({
  kind: 'not-implemented',
  message: `${action === 'buyNo' ? 'Buy No' : 'Sell No'} isn't switched on yet: the program accepts it in a later release. Nothing was sent.`,
});

const ALREADY_PLACED: Failure = {
  kind: 'already-placed',
  message: 'This order was already placed. The book and your balances show what happened to it.',
};

/** A refusal in the devnet simulation, before the wallet opens: nothing was sent, so nothing was charged (D115). */
export function describeSimulationFailure(err: unknown, action: TradeAction, tradeIndex?: number): Failure {
  const { custom, name, index } = instructionError(err);
  const noToken = action === 'buyNo' || action === 'sellNo';
  if (noToken && (custom === 6015 || name === 'InvalidInstructionData')) return notImplemented(action);
  if (custom === 6022) return { kind: 'orders-closed', message: `Trading has ended, so nothing was ${done(action)} and nothing was sent.` };
  const words = programWords(custom);
  if (words) return { kind: 'refused', message: words };
  if (custom === 6010) return ALREADY_PLACED;
  if (custom === 1 && (tradeIndex === undefined || index === tradeIndex)) {
    // The token program's "insufficient funds": a buy is short of USDC, a sell is short of the token it sells.
    const short = action === 'buyYes' || action === 'buyNo' ? 'USDC for this order' : `${action === 'sellYes' ? 'Yes' : 'No'} to sell`;
    return { kind: 'not-enough-usdc', message: `Your wallet doesn't hold enough ${short}. Nothing was sent.` };
  }
  if (err === 'InsufficientFundsForFee' || err === 'AccountNotFound') {
    return {
      kind: 'no-sol',
      message: "You need a little devnet SOL for network fees, about 0.01 SOL. It's free at faucet.solana.com: choose Devnet and paste your address.",
    };
  }
  return { kind: 'refused', message: `Devnet refused this order, so nothing was sent. (${show(err)})` };
}

/** An order that was sent and landed with an error: the network fee was charged (ARCHITECTURE.md §6). */
export function describeLandedFailure(err: unknown, action: TradeAction): Failure {
  const { custom } = instructionError(err);
  if (custom === 6022) {
    return {
      kind: 'orders-closed',
      message: `Trading ended before your order reached the network. Nothing was ${done(action)}; only the network fee was charged.`,
    };
  }
  if (custom === 6010) return ALREADY_PLACED;
  const words = programWords(custom);
  if (words) return { kind: 'refused', message: `${words} Only the network fee was charged.` };
  return { kind: 'failed', message: `The program refused your order after it was sent; only the network fee was charged. (${show(err)})` };
}
