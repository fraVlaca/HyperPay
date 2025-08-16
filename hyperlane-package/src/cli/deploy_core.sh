#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

mkdir -p /configs

IFS=',' read -r -a CHAINS <<< "${CHAIN_NAMES:-}"
for ch in "${CHAINS[@]}"; do
  stamp="/configs/.done-core-${ch}"
  if [ -f "${stamp}" ]; then
    echo "core already deployed for ${ch}, skipping"
    continue
  fi
  echo "would deploy core for ${ch} here via hyperlane CLI"
  touch "${stamp}"
done

touch /configs/.deploy-core
