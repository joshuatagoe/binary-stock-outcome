// The store opens in WAL mode for Litestream, applies each migration once, and knows when it is behind.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, migrate, migrationStatus, openDatabase } from '../src/db.ts';

// A fresh folder per database (P16).
const fresh = () => openDatabase(join(mkdtempSync(join(tmpdir(), 'meridian-db-')), 'meridian.db'));
const extra = { name: '0099_test', sql: 'CREATE TABLE test_only (x INTEGER)' };

describe('the store', () => {
  it('opens in WAL mode, which Litestream needs', () => {
    expect(fresh().pragma('journal_mode', { simple: true })).toBe('wal');
  });

  it('applies every migration once, in order', () => {
    const db = fresh();
    expect(migrate(db)).toEqual(MIGRATIONS.map((m) => m.name));
    expect(migrate(db)).toEqual([]);
    expect(migrationStatus(db)).toEqual({ applied: MIGRATIONS.map((m) => m.name), current: true });
  });

  it('creates the heartbeats and alerts tables of ARCHITECTURE.md §5', () => {
    const db = fresh();
    migrate(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").pluck().all();
    expect(tables).toEqual(expect.arrayContaining(['alerts', 'heartbeats']));
    const negative = db.prepare("INSERT INTO heartbeats (at, provider, slot, genesis_hash) VALUES ('x', 'p', -1, 'g')");
    expect(() => negative.run()).toThrow(/CHECK/);
  });

  it('is not current when a migration is pending', () => {
    const db = fresh();
    migrate(db);
    expect(migrationStatus(db, [...MIGRATIONS, extra]).current).toBe(false);
  });

  it('stays current after a rollback: a newer build’s migration is listed, and nothing of this build is pending', () => {
    const db = fresh();
    migrate(db, [...MIGRATIONS, extra]);
    expect(migrationStatus(db)).toEqual({ applied: [...MIGRATIONS.map((m) => m.name), extra.name], current: true });
  });
});
