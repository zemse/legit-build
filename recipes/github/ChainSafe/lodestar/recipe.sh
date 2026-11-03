#!/usr/bin/env bash
# legit.build recipe — Lodestar (ChainSafe). caxa self-contained binary.
# Usage: recipe.sh <tag>   e.g. recipe.sh v1.50.1
# Produces: ./artifact/lodestar   Prints: toolchainHash=<sha256>
# reproducible=none (see meta): caxa stamps every tar-entry mtime with wall-clock time and uses
# a random identifier, so the binary does not converge across rebuilders. Lodestar's npm package
# and Docker images are SLSA-attested instead. Build and report honestly.
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker required" >&2; exit 3; }
TAG="${1:?usage: recipe.sh <tag>}"
OUT="$PWD/artifact"; mkdir -p "$OUT"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone --depth 1 --branch "$TAG" https://github.com/ChainSafe/lodestar "$WORK/src"
docker run --rm -v "$WORK/src":/w -w /w node:24.22.1 bash -euo pipefail -c '
  corepack enable
  pnpm install --frozen-lockfile
  pnpm build
  npx @chainsafe/caxa@3.0.6 --input . --output lodestar \
    -e "dashboards/**" -e "docs/**" -D \
    -p "pnpm clean:nm && pnpm install --frozen-lockfile --prod" \
    -- "{{caxa}}/node_modules/.bin/node" "--max-old-space-size=8192" "{{caxa}}/packages/cli/bin/lodestar.js"'
cp "$WORK/src/lodestar" "$OUT/lodestar"
echo "toolchainHash=$(printf '%s' "node:24.22.1|pnpm@11.0.0|caxa@3.0.6" | sha256sum | cut -d' ' -f1)"
