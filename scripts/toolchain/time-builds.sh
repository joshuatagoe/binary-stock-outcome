#!/usr/bin/env bash
# Times P11's three setups for a clean `anchor build` of Anchor's starter program, plus `npm ci` in WSL.
# Run from Windows: wsl -e bash -lc "cd /mnt/c/dev/binary-stock-outcome && bash scripts/toolchain/time-builds.sh [STEPS]"
# STEPS picks from: 1 2 3 npm (default: all). A warm-up build on WSL's disk always runs first.
# P11's rule: the repository moves into WSL if the better Windows-folder setup is more than 3 times
# slower than the copy on WSL's disk, or its clean build takes over 5 minutes.
# npm ci on Windows itself (where P11 runs npm) is timed separately, from Windows.
# The throwaway projects live outside the repository and outside OneDrive, and are deleted first.
# Everything is inside main(), so bash reads the whole file before running it: an edit made
# while it runs can't change what it does (AI_USAGE 16).
set -euo pipefail

main() {
  local here repo steps
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo="$(cd "$here/../.." && pwd)"
  steps=" ${*:-1 2 3 npm} "
  WIN=/mnt/c/dev/meridian-timing
  LIN="$HOME/meridian-timing"
  TARGET="$HOME/.cache/meridian-target/timing"

  rm -rf "$WIN" "$LIN" "$TARGET"
  mkdir -p "$WIN" "$LIN"
  (cd "$LIN" && anchor init starter --no-install --no-git > /dev/null)
  cp -r "$LIN/starter" "$WIN/starter"

  echo "Clean anchor build of the starter (Anchor $(anchor --version | cut -d' ' -f2), $(nproc) cores, $(date -u +%FT%TZ)):"
  timed "warm-up: a first build on WSL's disk" "$LIN/starter" -- anchor build
  rm -rf "$LIN/starter/target"

  if [[ $steps == *" 1 "* ]]; then
    timed "1. everything in the Windows folder" "$WIN/starter" -- anchor build
    test -f "$WIN/starter/target/deploy/starter.so"
    rm -rf "$WIN/starter/target"
  fi
  if [[ $steps == *" 2 "* ]]; then
    timed "2. Windows folder, Rust's output on WSL's disk" "$WIN/starter" CARGO_TARGET_DIR="$TARGET" -- anchor build
    test -f "$TARGET/deploy/starter.so"
    test ! -e "$WIN/starter/target/deploy/starter.so"
  fi
  if [[ $steps == *" 3 "* ]]; then
    timed "3. a copy on WSL's disk" "$LIN/starter" -- anchor build
    test -f "$LIN/starter/target/deploy/starter.so"
  fi

  if [[ $steps == *" npm "* ]]; then
    echo
    echo "npm ci of this repository's package-lock.json in WSL (Node $(node --version)):"
    mkdir -p "$LIN/npm"
    cp "$repo/package.json" "$repo/package-lock.json" "$LIN/npm/"
    timed "warm-up: a first npm ci on WSL's disk" "$LIN/npm" -- npm ci --no-fund --no-audit
    rm -rf "$LIN/npm/node_modules"
    timed "3. npm ci, a copy on WSL's disk" "$LIN/npm" -- npm ci --no-fund --no-audit
  fi
}

# timed LABEL DIR [ENV=VALUE...] -- COMMAND...: run COMMAND in DIR and print the wall-clock seconds.
timed() {
  local label="$1" dir="$2" log start end
  shift 2
  local envs=()
  while [ "$1" != "--" ]; do envs+=("$1"); shift; done
  shift
  log="$LIN/$(echo "$label" | tr -c 'A-Za-z0-9\n' '-').log"
  start=$(date +%s%N)
  if ! (cd "$dir" && env "${envs[@]}" "$@" > "$log" 2>&1); then
    echo "$label: FAILED, see $log"
    tail -5 "$log"
    return 1
  fi
  end=$(date +%s%N)
  printf '%-58s %6.1f s\n' "$label" "$(( (end - start) / 1000000 ))e-3"
}

main "$@"
