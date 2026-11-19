#!/usr/bin/env bash
# legit.build recipe — go-ethereum (geth). Deterministic build in a digest-pinned container.
# Usage: recipe.sh <tag>        e.g. recipe.sh v1.17.10
# Produces: ./artifact/geth     Prints: toolchainHash=<sha256> on the last line.
# Requires Docker (the C toolchain is frozen by the base image; a bare-host build won't converge).
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required to run the pinned toolchain" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
IMG="ubuntu@sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852"  # ubuntu:24.04, verified bit-for-bit
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

git clone --depth 1 --branch "$TAG" https://github.com/ethereum/go-ethereum "$WORK/src"
# The Go version geth's release (-dlgo) pins at this tag.
GOVER="$(sed -n 's/^# version:golang //p' "$WORK/src/build/checksums.txt" | head -1)"
[ -n "$GOVER" ] || { echo "ERROR: no Go version pinned in build/checksums.txt" >&2; exit 4; }
# Ubuntu archive as of the tag's commit, so apt installs the gcc/glibc the release was built with
# (static glibc is linked in; a newer libc6-dev changes the binary).
SNAP="$(TZ=UTC git -C "$WORK/src" log -1 --format=%cd --date=format-local:%Y%m%dT%H%M%SZ)"

docker run --rm --platform linux/amd64 -v "$WORK/src":/w -w /w "$IMG" bash -euo pipefail -c "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null
  apt-get install -y --no-install-recommends ca-certificates >/dev/null
  sed -i -E 's#^URIs: http://(archive|security).ubuntu.com/ubuntu/#URIs: https://snapshot.ubuntu.com/ubuntu/${SNAP}/#' /etc/apt/sources.list.d/ubuntu.sources
  apt-get update >/dev/null
  apt-get install -y --no-install-recommends gcc libc6-dev git wget >/dev/null
  wget -q https://go.dev/dl/go${GOVER}.linux-amd64.tar.gz -O /tmp/go.tgz
  tar -C /usr/local -xzf /tmp/go.tgz
  export PATH=/usr/local/go/bin:\$PATH
  git config --global --add safe.directory '*'
  go run build/ci.go install -static ./cmd/geth
  gcc --version | head -1 > /w/.gcc
  dpkg-query -W -f='\${Version}' libc6-dev > /w/.libc
"
cp "$WORK/src/build/bin/geth" "$OUT/geth"

TC="$IMG|$(cat "$WORK/src/.gcc")|libc6-dev $(cat "$WORK/src/.libc")|go${GOVER}|x86_64-unknown-linux-gnu"
echo "toolchainHash=$(printf '%s' "$TC" | sha256sum | cut -d' ' -f1)"
