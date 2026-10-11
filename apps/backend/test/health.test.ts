// GET /api/health (ARCHITECTURE.md §6, D98, D132): 200 only when the database answers and its migrations are current.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import type { Progress } from '../src/checker.ts';
import { MIGRATIONS, migrate, openDatabase } from '../src/db.ts';

const fresh = () => openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-health-')), 'meridian.db'));
const progress: Progress = {
  lastPassAt: new Date('2026-10-12T13:00:30Z'),
  chain: { slot: 509_924_280, seenAt: new Date('2026-10-12T13:00:30Z') },
};
const idle: Progress = { lastPassAt: null, chain: null };

async function get(app: ReturnType<typeof createApp>) {
  const res = await app.request('/api/health');
  return { status: res.status, body: await res.json() };
}

describe('GET /api/health', () => {
  it('reports the role, commit, last pass, chain progress and migrations', async () => {
    const db = fresh();
    migrate(db);
    const { status, body } = await get(createApp({ db, role: 'primary', commit: 'abc1234', progress: () => progress }));
    expect(status).toBe(200);
    expect(body).toEqual({
      role: 'primary',
      commit: 'abc1234',
      last_pass_at: '2026-10-12T13:00:30.000Z',
      chain: { slot: 509_924_280, seen_at: '2026-10-12T13:00:30.000Z' },
      database: { answers: true, migrations: { applied: MIGRATIONS.map((m) => m.name), current: true } },
    });
  });

  it('shows no pass and no chain progress before the first pass', async () => {
    const db = fresh();
    migrate(db);
    const { status, body } = await get(createApp({ db, role: 'primary', commit: 'abc1234', progress: () => idle }));
    expect(status).toBe(200);
    expect(body.last_pass_at).toBeNull();
    expect(body.chain).toBeNull();
  });

  it('answers 503 when a migration is pending', async () => {
    const db = fresh();
    const { status, body } = await get(createApp({ db, role: 'primary', commit: 'abc1234', progress: () => progress }));
    expect(status).toBe(503);
    expect(body.database).toEqual({ answers: true, migrations: { applied: [], current: false } });
  });

  it('answers an unknown path with 404 and {code, message} (§6)', async () => {
    const db = fresh();
    const res = await createApp({ db, role: 'primary', commit: 'abc1234', progress: () => idle }).request('/api/nothing');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: 'not_found', message: expect.any(String) });
  });

  it('answers 503 when the database does not answer', async () => {
    const db = fresh();
    migrate(db);
    db.close();
    const { status, body } = await get(createApp({ db, role: 'primary', commit: 'abc1234', progress: () => progress }));
    expect(status).toBe(503);
    expect(body.database).toEqual({ answers: false, migrations: null });
  });
});
