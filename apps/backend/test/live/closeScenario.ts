// A market with resting orders, for M4-c's live run: bids and offers from four traders (36 orders, so the sweep needs two calls), a
// paired offer (a Buy No limit order whose Yes found no buyer, D142), and a trader who closed her USDC account while her bid rested,
// so her refund has nowhere to land until the backend re-creates the account (D99). Local chain only: it uses Surfpool's cheat codes
// (surfnet_setAccount, surfnet_setTokenAccount) to give the USDC mint its supply and the traders their USDC.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as client from '@meridian/client';
import { marketAccounts, marketAddress, PROGRAM_ADDRESS } from '@meridian/shared';
import {
  AccountRole,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
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
import { ata, createAta, rpcCall, sleep, TOKEN, TOKEN_2022, USDC_MINT } from './lifecycle.ts';

export interface CloseScenario {
  market: Address;
  closeAt: number;
  /** Orders resting in the book when the scenario ends. */
  resting: number;
  traders: Record<'alice' | 'bob' | 'carol' | 'dave', Address>;
  /** Carol's USDC account, which she closed while her bid rested. */
  carolUsdc: Address;
  /** The signatures of the transactions sent together, to be found in the same slots. */
  burst: string[];
}

/** SPL Token's CloseAccount (instruction 9): the owner closes an empty account and takes back its rent. */
const closeAccount = (account: Address, owner: KeyPairSigner): Instruction => ({
  programAddress: TOKEN,
  accounts: [
    { address: account, role: AccountRole.WRITABLE },
    { address: owner.address, role: AccountRole.WRITABLE },
    { address: owner.address, role: AccountRole.READONLY_SIGNER, signer: owner } as never,
  ],
  data: new Uint8Array([9]),
});

export async function runCloseScenario(rpcUrl: string, keysFolder: string, options: { ticker: string; closeInSecs: number }): Promise<CloseScenario> {
  const rpc = createSolanaRpc(rpcUrl) as any;
  const keyFile = (name: string) => createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(keysFolder, `meridian-${name}.json`), 'utf8'))));
  const [operator, admin, alice, bob, carol, dave] = await Promise.all([keyFile('operator'), keyFile('admin'), ...Array.from({ length: 4 }, () => generateKeyPairSigner())]);
  const eventAuthority = (await getProgramDerivedAddress({ programAddress: PROGRAM_ADDRESS, seeds: [new TextEncoder().encode('__event_authority')] }))[0];
  const common = { eventAuthority, program: PROGRAM_ADDRESS };

  const chainNow = async () => Number(await rpc.getBlockTime(await rpc.getSlot().send()).send());
  const waitUntilChainTime = async (t: number) => {
    while ((await chainNow()) < t) await sleep(500);
  };

  async function sign(instructions: Instruction[], payer: KeyPairSigner) {
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    );
    const signed = await signTransactionMessageWithSigners(message);
    return { wire: getBase64EncodedWireTransaction(signed), signature: getSignatureFromTransaction(signed) };
  }
  async function confirmed(name: string, signature: string) {
    for (let i = 0; i < 120; i++) {
      const [status] = (await rpc.getSignatureStatuses([signature]).send()).value;
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
        if (status.err !== null) throw new Error(`${name}: failed on the chain (${JSON.stringify(status.err, (_k, v) => (typeof v === 'bigint' ? String(v) : v))})`);
        return;
      }
      await sleep(250);
    }
    throw new Error(`${name}: not confirmed in time`);
  }
  /** One transaction, waited for. */
  async function send(name: string, instructions: Instruction[], payer: KeyPairSigner) {
    const { wire, signature } = await sign(instructions, payer);
    await rpc.sendTransaction(wire, { encoding: 'base64' }).send();
    await confirmed(name, signature);
  }
  /** Many transactions sent at once, so several land in the same slot. Returns their signatures in the order sent. */
  async function sendTogether(name: string, items: { instructions: Instruction[]; payer: KeyPairSigner }[]) {
    const signed = await Promise.all(items.map((i) => sign(i.instructions, i.payer)));
    await Promise.all(signed.map((s) => rpc.sendTransaction(s.wire, { encoding: 'base64' }).send()));
    await Promise.all(signed.map((s, i) => confirmed(`${name} ${i}`, s.signature)));
    return signed.map((s) => s.signature as string);
  }

  // Funds: SOL by airdrop, the USDC mint with a supply, and USDC in the traders' accounts.
  const traders = { alice, bob, carol, dave };
  for (const who of Object.values(traders)) await rpc.requestAirdrop(who.address, 5_000_000_000n).send();
  const mintData = Buffer.alloc(82);
  mintData.writeBigUInt64LE(1_000_000_000_000n, 36);
  mintData[44] = 6;
  mintData[45] = 1;
  await rpcCall(rpcUrl, 'surfnet_setAccount', [USDC_MINT, { lamports: 1_461_600, data: mintData.toString('hex'), owner: TOKEN, executable: false }]);
  for (const who of [alice, bob, dave]) await rpcCall(rpcUrl, 'surfnet_setTokenAccount', [who.address, USDC_MINT, { amount: 100_000_000 }, TOKEN]);
  await rpcCall(rpcUrl, 'surfnet_setTokenAccount', [carol.address, USDC_MINT, { amount: 1_200_000 }, TOKEN]); // exactly her bid: 4 Yes at 30 cents

  const day = 20261013;
  const strikeCents = 1000 * (10 + Math.floor(Math.random() * 9000));
  const market = await marketAddress(options.ticker, day, strikeCents);
  const accounts = await marketAccounts(market);

  await send('update config', [await client.getUpdateConfigInstructionAsync({ admin, ...common, pythReceivers: null, tickers: null, ladderBps: null, thresholds: null, fillLimit: 32 })], admin);
  const t0 = await chainNow();
  const [mintOpen, open, close] = [t0 + 8, t0 + 20, t0 + options.closeInSecs];
  await send('create market', [
    await client.getCreateMarketInstructionAsync({ creator: operator, market, usdcMint: USDC_MINT, ...common, ticker: options.ticker, day, strikeCents, mintOpen, open, close }),
  ], operator);

  const own = async (who: KeyPairSigner) => ({
    usdc: await ata(who.address, USDC_MINT, TOKEN),
    yes: await ata(who.address, accounts.yesMint, TOKEN_2022),
    no: await ata(who.address, accounts.noMint, TOKEN_2022),
  });
  const mine = { alice: await own(alice), bob: await own(bob), carol: await own(carol), dave: await own(dave) };
  for (const [name, who] of Object.entries(traders)) {
    const a = mine[name as keyof typeof mine];
    await send(`accounts of ${name}`, [createAta(who, a.yes, who.address, accounts.yesMint, TOKEN_2022), createAta(who, a.no, who.address, accounts.noMint, TOKEN_2022)], who);
  }
  await waitUntilChainTime(mintOpen + 1);

  const trade = (who: KeyPairSigner, a: typeof mine.alice) => ({ market, taker: who, takerUsdc: a.usdc, takerYes: a.yes, usdcMint: USDC_MINT, ...common });
  const { Buy, Sell } = client.Side;
  const Limit = client.OrderKind.Limit;
  const mint = async (who: KeyPairSigner, a: typeof mine.alice, quantity: number) =>
    send('mint', [await client.getMintPairsInstructionAsync({ market, minter: who, minterUsdc: a.usdc, minterYes: a.yes, minterNo: a.no, usdcMint: USDC_MINT, ...common, quantity })], who);
  await mint(alice, mine.alice, 20);
  await mint(bob, mine.bob, 10);
  await waitUntilChainTime(open + 1);

  const place = async (who: KeyPairSigner, a: typeof mine.alice, side: client.Side, price: number, quantity: number, orderId: number) =>
    client.getPlaceOrderInstructionAsync({ ...trade(who, a), side, kind: Limit, price, quantity, orderId });

  // Offers, spread over three traders, and Alice's and Carol's bids.
  await send('alice offers 5 Yes at 70', [await place(alice, mine.alice, Sell, 70, 5, 1)], alice);
  await send('alice offers 4 Yes at 75', [await place(alice, mine.alice, Sell, 75, 4, 2)], alice);
  await send('bob offers 3 Yes at 72', [await place(bob, mine.bob, Sell, 72, 3, 1)], bob);
  await send('alice bids 3 Yes at 40', [await place(alice, mine.alice, Buy, 40, 3, 3)], alice);
  await send('carol bids 4 Yes at 30', [await place(carol, mine.carol, Buy, 30, 4, 1)], carol);
  // Carol closes her now-empty USDC account: her refund will have to re-create it (D99).
  await send('carol closes her USDC account', [closeAccount(mine.carol.usdc, carol)], carol);

  // Dave buys 3 No at 20 cents: pairs are minted and the Yes is offered at 80 or better. No bid is that high, so the 3 rest as a paired offer.
  await send('dave Buys No 3 at 20 (a paired offer rests)', [
    await client.getBuyNoInstructionAsync({ ...trade(dave, mine.dave), takerNo: mine.dave.no, kind: Limit, price: 20, quantity: 3, orderId: 1 }),
  ], dave);

  // A burst: 30 bids of Bob's sent at once, so several land in one slot (the order inside it is the block's, not the signature's).
  const bids = await Promise.all(Array.from({ length: 30 }, async (_, i) => ({ instructions: [await place(bob, mine.bob, Buy, 5 + i, 1, 100 + i)], payer: bob })));
  const burst = await sendTogether('bob bids', bids);

  return {
    market,
    closeAt: close,
    resting: 2 + 1 + 1 + 1 + 1 + 30, // Alice's two offers, Bob's offer, Alice's bid, Carol's bid, Dave's paired offer, Bob's 30 bids = 36
    traders: { alice: alice.address, bob: bob.address, carol: carol.address, dave: dave.address },
    carolUsdc: mine.carol.usdc,
    burst,
  };
}
