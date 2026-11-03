#!/usr/bin/env bash
# legit.build recipe — Nethermind. Builds via Nethermind's own digest-pinned release Dockerfile.
# Usage: recipe.sh <tag>        e.g. recipe.sh 2.2.2
# Produces: ./artifact/nethermind    Prints: toolchainHash=<sha256> on the last line.
# Requires Docker.
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# FULL clone (the in-container build.sh runs git / dotnet restore --locked-mode).
git clone --branch "$TAG" https://github.com/NethermindEth/nethermind "$WORK/src"
cd "$WORK/src"
git config --global --add safe.directory "$WORK/src" 2>/dev/null || true
CH="$(git rev-parse HEAD)"
SDE="$(git log -1 --format=%ct)"          # commit date: deterministic across all rebuilders

# scripts/build/Dockerfile is FROM mcr.microsoft.com/dotnet/sdk:10.0.403-resolute@sha256:b836e4...
docker build . -t legit-nethermind -f scripts/build/Dockerfile \
  --build-arg COMMIT_HASH="$CH" --build-arg SOURCE_DATE_EPOCH="$SDE"
mkdir -p "$WORK/dist"
docker run --rm --mount type=bind,source="$WORK/dist",target=/output legit-nethermind
cp "$WORK/dist/linux-x64/nethermind" "$OUT/nethermind"

SDK="$(grep -m1 '^FROM ' scripts/build/Dockerfile)"
TC="$SDK|SOURCE_DATE_EPOCH=$SDE|linux-x64"
echo "toolchainHash=$(printf '%s' "$TC" | sha256sum | cut -d' ' -f1)"
