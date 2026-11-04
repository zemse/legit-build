#!/usr/bin/env bash
# legit.build recipe — ethrex (lambdaclass). Rust L1 node binary.
# Usage: recipe.sh <tag>   e.g. recipe.sh v30.0.1
# Produces: ./artifact/ethrex   Prints: toolchainHash=<sha256>
# Builds in ubuntu:22.04 (gcc 11.4.0 compiles the vendored RocksDB C++, baked into the binary),
# with HOME=/home/runner so the unremapped CARGO_HOME / rust-sysroot paths converge across rebuilders.
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
IMG="ubuntu:22.04@sha256:076e7bf82319619f28dd0aa9c02ab34b055ad37100395b4f49a2ffba04fb5e11"   # verified 2026-11-04 (gcc 11.4.0; ethrex reproduced bit-for-bit)
OUT="$PWD/artifact"; mkdir -p "$OUT"
docker run --rm -v "$OUT":/out "$IMG" bash -euo pipefail -c '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null
  apt-get install -y --no-install-recommends curl git ca-certificates build-essential pkg-config libssl-dev cmake clang libclang-dev protobuf-compiler >/dev/null
  export HOME=/home/runner CARGO_HOME=/home/runner/.cargo RUSTUP_HOME=/home/runner/.rustup
  mkdir -p /home/runner/work/ethrex && cd /home/runner/work/ethrex
  git config --global --add safe.directory "*"
  git clone --depth 1 --branch '"$TAG"' --recurse-submodules https://github.com/lambdaclass/ethrex ethrex
  cd ethrex
  curl -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain none   # rust-toolchain.toml pins 1.93.0
  . "$CARGO_HOME/env"
  cargo build --release --bin ethrex    # .cargo/config.toml rustflags (target-cpu=x86-64-v3) apply
  cp target/release/ethrex /out/ethrex'
echo "toolchainHash=$(printf '%s' "$IMG|rustc1.93.0(rust-toolchain.toml)|HOME=/home/runner|x86-64-v3" | sha256sum | cut -d' ' -f1)"
