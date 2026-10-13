// Any address the site doesn't have. Cloudflare Pages serves the root for every path, so this renders here.
import { Link } from 'react-router';

export function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>There's nothing at this address.</p>
      <p>
        <Link to="/">Go to the home page</Link>, or <Link to="/markets">browse the markets</Link>
      </p>
    </>
  );
}
