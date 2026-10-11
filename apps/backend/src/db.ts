// The store: SQLite through better-sqlite3, replicated continuously by Litestream (ARCHITECTURE.md §5, §9, D124).
import Database from 'better-sqlite3';

export type Db = Database.Database;
export type Migration = { name: string; sql: string };

// Each migration runs once, in order, and never changes after it ships: a change is a new migration.
// The tables and columns are §5's.
export const MIGRATIONS: Migration[] = [
  {
    name: '0001_heartbeats_alerts',
    sql: `
      CREATE TABLE heartbeats (
        at TEXT NOT NULL,
        provider TEXT NOT NULL,
        slot INTEGER NOT NULL CHECK (slot >= 0),
        genesis_hash TEXT NOT NULL,
        last_restart_slot INTEGER CHECK (last_restart_slot >= 0)
      );
      CREATE INDEX heartbeats_by_time ON heartbeats (at);
      CREATE TABLE alerts (
        id INTEGER PRIMARY KEY,
        at TEXT NOT NULL,
        kind TEXT NOT NULL,
        message TEXT NOT NULL
      );
    `,
  },
];

export function openDatabase(path: string): Db {
  const db = new Database(path);
  // Litestream copies the write-ahead log, so the database must keep one.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

const appliedNames = (db: Db) => db.prepare('SELECT name FROM migrations ORDER BY name').pluck().all() as string[];

// Applies the migrations not yet applied and returns their names.
export function migrate(db: Db, migrations = MIGRATIONS, now = () => new Date()): string[] {
  db.exec('CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set(appliedNames(db));
  const applied: string[] = [];
  for (const m of migrations) {
    if (done.has(m.name)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(m.name, now().toISOString());
    })();
    applied.push(m.name);
  }
  return applied;
}

// Current means none of this build's migrations is pending. A migration from a newer build is listed but
// allowed, so a rolled-back build still passes its health check; migrations only add, so the older code
// still works. Reads only, and throws if the database doesn't answer.
export function migrationStatus(db: Db, migrations = MIGRATIONS) {
  const tracked = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'migrations'").get();
  const applied = tracked ? appliedNames(db) : [];
  const current = migrations.every((m) => applied.includes(m.name));
  return { applied, current };
}
