#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"
WARP_FILE="${WARP_FILE:-/configs/registry/deployments/warp_routes/ETH/arbitrum-ethereum-config.yaml}"
INITIAL_LIQUIDITY="${INITIAL_LIQUIDITY:-}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set"
  exit 1
fi

if [ -z "$INITIAL_LIQUIDITY" ]; then
  echo "INITIAL_LIQUIDITY is empty; nothing to seed"
  exit 0
fi

TMP_OUT="/tmp/warp-derived.json"
set +e
hyperlane warp read --warp "$WARP_FILE" -r "$REGISTRY_DIR" -y --log json > "$TMP_OUT"
READ_RC=$?
set -e
if [ $READ_RC -ne 0 ]; then
  echo "warp read failed; cannot derive router addresses"
  exit 3
fi

if ! command -v node >/dev/null 2>&1; then
  apt-get update && apt-get install -y nodejs npm >/dev/null 2>&1 || true
fi

node - <<'NODE' "$INITIAL_LIQUIDITY" "$TMP_OUT" > /tmp/seed-plan.txt
const fs = require('fs');
const liq = process.argv[2];
const outPath = process.argv[3];
let doc;
try { doc = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch { doc = null; }
if (!doc || !doc.tokens) {
  process.exit(4);
}
const byChain = {};
for (const t of doc.tokens) {
  if (!byChain[t.chainName]) byChain[t.chainName] = [];
  byChain[t.chainName].push(t);
}
const entries = liq.split(',').map(x => x.trim()).filter(Boolean);
for (const e of entries) {
  const [chain, amount] = e.split('=');
  const tokens = byChain[chain] || [];
  if (tokens.length === 0) continue;
  const token = tokens[0];
  const to = token.addressOrDenom;
  console.log(`${chain} ${to} ${amount}`);
}
NODE

while read -r chain addr amount; do
  if [ -z "$chain" ] || [ -z "$addr" ] || [ -z "$amount" ]; then
    continue
  fi
  hyperlane submit --chain "$chain" --to "$addr" --value "$amount" -r "$REGISTRY_DIR" -y
done < /tmp/seed-plan.txt
