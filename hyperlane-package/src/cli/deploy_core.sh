#!/usr/bin/env bash
set -euo pipefail
if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi
touch /configs/.deploy-core
