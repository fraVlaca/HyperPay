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
# Provide a single private key via env for all chains
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
