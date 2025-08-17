#!/bin/bash
set -e

echo "=== OIF E2E Test Script ==="
echo "Testing cross-chain intent settlement from Ethereum Sepolia to Arbitrum Sepolia"
echo

# Configuration
SOLVER_CONFIG="e2e-solver-config.toml"
SOLVER_PORT=3000

# Contract addresses (already deployed)
ETH_SEPOLIA_INPUT="0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563"
ETH_SEPOLIA_OUTPUT="0x331B0c3b82C8C3CF06DFD2a12905Cc311589FB6D"
ETH_SEPOLIA_ORACLE="0xa39434521088d9a50325BC50eC2f50660e06Df34"

ARB_SEPOLIA_INPUT="0xCe81010d0A47FF13Cc19105E8Ef7B597aA8D3460"
ARB_SEPOLIA_OUTPUT="0x92DAe04879b394104491d5153C36d814bEbcB388"
ARB_SEPOLIA_ORACLE="0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa"

# Create solver config
cat > $SOLVER_CONFIG << EOF
[solver]
id = "oif-e2e-solver"

# Networks
[networks.11155111]
rpc_url = "https://ethereum-sepolia-rpc.publicnode.com"
input_settler_address = "$ETH_SEPOLIA_INPUT"
output_settler_address = "$ETH_SEPOLIA_OUTPUT"
[[networks.11155111.tokens]]
address = "0x352f1c7ffa598d0698c1D8D2fCAb02511c6fF3e9"
symbol = "USDC"
decimals = 6

[networks.421614]
rpc_url = "https://api.zan.top/arb-sepolia"
input_settler_address = "$ARB_SEPOLIA_INPUT"
output_settler_address = "$ARB_SEPOLIA_OUTPUT"
[[networks.421614.tokens]]
address = "0x61714300b991Cfc2BD336cb1745F01463163A988"
symbol = "USDC"
decimals = 6

[storage]
primary = "memory"
cleanup_interval_seconds = 3600
[storage.implementations.memory]

[account]
provider = "local"
[account.config]
private_key = "0x0820e79cde729336c29c6d3f5102b522f625b4b1e5801f097848600a23e15cb2"

[delivery]
min_confirmations = 1
[delivery.providers.provider_0]
network_id = 11155111
private_key = "0x0820e79cde729336c29c6d3f5102b522f625b4b1e5801f097848600a23e15cb2"
[delivery.providers.provider_1]
network_id = 421614
private_key = "0x0820e79cde729336c29c6d3f5102b522f625b4b1e5801f097848600a23e15cb2"

[order]
[order.implementations.eip7683]
[order.execution_strategy]
strategy_type = "simple"
[order.execution_strategy.config]
max_gas_price_gwei = 100

[settlement]
[settlement.domain]
chain_id = 1
address = "0x0000000000000000000000000000000000000000"
[settlement.implementations.eip7683]
oracle_addresses = { 11155111 = "$ETH_SEPOLIA_ORACLE", 421614 = "$ARB_SEPOLIA_ORACLE" }
dispute_period_seconds = 1

[sources]
[sources.implementations]

[discovery]
enabled = false

[api]
enabled = true
host = "0.0.0.0"
port = $SOLVER_PORT
timeout_seconds = 30
max_request_size = 1048576
EOF

echo "Created solver config at $SOLVER_CONFIG"
echo

# Run solver in background
echo "Starting OIF solver..."
docker run -d \
  --name oif-e2e-solver \
  -p $SOLVER_PORT:$SOLVER_PORT \
  -v "$(pwd)/$SOLVER_CONFIG:/config.toml:ro" \
  oif-solver:local \
  --config /config.toml

# Wait for solver to start
echo "Waiting for solver to start..."
sleep 5

# Check solver health
echo "Checking solver health..."
curl -s http://localhost:$SOLVER_PORT/health || echo "Solver not responding yet..."

echo
echo "=== Solver Running ==="
echo "Solver API available at: http://localhost:$SOLVER_PORT"
echo "View logs with: docker logs -f oif-e2e-solver"
echo
echo "To submit an intent, use the submit-intent.js script"
echo "To stop the solver: docker stop oif-e2e-solver && docker rm oif-e2e-solver"
