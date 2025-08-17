Rebalancer (Docker)

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
