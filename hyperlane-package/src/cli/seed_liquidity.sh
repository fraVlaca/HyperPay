#!/usr/bin/env bash
set -euo pipefail

if ! command -v hyperlane >/dev/null 2>&1; then
  npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
fi

REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"
WARP_FILE="${WARP_FILE:-}"
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
if [ -z "$WARP_FILE" ]; then
  CANDIDATE="$(ls -1 "$REGISTRY_DIR"/deployments/warp_routes/*/*.yaml 2>/dev/null | head -n1 || true)"
  if [ -n "$CANDIDATE" ] && [ -f "$CANDIDATE" ]; then
    WARP_FILE="$CANDIDATE"
  fi
fi

fi

TMP_OUT="/tmp/warp-derived.json"
READ_RC=1
set +e
if [ -n "$WARP_FILE" ] && [ -f "$WARP_FILE" ]; then
  hyperlane warp read --warp "$WARP_FILE" -r "$REGISTRY_DIR" -y > "$TMP_OUT"
  READ_RC=$?
elif [ -n "$SYMBOL" ]; then
  hyperlane warp read --symbol "$SYMBOL" -r "$REGISTRY_DIR" -y > "$TMP_OUT"
  READ_RC=$?
else
  hyperlane warp read -r "$REGISTRY_DIR" -y > "$TMP_OUT"
  READ_RC=$?
fi
set -e

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
const yaml = require('yaml');
const liq = process.argv[2];
const outPath = process.argv[3];
let raw;
try { raw = fs.readFileSync(outPath, 'utf8'); } catch { raw = null; }
let doc = null;
if (raw) {
  try { doc = JSON.parse(raw); } catch {}
  if (!doc) {
    try { doc = yaml.parse(raw); } catch {}
  }
}
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

mkdir -p /tmp/txs
STRATEGY_FILE="/tmp/strategy.yaml"
: > "$STRATEGY_FILE"

while read -r chain addr amount; do
  if [ -z "$chain" ] || [ -z "$addr" ] || [ -z "$amount" ]; then
    continue
  fi
  tx_file="/tmp/txs/${chain}.json"
  printf '[{"to":"%s","value":"%s"}]\n' "$addr" "$amount" > "$tx_file"
  {
    echo "${chain}:"
    echo "  type: FILE"
    echo "  filepath: ${tx_file}"
  } >> "$STRATEGY_FILE"
done < /tmp/seed-plan.txt

hyperlane submit \
  --transactions "/tmp/txs" \
  --strategy "$STRATEGY_FILE" \
  -r "$REGISTRY_DIR" \
  -y
