#!/usr/bin/env bash
# legit.build recipe — go-ethereum (geth). Deterministic build in a digest-pinned container.
# Usage: recipe.sh <tag>        e.g. recipe.sh v1.17.10
# Produces: ./artifact/geth     Prints: toolchainHash=<sha256> on the last line.
# Requires Docker (the C toolchain is frozen by the base image; a bare-host build won't converge).
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required to run the pinned toolchain" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
GOVER="1.27.3"                       # the Go version geth's release (-dlgo) pins at this tag
IMG="ubuntu@sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852"  # ubuntu:24.04, verified bit-for-bit
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

git clone --depth 1 --branch "$TAG" https://github.com/ethereum/go-ethereum "$WORK/src"

docker run --rm -v "$WORK/src":/w -w /w "$IMG" bash -euo pipefail -c "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null
  apt-get install -y --no-install-recommends gcc libc6-dev git ca-certificates wget >/dev/null
  wget -q https://go.dev/dl/go${GOVER}.linux-amd64.tar.gz -O /tmp/go.tgz
  tar -C /usr/local -xzf /tmp/go.tgz
  export PATH=/usr/local/go/bin:\$PATH
  git config --global --add safe.directory '*'
  go run build/ci.go install -static ./cmd/geth
  gcc --version | head -1 > /w/.gcc
"
cp "$WORK/src/build/bin/geth" "$OUT/geth"

TC="$IMG|$(cat "$WORK/src/.gcc")|go${GOVER}|x86_64-unknown-linux-gnu"
echo "toolchainHash=$(printf '%s' "$TC" | sha256sum | cut -d' ' -f1)"
