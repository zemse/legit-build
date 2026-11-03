#!/usr/bin/env bash
# legit.build recipe — Lighthouse (sigp). Builds via the repo's own CI script, which
# runs cargo inside a digest-pinned rust image (rust:1.99.0-bookworm@sha256:114c...).
# Usage: recipe.sh <tag>   e.g. recipe.sh v8.3.2
# Produces: ./artifact/lighthouse   Prints: toolchainHash=<sha256>
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" https://github.com/sigp/lighthouse "$WORK/src"
cd "$WORK/src"
# Exactly what release.yml runs for the x86_64 linux row (features auto-prepend 'portable').
scripts/ci/build-linux.sh lighthouse maxperf gnosis,slasher-lmdb,slasher-mdbx,slasher-redb,beacon-node-leveldb,beacon-node-redb
cp target/x86_64-unknown-linux-gnu/maxperf/lighthouse "$OUT/lighthouse"
IMG="$(grep -hoE 'rust:[0-9.]+-bookworm@sha256:[0-9a-f]{64}' scripts/ci/*.sh 2>/dev/null | head -1)"
echo "toolchainHash=$(printf '%s' "${IMG:-rust-pinned-image}|profile=maxperf|x86_64-unknown-linux-gnu" | sha256sum | cut -d' ' -f1)"
