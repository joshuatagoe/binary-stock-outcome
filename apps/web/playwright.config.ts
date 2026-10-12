// The website's browser tests (D116), against the built site (`vite preview`, which serves public/_headers) and,
// for the main page, the dev server too: the dev server once crashed where the build didn't (M0.10).
// Devnet and Google Fonts are replaced, so the tests don't depend on the network. MERIDIAN_E2E_PORT moves both
// servers, so two checkouts can run them at once (P16); the dev server here is a test server on its own port.
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.MERIDIAN_E2E_PORT ?? 4173);
const BUILT = `http://127.0.0.1:${port}`;
const DEV = `http://127.0.0.1:${port + 1}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  projects: [
    { name: 'built', use: { ...devices['Desktop Chrome'], baseURL: BUILT }, grepInvert: /on the dev server/ },
    { name: 'dev', use: { ...devices['Desktop Chrome'], baseURL: DEV }, grep: /stocks read from Config|on the dev server/ },
  ],
  webServer: [
    {
      command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
      url: BUILT,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { GIT_COMMIT: 'e2e-test-commit' },
    },
    { command: `npx vite --host 127.0.0.1 --port ${port + 1} --strictPort`, url: DEV, reuseExistingServer: false, timeout: 120_000 },
  ],
});
