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
VERIFY_IMAGE=solanafoundation/solana-verifiable-build:4.3.0@sha256:12fd4c0a0790f0fc41ef74b0cdb6bccc167ba6137eb1adb749bac649481c86bd
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
  assert.equal(Object.keys(PINS).length, 9);
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

const FILES = {
  rustToolchain: '[toolchain]\nchannel = "1.98.0"\n',
  nvmrc: '24.21.0\n',
  cargoToml: '[workspace]\nmembers = ["programs/*"]\n\n[workspace.metadata.cli]\nsolana = "4.3.0"\n',
  anchorToml: '[toolchain]\nanchor_version = "1.2.0"\nsolana_version = "4.3.0"\n',
};

test('rust-toolchain.toml, .nvmrc, Cargo.toml, Anchor.toml and the build image agree with the pins', () => {
  assert.deepEqual(checkPinsAgree(PINS, FILES), []);
});

test('a disagreeing rust-toolchain.toml or .nvmrc fails', () => {
  assert.equal(checkPinsAgree(PINS, { ...FILES, rustToolchain: 'channel = "1.97.0"' }).length, 1);
  assert.equal(checkPinsAgree(PINS, { ...FILES, nvmrc: '24.20.0' }).length, 1);
});

test('a missing or disagreeing Solana or Anchor version in Cargo.toml or Anchor.toml fails', () => {
  assert.match(checkPinsAgree(PINS, { ...FILES, cargoToml: '[workspace]\n' })[0] ?? '', /Cargo\.toml/);
  assert.match(checkPinsAgree(PINS, { ...FILES, cargoToml: FILES.cargoToml.replace('4.3.0', '4.2.2') })[0] ?? '', /4\.2\.2.*4\.3\.0/);
  assert.match(checkPinsAgree(PINS, { ...FILES, anchorToml: FILES.anchorToml.replace('"4.3.0"', '"4.2.2"') })[0] ?? '', /Anchor\.toml.*4\.2\.2/);
  assert.match(checkPinsAgree(PINS, { ...FILES, anchorToml: FILES.anchorToml.replace('"1.2.0"', '"1.1.0"') })[0] ?? '', /Anchor\.toml.*1\.1\.0/);
});

test('the build image must be for the pinned Agave, and pinned by digest', () => {
  const other = { ...PINS, VERIFY_IMAGE: PINS.VERIFY_IMAGE.replace(':4.3.0@', ':4.2.2@') };
  assert.match(checkPinsAgree(other, FILES)[0] ?? '', /4\.2\.2.*4\.3\.0/);
  const byTag = { ...PINS, VERIFY_IMAGE: 'solanafoundation/solana-verifiable-build:4.3.0' };
  assert.match(checkPinsAgree(byTag, FILES)[0] ?? '', /digest/);
});
