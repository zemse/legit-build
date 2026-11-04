#!/usr/bin/env bash
# legit.build recipe — Nimbus EL (status-im/nimbus-eth1). `make dist-linux-amd64` builds inside a
# digest-pinned base image (dist_base_eth1 ...@sha256:8b9442cd...). NOTE the target name: EL uses
# dist-linux-amd64 (CL uses dist-amd64).
# Usage: recipe.sh <tag>   e.g. recipe.sh v0.4.4
# Produces: ./artifact/nimbus   Prints: toolchainHash=<sha256>
# Host needs: docker, make, gcc, git, git-lfs.
# reproducible=partial (see meta): the executable CODE (.text) is bit-identical to the release,
# but the full binary does NOT converge (Nim "Compiled at <date>" banner + symbol-table ordering).
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
command -v make  >/dev/null || { echo "ERROR: make required on host (dnf groupinstall 'Development Tools')" >&2; exit 3; }
command -v git-lfs >/dev/null || { echo "ERROR: git-lfs required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone https://github.com/status-im/nimbus-eth1 "$WORK/src"
cd "$WORK/src"
git checkout "$TAG"
git lfs install
make update -j
make dist-linux-amd64
tar -xzf dist/nimbus-eth1_linux_amd64_*.tar.gz -C "$WORK"
cp "$WORK"/nimbus-eth1_linux_amd64_*/build/nimbus "$OUT/nimbus"
echo "toolchainHash=$(printf '%s' "nimbus-eth1:dist_base_eth1@sha256:8b9442cd1f66518635b355529e4b44eb89a9ebad513dc9015c96c7cd1dd82a24|make-dist-linux-amd64" | sha256sum | cut -d' ' -f1)"
