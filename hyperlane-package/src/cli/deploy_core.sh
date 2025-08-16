#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

mkdir -p /configs /configs/registry/chains

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
    echo "error: no RPC provided for chain ${ch}"; exit 1
  fi

  reg_chain_dir="/configs/registry/chains/${ch}"
  mkdir -p "${reg_chain_dir}"

  cat > "${reg_chain_dir}/metadata.yaml" <<EOF
name: ${ch}
rpcUrls:
  - http: ${rpc}
EOF

  core_cfg="/configs/core-${ch}.yaml"

  echo "Initializing core config for ${ch}"
  hyperlane core init -o "${core_cfg}"

  echo "Deploying Hyperlane core to ${ch} using local registry only"
  hyperlane core deploy --chain "${ch}" -o "${core_cfg}" -r "/configs/registry" -k "$HYP_KEY" -y

  if [ -f "/home/ubuntu/.hyperlane/chains/${ch}/addresses.yaml" ]; then
    cp "/home/ubuntu/.hyperlane/chains/${ch}/addresses.yaml" "${reg_chain_dir}/addresses.yaml" || true
  fi

  touch "${stamp}"
done

touch /configs/.deploy-core
