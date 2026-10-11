#!/usr/bin/env bash
# Installs the Solana build tools in WSL at the pins in pins.sh, without sudo (ARCHITECTURE.md §9, P11).
# Run from Windows: wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/toolchain/install.sh"
# Solana's apt prerequisites come first, once, with sudo:
#   sudo apt-get install -y build-essential pkg-config libudev-dev llvm libclang-dev protobuf-compiler libssl-dev
# Every release file's SHA-256 is checked against pins.sh before it is unpacked.
# Running it again skips whatever is already installed at its pin.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=pins.sh
source "$here/pins.sh"

TOOLS="$HOME/.local/share/meridian-toolchain"
BIN="$HOME/.local/bin"
mkdir -p "$TOOLS" "$BIN"
export PATH="$BIN:$HOME/.cargo/bin:$PATH"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# fetch URL SHA256 NAME: download into the temporary folder and stop unless the hash matches.
fetch() {
  echo "  downloading $1"
  curl -fsSL --retry 3 -o "$tmp/$3" "$1"
  if ! echo "$2  $tmp/$3" | sha256sum --check --status; then
    echo "SHA-256 mismatch for $1: expected $2, got $(sha256sum "$tmp/$3" | cut -d' ' -f1)" >&2
    exit 1
  fi
}

# unpacked NAME: true if NAME is already installed; otherwise clears any half-finished attempt.
unpacked() {
  [ -d "$TOOLS/$1" ] && { echo "$1: already installed"; return 0; }
  rm -rf "$TOOLS/$1.part"
  mkdir -p "$TOOLS/$1.part"
  echo "$1: installing"
  return 1
}
finish() { mv "$TOOLS/$1.part" "$TOOLS/$1"; }

# Rust, through rustup. rustup itself isn't pinned; the toolchain it installs is.
if ! command -v rustup >/dev/null 2>&1; then
  echo "rustup: installing"
  base=https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu
  fetch "$base/rustup-init" "$(curl -fsSL "$base/rustup-init.sha256" | cut -d' ' -f1)" rustup-init
  chmod +x "$tmp/rustup-init"
  "$tmp/rustup-init" -y --profile minimal --default-toolchain "$RUST"
fi
rustup toolchain install "$RUST" --profile minimal -c rustfmt -c clippy

# Agave: the Solana CLI, solana-keygen and cargo-build-sbf.
name="agave-$AGAVE"
if ! unpacked "$name"; then
  fetch "https://github.com/anza-xyz/agave/releases/download/v$AGAVE/solana-release-x86_64-unknown-linux-gnu.tar.bz2" "$AGAVE_SHA256" agave.tar.bz2
  tar -xjf "$tmp/agave.tar.bz2" -C "$TOOLS/$name.part"
  finish "$name"
fi
for f in "$TOOLS/$name/solana-release/bin/"*; do
  [ -f "$f" ] && [ -x "$f" ] && ln -sfn "$f" "$BIN/$(basename "$f")"
done
# A link from an earlier version of this script that also linked bin/deps, a folder.
[ -L "$BIN/deps" ] && [ "$(readlink "$BIN/deps")" = "$TOOLS/$name/solana-release/bin/deps" ] && rm "$BIN/deps"

# Anchor, the CLI only; the program's crates come from Cargo.
name="anchor-$ANCHOR"
if ! unpacked "$name"; then
  fetch "https://github.com/solana-foundation/anchor/releases/download/v$ANCHOR/anchor-$ANCHOR-x86_64-unknown-linux-gnu" "$ANCHOR_SHA256" anchor
  install -m 755 "$tmp/anchor" "$TOOLS/$name.part/anchor"
  finish "$name"
fi
ln -sfn "$TOOLS/$name/anchor" "$BIN/anchor"

# Surfpool, the local chain for `make dev`.
name="surfpool-$SURFPOOL"
if ! unpacked "$name"; then
  fetch "https://github.com/txtx/surfpool/releases/download/v$SURFPOOL/surfpool-linux-x64.tar.gz" "$SURFPOOL_SHA256" surfpool.tar.gz
  tar -xzf "$tmp/surfpool.tar.gz" -C "$TOOLS/$name.part"
  finish "$name"
fi
ln -sfn "$(find "$TOOLS/$name" -type f -name surfpool | head -1)" "$BIN/surfpool"

# solana-verify, for the reproducible build and its hash (D69, D125).
name="solana-verify-$SOLANA_VERIFY"
if ! unpacked "$name"; then
  fetch "https://github.com/Ellipsis-Labs/solana-verifiable-build/releases/download/v$SOLANA_VERIFY/solana-verify-$SOLANA_VERIFY-linux" "$SOLANA_VERIFY_SHA256" solana-verify
  install -m 755 "$tmp/solana-verify" "$TOOLS/$name.part/solana-verify"
  finish "$name"
fi
ln -sfn "$TOOLS/$name/solana-verify" "$BIN/solana-verify"

# Litestream, which backs the backend's SQLite file up to R2 (D124).
name="litestream-$LITESTREAM"
if ! unpacked "$name"; then
  fetch "https://github.com/benbjohnson/litestream/releases/download/v$LITESTREAM/litestream-$LITESTREAM-linux-x86_64.tar.gz" "$LITESTREAM_SHA256" litestream.tar.gz
  tar -xzf "$tmp/litestream.tar.gz" -C "$TOOLS/$name.part"
  finish "$name"
fi
ln -sfn "$(find "$TOOLS/$name" -type f -name litestream | head -1)" "$BIN/litestream"

# Node, for npm in WSL and for check.mjs. Windows has its own copy (P11).
name="node-$NODE"
if ! unpacked "$name"; then
  fetch "https://nodejs.org/dist/v$NODE/node-v$NODE-linux-x64.tar.xz" "$NODE_SHA256" node.tar.xz
  tar -xJf "$tmp/node.tar.xz" -C "$TOOLS/$name.part" --strip-components=1
  finish "$name"
fi
for f in node npm npx; do ln -sfn "$TOOLS/$name/bin/$f" "$BIN/$f"; done

# flyctl, which creates and deploys the backend on Fly.io (P17). `fly` is the same program.
name="flyctl-$FLYCTL"
if ! unpacked "$name"; then
  fetch "https://github.com/superfly/flyctl/releases/download/v$FLYCTL/flyctl_${FLYCTL}_Linux_x86_64.tar.gz" "$FLYCTL_SHA256" flyctl.tar.gz
  tar -xzf "$tmp/flyctl.tar.gz" -C "$TOOLS/$name.part"
  finish "$name"
fi
for f in flyctl fly; do ln -sfn "$(find "$TOOLS/$name" -type f -name flyctl | head -1)" "$BIN/$f"; done

echo
node "$here/check.mjs"
