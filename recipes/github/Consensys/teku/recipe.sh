#!/usr/bin/env bash
# legit.build recipe — Teku (Consensys). JVM; Gradle emits a reproducible dist tarball.
# Usage: recipe.sh <tag>   e.g. recipe.sh 26.10.3
# Produces: ./artifact/teku.tar.gz   Prints: toolchainHash=<sha256>
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
IMG="eclipse-temurin:25-jdk@sha256:83f4a7fc27df94dcc7b8de04d14cbbba8da14406f921e966969c3b09000aa507"   # verified 2026-11-04 (teku 26.10.3 reproduced bit-for-bit)
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" https://github.com/Consensys/teku "$WORK/src"
docker run --rm -v "$WORK/src":/w -w /w "$IMG" bash -euo pipefail -c '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null && apt-get install -y --no-install-recommends git >/dev/null
  git config --global --add safe.directory /w
  ./gradlew --no-daemon -x test -x convertRefTests distTar'
cp "$WORK/src"/build/distributions/teku-*.tar.gz "$OUT/teku.tar.gz"
JV=$(docker run --rm "$IMG" java -version 2>&1 | head -1)
TC="$IMG|$JV|gradle(reproducibleFileOrder,preserveFileTimestamps=false)"
echo "toolchainHash=$(printf '%s' "$TC" | sha256sum | cut -d' ' -f1)"
