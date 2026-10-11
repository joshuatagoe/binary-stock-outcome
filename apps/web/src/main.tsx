// The website's entry: the shell around every page, and the routes (ARCHITECTURE.md §7).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Home } from './pages/Home.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { Shell } from './Shell.tsx';
import './theme.css';

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
