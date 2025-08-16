# hyperlane-tools

Minimal TS CLI helpers to:
- Generate and optionally deploy Hyperlane HWR 2.0 multi-collateral routes.
- Wire LayerZero OFT Native ETH adapters across two chains and emit artifacts.
- Build a merged registry JSON for the UI.

## Install

- cd hyperlane-tools
- pnpm i (or npm i)

## Commands

- Generate multi-collateral YAML (dry-run by default):
  - pnpm extend -- --config ./samples/sepolia-triangle.json
- Deploy the multi-collateral route and read routers (requires wallet env for Hyperlane CLI):
  - pnpm extend -- --config ./samples/sepolia-triangle.json --deploy
- Wire OFT Native ETH adapters (expects adapters already deployed; this script sets peers and emits an artifact):
  - OFT_NATIVE_SEPOLIA=0x... OFT_NATIVE_ARBSEPOLIA=0x... pnpm deploy:oft:native -- --config ./samples/oft-native.json
- Build merged registry JSON for the UI from artifacts:
  - pnpm registry:build

## Inputs

### samples/sepolia-triangle.json (HWR 2.0)
{
  "token": { "symbol": "ETH", "decimals": 18 },
  "collaterals": ["sepolia", "arbSepolia"],
  "synthetic": "baseSepolia",
  "chains": {
    "sepolia": { "evmChainId": 11155111, "hyperlaneDomain": 11155111 },
    "arbSepolia": { "evmChainId": 421614, "hyperlaneDomain": 421614 },
    "baseSepolia": { "evmChainId": 84532, "hyperlaneDomain": 84532 }
  },
  "owner": ""
}

### samples/oft-native.json (OFT Native ETH)
{
  "token": { "symbol": "ETH", "decimals": 18 },
  "chains": {
    "sepolia": { "rpcUrl": "https://...", "eid": 40161 },
    "arbSepolia": { "rpcUrl": "https://...", "eid": 40231 }
  },
  "deployer": { "privateKey": "0x..." },
  "out": "./artifacts/oft-native.eth.sepolia-arbSepolia.json",
  "dryRun": false
}

Env required for OFT wiring:
- OFT_NATIVE_SEPOLIA=0x... (NativeOFTAdapter on Sepolia)
- OFT_NATIVE_ARBSEPOLIA=0x... (NativeOFTAdapter on Arbitrum Sepolia)

## Outputs

- artifacts/oft-native.*.json: OFT artifact containing adapter addresses and EIDs
- artifacts/hwr.*.json: HWR artifact containing routers/topology
- out/registry.artifact.json: Unified registry JSON the UI can consume

## Feed into the UI

Option A (URL):
- Host hyperlane-tools/out/registry.artifact.json
- bridge-ui/.env.local: NEXT_PUBLIC_REGISTRY_JSON_URL=https://.../registry.artifact.json

Option B (LocalStorage):
- Copy the JSON into browser devtools:
  - localStorage.setItem("bridgeRegistryArtifact", JSON.stringify(<json>));
