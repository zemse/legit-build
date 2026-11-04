#!/usr/bin/env bash
# legit.build recipe — Besu. JVM; the application jar is byte-reproducible (the dist TARBALL
# wrapper is NOT, because Besu's Gradle does not set reproducible-archive flags like Teku).
# So we hash the application jar, not the tarball.
# Usage: recipe.sh <tag>   e.g. recipe.sh 26.10.2
# Produces: ./artifact/besu-app.jar   Prints: toolchainHash=<sha256>
# NOTE: Besu's canonical repo moved from hyperledger/besu to besu-eth/besu for newer releases;
# adjust the clone URL per the forge-qualified project id the session hands you.
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"; VER="$TAG"
IMG="eclipse-temurin:25-jdk@sha256:83f4a7fc27df94dcc7b8de04d14cbbba8da14406f921e966969c3b09000aa507"   # verified 2026-11-04 (same image as teku)
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" https://github.com/hyperledger/besu "$WORK/src"
docker run --rm -v "$WORK/src":/w -w /w "$IMG" bash -euo pipefail -c '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update >/dev/null && apt-get install -y --no-install-recommends git >/dev/null
  git config --global --add safe.directory /w
  ./gradlew -Prelease.releaseVersion='"$VER"' -Pversion='"$VER"' --no-daemon -x test -x :acceptance-tests:tests:assemble installDist'
# the main application jar (reproducible across rebuilders); pick the besu-app jar for this version.
JAR="$(find "$WORK/src" -path '*/install/besu/lib/*' -name 'besu-app-'"$VER"'.jar' 2>/dev/null | head -1)"
[ -n "$JAR" ] || JAR="$(find "$WORK/src" -path '*/install/besu/lib/*' -name 'besu-'"$VER"'.jar' 2>/dev/null | head -1)"
[ -n "$JAR" ] || { echo "ERROR: could not locate the besu application jar" >&2; exit 4; }
cp "$JAR" "$OUT/besu-app.jar"
JV="$(docker run --rm "$IMG" java -version 2>&1 | head -1)"
echo "toolchainHash=$(printf '%s' "$IMG|$JV|gradle-installDist|app-jar" | sha256sum | cut -d' ' -f1)"
