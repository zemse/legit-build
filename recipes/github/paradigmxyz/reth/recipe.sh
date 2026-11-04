#!/usr/bin/env bash
# legit.build recipe — reth (paradigmxyz). TARGET THE REPRODUCIBLE ARTIFACT, not the maxperf release.
# reth's standard maxperf tarball + :latest image are NOT reproducible (VERGEN_BUILD_TIMESTAMP wall
# clock + unremapped /home/runner path + a rolling apt.llvm.org clang-23 snapshot). reth ships a
# SEPARATE byte-verifiable build: Dockerfile.reproducible + a `reproducible` cargo profile
# (release-reproducible.yml), published as reth-reproducible + ghcr.io/paradigmxyz/reth-reproducible.
# Usage: recipe.sh <tag>   e.g. recipe.sh v2.9.0
# Produces: ./artifact/reth   Prints: toolchainHash=<sha256>
#
# STATUS: VERIFIED reproducible=full (2026-11-04). Two independent `docker build --no-cache` runs on a
# fresh x86_64 box produced a BYTE-IDENTICAL binary (sha256 ddf9a4cf...37883, 172,591,416 bytes for
# v2.9.0). But the as-committed Dockerfile.reproducible does NOT build today without the two fixes
# below, so this recipe applies them:
#   (1) apt valid-until: the Debian snapshot is pinned to 20250908T000000Z, but
#       .github/scripts/install_llvm_ubuntu.sh runs a plain `apt-get update` with no
#       `-o Acquire::Check-Valid-Until=false`. That snapshot's InRelease files are now >400 days past
#       Valid-Until, so apt exits 100 before compiling. We inject a compilation-neutral apt.conf
#       (same snapshot, same package versions, so the binary is unaffected). [report upstream]
#   (2) toolchain pin: the Dockerfile default `ARG RUST_TOOLCHAIN=1.89.0` does NOT compile v2.9.0
#       (reth's own workspace crates need rustc 1.96). We pass RUST_TOOLCHAIN explicitly. The release
#       workflow derives rustc from the CI runner (`rustc --version`, NOT pinned in-repo), so to
#       byte-match the PUBLISHED reth-reproducible artifact a rebuilder must know the exact release
#       rustc; it is not recorded in the repo. Our sha proves build-to-build convergence with the
#       RUST_TOOLCHAIN below, not necessarily equality to the published release binary. [report upstream]
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
RUST_TOOLCHAIN="${RUST_TOOLCHAIN:-1.96.0}"   # must be >=1.96 for v2.9.0; set to the exact release rustc to match the published artifact
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" https://github.com/paradigmxyz/reth "$WORK/src"
cd "$WORK/src"
# Fix (1): make install_llvm_ubuntu.sh's apt-get update tolerate the expired pinned snapshot.
# Inject at the top of the script so the config lands before any apt-get call it makes.
if [ -f .github/scripts/install_llvm_ubuntu.sh ]; then
  sed -i '1a echo '\''Acquire::Check-Valid-Until "false";'\'' > /etc/apt/apt.conf.d/10no-check-valid-until' .github/scripts/install_llvm_ubuntu.sh
fi
export DOCKER_BUILDKIT=1
# Build exactly as .github/workflows/release-reproducible.yml does (buildkit local output).
docker build . -f Dockerfile.reproducible --target artifacts \
  --build-arg RUST_TOOLCHAIN="$RUST_TOOLCHAIN" --build-arg VERSION="$TAG" \
  --output "type=local,dest=$WORK/export"
cp "$WORK/export/reth" "$OUT/reth"
echo "toolchainHash=$(printf '%s' "Dockerfile.reproducible|profile=reproducible|rustc=$RUST_TOOLCHAIN|$TAG" | sha256sum | cut -d' ' -f1)"
