# Source this in WSL from the checkout's root before building the program: `source scripts/program/env.sh`.
# In a checkout on the Windows drive, Rust's build output goes on WSL's disk instead, where a clean
# build takes 2.5 minutes rather than 13 (P11, M0.02). Each checkout gets its own folder (P16).
# No git here: Linux git can't open worktrees made by Windows git (AGENTS.md).
case "$PWD" in
  /mnt/*) export CARGO_TARGET_DIR="$HOME/.cache/meridian-target/$(basename "$PWD")" ;;
esac
