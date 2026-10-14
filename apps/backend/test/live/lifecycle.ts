// The transactions of the live run (M4-b): one market from creation through minting, resting and filled orders, cancels, Buy No and Sell No,
// plus one that fails. Each step names the events the program wrote, written by hand from programs/meridian/src, so the reader's rows are
// checked against what a person expects and not against the reader's own decoder. Local chain only: it uses Surfpool's cheat codes
// (surfnet_setAccount, surfnet_setTokenAccount) to give the USDC mint its supply and the traders their USDC.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as client from '@meridian/client';
import { marketAddress, marketAccounts, PROGRAM_ADDRESS } from '@meridian/shared';
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type KeyPairSigner,
} from '@solana/kit';

export const TOKEN = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022 = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ATA_PROGRAM = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYSTEM = address('11111111111111111111111111111111');
export const USDC_MINT = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // config/program-local.json's usdcMint

/** An event as the store should hold it: its kind and the fields of `data` (big numbers as text, as the store keeps them). */
export type Expected = { kind: string } & Record<string, unknown>;
export interface Step {
  name: string;
  signature: string;
  slot: number;
  failed: boolean;
  /** In the order the program wrote them. */
  expected: Expected[];
}

export interface Lifecycle {
  steps: Step[];
  market: Address;
  alice: Address;
  bob: Address;
  operator: Address;
  admin: Address;
}

export async function rpcCall(url: string, method: string, params: unknown[] = []): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as { error?: { message: string }; result: unknown };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ata(owner: Address, mint: Address, program: Address): Promise<Address> {
  const enc = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({ programAddress: ATA_PROGRAM, seeds: [enc.encode(owner), enc.encode(program), enc.encode(mint)] });
  return pda;
}

/** Creates an associated token account if it is missing (the idempotent instruction), paid by `payer`. */
export const createAta = (payer: KeyPairSigner, account: Address, owner: Address, mint: Address, program: Address): Instruction => ({
  programAddress: ATA_PROGRAM,
  accounts: [
    { address: payer.address, role: AccountRole.WRITABLE_SIGNER, signer: payer } as never,
    { address: account, role: AccountRole.WRITABLE },
    { address: owner, role: AccountRole.READONLY },
    { address: mint, role: AccountRole.READONLY },
    { address: SYSTEM, role: AccountRole.READONLY },
    { address: program, role: AccountRole.READONLY },
  ],
  data: new Uint8Array([1]),
});

export async function runLifecycle(rpcUrl: string, keysFolder: string): Promise<Lifecycle> {
  const rpc = createSolanaRpc(rpcUrl) as any;
  const keyFile = (name: string) => createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(keysFolder, `meridian-${name}.json`), 'utf8'))));
  const [operator, admin, alice, bob] = await Promise.all([keyFile('operator'), keyFile('admin'), generateKeyPairSigner(), generateKeyPairSigner()]);
  const eventAuthority = (await getProgramDerivedAddress({ programAddress: PROGRAM_ADDRESS, seeds: [new TextEncoder().encode('__event_authority')] }))[0];
  const common = { eventAuthority, program: PROGRAM_ADDRESS };
  const steps: Step[] = [];

  const chainNow = async () => Number(await rpc.getBlockTime(await rpc.getSlot().send()).send());
  const waitUntilChainTime = async (t: number) => {
    while ((await chainNow()) < t) await sleep(500);
  };

  // Sends one transaction and waits until it is confirmed. The next step starts in a later slot, so no two steps share one and the
  // order of their events is the order of the steps.
  async function send(name: string, instructions: Instruction[], payer: KeyPairSigner, expected: Expected[] = [], options: { fails?: boolean } = {}) {
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    );
    const signed = await signTransactionMessageWithSigners(message);
    const signature = getSignatureFromTransaction(signed);
    await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64', skipPreflight: options.fails === true }).send();
    for (let i = 0; i < 80; i++) {
      const [status] = (await rpc.getSignatureStatuses([signature]).send()).value;
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
        const failed = status.err !== null;
        if (failed !== (options.fails === true)) throw new Error(`${name}: ${failed ? `failed on the chain (${JSON.stringify(status.err, (_k, v) => (typeof v === 'bigint' ? String(v) : v))})` : 'was meant to fail and did not'}`);
        const slot = Number(status.slot);
        while (Number(await rpc.getSlot().send()) <= slot) await sleep(100);
        steps.push({ name, signature, slot, failed, expected });
        return;
      }
      await sleep(250);
    }
    throw new Error(`${name}: not confirmed in time`);
  }

  // Funds: SOL by airdrop, the USDC mint with a supply, and USDC in the traders' accounts (Surfpool cheat codes).
  for (const who of [alice, bob]) await rpc.requestAirdrop(who.address, 5_000_000_000n).send();
  const mintData = Buffer.alloc(82);
  mintData.writeBigUInt64LE(1_000_000_000_000n, 36); // supply
  mintData[44] = 6; // decimals
  mintData[45] = 1; // initialized
  await rpcCall(rpcUrl, 'surfnet_setAccount', [USDC_MINT, { lamports: 1_461_600, data: mintData.toString('hex'), owner: TOKEN, executable: false }]);
  for (const who of [alice, bob]) await rpcCall(rpcUrl, 'surfnet_setTokenAccount', [who.address, USDC_MINT, { amount: 100_000_000 }, TOKEN]);

  // A market of its own on every run, so the same chain can be used again: the strike is a multiple of the $10 step.
  const day = 20261013;
  const strikeCents = 1000 * (10 + Math.floor(Math.random() * 9000));
  const market = await marketAddress('AAPL', day, strikeCents);
  const accounts = await marketAccounts(market);

  // 1. The admin lets orders match more than zero resting orders (Config starts with a fill limit of 0).
  await send('update config', [await client.getUpdateConfigInstructionAsync({ admin, ...common, pythReceivers: null, tickers: null, ladderBps: null, thresholds: null, fillLimit: 32 })], admin, [
    { kind: 'ConfigUpdated', admin: admin.address, fillLimit: 32 },
  ]);

  // 2. The operator creates the market: minting opens in 8 s, orders in 20 s, and it closes in an hour.
  const t0 = await chainNow();
  const [mintOpen, open, close] = [t0 + 8, t0 + 20, t0 + 3600];
  await send('create market', [
    await client.getCreateMarketInstructionAsync({ creator: operator, market, usdcMint: USDC_MINT, ...common, ticker: 'AAPL', day, strikeCents, mintOpen, open, close }),
  ], operator, [
    { kind: 'MarketCreated', market, ticker: 'AAPL', day, strikeCents: String(strikeCents), mintOpen: String(mintOpen), open: String(open), close: String(close), creator: operator.address },
  ]);

  // The traders' Yes and No accounts (Token-2022), then the wait for minting to open.
  const accountsOf = async (who: KeyPairSigner) => ({
    usdc: await ata(who.address, USDC_MINT, TOKEN),
    yes: await ata(who.address, accounts.yesMint, TOKEN_2022),
    no: await ata(who.address, accounts.noMint, TOKEN_2022),
  });
  const [a, b] = [await accountsOf(alice), await accountsOf(bob)];
  for (const [who, own] of [[alice, a], [bob, b]] as const) {
    const created = [createAta(who, own.yes, who.address, accounts.yesMint, TOKEN_2022), createAta(who, own.no, who.address, accounts.noMint, TOKEN_2022)];
    await send(`accounts of ${who === alice ? 'alice' : 'bob'}`, created, who);
  }
  await waitUntilChainTime(mintOpen + 1);

  const tradeAccounts = (who: KeyPairSigner, own: typeof a) => ({ market, taker: who, takerUsdc: own.usdc, takerYes: own.yes, usdcMint: USDC_MINT, ...common });
  const noAccounts = (who: KeyPairSigner, own: typeof a) => ({ ...tradeAccounts(who, own), takerNo: own.no });
  const Buy = client.Side.Buy;
  const Sell = client.Side.Sell;
  const Limit = client.OrderKind.Limit;

  // 3. Alice mints 10 pairs: 10 Yes and 10 No for 10 USDC.
  await send('alice mints 10 pairs', [
    await client.getMintPairsInstructionAsync({ market, minter: alice, minterUsdc: a.usdc, minterYes: a.yes, minterNo: a.no, usdcMint: USDC_MINT, ...common, quantity: 10 }),
  ], alice, [{ kind: 'PairsMinted', market, owner: alice.address, quantity: '10' }]);

  await waitUntilChainTime(open + 1);

  // 4. Alice offers 4 Yes at 60 cents. 5. Bob buys 3 of them. 6. Bob bids 2 at 40 cents, 7. and cancels the bid.
  await send('alice offers 4 Yes at 60', [
    await client.getPlaceOrderInstructionAsync({ ...tradeAccounts(alice, a), side: Sell, kind: Limit, price: 60, quantity: 4, orderId: 1 }),
  ], alice, [{ kind: 'OrderPlaced', market, owner: alice.address, orderId: '1', side: 'Sell', price: 60, quantity: 4 }]);
  await send('bob buys 3 Yes at 60', [
    await client.getPlaceOrderInstructionAsync({ ...tradeAccounts(bob, b), side: Buy, kind: Limit, price: 60, quantity: 3, orderId: 2 }),
  ], bob, [{ kind: 'Fill', market, maker: alice.address, makerOrderId: '1', taker: bob.address, takerOrderId: '2', side: 'Buy', price: 60, quantity: 3 }]);
  await send('bob bids 2 Yes at 40', [
    await client.getPlaceOrderInstructionAsync({ ...tradeAccounts(bob, b), side: Buy, kind: Limit, price: 40, quantity: 2, orderId: 3 }),
  ], bob, [{ kind: 'OrderPlaced', market, owner: bob.address, orderId: '3', side: 'Buy', price: 40, quantity: 2 }]);
  const cancelAccounts = (who: KeyPairSigner) => ({ market, owner: who, usdcMint: USDC_MINT, ...common });
  await send('bob cancels the bid', [await client.getCancelOrderInstructionAsync({ ...cancelAccounts(bob), orderId: 3 })], bob, [
    { kind: 'OrderCancelled', market, owner: bob.address, orderId: '3', side: 'Buy', price: 40, quantity: 2, reason: 'Owner' },
  ]);

  // 8. Alice bids 2 at 58 cents. 9. Bob Buys No at 45 for 3: he sells new pairs' Yes for at least 55, so 2 go to Alice's bid at her price 58
  //    and the third rests as a paired offer at 55.
  await send('alice bids 2 Yes at 58', [
    await client.getPlaceOrderInstructionAsync({ ...tradeAccounts(alice, a), side: Buy, kind: Limit, price: 58, quantity: 2, orderId: 4 }),
  ], alice, [{ kind: 'OrderPlaced', market, owner: alice.address, orderId: '4', side: 'Buy', price: 58, quantity: 2 }]);
  await send('bob Buys No 3 at 45', [
    await client.getBuyNoInstructionAsync({ ...noAccounts(bob, b), kind: Limit, price: 45, quantity: 3, orderId: 5 }),
  ], bob, [
    { kind: 'PairsMinted', market, owner: bob.address, quantity: '3' },
    { kind: 'Fill', market, maker: alice.address, makerOrderId: '4', taker: bob.address, takerOrderId: '5', side: 'Sell', price: 58, quantity: 2 },
    { kind: 'OrderPlaced', market, owner: bob.address, orderId: '5', side: 'Sell', price: 55, quantity: 1 },
  ]);

  // 10. Bob cancels the paired offer: its pair closes for 1.00. 11. Bob Sells No: he buys Alice's last Yes at 60 and closes it with a No.
  await send('bob cancels the paired offer', [await client.getCancelOrderInstructionAsync({ ...cancelAccounts(bob), orderId: 5 })], bob, [
    { kind: 'OrderCancelled', market, owner: bob.address, orderId: '5', side: 'Sell', price: 55, quantity: 1, reason: 'Owner' },
    { kind: 'Redeemed', market, owner: bob.address, mode: 'Pairs', quantity: '1', usdc: '1000000' },
  ]);
  await send('bob Sells No 1 at 62', [
    await client.getSellNoInstructionAsync({ ...noAccounts(bob, b), price: 62, quantity: 1 }),
  ], bob, [
    { kind: 'Fill', market, maker: alice.address, makerOrderId: '1', taker: bob.address, takerOrderId: '0', side: 'Buy', price: 60, quantity: 1 },
    { kind: 'Redeemed', market, owner: bob.address, mode: 'Pairs', quantity: '1', usdc: '1000000' },
  ]);

  // 12. A transaction the chain refuses: Bob bids for far more than he holds. Sent without the node's pre-check so that it lands and fails.
  await send('bob bids beyond his funds (fails)', [
    await client.getPlaceOrderInstructionAsync({ ...tradeAccounts(bob, b), side: Buy, kind: Limit, price: 50, quantity: 1_000_000, orderId: 6 }),
  ], bob, [], { fails: true });

  return { steps, market, alice: alice.address, bob: bob.address, operator: operator.address, admin: admin.address };
}
