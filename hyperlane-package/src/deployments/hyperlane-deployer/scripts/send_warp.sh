#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

ORIGIN="${ORIGIN:-ethereum}"
DESTINATION="${DESTINATION:-arbitrum}"
REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"
WARP_FILE="${WARP_FILE:-}"
SYMBOL="${SYMBOL:-TEST}"
AMOUNT="${AMOUNT:-1}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set. Provide the private key for the sender (deployer) via environment."
  exit 1
fi

if [ -z "$WARP_FILE" ]; then
  CANDIDATE="$(ls -1 "$REGISTRY_DIR"/deployments/warp_routes/*/*.yaml 2>/dev/null | head -n1 || true)"
  if [ -n "$CANDIDATE" ] && [ -f "$CANDIDATE" ]; then
    WARP_FILE="$CANDIDATE"
  fi
fi

if [ -n "$WARP_FILE" ] && [ -f "$WARP_FILE" ]; then
  echo "Sending $AMOUNT wei via warp file $WARP_FILE from $ORIGIN to $DESTINATION using registry at $REGISTRY_DIR"
  hyperlane warp send \
    --origin "$ORIGIN" \
    --destination "$DESTINATION" \
    --warp "$WARP_FILE" \
    --amount "$AMOUNT" \
    --relay \
    -r "$REGISTRY_DIR" \
    -y
else
  echo "Sending $AMOUNT wei via symbol $SYMBOL from $ORIGIN to $DESTINATION using registry at $REGISTRY_DIR"
  hyperlane warp send \
    --origin "$ORIGIN" \
    --destination "$DESTINATION" \
    --symbol "$SYMBOL" \
    --amount "$AMOUNT" \
    --relay \
    -r "$REGISTRY_DIR" \
    -y
fi
