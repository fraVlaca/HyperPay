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

IFS=',' read -r -a CHAINS <<< "${CHAIN_NAMES}"
for ch in "${CHAINS[@]}"; do
  stamp="/configs/.done-core-${ch}"
  if [ -f "${stamp}" ]; then
    echo "core already deployed for ${ch}, skipping"
    continue
  fi

  echo "Deploying Hyperlane core to ${ch} (registry_mode=${REGISTRY_MODE:-public})"
  echo "hyperlane core init --chain ${ch} --registry ${REGISTRY_MODE:-public}"
  echo "hyperlane core deploy --chain ${ch} --key \$HYP_KEY"
  touch "${stamp}"
done

touch /configs/.deploy-core
