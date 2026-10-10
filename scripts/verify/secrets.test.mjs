// No key file or secret is committed (D17). The fake secrets are assembled at run time,
// so this file never matches the scan it tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSecrets } from './secrets.mjs';

const k = (...parts) => parts.join('');
const one = (path, text = 'nothing here') => checkSecrets(new Map([[path, text]]));

test('ordinary files and an empty .env.example pass', () => {
  assert.deepEqual(checkSecrets(new Map([
    ['docs/a.md', 'Use the operator key from .env; never commit it.'],
    ['.env.example', '# Reference close (D93)\nTIINGO_API_KEY=\n'],
  ])), []);
});

test('a committed .env file fails', () => {
  assert.equal(one('.env').length, 1);
  assert.equal(one('apps/backend/.env.local').length, 1);
});

test('.env.example may not hold a value', () => {
  assert.equal(one('.env.example', 'TIINGO_API_KEY=abc123\n').length, 1);
});

test('key files fail by name', () => {
  for (const path of ['wallets/admin-keypair.json', 'id.json', 'deploy/upgrade.pem', 'x/server.key']) {
    assert.equal(one(path).length, 1, path);
  }
});

test('a 64-byte Solana key array fails, a 32-byte array passes', () => {
  assert.equal(one('a.json', `[${Array(64).fill(17).join(',')}]`).length, 1);
  assert.deepEqual(one('a.json', `[${Array(32).fill(17).join(', ')}]`), []);
});

test('a PEM private key fails', () => {
  assert.equal(one('a.txt', k('-----BEGIN ', 'PRIVATE KEY-----\nabc')).length, 1);
});

test('tokens fail', () => {
  const cases = {
    github: k('ghp', '_', 'A'.repeat(36)),
    telegram: k('123456789', ':', 'A'.repeat(35)),
    healthchecks: k('https://hc-ping.com/', '0f1e2d3c-4b5a-4968-8776-655443322110'),
    alchemy: k('https://solana-devnet.g.alchemy.com/v2/', 'a1B2c3D4e5F6g7H8i9J0kLmN'),
  };
  for (const [name, secret] of Object.entries(cases)) {
    assert.equal(one('docs/a.md', `token: ${secret}`).length, 1, name);
  }
});
