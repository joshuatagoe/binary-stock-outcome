#!/usr/bin/env bash
# Builds the program reproducibly from a pushed commit, in Solana's pinned build image (D69, D125, P24).
# The source is the commit as GitHub serves it, so the build holds nothing that isn't public.
# Run in WSL or Linux with Docker; anyone can rerun it and compare its hash with the program on devnet:
#   bash scripts/program/verified-build.sh <40-character commit>
#   solana-verify get-program-hash -u devnet kvQXEAnqr5muN7CKBGWFQ9R5d3L4Yf1bqPgG2BQX3Ly
# The program lands in ~/.cache/meridian-verify/<commit>/target/deploy/meridian.so.
set -euo pipefail

REPO=https://github.com/joshuatagoe/binary-stock-outcome

main() {
  local commit="${1:-}"
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo "usage: verified-build.sh <40-character commit>" >&2; exit 2; }
  source "$(dirname "${BASH_SOURCE[0]}")/../toolchain/pins.sh"
  local base="$HOME/.cache/meridian-verify" dir="$HOME/.cache/meridian-verify/$commit"

  # The build image writes target/ as root, so a previous build of this commit is removed through Docker.
  if [ -e "$dir" ]; then
    docker run --rm --entrypoint rm -v "$base:/w" "$VERIFY_IMAGE" -rf "/w/$commit"
  fi
  mkdir -p "$dir"
  curl -fsSL "$REPO/archive/$commit.tar.gz" | tar -xz -C "$dir" --strip-components=1

  # The folder must be a full path: solana-verify 0.5.2 given "." drops every dot from the manifest's path.
  # --arch v3: Anchor's format, and the one devnet will require once SIMD-0500 is on; solana-verify's default is v0 (M0.05).
  solana-verify build --base-image "$VERIFY_IMAGE" --library-name meridian --arch v3 "$dir"

  local so="$dir/target/deploy/meridian.so"
  local flags; flags=$(od -An -tu4 -j48 -N4 "$so" | tr -d ' ')
  [ "$flags" = 3 ] || { echo "$so is not sBPFv3 (ELF e_flags $flags)" >&2; exit 1; }
  local hash; hash=$(solana-verify get-executable-hash "$so")
  echo "commit  $commit"
  echo "program $so ($(stat -c %s "$so") bytes, sBPFv3)"
  echo "hash    $hash"
}

main "$@"
