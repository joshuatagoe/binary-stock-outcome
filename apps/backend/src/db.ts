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
  {
    // §5's EVENTS (from the chain, rebuildable, D62) and the markets they name, plus the chain reader's place in the history.
    name: '0002_events_markets_reader_state',
    sql: `
      CREATE TABLE events (
        signature TEXT NOT NULL,
        ix_index INTEGER NOT NULL CHECK (ix_index >= 0),
        event_index INTEGER NOT NULL CHECK (event_index >= 0),
        slot INTEGER NOT NULL CHECK (slot >= 0),
        block_time TEXT,
        kind TEXT NOT NULL,
        market TEXT,
        market_key TEXT,
        trading_day INTEGER,
        wallet TEXT,
        counterparty TEXT,
        price_cents INTEGER CHECK (price_cents IS NULL OR price_cents BETWEEN 1 AND 99),
        qty INTEGER CHECK (qty IS NULL OR qty > 0),
        usdc_units INTEGER CHECK (usdc_units IS NULL OR usdc_units >= 0),
        data TEXT NOT NULL CHECK (json_valid(data)),
        network_epoch INTEGER NOT NULL DEFAULT 0 CHECK (network_epoch >= 0),
        PRIMARY KEY (signature, ix_index, event_index)
      ) WITHOUT ROWID;
      CREATE INDEX events_by_market_time ON events (market_key, slot);
      CREATE INDEX events_by_wallet_time ON events (wallet, slot);
      CREATE INDEX events_by_counterparty_time ON events (counterparty, slot) WHERE counterparty IS NOT NULL;
      CREATE INDEX events_by_day_kind ON events (trading_day, kind);
      CREATE INDEX events_by_market_address ON events (market) WHERE market_key IS NULL;
      CREATE TABLE markets (
        market TEXT PRIMARY KEY,
        market_key TEXT NOT NULL,
        network_epoch INTEGER NOT NULL DEFAULT 0 CHECK (network_epoch >= 0),
        stock TEXT NOT NULL,
        trading_day INTEGER NOT NULL,
        strike_cents INTEGER NOT NULL CHECK (strike_cents > 0),
        mint_open_at TEXT NOT NULL,
        open_at TEXT NOT NULL,
        close_at TEXT NOT NULL
      );
      CREATE INDEX markets_by_key ON markets (market_key);
      CREATE TABLE reader_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
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
