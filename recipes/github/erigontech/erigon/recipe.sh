#!/usr/bin/env bash
# legit.build recipe — Erigon (erigontech). Builds via Erigon's own Dockerfile and extracts
# the binary (exactly what the release's buildx step does), on a fixed builder image.
# Usage: recipe.sh <tag>   e.g. recipe.sh v3.8.1
# Produces: ./artifact/erigon   Prints: toolchainHash=<sha256>
# NOTE: reproducible=partial. All rebuilders who clone the tag the same way agree on the Go
# code + version strings, but libmdbx bakes a wall-clock timestamp (mdbx.c __DATE__/__TIME__)
# that differs per build, so the full-binary hash does not yet converge. Fixed by mdbx-go#261
# (open) or by defining MDBX_BUILD_TIMESTAMP. See meta.json.
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"; VER="${TAG#v}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" --recurse-submodules https://github.com/erigontech/erigon "$WORK/src"
cd "$WORK/src"
export DOCKER_BUILDKIT=1
docker build . -t legit-erigon \
  --build-arg BUILDER_IMAGE=golang:1.27-bookworm \
  --build-arg TARGET_BASE_IMAGE=debian:12-slim \
  --build-arg BINARIES=erigon \
  --build-arg VERSION="$VER"
cid="$(docker create legit-erigon)"; docker cp "$cid:/usr/local/bin/erigon" "$OUT/erigon"; docker rm "$cid" >/dev/null
echo "toolchainHash=$(printf '%s' "golang:1.27-bookworm|debian:12-slim|GOAMD64=v2|GOEXPERIMENT=jsonv2|tags=nosqlite,noboltdb" | sha256sum | cut -d' ' -f1)"
