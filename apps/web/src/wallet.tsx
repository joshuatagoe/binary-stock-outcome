// Wallet connection (D115, USERS.md F2): the wallets the browser offers through Wallet Standard, the connected
// account and its signer, and its SOL and USDC. Wallets only sign; the site simulates and sends (tracker, send.ts).
import { createClient, type Address, type TransactionSigner } from '@solana/kit';
import { walletWithoutSigner } from '@solana/kit-plugin-wallet';
import { useConnect, useConnectedWallet, useDisconnect, useWallets } from '@solana/kit-plugin-wallet/react';
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import type { UiWallet } from '@wallet-standard/ui';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useChainConfig } from './chain-config.tsx';
import { describeConnectFailure, type Failure } from './failures.ts';
import { chainRpc } from './read-config.ts';
import { readBalances } from './read-markets.ts';

export const walletClient = createClient().use(walletWithoutSigner({ chain: 'solana:devnet' }));

export type Funds = { sol: bigint; usdc: bigint };

export type WalletState = {
  wallets: readonly UiWallet[];
  address: Address | null;
  walletName: string | null;
  signer: TransactionSigner | null;
  connecting: boolean;
  connectError: Failure | null;
  connect: (wallet: UiWallet) => void;
  disconnect: () => void;
  /** The connect panel, which any page can ask to open. */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  funds: Funds | null;
  /** Reads the balances again, after an order or when the person says they added funds. */
  refreshFunds: () => void;
};

const Context = createContext<WalletState | null>(null);

export const useWallet = () => {
  const value = useContext(Context);
  if (!value) throw new Error('useWallet needs a WalletProvider');
  return value;
};

const POLL_MS = 10_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallets = useWallets(walletClient);
  const connected = useConnectedWallet(walletClient);
  const { dispatch: dispatchConnect, error: connectError, isRunning: connecting } = useConnect(walletClient);
  const { dispatch: dispatchDisconnect } = useDisconnect(walletClient);
  const { config } = useChainConfig();
  const [panelOpen, setPanelOpen] = useState(false);
  const [funds, setFunds] = useState<Funds | null>(null);
  const [tick, setTick] = useState(0);
  const lastOwner = useRef<string | null>(null);

  const address = (connected?.account.address ?? null) as Address | null;
  const usdcMint = config.kind === 'ready' ? config.usdcMint : null;

  useEffect(() => {
    if (!address || !usdcMint) {
      setFunds(null);
      return;
    }
    if (lastOwner.current !== address) setFunds(null);
    lastOwner.current = address;
    const controller = new AbortController();
    const read = async () => {
      try {
        const [usdcAccount] = await findAssociatedTokenPda({ owner: address, mint: usdcMint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
        const b = await readBalances(chainRpc, [usdcAccount], address, controller.signal);
        if (!controller.signal.aborted) setFunds({ sol: b.sol, usdc: b.usdc });
      } catch (error) {
        if (!controller.signal.aborted) console.error('Reading the wallet balances failed:', error);
      }
    };
    void read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [address, usdcMint, tick]);

  const value = useMemo<WalletState>(
    () => ({
      wallets,
      address,
      walletName: connected?.wallet.name ?? null,
      signer: (connected?.signer ?? null) as TransactionSigner | null,
      connecting,
      connectError: connectError == null ? null : describeConnectFailure(connectError),
      connect: (wallet) => void dispatchConnect(wallet),
      disconnect: () => void dispatchDisconnect(),
      panelOpen,
      setPanelOpen,
      funds,
      refreshFunds: () => setTick((n) => n + 1),
    }),
    [wallets, address, connected, connecting, connectError, dispatchConnect, dispatchDisconnect, panelOpen, funds],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
