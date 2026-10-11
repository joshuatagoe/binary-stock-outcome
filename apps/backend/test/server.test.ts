// The real server answers over HTTP. It listens on port 0, a free port the system picks (P16).
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { migrate, openDatabase } from '../src/db.ts';
import { listen } from '../src/server.ts';

describe('the server', () => {
  it('serves /api/health on a free port', async () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-server-')), 'meridian.db'));
    migrate(db);
    const app = createApp({ db, role: 'primary', commit: 'abc1234', progress: () => ({ lastPassAt: null, chain: null }) });
    const server = await listen(app, 0);
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/api/health`);
      expect(res.status).toBe(200);
      expect((await res.json()).commit).toBe('abc1234');
    } finally {
      await server.close();
    }
  });
});
