// Serves the app over HTTP/1.1; the host's proxy gives browsers HTTP/2 (ARCHITECTURE.md §9).
import { serve } from '@hono/node-server';
import type { Hono } from 'hono';

export type Listening = { port: number; close: () => Promise<void> };

// Port 0 picks a free port, as tests do (P16).
export function listen(app: Hono, port: number, hostname = '0.0.0.0'): Promise<Listening> {
  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port, hostname }, (info) =>
      resolve({
        port: info.port,
        close: () => new Promise<void>((done, fail) => server.close((error) => (error ? fail(error) : done()))),
      }),
    );
  });
}
