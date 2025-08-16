#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

mkdir -p /configs

route_symbol="${ROUTE_SYMBOL:-route}"
stamp="/configs/.done-warp-${route_symbol}"
if [ -f "${stamp}" ]; then
  echo "warp route ${route_symbol} already configured, skipping"
else
  echo "would configure warp route ${route_symbol} here via hyperlane CLI"
  touch "${stamp}"
fi

touch /configs/.warp-routes
