#!/usr/bin/env bash
# legit.build recipe — Grandine (grandinetech). Real release build via `cross`.
# Usage: recipe.sh <tag>   e.g. recipe.sh 2.0.6
# Produces: ./artifact/grandine   Prints: toolchainHash=<sha256>
# reproducible=none (see meta): a live nanosecond build timestamp + a floating cross-image
# tag mean rebuilders do NOT converge yet. Build and report honestly anyway.
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required (cross uses a container)" >&2; exit 3; }
command -v cargo >/dev/null || { echo "ERROR: rust/cargo required on host (rustup)" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
export CARGO_HOME=/home/runner/.cargo RUSTUP_HOME=/home/runner/.rustup   # converges the fixable path strings
git clone --depth 1 --branch "$TAG" --recurse-submodules https://github.com/grandinetech/grandine "$WORK/src"
cd "$WORK/src"
cargo install cross --git https://github.com/cross-rs/cross --rev f86fd03bb70b4c6802847c18087e21391498b0b4 --locked
cross build --bin grandine --target x86_64-unknown-linux-gnu --features default-networks --features tracing \
  --profile compact --workspace --exclude zkvm_host --exclude zkvm_guest_risc0 --exclude c_grandine --exclude csharp_grandine
cp target/x86_64-unknown-linux-gnu/compact/grandine "$OUT/grandine"
echo "toolchainHash=$(printf '%s' "rustc1.95.0(rust-toolchain.toml)|cross@f86fd03|ghcr.io/cross-rs/x86_64-unknown-linux-gnu:main(FLOATING)" | sha256sum | cut -d' ' -f1)"
