// The WSL toolchain matches scripts/toolchain/pins.sh, and the other pin files agree with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPins, checkToolchain, checkPinsAgree } from './check.mjs';

const PINS = readPins(`# comment
RUST=1.98.0
AGAVE=4.3.0
ANCHOR=1.2.0
SURFPOOL=1.6.0
SOLANA_VERIFY=0.5.2
LITESTREAM=0.5.17
NODE=24.21.0
AGAVE_SHA256=c97289a8abb1d0efb497d8b5cb285baabd9b7f8ea6647f5d145c5dc8ff3611e8
`);

// What each tool printed for its version at its pin, in WSL on 2026-10-10.
const OUTPUT = {
  rustc: 'rustc 1.98.0 (88d9e12ae 2026-08-18)',
  solana: 'solana-cli 4.3.0 (src:825efd18; feat:c9ad34d2, client:Agave)',
  anchor: 'anchor-cli 1.2.0',
  surfpool: 'surfpool 1.6.0',
  'solana-verify': 'solana-verify 0.5.2',
  litestream: '0.5.17',
  node: 'v24.21.0',
};
const runner = (output) => (cmd) => {
  if (!(cmd in output)) throw new Error(`${cmd}: command not found`);
  return output[cmd];
};

test('pins are read from the file, comments skipped', () => {
  assert.equal(PINS.RUST, '1.98.0');
  assert.equal(PINS.AGAVE_SHA256.length, 64);
  assert.equal(Object.keys(PINS).length, 8);
});

test('every tool at its pin passes', () => {
  assert.deepEqual(checkToolchain(PINS, runner(OUTPUT)), []);
});

test('a tool at another version fails, naming both versions', () => {
  const problems = checkToolchain(PINS, runner({ ...OUTPUT, anchor: 'anchor-cli 1.2.1' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /anchor.*1\.2\.1.*1\.2\.0/);
});

test('a missing tool fails', () => {
  const { solana, ...rest } = OUTPUT;
  assert.match(checkToolchain(PINS, runner(rest))[0] ?? '', /solana/);
});

test('rust-toolchain.toml and .nvmrc agree with the pins', () => {
  const files = { rustToolchain: '[toolchain]\nchannel = "1.98.0"\n', nvmrc: '24.21.0\n' };
  assert.deepEqual(checkPinsAgree(PINS, files), []);
});

test('a disagreeing rust-toolchain.toml or .nvmrc fails', () => {
  assert.equal(checkPinsAgree(PINS, { rustToolchain: 'channel = "1.97.0"', nvmrc: '24.21.0' }).length, 1);
  assert.equal(checkPinsAgree(PINS, { rustToolchain: 'channel = "1.98.0"', nvmrc: '24.20.0' }).length, 1);
});
