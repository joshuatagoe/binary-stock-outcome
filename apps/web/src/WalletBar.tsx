// The wallet header, the connect panel and the devnet guide (D115, USERS.md F2). Any page can open the panel
// (useWallet().setPanelOpen), so the ticket's "Connect wallet" and the header's are the same button and the same words.
import { useEffect, useRef, useState } from 'react';
import { WALLET_WORDS } from './failures.ts';
import { formatSol, fundsNotes, shortAddress } from './format.ts';
import { formatUsdc } from '@meridian/shared';
import { useWallet } from './wallet.tsx';

const GUIDE_KEY = 'meridian-devnet-guide-done';

// Storage can be blocked or empty (private windows), so the page works without it.
function guideDone(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function WalletBar() {
  const w = useWallet();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [guideHidden, setGuideHidden] = useState(guideDone);
  const [copied, setCopied] = useState(false);

  // Focus moves into the panel when it opens, and back to the button when it closes by keyboard.
  useEffect(() => {
    if (w.panelOpen) panel.current?.focus();
  }, [w.panelOpen]);

  // After connecting, the panel's heading takes focus, so it doesn't fall back to the page when the list of wallets goes away.
  const connectedHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (w.address && w.panelOpen) connectedHeading.current?.focus();
  }, [w.address, w.panelOpen]);

  const copy = async () => {
    if (!w.address) return;
    try {
      await navigator.clipboard.writeText(w.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the address is on screen to copy by hand */
    }
  };

  const notes = fundsNotes(w.funds);

  return (
    <div className="wallet">
      <div className="wallet-bar">
        {w.address ? (
          <>
            <span className="mono" aria-label={`Connected ${w.walletName ?? 'wallet'}, address ${w.address}`}>
              {shortAddress(w.address)}
              {w.funds && ` · ${formatSol(w.funds.sol)} SOL · ${formatUsdc(w.funds.usdc)} USDC`}
            </span>
            <button type="button" className="quiet" onClick={() => w.setPanelOpen(!w.panelOpen)} aria-expanded={w.panelOpen} aria-controls="wallet-panel" ref={opener}>
              Wallet
            </button>
          </>
        ) : (
          <button type="button" onClick={() => w.setPanelOpen(!w.panelOpen)} aria-expanded={w.panelOpen} aria-controls="wallet-panel" ref={opener}>
            Connect wallet
          </button>
        )}
      </div>

      <div
        id="wallet-panel"
        ref={panel}
        tabIndex={-1}
        hidden={!w.panelOpen}
        className="card wallet-panel"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            w.setPanelOpen(false);
            opener.current?.focus();
          }
        }}
      >
        {!w.address ? (
          <>
            <h2>Connect wallet</h2>
            {w.wallets.length === 0 ? (
              <p>{WALLET_WORDS.noWallet}</p>
            ) : (
              <ul className="wallets" aria-label="Wallets">
                {w.wallets.map((wallet) => (
                  <li key={wallet.name}>
                    <button type="button" disabled={w.connecting} onClick={() => w.connect(wallet)}>
                      Connect {wallet.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {w.connecting && <p role="status">Waiting for your wallet: approve the connection in its pop-up, which may be behind this window.</p>}
            {w.connectError && (
              <p role="alert" className="notice danger">
                {w.connectError.message}
              </p>
            )}
            <p className="muted">Signing in is your wallet only. Meridian never sees a key or a password.</p>
          </>
        ) : (
          <>
            <h2 ref={connectedHeading} tabIndex={-1}>
              Connected
            </h2>
            <p role="status">
              {w.walletName} is connected: <span className="mono">{w.address}</span>
            </p>
            {!w.signer && (
              <p role="alert" className="notice danger">
                Connected, but the wallet gave the page no way to sign, so you can look but not trade.
              </p>
            )}
            <p className="answers">
              <button type="button" onClick={copy}>
                Copy address
              </button>
              <button type="button" className="quiet" onClick={w.disconnect}>
                Disconnect
              </button>
            </p>
            <p role="status" className="sr-only">
              {copied ? 'Address copied' : ''}
            </p>
          </>
        )}
      </div>

      {w.address && !guideHidden && (
        <section className="notice warn" aria-labelledby="devnet-guide">
          <h2 id="devnet-guide">Set your wallet to Solana Devnet</h2>
          <p>
            In Solflare: Settings, then Network, then Devnet. In Phantom: turn on Testnet Mode in its developer settings.
          </p>
          <button
            type="button"
            onClick={() => {
              setGuideHidden(true);
              try {
                localStorage.setItem(GUIDE_KEY, '1');
              } catch {
                /* it shows again next visit */
              }
            }}
          >
            Done
          </button>
        </section>
      )}

      {w.address &&
        notes.map((n) => (
          <section key={n.id} className="notice warn" aria-label={n.id === 'sol' ? 'Devnet SOL' : 'Test USDC'}>
            <p>{n.text}</p>
            <p className="answers">
              <button type="button" onClick={copy}>
                Copy address
              </button>
              <a className="button" href={n.faucet} target="_blank" rel="noreferrer">
                Open faucet
              </a>
            </p>
          </section>
        ))}
    </div>
  );
}
