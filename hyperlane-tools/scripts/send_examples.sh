#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 3 ]; then
  echo "usage: $0 <origin> <destination> <amount>"
  exit 1
fi
ORIGIN="$1"
DEST="$2"
AMT="$3"
npx @hyperlane-xyz/cli@latest warp send --origin "${ORIGIN}" --destination "${DEST}" --symbol PYUSD --amount "${AMT}" --relay -y
