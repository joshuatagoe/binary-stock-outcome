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
FLYCTL=0.4.108
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
  flyctl: 'flyctl v0.4.108 linux/amd64 Commit: 598c8d785986ef71fcb6b964b90f920b8936cd8e BuildDate: 2026-09-24T16:27:10Z', // in WSL on 2026-10-11
};
const runner = (output) => (cmd) => {
  if (!(cmd in output)) throw new Error(`${cmd}: command not found`);
  return output[cmd];
};

test('pins are read from the file, comments skipped', () => {
  assert.equal(PINS.RUST, '1.98.0');
  assert.equal(PINS.AGAVE_SHA256.length, 64);
  assert.equal(Object.keys(PINS).length, 10);
});

test('flyctl, which deploys the backend (P17), is checked like the other tools', () => {
  const { flyctl, ...rest } = OUTPUT;
  assert.match(checkToolchain(PINS, runner(rest))[0] ?? '', /flyctl is not installed/);
  assert.match(checkToolchain(PINS, runner({ ...OUTPUT, flyctl: 'flyctl v0.4.115 linux/amd64' }))[0] ?? '', /0\.4\.115.*0\.4\.108/);
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
  dockerfile: '# The image\nFROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20\n',
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

test("the backend image's Node must be the pinned Node, pinned by digest", () => {
  const older = { ...FILES, dockerfile: FILES.dockerfile.replace('24.21.0', '24.20.0') };
  assert.match(checkPinsAgree(PINS, older)[0] ?? '', /Dockerfile.*24\.20\.0.*24\.21\.0/);
  const byTag = { ...FILES, dockerfile: 'FROM node:24.21.0-bookworm-slim\n' };
  assert.match(checkPinsAgree(PINS, byTag)[0] ?? '', /Dockerfile.*digest/);
});

test('the build image must be for the pinned Agave, and pinned by digest', () => {
  const other = { ...PINS, VERIFY_IMAGE: PINS.VERIFY_IMAGE.replace(':4.3.0@', ':4.2.2@') };
  assert.match(checkPinsAgree(other, FILES)[0] ?? '', /4\.2\.2.*4\.3\.0/);
  const byTag = { ...PINS, VERIFY_IMAGE: 'solanafoundation/solana-verifiable-build:4.3.0' };
  assert.match(checkPinsAgree(byTag, FILES)[0] ?? '', /digest/);
});
