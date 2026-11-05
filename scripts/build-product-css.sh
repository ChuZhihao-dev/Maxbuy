#!/bin/sh
# Build both product stylesheets; pass --watch=forever to rebuild after edits.
set -eu
cd "$(dirname "$0")/.."

set -- assets/main-product.css assets/maxbuy-product-mobile.css \
  --minify --outdir=assets --out-extension:.css=.min.css "$@"

if [ -n "${ESBUILD_BIN:-}" ]; then
  exec "$ESBUILD_BIN" "$@"
fi
exec npx --yes esbuild@0.28.1 "$@"
