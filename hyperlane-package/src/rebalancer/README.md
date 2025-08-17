Rebalancer (Docker)

- Uses Hyperlane monorepo CLI rebalancer.
- OFT and CCTP supported via config.

Build
docker build -t hyperlane-rebalancer:oft ./hyperlane-package/src/rebalancer

Run
# Non-interactive: provide a private key via env (single key across chains)
docker run --rm \
  -e HYP_KEY=0xYOUR_PRIVATE_KEY \
  -v $(pwd)/config:/config \
  hyperlane-rebalancer:oft \
  --config /config/rebalancer.oft.json \
  --monitorOnly

# Or using an args-file (Kurtosis-style)
docker run --rm \
  -e HYP_KEY=0xYOUR_PRIVATE_KEY \
  -v $(pwd)/config:/config \
  hyperlane-rebalancer:oft \
  --args-file /config/oft.args.example.yaml \
  --monitorOnly

Notes
- You must pass either --config or --args-file; otherwise the CLI will error with "Missing required argument: config".
- The config must include a valid warpRouteId and per-chain bridge addresses (TokenBridgeOft).
- Example config included: ./rebalancer.oft.example.json (copy to your mounted /config path and edit).

Config
See hyperlane-monorepo/typescript/cli/examples/rebalancer.oft.example.json or the provided rebalancer.oft.example.json and set per-chain bridge addresses to TokenBridgeOft to enable OFT.
