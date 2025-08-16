#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

mkdir -p /configs

if [ -z "${CHAIN_NAMES:-}" ]; then
  echo "CHAIN_NAMES not set"; exit 1
fi

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set (agents.deployer.key). Required for core deployment."; exit 1
fi

declare -A RPCS=()
if [ -n "${CHAIN_RPCS:-}" ]; then
  IFS=',' read -r -a PAIRS <<< "${CHAIN_RPCS}"
  for p in "${PAIRS[@]}"; do
    k="${p%%=*}"
    v="${p#*=}"
    RPCS["$k"]="$v"
  done
fi

IFS=',' read -r -a CHAINS <<< "${CHAIN_NAMES}"
for ch in "${CHAINS[@]}"; do
  stamp="/configs/.done-core-${ch}"
  if [ -f "${stamp}" ]; then
    echo "core already deployed for ${ch}, skipping"
    continue
  fi

  rpc="${RPCS[$ch]:-}"
  if [ -z "$rpc" ]; then
    echo "warning: no RPC provided for chain ${ch}; CLI may rely on registry/public config"
  fi

  echo "Deploying Hyperlane core to ${ch} (registry_mode=${REGISTRY_MODE:-public})"
  hyperlane core init --chain "${ch}" --registry "${REGISTRY_MODE:-public}"
  if [ -n "$rpc" ]; then
    hyperlane core deploy --chain "${ch}" --key "$HYP_KEY" --rpcUrl "$rpc"
  else
    hyperlane core deploy --chain "${ch}" --key "$HYP_KEY"
  fi
  touch "${stamp}"
done

touch /configs/.deploy-core
