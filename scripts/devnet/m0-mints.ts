// M0's account-size measurement, and the tokens for the wallet test (D50, D94, D107, D108; M0 slice f).
// Creates a Yes and a No test mint on devnet, made as market mints will be (ARCHITECTURE.md §5): Token-2022,
// 0 decimals, Permissioned Burn, a metadata pointer to itself and a name, with no freeze authority. Here the
// operator key holds the mint and burn authority; a market's address will (D94). It then measures each account's
// size and deposit, checks that a holder can't burn alone but can with the burn authority's signature, and writes
// the mints to config/m0-wallet-test.json for the wallet test. Run in WSL, where the key files are (D92):
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/devnet/m0-mints.ts"
// The upgrade key tops the operator key up to 0.05 SOL first if it holds less.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  lamports,
  none,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  some,
  type Address,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit';
import { getCreateAccountInstruction, getTransferSolInstruction } from '@solana-program/system';
import {
  extension,
  findAssociatedTokenPda,
  getBurnCheckedInstruction,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMetadataPointerInstruction,
  getInitializeMint2Instruction,
  getInitializePermissionedBurnInstruction,
  getInitializeTokenMetadataInstruction,
  getMintSize,
  getMintToCheckedInstruction,
  getPermissionedBurnCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';

const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const repo = join(import.meta.dirname, '..', '..');
const rpc = createSolanaRpc(RPC);
const send = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws')) });

const keyFile = (name: string) =>
  createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', `meridian-${name}.json`), 'utf8'))));
const [operator, upgrade] = await Promise.all([keyFile('operator'), keyFile('upgrade')]);

async function run(payer: TransactionSigner, instructions: Instruction[]) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  const tx = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    ),
  );
  await send(tx as Parameters<typeof send>[0], { commitment: 'confirmed' });
  return getSignatureFromTransaction(tx);
}

const rent = async (bytes: number) => Number(await rpc.getMinimumBalanceForRentExemption(BigInt(bytes)).send()) / 1e9;
const size = async (address: Address) => {
  const { value } = await rpc.getAccountInfo(address, { encoding: 'base64' }).send();
  if (!value) throw new Error(`${address} doesn't exist`);
  return { bytes: Buffer.from(value.data[0], 'base64').length, sol: Number(value.lamports) / 1e9, owner: value.owner };
};

// The operator key pays for the mints; the upgrade key signs once, to top it up.
const balance = Number((await rpc.getBalance(operator.address).send()).value);
if (balance < 50_000_000) {
  const sig = await run(upgrade, [getTransferSolInstruction({ source: upgrade, destination: operator.address, amount: lamports(BigInt(50_000_000 - balance)) })]);
  console.log(`topped the operator key up to 0.05 SOL: ${sig}`);
}

async function createMint(side: 'Yes' | 'No') {
  const mint = await generateKeyPairSigner();
  const name = `META 680+ ${side} 10/08 (TEST)`;
  const symbol = side.toUpperCase();
  const fixed = [
    extension('PermissionedBurn', { authority: some(operator.address) }),
    extension('MetadataPointer', { authority: some(operator.address), metadataAddress: some(mint.address) }),
  ];
  const metadata = extension('TokenMetadata', {
    updateAuthority: some(operator.address),
    mint: mint.address,
    name,
    symbol,
    uri: '',
    additionalMetadata: new Map(),
  });
  // The account starts with room for the fixed extensions; the name's extension grows it, paid for up front.
  const space = getMintSize(fixed);
  const deposit = await rpc.getMinimumBalanceForRentExemption(BigInt(getMintSize([...fixed, metadata]))).send();
  const signature = await run(operator, [
    getCreateAccountInstruction({ payer: operator, newAccount: mint, lamports: deposit, space, programAddress: TOKEN_2022_PROGRAM_ADDRESS }),
    getInitializeMetadataPointerInstruction({ mint: mint.address, authority: operator.address, metadataAddress: mint.address }),
    getInitializePermissionedBurnInstruction({ mint: mint.address, authority: operator.address }),
    getInitializeMint2Instruction({ mint: mint.address, decimals: 0, mintAuthority: operator.address, freezeAuthority: none() }),
    getInitializeTokenMetadataInstruction({ metadata: mint.address, updateAuthority: operator.address, mint: mint.address, mintAuthority: operator, name, symbol, uri: '' }),
  ]);
  return { side, address: mint.address, name, symbol, signature, expected: getMintSize([...fixed, metadata]) };
}

const yes = await createMint('Yes');
const no = await createMint('No');
console.log(`created ${yes.name}: ${yes.address} (${yes.signature})`);
console.log(`created ${no.name}: ${no.address} (${no.signature})`);

// A holder that isn't the burn authority: a throwaway key with 2 Yes tokens, whose fees the operator pays.
const holder = await generateKeyPairSigner();
const [holderAta] = await findAssociatedTokenPda({ owner: holder.address, mint: yes.address, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
await run(operator, [
  await getCreateAssociatedTokenIdempotentInstructionAsync({ payer: operator, owner: holder.address, mint: yes.address, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }),
  getMintToCheckedInstruction({ mint: yes.address, token: holderAta, mintAuthority: operator, amount: 2n, decimals: 0 }),
]);

let aloneRefused = '';
try {
  await run(operator, [getBurnCheckedInstruction({ account: holderAta, mint: yes.address, authority: holder, amount: 1n, decimals: 0 })]);
  aloneRefused = 'NOT REFUSED: the holder burned alone';
} catch (error) {
  aloneRefused = `refused: ${(error as Error).message.split('\n')[0]}`;
}
const withAuthority = await run(operator, [
  getPermissionedBurnCheckedInstruction({ account: holderAta, mint: yes.address, permissionedBurnAuthority: operator, authority: holder, amount: 1n, decimals: 0 }),
]);

const [mintYes, mintNo, tokenAccount] = await Promise.all([size(yes.address), size(no.address), size(holderAta)]);
const results = {
  measuredAt: new Date().toISOString(),
  mints: [
    { ...yes, ...mintYes, rentSol: await rent(mintYes.bytes) },
    { ...no, ...mintNo, rentSol: await rent(mintNo.bytes) },
  ],
  tokenAccount: { address: holderAta, ...tokenAccount, rentSol: await rent(tokenAccount.bytes) },
  plainBurnByHolder: aloneRefused,
  permissionedBurnWithAuthority: withAuthority,
  rentFor: { config647: await rent(647), book6728: await rent(6728), vault165: await rent(165) },
};
console.log(JSON.stringify(results, null, 2));

writeFileSync(
  join(repo, 'config', 'm0-wallet-test.json'),
  JSON.stringify(
    {
      _about: "Devnet test mints for M0's wallet test (D94, D108), made by scripts/devnet/m0-mints.ts. Test tokens only; the operator key holds the mint and burn authority.",
      network: 'devnet',
      authority: operator.address,
      mints: results.mints.map(({ side, address, name, symbol }) => ({ side, address, name, symbol })),
    },
    null,
    2,
  ) + '\n',
);
console.log('wrote config/m0-wallet-test.json');
process.exit(0);
