// Config as the pages need it (the USDC mint, and whether trading is paused), read from the chain and shared. A refresh
// is silent: it changes what is shown only when it succeeds, so a poll never flickers the ticket.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Address } from '@solana/kit';
import { CHAIN } from './network.ts';
import { readTradeConfig } from './read-markets.ts';
import { ConfigMissing, chainRpc } from './read-config.ts';

export type ChainConfig =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'ready'; usdcMint: Address; paused: boolean };

const Context = createContext<{ config: ChainConfig; reload: () => void; refresh: () => void }>({
  config: { kind: 'loading' },
  reload: () => {},
  refresh: () => {},
});

export function ChainConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ChainConfig>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<AbortController | null>(null);

  const read = useCallback((silent: boolean) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    if (!silent) setConfig({ kind: 'loading' });
    readTradeConfig(chainRpc, c.signal).then(
      (v) => !c.signal.aborted && setConfig({ kind: 'ready', ...v }),
      (error) => {
        if (c.signal.aborted || silent) return;
        console.error(`Reading Config from ${CHAIN.name} failed:`, error);
        setConfig({ kind: error instanceof ConfigMissing ? 'missing' : 'error' });
      },
    );
  }, []);

  useEffect(() => {
    read(false);
    return () => controller.current?.abort();
  }, [attempt, read]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const refresh = useCallback(() => read(true), [read]);
  const value = useMemo(() => ({ config, reload, refresh }), [config, reload, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useChainConfig = () => useContext(Context);
