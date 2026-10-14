// What the site says when a wallet or the program refuses (D13, D115, D136; ARCHITECTURE.md §6 "Errors, in USERS.md's words").
import { describe, expect, it } from 'vitest';
import { describeConnectFailure, describeLandedFailure, describeSimulationFailure, describeWalletFailure, WALLET_WORDS } from '../src/failures.ts';

const walletError = (code: number, message = 'x') => Object.assign(new Error(message), { code });

describe('a wallet that refuses to sign', () => {
  it('code 4001 says nothing was sent and names the network (D136)', () => {
    expect(describeWalletFailure(walletError(4001))).toEqual({
      kind: 'closed',
      message: "Nothing was sent. If your wallet said the network doesn't match, switch it to Solana Devnet and try again.",
    });
  });

  it('finds the code on the error’s cause, where Kit’s wallet layer puts it', () => {
    const wrapped = Object.assign(new Error('The wallet failed to sign'), { cause: walletError(4001) });
    expect(describeWalletFailure(wrapped)).toMatchObject({ kind: 'closed' });
  });

  it('code -32003, after a transaction that passed on devnet, means the wrong network (D115)', () => {
    expect(describeWalletFailure(walletError(-32003))).toEqual({
      kind: 'wrong-network',
      message: 'Your wallet seems to be on Mainnet. Switch it to Solana Devnet, then try again.',
    });
  });

  it('any other wallet failure says nothing was sent, with the wallet’s own words', () => {
    expect(describeWalletFailure(new Error('Wallet is locked'))).toEqual({
      kind: 'failed',
      message: "Your wallet didn't sign: Wallet is locked. Nothing was sent.",
    });
  });

  it('a closed connect pop-up (4001) shows the same words, and any other connect failure says what the wallet said', () => {
    expect(describeConnectFailure(walletError(4001))).toEqual({ kind: 'closed', message: WALLET_WORDS.closed });
    expect(describeConnectFailure(new Error('User rejected'))).toEqual({ kind: 'failed', message: "The wallet didn't connect: User rejected" });
  });

  it('keeps the words in one place for the connect step too', () => {
    expect(WALLET_WORDS.closed).toBe("Nothing was sent. If your wallet said the network doesn't match, switch it to Solana Devnet and try again.");
  });
});

const custom = (code: number) => ({ InstructionError: [1, { Custom: code }] });

describe("the program's refusals, seen in the devnet simulation before the wallet opens (D115)", () => {
  it('reads the error numbers Kit returns as bigint', () => {
    expect(describeSimulationFailure({ InstructionError: [2n, { Custom: 6022n }] }, 'buyYes').kind).toBe('orders-closed');
    expect(describeSimulationFailure({ InstructionError: [2n, { Custom: 6015n }] }, 'sellNo').kind).toBe('not-implemented');
  });

  it('orders closed (6022)', () => {
    expect(describeSimulationFailure(custom(6022), 'buyYes')).toEqual({
      kind: 'orders-closed',
      message: 'Trading has ended, so nothing was bought and nothing was sent.',
    });
    expect(describeSimulationFailure(custom(6022), 'sellYes').message).toBe('Trading has ended, so nothing was sold and nothing was sent.');
  });

  it('not open yet (6021)', () => {
    expect(describeSimulationFailure(custom(6021), 'buyYes').message).toBe('Opens 9:30 AM ET');
  });

  it('paused (6012)', () => {
    expect(describeSimulationFailure(custom(6012), 'buyYes').message).toBe(
      'Trading is paused by the admin. You can still cancel orders, close pairs and redeem.',
    );
  });

  it('a re-sent order ID (6010) is "already placed", not an error to retry', () => {
    expect(describeSimulationFailure(custom(6010), 'buyYes')).toEqual({
      kind: 'already-placed',
      message: 'This order was already placed. The book and your balances show what happened to it.',
    });
  });

  it('too little USDC is only claimed when the trade instruction says it, not an account-opening instruction before it', () => {
    expect(describeSimulationFailure({ InstructionError: [0, { Custom: 1 }] }, 'buyYes', 1).kind).toBe('refused');
    expect(describeSimulationFailure({ InstructionError: [1n, { Custom: 1 }] }, 'buyYes', 1).kind).toBe('not-enough-usdc');
  });

  it('book full (6009)', () => {
    expect(describeSimulationFailure(custom(6009), 'buyYes').message).toBe("This market's order book is full.");
  });

  it('Buy No and Sell No are not built into the program yet (6015, P31): says so and that nothing was sent', () => {
    expect(describeSimulationFailure(custom(6015), 'buyNo')).toEqual({
      kind: 'not-implemented',
      message: "Buy No isn't switched on yet: the program accepts it in a later release. Nothing was sent.",
    });
    expect(describeSimulationFailure(custom(6015), 'sellNo').message).toMatch(/^Sell No isn't switched on yet/);
  });

  it('devnet still runs the first program, which does not know these instructions at all', () => {
    expect(describeSimulationFailure({ InstructionError: [0, 'InvalidInstructionData'] }, 'buyNo').kind).toBe('not-implemented');
    expect(describeSimulationFailure('ProgramAccountNotFound', 'buyYes').kind).toBe('refused');
  });

  it('a sell that the wallet cannot cover says which token is short, and that nothing was sent', () => {
    expect(describeSimulationFailure({ InstructionError: [2, { Custom: 1 }] }, 'sellNo', 2)).toEqual({
      kind: 'not-enough-usdc',
      message: "Your wallet doesn't hold enough No to sell. Nothing was sent.",
    });
    expect(describeSimulationFailure({ InstructionError: [1, { Custom: 1 }] }, 'sellYes', 1).message).toBe("Your wallet doesn't hold enough Yes to sell. Nothing was sent.");
  });

  it('a buy that the wallet cannot cover says USDC, and that nothing was sent', () => {
    expect(describeSimulationFailure({ InstructionError: [2, { Custom: 1 }] }, 'buyNo', 2).message).toBe("Your wallet doesn't hold enough USDC for this order. Nothing was sent.");
  });

  it('too little USDC in the token account (token program error 1)', () => {
    expect(describeSimulationFailure(custom(1), 'buyYes')).toMatchObject({ kind: 'not-enough-usdc' });
  });

  it('no SOL for fees', () => {
    expect(describeSimulationFailure('InsufficientFundsForFee', 'buyYes').message).toMatch(/devnet SOL/);
  });

  it('anything else is refused with the raw reason, and nothing was sent', () => {
    const f = describeSimulationFailure({ InstructionError: [0, { Custom: 9999 }] }, 'buyYes');
    expect(f.kind).toBe('refused');
    expect(f.message).toMatch(/^Devnet refused this order, so nothing was sent\./);
    expect(f.message).toContain('9999');
  });
});

describe('Cancel order refused (F6, D68, D90)', () => {
  const custom = (code: number) => ({ InstructionError: [0, { Custom: code }] });
  const GONE = 'That order is no longer open: it was filled or cancelled before this cancel arrived. Nothing was changed; your balances and positions show what happened.';

  it('an order that already filled (or was cancelled) says so, and that nothing changed', () => {
    expect(describeSimulationFailure(custom(6031), 'cancel', 0)).toEqual({ kind: 'refused', message: GONE });
  });

  it('the same refusal after the cancel was sent costs the network fee, and says so', () => {
    expect(describeLandedFailure(custom(6031), 'cancel')).toEqual({ kind: 'refused', message: `${GONE} Only the network fee was charged.` });
  });

  it('is never refused for a pause or the close, which do not stop a cancel (D68): an unexpected code is shown plainly', () => {
    expect(describeSimulationFailure(custom(6012), 'cancel', 0).message).not.toMatch(/paused by the admin/);
    expect(describeSimulationFailure(custom(6022), 'cancel', 0).message).not.toMatch(/Trading has ended/);
  });

  it('a wallet with no SOL for the fee is told where to get some', () => {
    expect(describeSimulationFailure('InsufficientFundsForFee', 'cancel')).toMatchObject({ kind: 'no-sol' });
  });

  it('a short token balance is not "not enough USDC": a cancel moves none of the wallet’s tokens', () => {
    expect(describeSimulationFailure(custom(1), 'cancel', 0).message).not.toMatch(/enough USDC/);
  });
});

describe('a full book refuses a Buy No limit whole (D138, D143)', () => {
  it('in the simulation, before the wallet opens: "This market’s order book is full."', () => {
    expect(describeSimulationFailure({ InstructionError: [2, { Custom: 6009 }] }, 'buyNo', 2)).toEqual({
      kind: 'refused',
      message: "This market's order book is full.",
    });
  });
});
