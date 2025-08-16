#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"
WARP_FILE="${WARP_FILE:-/configs/registry/deployments/warp_routes/ETH/arbitrum-ethereum-config.yaml}"
INITIAL_LIQUIDITY="${INITIAL_LIQUIDITY:-}"
SYMBOL="${SYMBOL:-}"

if [ -z "${HYP_KEY:-}" ]; then
  echo "HYP_KEY not set"
  exit 1
fi

if [ -z "$INITIAL_LIQUIDITY" ]; then
  echo "INITIAL_LIQUIDITY is empty; nothing to seed"
  exit 0
fi

if [ -z "$SYMBOL" ]; then
  if ! command -v node >/dev/null 2>&1; then
    apt-get update && apt-get install -y nodejs npm >/dev/null 2>&1 || true
  fi
  SYMBOL="$(node - <<'NODE' "$WARP_FILE" 2>/dev/null || true
const fs = require('fs');
const yaml = require('yaml');
const f = process.argv[2];
try {
  const doc = yaml.parse(fs.readFileSync(f, 'utf8'));
  const tok = (doc && doc.tokens && doc.tokens[0]) || null;
  if (tok && tok.symbol) {
    process.stdout.write(tok.symbol);
  }
} catch {}
NODE
)"
fi

TMP_OUT="/tmp/warp-derived.json"
READ_RC=1
set +e
if [ -n "$SYMBOL" ]; then
  hyperlane warp read --warp "$WARP_FILE" --symbol "$SYMBOL" -r "$REGISTRY_DIR" -y --log json > "$TMP_OUT"
  READ_RC=$?
else
  hyperlane warp read --warp "$WARP_FILE" -r "$REGISTRY_DIR" -y --log json > "$TMP_OUT"
  READ_RC=$?
fi
set -e

if [ $READ_RC -ne 0 ]; then
  if [ -n "$SYMBOL" ]; then
    set +e
    hyperlane warp read --symbol "$SYMBOL" -r "$REGISTRY_DIR" -y --log json > "$TMP_OUT"
    READ_RC=$?
    set -e
  fi
fi

if [ $READ_RC -ne 0 ]; then
  if ! command -v node >/dev/null 2>&1; then
    apt-get update && apt-get install -y nodejs npm >/dev/null 2>&1 || true
  fi
  node - <<'NODE' "$INITIAL_LIQUIDITY" "$WARP_FILE" > /tmp/seed-plan.txt || exit 4
const fs = require('fs');
const yaml = require('yaml');
const liq = process.argv[2];
const f = process.argv[3];
let doc;
try { doc = yaml.parse(fs.readFileSync(f, 'utf8')); } catch { doc = null; }
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
else
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
fi

while read -r chain addr amount; do
  if [ -z "$chain" ] || [ -z "$addr" ] || [ -z "$amount" ]; then
    continue
  fi

  tx_file="/tmp/txs-${chain}.json"
  strat_file="/tmp/strategy-${chain}.yaml"

  printf '[{"to":"%s","value":"%s"}]\n' "$addr" "$amount" > "$tx_file"

  {
    echo "submitters:"
    echo "  ${chain}:"
    echo "    type: FILE"
    echo "    filepath: ${tx_file}"
  } > "$strat_file"

  set +e
  hyperlane submit \
    --chain "$chain" \
    --transactions "$tx_file" \
    --strategy "$strat_file" \
    -r "$REGISTRY_DIR" \
    -y
  rc=$?
  set -e

  if [ $rc -ne 0 ]; then
    hyperlane submit --chain "$chain" --to "$addr" --value "$amount" -r "$REGISTRY_DIR" -y
  fi
done < /tmp/seed-plan.txt
