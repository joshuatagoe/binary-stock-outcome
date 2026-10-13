// Shared by the website's browser tests: a fake devnet that answers the site's JSON-RPC calls from recorded or
// encoded accounts (P27), and a fake Wallet Standard wallet that signs, refuses with 4001, or refuses with -32003.
// Nothing here touches the network. Google Fonts is answered with nothing.
import { BOOK_DISCRIMINATOR, findConfigPda, getConfigEncoder, MARKET_DISCRIMINATOR } from '@meridian/client';
import { marketAccounts } from '@meridian/shared';
import { address, getAddressEncoder, type Address } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import type { Page } from '@playwright/test';
import { chainMarket, config, configAccount, F4_ASKS, F4_BIDS, toBase64, type ChainMarket, type MarketOptions, type Resting } from '../test/fixtures/chain.ts';

export const TRADER = address('5LKyP7WchayADj5zwowChWizkyW3vHtWWj9nFYmz8Z5Q');
export const USDC_MINT = config().usdcMint;

export type Scenario = {
  /** Markets on the chain, each with its book. */
  markets: ChainMarket[];
  /** 'down' answers every call with a 503. */
  devnet: 'up' | 'down';
  paused: boolean;
  /** The trader's balances, in base units. */
  sol: bigint;
  usdc: bigint;
  yes: bigint;
  no: bigint;
  /** What devnet's simulation says: null passes, or a transaction error. */
  simulation: unknown;
  /** What a landed transaction changes. */
  after: { usdc: bigint; yes: bigint; no: bigint } | null;
  /** Statuses getSignatureStatuses gives, in order, then repeats the last. */
  statuses: ('none' | 'finalized' | { err: unknown })[];
  blockHeight: bigint;
  /** What the site sent. */
  sent: string[];
  simulated: string[];
  calls: string[];
  /** The program's event instructions inside the landed transaction (base58 data). */
  innerInstructions?: { index: number; instructions: { programIdIndex: number; accounts: number[]; data: string }[] }[];
  /** The trader's balances when the order finalized, as the landed transaction records them. */
  landedAfter?: { usdc: bigint; yes: bigint; no: bigint };
  /** The trader's balances when the order was sent. */
  landedBefore?: { usdc: bigint; yes: bigint; no: bigint };
  /** Runs when an order finalizes, so a test can change the book as the chain would. */
  onFinalized?: () => void;
};

export async function f4Scenario(extra: Partial<Scenario> = {}): Promise<Scenario> {
  return {
    markets: [
      await chainMarket({ strikeDollars: 680 }, F4_BIDS, F4_ASKS),
      await chainMarket({ strikeDollars: 690 }, [], []),
      await chainMarket({ symbol: 'AAPL', strikeDollars: 270 }, [[40, 3]], [[45, 4]]),
    ],
    devnet: 'up',
    paused: false,
    sol: 500_000_000n,
    usdc: 20_000_000n,
    yes: 0n,
    no: 0n,
    simulation: null,
    after: null,
    statuses: ['finalized'],
    blockHeight: 100n,
    sent: [],
    simulated: [],
    calls: [],
    ...extra,
  };
}

const tokenAccount = (amount: bigint) => {
  const bytes = new Uint8Array(165);
  new DataView(bytes.buffer).setBigUint64(64, amount, true);
  return bytes;
};
const encoded = (bytes: Uint8Array) => ({ data: [toBase64(bytes), 'base64'], executable: false, lamports: 1_000_000, owner: '11111111111111111111111111111111', space: bytes.length, rentEpoch: 0 });

// The recorded Config with the admin's pause flag set, encoded by the generated client.
function pausedConfig(): Uint8Array {
  return new Uint8Array(getConfigEncoder().encode({ ...config(), paused: true } as never));
}

const FAKE_SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

export async function fakeNetwork(page: Page, scenario: Scenario) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  const [configAddress] = await findConfigPda();
  const accounts = new Map<string, Uint8Array>([[configAddress, Uint8Array.from(Buffer.from(configAccount.value.data[0]!, 'base64'))]]);
  // Markets and books are looked up live, so a test can change a book after an order lands.
  const bookOwner = new Map<string, ChainMarket>();
  for (const m of scenario.markets) bookOwner.set((await marketAccounts(m.address)).book, m);
  const marketOf = new Map(scenario.markets.map((m) => [m.address as string, m]));
  // The trader's token accounts for every market's mints.
  const tokens = new Map<string, () => Uint8Array | null>();
  const [usdcAta] = await findAssociatedTokenPda({ owner: TRADER, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  tokens.set(usdcAta, () => tokenAccount(scenario.usdc));
  for (const m of scenario.markets) {
    const a = await marketAccounts(m.address);
    const [yes] = await findAssociatedTokenPda({ owner: TRADER, mint: a.yesMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
    const [no] = await findAssociatedTokenPda({ owner: TRADER, mint: a.noMint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS });
    tokens.set(yes, () => (scenario.yes > 0n ? tokenAccount(scenario.yes) : null));
    tokens.set(no, () => (scenario.no > 0n ? tokenAccount(scenario.no) : null));
  }

  let statusCalls = 0;
  await page.route('https://api.devnet.solana.com/**', async (route) => {
    if (scenario.devnet === 'down') return route.fulfill({ status: 503, body: 'Service Unavailable' });
    const { id, method, params } = route.request().postDataJSON();
    scenario.calls.push(method);
    const ok = (result: unknown) => route.fulfill({ json: { jsonrpc: '2.0', id, result } });
    const context = { apiVersion: '4.4.0-beta.0', slot: 510047395 };
    switch (method) {
      case 'getAccountInfo': {
        const bytes = marketOf.get(params[0])?.market ?? bookOwner.get(params[0])?.book ?? accounts.get(params[0]);
        if (bytes && params[0] === configAddress && scenario.paused) return ok({ context, value: encoded(pausedConfig()) });
        return ok({ context, value: bytes ? encoded(bytes) : null });
      }
      case 'getProgramAccounts': {
        const want = params[1].filters[0].memcmp.bytes;
        const markets = want === toBase64(MARKET_DISCRIMINATOR as Uint8Array);
        const books = want === toBase64(BOOK_DISCRIMINATOR as Uint8Array);
        const out = [];
        for (const m of scenario.markets) {
          if (markets) out.push({ pubkey: m.address, account: encoded(m.market) });
          if (books) out.push({ pubkey: (await marketAccounts(m.address)).book, account: encoded(m.book) });
        }
        return ok(out);
      }
      case 'getBalance':
        return ok({ context, value: Number(scenario.sol) });
      case 'getMultipleAccounts':
        return ok({ context, value: params[0].map((a: string) => { const bytes = tokens.get(a)?.(); return bytes ? encoded(bytes) : null; }) });
      case 'getLatestBlockhash':
        return ok({ context, value: { blockhash: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn', lastValidBlockHeight: 150 } });
      case 'simulateTransaction':
        scenario.simulated.push(params[0]);
        return ok({ context, value: { err: scenario.simulation, logs: [], accounts: null, unitsConsumed: 1000, returnData: null } });
      case 'sendTransaction':
        scenario.sent.push(params[0]);
        scenario.landedBefore = { usdc: scenario.usdc, yes: scenario.yes, no: scenario.no };
        scenario.landedAfter = undefined;
        return ok(FAKE_SIGNATURE);
      case 'getSignatureStatuses': {
        const status = scenario.statuses[Math.min(statusCalls++, scenario.statuses.length - 1)]!;
        // The order's effect on the trader's balances arrives with its finalization.
        if (status === 'finalized' && scenario.after) Object.assign(scenario, scenario.after);
        if (status === 'finalized' && !scenario.landedAfter) scenario.landedAfter = { usdc: scenario.usdc, yes: scenario.yes, no: scenario.no };
        if (status === 'finalized') scenario.onFinalized?.();
        const value = status === 'none' ? null : status === 'finalized'
          ? { slot: 1, confirmations: null, err: null, confirmationStatus: 'finalized' }
          : { slot: 1, confirmations: 0, err: status.err, confirmationStatus: 'confirmed' };
        return ok({ context, value: [value] });
      }
      case 'getTransaction': {
        // The landed transaction: the trader's token balances before and after, and any events a test supplied.
        const before = scenario.landedBefore ?? { usdc: scenario.usdc, yes: scenario.yes, no: scenario.no };
        const landed = scenario.landedAfter ?? { usdc: scenario.usdc, yes: scenario.yes, no: scenario.no };
        const entry = (accountIndex: number, mint: string, amount: bigint) => ({ accountIndex, mint, owner: TRADER as string, uiTokenAmount: { amount: String(amount) } });
        const pre: unknown[] = [entry(1, USDC_MINT, before.usdc)];
        const post: unknown[] = [entry(1, USDC_MINT, landed.usdc)];
        for (const [i, m] of scenario.markets.entries()) {
          const a = await marketAccounts(m.address);
          pre.push(entry(10 + i, a.yesMint, before.yes), entry(20 + i, a.noMint, before.no));
          post.push(entry(10 + i, a.yesMint, landed.yes), entry(20 + i, a.noMint, landed.no));
        }
        return ok({ slot: 1, blockTime: null, transaction: {}, meta: { err: null, preTokenBalances: pre, postTokenBalances: post, innerInstructions: scenario.innerInstructions ?? [] } });
      }
      case 'getBlockHeight':
        return ok(Number(scenario.blockHeight));
      default:
        return route.fulfill({ status: 400, body: `unexpected ${method}` });
    }
  });
  return errors;
}

export type WalletMode = 'sign' | 'close' | 'mainnet';

/** Registers a fake Wallet Standard wallet before the page's scripts run. Switch its behaviour with setWalletMode. */
export async function addFakeWallet(page: Page, mode: WalletMode = 'sign') {
  const publicKey = [...getAddressEncoder().encode(TRADER)];
  await page.addInitScript(
    ({ publicKey, address, mode }) => {
      const w = window as unknown as { __fakeWallet: { mode: string; signed: number; connects: number } };
      w.__fakeWallet = { mode, signed: 0, connects: 0 };
      // Order IDs are random 64-bit numbers; tests that read the book back need to know them: 4242, then 4243, and so on.
      const real = crypto.getRandomValues.bind(crypto);
      let issued = 0n;
      crypto.getRandomValues = ((a: ArrayBufferView) => (a instanceof BigUint64Array ? ((a[0] = 4242n + issued++), a) : real(a as never))) as typeof crypto.getRandomValues;
      const account = {
        address,
        publicKey: new Uint8Array(publicKey),
        chains: ['solana:devnet', 'solana:mainnet'],
        features: ['solana:signTransaction'],
        label: 'Fake account',
      };
      const listeners: Record<string, ((p: unknown) => void)[]> = {};
      const wallet = {
        version: '1.0.0',
        name: 'Fake Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=',
        chains: ['solana:devnet', 'solana:mainnet'],
        accounts: [] as unknown[],
        features: {
          'standard:connect': {
            version: '1.0.0',
            connect: async () => {
              w.__fakeWallet.connects++;
              if (w.__fakeWallet.mode === 'refuse-connect') throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
              wallet.accounts = [account];
              return { accounts: [account] };
            },
          },
          'standard:disconnect': {
            version: '1.0.0',
            disconnect: async () => {
              wallet.accounts = [];
              listeners['change']?.forEach((l) => l({ accounts: [] }));
            },
          },
          'standard:events': {
            version: '1.0.0',
            on: (event: string, listener: (p: unknown) => void) => {
              (listeners[event] ??= []).push(listener);
              return () => (listeners[event] = (listeners[event] ?? []).filter((l) => l !== listener));
            },
          },
          'solana:signTransaction': {
            version: '1.0.0',
            supportedTransactionVersions: ['legacy', 0],
            signTransaction: async (...inputs: { transaction: Uint8Array }[]) => {
              const mode = w.__fakeWallet.mode;
              if (mode === 'close') throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
              if (mode === 'mainnet') throw Object.assign(new Error('Network mismatch'), { code: -32003 });
              w.__fakeWallet.signed++;
              return inputs.map(({ transaction }) => {
                const signed = new Uint8Array(transaction);
                // One required signature, the fee payer's: fill its 64 bytes after the count byte.
                for (let i = 1; i <= 64; i++) signed[i] = 7;
                return { signedTransaction: signed };
              });
            },
          },
        },
      };
      const register = (api: { register: (w: unknown) => void }) => api.register(wallet);
      window.addEventListener('wallet-standard:app-ready', ((e: CustomEvent) => register(e.detail)) as EventListener);
      window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
    },
    { publicKey, address: TRADER as string, mode },
  );
}

export const setWalletMode = (page: Page, mode: WalletMode | 'refuse-connect') =>
  page.evaluate((m) => ((window as unknown as { __fakeWallet: { mode: string } }).__fakeWallet.mode = m), mode);

export const signedCount = (page: Page) => page.evaluate(() => (window as unknown as { __fakeWallet: { signed: number } }).__fakeWallet.signed);

export type { Address, MarketOptions, Resting };
