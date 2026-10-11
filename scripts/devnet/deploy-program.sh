#!/usr/bin/env bash
# Deploys or upgrades the program on devnet, only from the laptop that holds the upgrade key (D92, D125).
# It builds a pushed commit with verified-build.sh, deploys that exact file, then checks that the
# program on devnet has the build's hash. Run in WSL, from the checkout's root:
#   wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/devnet/deploy-program.sh <40-character commit>"
# The upgrade key pays. The upload goes through a buffer account whose key file this script makes; left to
# itself, the CLI makes one and prints its recovery phrase (AI_USAGE 17). A stopped deploy keeps the file and
# its SOL: run the script again with the same commit to resume. To deploy another commit instead, first return
# the SOL: `solana program close --buffers -u devnet -k ~/.config/solana/meridian-upgrade.json`.
set -euo pipefail

KEYS="$HOME/.config/solana"

main() {
  local commit="${1:-}"
  local program; program=$(sed -n '/^\[programs.devnet\]/,/^\[/s/^meridian = "\(.*\)"$/\1/p' Anchor.toml)
  local key; key=$(solana address -k "$KEYS/meridian-program.json")
  [ "$key" = "$program" ] || { echo "meridian-program.json is $key; Anchor.toml's devnet program is $program" >&2; exit 1; }

  bash scripts/program/verified-build.sh "$commit"
  local so="$HOME/.cache/meridian-verify/$commit/target/deploy/meridian.so"
  local built; built=$(solana-verify get-executable-hash "$so")

  local buffer="$KEYS/meridian-buffer.json"
  [ -f "$buffer" ] || solana-keygen new --silent --no-bip39-passphrase -o "$buffer"
  solana program deploy "$so" -u devnet \
    --program-id "$KEYS/meridian-program.json" \
    --upgrade-authority "$KEYS/meridian-upgrade.json" \
    --keypair "$KEYS/meridian-upgrade.json" \
    --buffer "$buffer"
  rm "$buffer"

  local deployed; deployed=$(solana-verify get-program-hash -u devnet "$program")
  echo "commit   $commit"
  echo "built    $built"
  echo "deployed $deployed"
  [ "$built" = "$deployed" ] || { echo "The program on devnet doesn't match the build" >&2; exit 1; }
  solana program show -u devnet "$program"
}

main "$@"
