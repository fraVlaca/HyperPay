#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

mkdir -p /configs

route_symbol="${ROUTE_SYMBOL:-route}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set (agents.deployer.key). Required for warp route operations."; exit 1
fi

stamp="/configs/.done-warp-${route_symbol}"
if [ -f "${stamp}" ]; then
  echo "warp route ${route_symbol} already configured, skipping"
else
  echo "Configuring warp route ${route_symbol}"
  echo "hyperlane warp init --symbol ${route_symbol}"
  echo "hyperlane warp deploy --symbol ${route_symbol} --key \$HYP_KEY"
  touch "${stamp}"
fi

touch /configs/.warp-routes
