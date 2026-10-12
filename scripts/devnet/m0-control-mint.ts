// The wallet test's control (D94, M0 slice f): a Token-2022 mint made exactly like m0-mints.ts's, with the same
// kind of name, but without Permissioned Burn. If wallets show this one and hide the test mints, Permissioned
// Burn is why; if they hide both, wallets hide new tokens whatever their extensions. The operator key pays, and
// sends 5 to each wallet given. Run in WSL, where the key files are (D92):
//   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && node scripts/devnet/m0-control-mint.ts <wallet> [<wallet> ...]"
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  none,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  some,
  type Instruction,
} from '@solana/kit';
import { getCreateAccountInstruction } from '@solana-program/system';
import {
  extension,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMetadataPointerInstruction,
  getInitializeMint2Instruction,
  getInitializeTokenMetadataInstruction,
  getMintSize,
  getMintToCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';

const wallets = process.argv.slice(2).map((w) => address(w));
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const rpc = createSolanaRpc(RPC);
const send = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws')) });
const operator = await createKeyPairSignerFromBytes(
  new Uint8Array(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'meridian-operator.json'), 'utf8'))),
);

async function run(instructions: Instruction[]) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  const tx = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(operator, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    ),
  );
  await send(tx as Parameters<typeof send>[0], { commitment: 'confirmed' });
  return getSignatureFromTransaction(tx);
}

const mint = await generateKeyPairSigner();
const name = 'META 680+ Yes 10/08 (CONTROL)';
const symbol = 'CTRL';
const fixed = [extension('MetadataPointer', { authority: some(operator.address), metadataAddress: some(mint.address) })];
const metadata = extension('TokenMetadata', { updateAuthority: some(operator.address), mint: mint.address, name, symbol, uri: '', additionalMetadata: new Map() });
const deposit = await rpc.getMinimumBalanceForRentExemption(BigInt(getMintSize([...fixed, metadata]))).send();
const created = await run([
  getCreateAccountInstruction({ payer: operator, newAccount: mint, lamports: deposit, space: getMintSize(fixed), programAddress: TOKEN_2022_PROGRAM_ADDRESS }),
  getInitializeMetadataPointerInstruction({ mint: mint.address, authority: operator.address, metadataAddress: mint.address }),
  getInitializeMint2Instruction({ mint: mint.address, decimals: 0, mintAuthority: operator.address, freezeAuthority: none() }),
  getInitializeTokenMetadataInstruction({ metadata: mint.address, updateAuthority: operator.address, mint: mint.address, mintAuthority: operator, name, symbol, uri: '' }),
]);
console.log(`created ${name}: ${mint.address} (${created})`);

const instructions: Instruction[] = [];
for (const wallet of wallets) {
  const [ata] = await findAssociatedTokenPda({ owner: wallet, mint: mint.address, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
  instructions.push(
    await getCreateAssociatedTokenIdempotentInstructionAsync({ payer: operator, owner: wallet, mint: mint.address, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS }),
    getMintToCheckedInstruction({ mint: mint.address, token: ata, mintAuthority: operator, amount: 5n, decimals: 0 }),
  );
}
if (instructions.length) console.log(`sent 5 to ${wallets.join(', ')}: ${await run(instructions)}`);

const file = join(import.meta.dirname, '..', '..', 'config', 'm0-wallet-test.json');
const test = JSON.parse(readFileSync(file, 'utf8'));
test.control = { address: mint.address, name, symbol, note: 'Token-2022 with a name but without Permissioned Burn' };
writeFileSync(file, JSON.stringify(test, null, 2) + '\n');
process.exit(0);
