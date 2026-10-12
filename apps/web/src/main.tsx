// The website's entry: the shell around every page, and the routes (ARCHITECTURE.md §7).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Home } from './pages/Home.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { Shell } from './Shell.tsx';
import './theme.css';

// M0's wallet test is local only (the user's choice): the build drops it, so the deployed site has no such page.
const devOnly = import.meta.env.DEV
  ? [
      {
        path: '/wallet-test',
        hydrateFallbackElement: <p role="status">Loading the wallet test…</p>,
        lazy: async () => ({ Component: (await import('./wallet-test/WalletTest.tsx')).WalletTest }),
      },
    ]
  : [];

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [{ path: '/', element: <Home /> }, ...devOnly, { path: '*', element: <NotFound /> }],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
