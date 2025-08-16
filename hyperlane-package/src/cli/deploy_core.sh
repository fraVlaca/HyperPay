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

declare -A IDS=()
if [ -n "${CHAIN_IDS:-}" ]; then
  IFS=',' read -r -a IPAIRS <<< "${CHAIN_IDS}"
  for p in "${IPAIRS[@]}"; do
    k="${p%%=*}"
    v="${p#*=}"
    IDS["$k"]="$v"
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

  echo "Detecting chainId for ${ch} via eth_chainId on ${rpc}"
  detected_cid="$(node -e "const https=require('https');const u=process.argv[1];const req=https.request(u,{method:'POST',headers:{'content-type':'application/json'}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{const j=JSON.parse(d); if(!j || !j.result){process.exit(2)}; const n=parseInt(j.result,16); if(!Number.isFinite(n)){process.exit(3)}; console.log(n);}catch(e){process.exit(1)}})});req.on('error',()=>process.exit(1));req.write(JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}));req.end();" "$rpc" || true)"
  if [ -n "${detected_cid:-}" ]; then
    cid="${detected_cid}"
    echo "Using detected chainId ${cid} for ${ch}"
  else
    cid="${IDS[$ch]:-}"
    if [ -z "$cid" ]; then
      echo "error: could not detect chainId from RPC and CHAIN_IDS missing id for ${ch}"; exit 1
    fi
    echo "Falling back to provided chainId ${cid} for ${ch}"
  fi

  cat > "${reg_chain_dir}/metadata.yaml" <<EOF
name: ${ch}
protocol: ethereum
chainId: ${cid}
domainId: ${cid}
rpcUrls:
  - http: ${rpc}
nativeToken:
  name: Ether
  symbol: ETH
  decimals: 18
EOF

  core_cfg="/configs/core-${ch}.yaml"

  echo "Initializing core config for ${ch}"
  yes "" | hyperlane core init -y || true
  if [ -f "./configs/core-config.yaml" ]; then
    cp "./configs/core-config.yaml" "${core_cfg}"
  else
    echo "error: core init did not produce ./configs/core-config.yaml"; exit 1
  fi

  echo "Deploying Hyperlane core to ${ch} using local registry only"
  
  # Retry deployment up to 3 times on nonce errors
  max_retries=3
  retry_count=0
  deployment_success=false
  
  while [ $retry_count -lt $max_retries ] && [ "$deployment_success" = "false" ]; do
    if hyperlane core deploy --chain "${ch}" -o "${core_cfg}" -r "/configs/registry" -k "$HYP_KEY" -y 2>&1 | tee /tmp/deploy-${ch}.log; then
      deployment_success=true
      echo "Successfully deployed core contracts to ${ch}"
    else
      if grep -q "nonce has already been used\|nonce too low" /tmp/deploy-${ch}.log; then
        retry_count=$((retry_count + 1))
        echo "Nonce error detected, retrying deployment (attempt $retry_count of $max_retries)..."
        # Wait a bit before retrying to allow pending transactions to settle
        sleep 5
      else
        echo "Deployment failed with non-nonce error, exiting"
        cat /tmp/deploy-${ch}.log
        exit 1
      fi
    fi
  done
  
  if [ "$deployment_success" = "false" ]; then
    echo "Failed to deploy after $max_retries attempts"
    exit 1
  fi

  if [ -f "$HOME/.hyperlane/chains/${ch}/addresses.yaml" ]; then
    cp "$HOME/.hyperlane/chains/${ch}/addresses.yaml" "${reg_chain_dir}/addresses.yaml" || true
  fi

  touch "${stamp}"
done

touch /configs/.deploy-core
