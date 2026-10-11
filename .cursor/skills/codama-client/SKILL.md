---
name: codama-client
description: The Codama-generated TypeScript client in clients/ts, from the program's Anchor IDL. Use when the program's interface changes, when verify reports a stale client, or when TypeScript code calls the program.
---

# Codama client in Meridian

Pinned: `codama` 1.11.0, `@codama/nodes-from-anchor` 1.5.6 and `@codama/renderers-js` 2.5.0, all released 2026-09-15; `@solana/kit` 8.3.0 (2026-09-09); TypeScript 6.0.3 and `@types/node` 24.19.0. Checked in this repo on 2026-10-10 (M0 slice c).

## Regenerate

`clients/idl/meridian.json` is the source; never edit `clients/ts/src/generated` by hand.

```sh
wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/program/build.sh"   # new IDL
npm run client                                                                        # new client
```

`npm run verify` regenerates into a temporary folder and fails if the committed client differs. It also typechecks `clients/ts`.

## What worked with Anchor 1.2.0's IDL

Codama read the IDL (spec 0.1.0) and generated accounts with decoders, PDA helpers (`findConfigPda`), instructions, errors, events and types. The renderer options in `scripts/client/generate.mjs`:

```js
renderVisitor(packageFolder, {
  generatedFolder: 'src/generated', deleteFolderBeforeRendering: true, formatCode: true,
  syncPackageJson: false, erasableSyntax: true, importExtension: 'ts',
});
```

`erasableSyntax` and `.ts` import extensions let Node 24 run the sources directly. `node clients/ts/examples/config-address.ts` printed Config's address, `Ax7mkLD7sgiud7phyXdpPa1HzFf2ek2ZKHv9FE6DcN2e`, the same one `solana find-program-derived-address <program> string:config` gives.

## Facts that cost time

- An instruction with one struct argument (`args: InitializeConfigArgs`) is flattened: the encoder takes `admin`, `operator` and so on at the top level, with no `args` key.
- The generated errors read `process.env.NODE_ENV`, so `clients/ts/tsconfig.json` needs `"types": ["node"]` and `@types/node`.
- `syncPackageJson: false` stops Codama from rewriting `clients/ts/package.json`.
