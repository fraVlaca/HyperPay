#!/usr/bin/env bash
set -euo pipefail

: "${HYP_KEY:?missing}"
: "${SEPOLIA_RPC:?missing}"
: "${ARBSEPOLIA_RPC:?missing}"
: "${SYMBOL:?missing}"
: "${LZ_EID_SEPOLIA:?missing}"
: "${LZ_EID_ARBSEPOLIA:?missing}"
: "${OFT_SEPOLIA:?missing}"
: "${OFT_ARBSEPOLIA:?missing}"

REGISTRY_URL="${REGISTRY_URL:-https://github.com/hyperlane-xyz/hyperlane-registry}"
OVERRIDES_DIR="${OVERRIDES_DIR:-$HOME/.hyperlane}"
WORK_DIR="${WORK_DIR:-$(pwd)}"
READ_JSON="${WORK_DIR}/warp-read.json"
REB_CONF="${WORK_DIR}/rebalancer.oft.yaml"

echo "== Reading Warp Route =="
hyperlane warp read \
  --symbol "$SYMBOL" \
  --registry "$OVERRIDES_DIR" \
  --json > "$READ_JSON"

WARP_ROUTE_ID=$(jq -r '.warpRouteId // .routeId // empty' "$READ_JSON")
if [ -z "$WARP_ROUTE_ID" ] || [ "$WARP_ROUTE_ID" = "null" ]; then
  WARP_ROUTE_ID="${SYMBOL}/sepolia-arbitrumsepolia"
fi
echo "warpRouteId: $WARP_ROUTE_ID"

SEPOLIA_ROUTER=$(jq -r '.addresses.sepolia.router // .addresses.sepolia.TokenBridgeOft // .sepolia.router // .sepolia.address // empty' "$READ_JSON")
ARBSEP_ROUTER=$(jq -r '.addresses["arbitrum-sepolia"].router // .addresses["arbitrum-sepolia"].TokenBridgeOft // ."arbitrum-sepolia".router // ."arbitrum-sepolia".address // empty' "$READ_JSON")

if [ -z "$SEPOLIA_ROUTER" ] || [ -z "$ARBSEP_ROUTER" ] || [ "$SEPOLIA_ROUTER" = "null" ] || [ "$ARBSEP_ROUTER" = "null" ]; then
  echo "ERROR: Could not resolve router addresses from warp-read.json"
  exit 1
fi

echo "Sepolia Router: ${SEPOLIA_ROUTER}"
echo "Arbitrum Sepolia Router: ${ARBSEP_ROUTER}"

PEER_SEP=$(cast abi-encode "f(address)" "$SEPOLIA_ROUTER")
PEER_ARB=$(cast abi-encode "f(address)" "$ARBSEP_ROUTER")

echo "== Wiring LayerZero EID mappings via addDomain on both routers =="
ETH_RPC_URL="$SEPOLIA_RPC" cast send "$SEPOLIA_ROUTER" \
  "addDomain(uint32,uint16,bytes,bytes)" \
  421614 "$LZ_EID_ARBSEPOLIA" 0x 0x \
  --private-key "$HYP_KEY" --legacy

ETH_RPC_URL="$ARBSEPOLIA_RPC" cast send "$ARBSEP_ROUTER" \
  "addDomain(uint32,uint16,bytes,bytes)" \
  11155111 "$LZ_EID_SEPOLIA" 0x 0x \
  --private-key "$HYP_KEY" --legacy

echo "== Enrolling recipients and allowlisting rebalancer/bridges =="
ETH_RPC_URL="$SEPOLIA_RPC" cast send "$SEPOLIA_ROUTER" \
  "setRecipient(uint32,bytes32)" 421614 "$PEER_ARB" \
  --private-key "$HYP_KEY" --legacy || true

ETH_RPC_URL="$ARBSEPOLIA_RPC" cast send "$ARBSEP_ROUTER" \
  "setRecipient(uint32,bytes32)" 11155111 "$PEER_SEP" \
  --private-key "$HYP_KEY" --legacy || true

if [ -n "${REBALANCER:-}" ]; then
  ETH_RPC_URL="$SEPOLIA_RPC" cast send "$SEPOLIA_ROUTER" \
    "addRebalancer(address)" "$REBALANCER" \
    --private-key "$HYP_KEY" --legacy || true

  ETH_RPC_URL="$ARBSEPOLIA_RPC" cast send "$ARBSEP_ROUTER" \
    "addRebalancer(address)" "$REBALANCER" \
    --private-key "$HYP_KEY" --legacy || true
fi

ETH_RPC_URL="$SEPOLIA_RPC" cast send "$SEPOLIA_ROUTER" \
  "addBridge(uint32,address)" 421614 "$ARBSEP_ROUTER" \
  --private-key "$HYP_KEY" --legacy || true

ETH_RPC_URL="$ARBSEPOLIA_RPC" cast send "$ARBSEP_ROUTER" \
  "addBridge(uint32,address)" 11155111 "$SEPOLIA_ROUTER" \
  --private-key "$HYP_KEY" --legacy || true

echo "== Snapshot pre-balances =="
ETH_RPC_URL="$SEPOLIA_RPC" PRE_SEP=$(cast call "$OFT_SEPOLIA" "balanceOf(address)(uint256)" "$SEPOLIA_ROUTER")
ETH_RPC_URL="$ARBSEPOLIA_RPC" PRE_ARB=$(cast call "$OFT_ARBSEPOLIA" "balanceOf(address)(uint256)" "$ARBSEP_ROUTER")
echo "Pre Sepolia router OFT balance: $PRE_SEP"
echo "Pre ArbSep   router OFT balance: $PRE_ARB"

echo "== Writing rebalancer.oft.yaml =="
cat > "$REB_CONF" <<YAML
route_id: "${WARP_ROUTE_ID}"
monitor_only: true
adapters:
  - type: oft
    params:
      eids:
        sepolia: ${LZ_EID_SEPOLIA}
        arbitrum-sepolia: ${LZ_EID_ARBSEPOLIA}
      peers:
        sepolia:          "${OFT_SEPOLIA}"
        arbitrum-sepolia: "${OFT_ARBSEPOLIA}"
strategy:
  rebalanceStrategy: weighted
  chains:
    sepolia:
      bridge: "${SEPOLIA_ROUTER}"
      bridgeLockTime: 20
      bridgeMinAcceptedAmount: "1"
      weighted: { weight: 10, tolerance: 5 }
    arbitrum-sepolia:
      bridge: "${ARBSEP_ROUTER}"
      bridgeLockTime: 20
      bridgeMinAcceptedAmount: "1"
      weighted: { weight: 100, tolerance: 10 }
YAML

echo "== Run monitor-only for visibility =="
node ./repos/hyperlane-monorepo/typescript/cli/cli-bundle/index.js warp rebalancer \
  --config "$REB_CONF" \
  --monitorOnly \
  --checkFrequency 10 \
  --registry "$OVERRIDES_DIR" \
  --registry "$REGISTRY_URL"

echo "== Run live for ~30s to execute one cycle =="
node ./repos/hyperlane-monorepo/typescript/cli/cli-bundle/index.js warp rebalancer \
  --config "$REB_CONF" \
  --checkFrequency 10 \
  --registry "$OVERRIDES_DIR" \
  --registry "$REGISTRY_URL" &
RUN_PID=$!

sleep 30
kill $RUN_PID || true

echo "== Snapshot post-balances =="
ETH_RPC_URL="$SEPOLIA_RPC" POST_SEP=$(cast call "$OFT_SEPOLIA" "balanceOf(address)(uint256)" "$SEPOLIA_ROUTER")
ETH_RPC_URL="$ARBSEPOLIA_RPC" POST_ARB=$(cast call "$OFT_ARBSEPOLIA" "balanceOf(address)(uint256)" "$ARBSEP_ROUTER")
echo "Post Sepolia router OFT balance: $POST_SEP"
echo "Post ArbSep   router OFT balance: $POST_ARB"

echo "Done. Compare pre/post to confirm movement."
