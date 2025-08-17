#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm i
pnpm extend -- --config ./samples/mainnet-pyusd-multicollateral.json --deploy
npx @hyperlane-xyz/cli@latest warp read --symbol PYUSD
pnpm registry:build
