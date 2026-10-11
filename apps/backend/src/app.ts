// The backend's API (ARCHITECTURE.md §6). At M0 it serves only GET /api/health (D98, D132).
// Errors come back as {code, message}.
import { Hono } from 'hono';
import type { Progress } from './checker.ts';
import { migrationStatus, type Db } from './db.ts';

export type Role = 'primary' | 'standby';

type Options = { db: Db; role: Role; commit: string; progress: () => Progress };

export function createApp({ db, role, commit, progress }: Options) {
  const app = new Hono();

  // 200 only when the database answers and none of this build's migrations is pending. A quiet chain doesn't
  // make the backend unhealthy: the standby and the alerts judge chain progress themselves (D98, D75).
  // Field names are snake_case, like §6's request bodies.
  app.get('/api/health', (c) => {
    let database: { answers: boolean; migrations: ReturnType<typeof migrationStatus> | null };
    try {
      database = { answers: true, migrations: migrationStatus(db) };
    } catch {
      database = { answers: false, migrations: null };
    }
    const { lastPassAt, chain } = progress();
    const body = {
      role,
      commit,
      last_pass_at: lastPassAt?.toISOString() ?? null,
      chain: chain && { slot: chain.slot, seen_at: chain.seenAt.toISOString() },
      database,
    };
    return c.json(body, database.migrations?.current ? 200 : 503);
  });

  app.notFound((c) => c.json({ code: 'not_found', message: 'There is nothing at this address.' }, 404));
  app.onError((_, c) => c.json({ code: 'internal', message: 'Something went wrong on our side.' }, 500));
  return app;
}
