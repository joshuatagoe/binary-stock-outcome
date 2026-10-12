// M0's wallet test (D94, D108, D110, D115, D66), served by the dev server only and never deployed. Each step asks
// the connected wallet to do one thing on devnet and records what happened, per wallet, in this browser. The page
// builds and simulates each transaction, the wallet only signs, and the page sends it (D115).
import {
  address,
  assertIsFullySignedTransaction,
  assertIsTransactionWithBlockhashLifetime,
  compileTransaction,
  createClient,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  isTransactionModifyingSigner,
  sendAndConfirmTransactionFactory,
  signTransactionMessageWithSigners,
  type TransactionSigner,
} from '@solana/kit';
import { walletWithoutSigner } from '@solana/kit-plugin-wallet';
import { useConnect, useConnectedWallet, useDisconnect, useWallets } from '@solana/kit-plugin-wallet/react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import test from '../../../../config/m0-wallet-test.json';
import { DEVNET_RPC_URL } from '../network.ts';
import { batchOfThree, sendOneToken, v1Transfer, type Lifetime } from './transactions.ts';

const client = createClient().use(walletWithoutSigner({ chain: 'solana:devnet' }));
// Devnet even under make dev, whose local chain doesn't have these tokens.
const rpc = createSolanaRpc(DEVNET_RPC_URL);
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: createSolanaRpcSubscriptions(DEVNET_RPC_URL.replace(/^http/, 'ws')) });
const authority = address(test.authority);
const [yesMint, noMint] = test.mints.map((m) => address(m.address));

type Result = { at: string; outcome: string; detail?: unknown };
type Results = Record<string, Result>;

// Every layer of an error: wallets put their code (4001, -32003, …) on the error or on its cause.
function describeError(error: unknown) {
  const layers: { name?: string; message?: string; code?: unknown }[] = [];
  for (let e = error as { name?: string; message?: string; code?: unknown; cause?: unknown } | undefined; e && layers.length < 4; e = e.cause as typeof e) {
    layers.push({ name: e.name, message: e.message?.slice(0, 300), code: e.code });
  }
  return layers;
}

async function latest(): Promise<Lifetime> {
  const { value } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  return value;
}

// Devnet runs each transaction before the wallet opens, so a failure there is the program's, not the wallet's.
async function simulate(message: Parameters<typeof compileTransaction>[0]) {
  const wire = getBase64EncodedWireTransaction(compileTransaction(message));
  const { value } = await rpc.simulateTransaction(wire, { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true }).send();
  if (value.err) throw new Error(`devnet's simulation failed: ${JSON.stringify(value.err, (_, v) => (typeof v === 'bigint' ? `${v}` : v))}; ${value.logs?.slice(-3).join(' | ')}`);
}

async function signAndSend(message: Parameters<typeof compileTransaction>[0]) {
  await simulate(message);
  const signed = await signTransactionMessageWithSigners(message);
  await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: 'confirmed' });
  return getSignatureFromTransaction(signed);
}

export function WalletTest() {
  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const { dispatch: connect, error: connectError, isRunning: connecting } = useConnect(client);
  const { dispatch: disconnect } = useDisconnect(client);
  const key = connected ? `meridian-wallet-test:${connected.wallet.name}` : null;
  const [results, setResults] = useState<Results>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    try {
      setResults(JSON.parse(localStorage.getItem(key) ?? '{}'));
    } catch {
      setResults({});
    }
  }, [key]);

  const record = useCallback(
    (step: string, outcome: string, detail?: unknown) =>
      setResults((r) => {
        const next = { ...r, [step]: { at: new Date().toISOString(), outcome, detail } };
        try {
          if (key) localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* results stay on screen even if storage is unavailable */
        }
        return next;
      }),
    [key],
  );

  const attempt = useCallback(
    async (step: string, action: (signer: TransactionSigner) => Promise<unknown>) => {
      const signer = connected?.signer;
      if (!signer) return;
      setBusy(step);
      try {
        record(step, 'ok', await action(signer));
      } catch (error) {
        record(step, 'failed', describeError(error));
      } finally {
        setBusy(null);
      }
    },
    [connected, record],
  );

  const batch = (signer: TransactionSigner) =>
    attempt('batch', async () => {
      if (!isTransactionModifyingSigner(signer)) return { note: 'the signer has no batch method', kind: Object.keys(signer) };
      const lifetime = await latest();
      const messages = batchOfThree(signer, authority, lifetime);
      for (const m of messages) await simulate(m);
      const signed = await signer.modifyAndSignTransactions(messages.map((m) => compileTransaction(m)));
      const signatures = [];
      for (const tx of signed) {
        // Checked, not assumed: the wallet must return every signature and keep the blockhash.
        assertIsFullySignedTransaction(tx);
        assertIsTransactionWithBlockhashLifetime(tx);
        await sendAndConfirm(tx, { commitment: 'confirmed' });
        signatures.push(getSignatureFromTransaction(tx));
      }
      return { signedInOneRequest: signed.length, signatures };
    });

  const report = connected && {
    wallet: connected.wallet.name,
    address: connected.account.address,
    supportedTransactionVersions: [...(connected.supportedTransactionVersions ?? [])].map(String),
    results,
  };

  return (
    <>
      <h1>Wallet test (M0)</h1>
      <p className="muted">
        Local only, on devnet with test tokens. Each step asks your wallet for one thing and records what happened.
      </p>

      <Step title="1. Connect">
        {connected && (
          <p>
            Connected <strong>{connected.wallet.name}</strong>: <span className="mono">{connected.account.address}</span>
          </p>
        )}
        {wallets.length === 0 ? (
          <p>No wallet found. Install Phantom or Solflare in this browser, then reload.</p>
        ) : (
          // Every wallet stays listed, so you can switch from one to the other; each keeps its own results.
          <p className="answers">
            {wallets
              .filter((w) => w.name !== connected?.wallet.name)
              .map((w) => (
                <button key={w.name} type="button" onClick={() => connect(w)}>
                  Connect {w.name}
                </button>
              ))}
            {connected && (
              <button type="button" onClick={() => disconnect()}>
                Disconnect {connected.wallet.name}
              </button>
            )}
          </p>
        )}
        {connecting && <p role="status">Waiting for the wallet: approve the connection in its pop-up, which may be behind this window.</p>}
        {connectError != null && <p role="alert" className="notice danger">The wallet didn't connect: {String((connectError as Error).message ?? connectError)}</p>}
        {connected && !connected.signer && <p role="alert" className="notice danger">Connected, but the wallet gave the page no way to sign, so the steps can't run.</p>}
        {connected && <p className="muted">Ask for test SOL and tokens for this address, then continue.</p>}
      </Step>

      {connected?.signer && (
        <>
          <Step title="2. Token names (D108)">
            <p>Open your wallet's token list. Is there "{test.mints[0].name}" and "{test.mints[1].name}", 5 of each?</p>
            <Answers step="names" record={record} options={['Both names show', 'Tokens show without names', 'Tokens don’t show']} />
            <Outcome result={results.names} />
          </Step>

          <Step title="3. Send a token (D94)">
            <p>Sends 1 Yes token to the test authority. Approve it in your wallet, set to Devnet.</p>
            <button type="button" disabled={!!busy} onClick={() => attempt('send', async (s) => signAndSend(await sendOneToken(s, yesMint, authority, await latest())))}>
              Send 1 Yes token
            </button>
            <Outcome result={results.send} />
          </Step>

          <Step title="4. Wallet set to Mainnet (D115)">
            <p>
              Switch your wallet to Mainnet first (Phantom: turn Testnet Mode off; Solflare: Settings, Network, Mainnet). Then
              press the button and approve if the wallet lets you. Switch back to Devnet afterwards.
            </p>
            <button type="button" disabled={!!busy} onClick={() => attempt('mainnet', async (s) => signAndSend(await sendOneToken(s, noMint, authority, await latest())))}>
              Sign a devnet transaction while on Mainnet
            </button>
            <Outcome result={results.mainnet} />
          </Step>

          <Step title="5. Three at once (D66)">
            <p>Asks your wallet to sign three tiny transfers in one request.</p>
            <button type="button" disabled={!!busy} onClick={() => batch(connected.signer!)}>
              Sign three at once
            </button>
            <Outcome result={results.batch} />
            <Answers step="batch-approvals" record={record} options={['One approval', 'Three approvals', 'Something else']} />
            <Outcome result={results['batch-approvals']} />
          </Step>

          <Step title="6. A version 1 transaction (D110)">
            <p>Asks your wallet to sign a v1 transaction.</p>
            <button type="button" disabled={!!busy} onClick={() => attempt('v1', async (s) => signAndSend(v1Transfer(s, authority, await latest())))}>
              Sign a v1 transaction
            </button>
            <Outcome result={results.v1} />
          </Step>
        </>
      )}

      {busy && <p role="status">Waiting for the wallet and devnet…</p>}
      {report && (
        <Step title="Results">
          <p>Copy this into the chat. It holds only public addresses and signatures.</p>
          <pre className="mono results">{JSON.stringify(report, null, 2)}</pre>
        </Step>
      )}
    </>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

// What a step recorded, right under it, so each click shows its result.
function Outcome({ result }: { result?: Result }) {
  if (!result) return null;
  const time = new Date(result.at).toLocaleTimeString();
  const detail = typeof result.detail === 'string' ? result.detail : result.detail ? JSON.stringify(result.detail).slice(0, 300) : '';
  return (
    <p role="status" className={result.outcome === 'failed' ? 'notice danger' : 'notice ok'}>
      Recorded at {time}: <strong>{result.outcome}</strong>
      {detail && <span className="mono"> {detail}</span>}
    </p>
  );
}

function Answers({ step, record, options }: { step: string; record: (step: string, outcome: string) => void; options: string[] }) {
  return (
    <p className="answers">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => record(step, o)}>
          {o}
        </button>
      ))}
    </p>
  );
}
