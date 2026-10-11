// The backend reads config/<network>.json (ARCHITECTURE.md §11) and names any missing secret.
import { describe, expect, it } from 'vitest';
import { databasePath, loadConfig, required } from '../src/config.ts';

describe('the config', () => {
  it("holds §11's devnet values", () => {
    expect(loadConfig('devnet')).toMatchObject({
      network: 'devnet',
      rpc: { public: 'https://api.devnet.solana.com' },
      checkEverySecs: 30,
      heartbeatEverySecs: 60,
    });
  });

  it('refuses a network name that could leave the config folder', () => {
    expect(() => loadConfig('../package')).toThrow(/network's name/);
  });

  it('puts the store in DATABASE_PATH, or in meridian.db, which git ignores', () => {
    expect(databasePath({ DATABASE_PATH: '/data/meridian.db' })).toBe('/data/meridian.db');
    expect(databasePath({})).toBe('meridian.db');
    expect(databasePath({ DATABASE_PATH: '' })).toBe('meridian.db');
  });

  it('names a missing secret, and points to .env.example', () => {
    expect(() => required('TELEGRAM_BOT_TOKEN', {})).toThrow(/TELEGRAM_BOT_TOKEN.*\.env\.example/);
    expect(required('TELEGRAM_BOT_TOKEN', { TELEGRAM_BOT_TOKEN: 'set' })).toBe('set');
  });
});
