#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

ORIGIN="${ORIGIN:-ethereum}"
DESTINATION="${DESTINATION:-arbitrum}"
REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"
WARP_FILE="${WARP_FILE:-/configs/registry/deployments/warp_routes/ETH/arbitrum-ethereum-config.yaml}"
AMOUNT="${AMOUNT:-1}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set. Provide the private key for the sender (deployer) via environment."
  exit 1
fi

echo "Sending $AMOUNT wei via warp file $WARP_FILE from $ORIGIN to $DESTINATION using registry at $REGISTRY_DIR"
hyperlane warp send \
  --origin "$ORIGIN" \
  --destination "$DESTINATION" \
  --warp "$WARP_FILE" \
  --amount "$AMOUNT" \
  --relay \
  -r "$REGISTRY_DIR" \
  -y
