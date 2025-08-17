Rebalancer (Docker)

Fallback: build the image locally if pull is unavailable
If the image fravlaca/hyperlane-monorepo:1.0.0 is private or not yet pushed, build it locally and reuse the same name:tag.

1) Create a minimal Dockerfile that runs the monorepo CLI bundle (or use your local checkout if you have it):
   - Example Dockerfile (root of your workspace if you have the monorepo cloned as ./repos/hyperlane-monorepo):
     FROM node:20-alpine
     WORKDIR /app
     COPY repos/hyperlane-monorepo/typescript/cli/cli-bundle /app/typescript/cli/cli-bundle
     ENV NODE_ENV=production
     ENTRYPOINT ["node", "/app/typescript/cli/cli-bundle/index.js"]

2) Build locally with the expected name:tag:
   docker build -t fravlaca/hyperlane-monorepo:1.0.0 -f ./Dockerfile.rebalancer .

3) Run as usual (monitor-only example):
   docker run --rm \
     -e HYP_KEY=0xYOUR_PRIVATE_KEY \
     -v $(pwd)/config:/config \
     fravlaca/hyperlane-monorepo:1.0.0 \
     warp rebalancer \
     --config /config/rebalancer.oft.json \
     --monitorOnly


- Uses the Hyperlane monorepo CLI rebalancer.
- OFT and CCTP supported via config.
- Runs from the user's forked image fravlaca/hyperlane-monorepo:1.0.0.

Run (monitor-only)
docker run --rm \
  -e HYP_KEY=0xYOUR_PRIVATE_KEY \
  -v $(pwd)/config:/config \
  fravlaca/hyperlane-monorepo:1.0.0 \
  warp rebalancer \
  --config /config/rebalancer.oft.json \
  --monitorOnly

Args-file variant (Kurtosis-style)
docker run --rm \
  -e HYP_KEY=0xYOUR_PRIVATE_KEY \
  -v $(pwd)/config:/config \
  fravlaca/hyperlane-monorepo:1.0.0 \
  warp rebalancer \
  --args-file /config/oft.args.example.yaml \
  --monitorOnly

Notes
- Pass either --config or --args-file; otherwise the CLI will error with "Missing required argument: config".
- The config must include a valid warpRouteId and per-chain bridge addresses (TokenBridgeOft).
- Example config included: ./rebalancer.oft.example.json (copy to your mounted /config path and edit).
- Optional visibility block: you can add an "oft.domains" section documenting LayerZero EIDs/endpoints to match on-chain addDomain mappings.

Config
See hyperlane-monorepo/typescript/cli/examples/rebalancer.oft.example.json or the provided rebalancer.oft.example.json and set per-chain bridge addresses to TokenBridgeOft to enable OFT.

One-command setup for any existing OFT pair

Use the deploy_oft_warp.sh helper to deploy/attach a Hyperlane Warp Route (HWR 2.0) over your existing OFTs, wire LayerZero EID mappings, grant rebalancer/bridge permissions, write local registry artifacts, and run the stock CLI rebalancer (monitor-only, then live). Prefer Hyperlane CLI owner ops; fall back to cast only where the CLI lacks a helper.

Prereqs
- env: HYP_KEY, SEPOLIA_RPC, ARBSEPOLIA_RPC
- tools: hyperlane CLI, jq, foundry cast, node
- your OFT token addresses on each chain and the LayerZero EIDs

Deploy + wire in one step
HYP_KEY=0xYOUR_PK \
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com \
ARBSEPOLIA_RPC=https://api.zan.top/arb-sepolia \
SYMBOL=MOFT \
OWNER=0xYourOwnerEOA \
REBALANCER=0xYourRebalancerEOA \
OFT_SEPOLIA=0xYourOFTonSepolia \
OFT_ARBSEPOLIA=0xYourOFTonArbSep \
LZ_EID_SEPOLIA=40161 \
LZ_EID_ARBSEPOLIA=40231 \
./deploy_oft_warp.sh

What it does
- Writes warp-route.yaml with bridge: oft and your OFT addresses
- hyperlane warp deploy to deploy/attach the Warp Route and write artifacts to ~/.hyperlane
- Reads warp-read.json to resolve warpRouteId and router addresses
- addDomain on both routers with the proper Hyperlane domain → LZ EID mapping (dispatch-then-native-send parity)
- Enrolls peers and allowlists: addRebalancer, addBridge, setRecipient
- Snapshots pre-balances
- Writes a rebalancer YAML config and runs monitor-only then live
- Snapshots post-balances to confirm movement

Wire + rebalance on an existing route
If you already have a route deployed (e.g., by a teammate), you can wire domains and run the rebalancer without re-deploying:

HYP_KEY=0xYOUR_PK \
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com \
ARBSEPOLIA_RPC=https://api.zan.top/arb-sepolia \
REGISTRY_URL=https://github.com/hyperlane-xyz/hyperlane-registry \
OVERRIDES_DIR=$HOME/.hyperlane \
SYMBOL=MOFT \
OFT_SEPOLIA=0xYourOFTonSepolia \
OFT_ARBSEPOLIA=0xYourOFTonArbSep \
LZ_EID_SEPOLIA=40161 \
LZ_EID_ARBSEPOLIA=40231 \
REBALANCER=0xYourRebalancerEOA \
./oft-wire-and-rebalance.sh

This script:
- Reads the route and resolves router addresses from your local registry artifacts
- Wires Hyperlane domain → LayerZero EID mappings on both routers
- Ensures recipients/allowlists are set
- Writes a rebalancer config and runs monitor-only, then a brief live cycle
- Outputs pre/post router balances to confirm movement

Templates
- warp-route.oft.template.yaml
- rebalancer.oft.template.yaml

Docker parity
Mount ~/.hyperlane and your /config to run the same config under the image:
docker run --rm -e HYP_KEY=0xYOUR_PK \
  -v ~/.hyperlane:/root/.hyperlane \
  -v $(pwd):/config \
  fravlaca/hyperlane-monorepo:1.0.0 \
  warp rebalancer \
  --config /config/rebalancer.oft.template.yaml \
  --monitorOnly \
  --registry /root/.hyperlane \
  --registry https://github.com/hyperlane-xyz/hyperlane-registry

Chain slugs
- Use arbitrum-sepolia for Arbitrum Sepolia everywhere (topology, peers, strategy).
