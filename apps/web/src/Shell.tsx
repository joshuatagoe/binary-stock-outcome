// The shell around every page: the network banner (D33), the site's name, the wallet header and the connect
// panel (D115). The first-visit card (D86) waits for the risks page it links to.
import { Link, NavLink, Outlet } from 'react-router';
import { ChainConfigProvider } from './chain-config.tsx';
import { NETWORK_LABEL } from './network.ts';
import { WalletBar } from './WalletBar.tsx';
import { WalletProvider } from './wallet.tsx';

export function Shell() {
  return (
    <ChainConfigProvider>
      <WalletProvider>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header>
          <p className="banner" role="note">
            {NETWORK_LABEL}
          </p>
          <div className="header">
            <Link to="/" className="brand">
              Meridian
            </Link>
            <nav aria-label="Main">
              <NavLink to="/markets">Markets</NavLink> <NavLink to="/portfolio">Portfolio</NavLink>
            </nav>
            <WalletBar />
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="footer">
          <a href="https://github.com/joshuatagoe/binary-stock-outcome">Source on GitHub</a>
        </footer>
      </WalletProvider>
    </ChainConfigProvider>
  );
}
