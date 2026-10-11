// The shell around every page: the play-money banner (D33) and the site's name. The wallet header, the
// first-visit card (D86) and the connection states join it in M5.
import { Link, Outlet } from 'react-router';
import { NETWORK_LABEL } from './network.ts';

export function Shell() {
  return (
    <>
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
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <a href="https://github.com/joshuatagoe/binary-stock-outcome">Source on GitHub</a>
      </footer>
    </>
  );
}
