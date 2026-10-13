// The backend reads config/<network>.json (ARCHITECTURE.md §11) and names any missing secret.
import { describe, expect, it } from 'vitest';
import { generateKeyPairSigner, getBase58Decoder } from '@solana/kit';
import { databasePath, loadConfig, operatorSigner, required } from '../src/config.ts';

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

describe('the operator key', () => {
  it('reads a key file’s byte list or a base58 secret, and names the same address for both', async () => {
    const signer = await generateKeyPairSigner(true);
    const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', signer.keyPair.privateKey)).slice(16);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', signer.keyPair.publicKey));
    const secret = new Uint8Array([...bytes, ...pub]);
    const fromList = await operatorSigner({ OPERATOR_SECRET_KEY: JSON.stringify(Array.from(secret)) });
    const fromBase58 = await operatorSigner({ OPERATOR_SECRET_KEY: getBase58Decoder().decode(secret) });
    expect(fromList!.address).toBe(signer.address);
    expect(fromBase58!.address).toBe(signer.address);
  });

  it('is absent when unset, and a wrong value is refused without printing it', async () => {
    expect(await operatorSigner({})).toBeNull();
    await expect(operatorSigner({ OPERATOR_SECRET_KEY: 'not-a-key-hunter2' })).rejects.toThrow(/OPERATOR_SECRET_KEY/);
    await expect(operatorSigner({ OPERATOR_SECRET_KEY: 'not-a-key-hunter2' })).rejects.not.toThrow(/hunter2/);
  });
});
