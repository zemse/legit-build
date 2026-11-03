#!/usr/bin/env bash
# legit.build recipe — Nimbus CL (status-im/nimbus-eth2). `make dist-amd64` builds inside a
# digest-pinned base image (dist_base ...@sha256:0600991a...).
# Usage: recipe.sh <tag>   e.g. recipe.sh v26.10.2
# Produces: ./artifact/nimbus_beacon_node   Prints: toolchainHash=<sha256>
# Host needs: docker, make, gcc, git, git-lfs.
# reproducible=partial (see meta): the executable CODE (.text) is bit-identical to the release,
# but the full binary does NOT converge (a Nim "Compiled at <date>" banner + environment-dependent
# symbol-table ordering).
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
command -v make  >/dev/null || { echo "ERROR: make required on host (dnf groupinstall 'Development Tools')" >&2; exit 3; }
command -v git-lfs >/dev/null || { echo "ERROR: git-lfs required (vendor/hoodi uses LFS)" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone https://github.com/status-im/nimbus-eth2 "$WORK/src"
cd "$WORK/src"
git checkout "$TAG"
git lfs install
make update -j
make dist-amd64
tar -xzf dist/nimbus-eth2_Linux_amd64_*.tar.gz -C "$WORK"
cp "$WORK"/nimbus-eth2_Linux_amd64_*/build/nimbus_beacon_node "$OUT/nimbus_beacon_node"
echo "toolchainHash=$(printf '%s' "nimbus-eth2:dist_base@sha256:0600991a291d02c11c69f7934951cb840c369f6c2ea82b231577cc30091b71b0|make-dist-amd64" | sha256sum | cut -d' ' -f1)"
