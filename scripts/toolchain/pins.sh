# The toolchain pins, one source (ARCHITECTURE.md §9, D123, D125, P11).
# install.sh sources this file, check.mjs reads it, and `npm run verify` checks that rust-toolchain.toml,
# .nvmrc, Cargo.toml, Anchor.toml, VERIFY_IMAGE and apps/backend/Dockerfile's Node image agree with it.

RUST=1.98.0
AGAVE=4.3.0
ANCHOR=1.2.0
SURFPOOL=1.6.0
SOLANA_VERIFY=0.5.2
LITESTREAM=0.5.17
NODE=24.21.0

# Solana's build image for the verified build (D69, D125), at AGAVE's version and pinned by its digest,
# because a tag can be pushed again. Pushed 2026-09-21; digest from Docker Hub's tag list, read 2026-10-11.
VERIFY_IMAGE=solanafoundation/solana-verifiable-build:4.3.0@sha256:12fd4c0a0790f0fc41ef74b0cdb6bccc167ba6137eb1adb749bac649481c86bd

# SHA-256 of each Linux release file, checked before anything is installed. Sources, read 2026-10-10:
# the publisher's checksum file where one exists (Node's SHASUMS256.txt, Litestream's checksums.txt,
# solana-verify's .sha256), otherwise GitHub's digest for the release asset.
AGAVE_SHA256=c97289a8abb1d0efb497d8b5cb285baabd9b7f8ea6647f5d145c5dc8ff3611e8
ANCHOR_SHA256=0c9c41a3292c281cc6eadb78d6e1c8224d8324a34b0736a89d640fd314db05b7
SURFPOOL_SHA256=cb471b00aa3b7d603338eb74ebfec1d23959ecba005b5f1be42ba8d174107fc2
SOLANA_VERIFY_SHA256=b9d5ccce9634dc14269cab3e7a58649bc141b3306e7735a94478c936341f211f
LITESTREAM_SHA256=cfb371176d164437ae869f8351cfde49bd1804ae71c61923f75c9cba9c9c006d
NODE_SHA256=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6
