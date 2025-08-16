#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

ORIGIN="${ORIGIN:-ethereum}"
DESTINATION="${DESTINATION:-arbitrum}"
SYMBOL="${SYMBOL:-TEST}"
AMOUNT="${AMOUNT:-0.0000001}"
REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set. Provide the private key for the sender (deployer) via environment."
  exit 1
fi

echo "Sending $AMOUNT $SYMBOL from $ORIGIN to $DESTINATION using registry at $REGISTRY_DIR"
hyperlane warp send \
  --origin "$ORIGIN" \
  --destination "$DESTINATION" \
  --symbol "$SYMBOL" \
  --amount "$AMOUNT" \
  -r "$REGISTRY_DIR" \
  -k "$HYP_KEY" \
  -y
