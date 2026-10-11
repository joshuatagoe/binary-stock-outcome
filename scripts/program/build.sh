#!/usr/bin/env bash
# Builds the program in WSL and refreshes the committed IDL that the TypeScript client is generated from.
# Run from Windows: wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/program/build.sh"
# Then, on Windows: npm run client. `npm run verify` fails until the client matches the IDL (C4).
# --check (used by CI): build, then fail if the IDL differs from the committed one, instead of copying it.
set -euo pipefail

main() {
  local check=0
  [ "${1:-}" = "--check" ] && check=1
  source scripts/program/env.sh
  local target="${CARGO_TARGET_DIR:-target}"

  # The program's address is fixed by its key file (D92). Anchor builds with target/deploy's copy,
  # so put ours there first; without it Anchor would make a new key and a new address.
  local key="$HOME/.config/solana/meridian-program.json"
  if [ -f "$key" ] && [ ! -f "$target/deploy/meridian-keypair.json" ]; then
    mkdir -p "$target/deploy"
    cp "$key" "$target/deploy/meridian-keypair.json"
    chmod 600 "$target/deploy/meridian-keypair.json"
  fi

  # CI has no program key by design, so Anchor would warn that its random key doesn't match the address.
  if [ "$check" = 1 ]; then anchor build --ignore-keys; else anchor build; fi
  if [ "$check" = 1 ]; then
    diff -u clients/idl/meridian.json "$target/idl/meridian.json" \
      || { echo "The committed IDL is stale: run scripts/program/build.sh, then npm run client" >&2; exit 1; }
    echo "IDL matches clients/idl/meridian.json"
  else
    cp "$target/idl/meridian.json" clients/idl/meridian.json
    echo "Copied the IDL to clients/idl/meridian.json; now run npm run client on Windows"
  fi
}

main "$@"
