// The website's smoke test: the deployed page is the commit just deployed, sends exactly the headers of
// public/_headers (P17, P27), shows the stocks it read from devnet, and logged no errors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeWebsite } from './website.mjs';

const SHA = '651218c9a885e7ad6afff16870ba323f92abc054';
const expectedHeaders = { 'x-robots-tag': 'noindex', 'content-security-policy': "default-src 'self'; connect-src https://api.devnet.solana.com" };
const good = {
  status: 200,
  headers: { ...expectedHeaders, 'content-type': 'text/html' },
  commit: SHA,
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'],
  errors: [],
};

test('the deployed commit, with its headers, its 7 stocks and no errors, passes', () => {
  assert.deepEqual(judgeWebsite(good, SHA, expectedHeaders), []);
});

test('an old build, a missing or different header, missing stocks or a console error fails', () => {
  const judge = (patch) => judgeWebsite({ ...good, ...patch }, SHA, expectedHeaders)[0] ?? '';
  assert.match(judge({ commit: 'e4b663a18136800ef46ae094b22f2971b2bbc0a0' }), /commit/);
  assert.match(judge({ headers: { 'content-security-policy': expectedHeaders['content-security-policy'] } }), /x-robots-tag/);
  assert.match(judge({ headers: { ...good.headers, 'content-security-policy': "default-src 'self'" } }), /content-security-policy/);
  assert.match(judge({ stocks: [] }), /stocks/);
  assert.match(judge({ errors: ['Refused to connect to https://x'] }), /Refused/);
});
