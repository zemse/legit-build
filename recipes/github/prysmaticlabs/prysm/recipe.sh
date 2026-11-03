#!/usr/bin/env bash
# legit.build recipe — Prysm (OffchainLabs). Bazel + hermetic toolchains. NO DOCKER.
# Requires bazelisk + a JDK on the host (Bazel needs them); bazelisk fetches the hermetic
# Go and CC toolchains itself, so the rest of the toolchain is frozen without a container.
# Usage: recipe.sh <tag>   e.g. recipe.sh v7.3.1
# Produces: ./artifact/beacon-chain and ./artifact/validator   Prints: toolchainHash=<sha256>
set -euo pipefail
command -v bazelisk >/dev/null || { echo "ERROR: bazelisk required (go install github.com/bazelbuild/bazelisk@latest or brew install bazelisk)" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" https://github.com/OffchainLabs/prysm "$WORK/src"
cd "$WORK/src"
CH="$(git rev-parse HEAD)"; SDE="$(git log -1 --format=%ct)"
ISO="$(date -u -d @"$SDE" +"%Y-%m-%d %H:%M:%S+00:00" 2>/dev/null || date -u -r "$SDE" +"%Y-%m-%d %H:%M:%S+00:00")"
# Pin the --stamp build date to the SOURCE commit date so every rebuilder converges.
cat > hack/workspace_status.sh <<WS
#!/bin/bash
echo STABLE_GIT_COMMIT $CH
echo DATE "$ISO"
echo DATE_UNIX "$SDE"
echo DOCKER_TAG reproducible
echo STABLE_GIT_TAG $TAG
WS
chmod +x hack/workspace_status.sh
bazelisk build --config=release //cmd/beacon-chain //cmd/validator   # Bazel 7.4.1 via .bazelversion
cp bazel-bin/cmd/beacon-chain/beacon-chain_/beacon-chain "$OUT/beacon-chain"
cp bazel-bin/cmd/validator/validator_/validator "$OUT/validator"
echo "toolchainHash=$(printf '%s' "bazel7.4.1|hermetic-go+zig-cc|--config=release|DATE_UNIX=$SDE" | sha256sum | cut -d' ' -f1)"
