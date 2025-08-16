#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

mkdir -p /configs /configs/registry

route_symbol="${ROUTE_SYMBOL:-route}"
mode="${MODE:-lock_release}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set (agents.deployer.key). Required for warp route operations."; exit 1
fi

if [ -z "${CHAIN_NAMES:-}" ]; then
  echo "CHAIN_NAMES not set"; exit 1
fi

case "$mode" in
  lock_release|lock_mint|burn_mint) ;;
  *) echo "Unknown MODE '$mode'"; exit 2 ;;
esac

stamp="/configs/.done-warp-${route_symbol}-${mode}"
if [ -f "${stamp}" ]; then
  echo "warp route ${route_symbol} (${mode}) already configured, skipping"
else
  echo "Configuring warp route ${route_symbol} (${mode})"
  warp_cfg="/configs/warp-${route_symbol}.yaml"

  {
    echo "---"
    IFS=',' read -r -a CHAINS <<< "${CHAIN_NAMES}"
    for ch in "${CHAINS[@]}"; do
      echo "${ch}:"
      echo "  type: native"
      echo "  name: \"${route_symbol}\""
      echo "  symbol: \"${route_symbol}\""
    done
  } > "${warp_cfg}"

  hyperlane warp deploy --config "${warp_cfg}" -r "/configs/registry" -k "$HYP_KEY" -y
  touch "${stamp}"
fi

touch /configs/.warp-routes
