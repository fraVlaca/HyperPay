Rebalancer (Docker)

- Uses Hyperlane monorepo CLI rebalancer.
- OFT and CCTP supported via config.

Build
docker build -t hyperlane-rebalancer:oft ./hyperlane-package/src/rebalancer

Run
# Using a JSON/YAML CLI config (non-interactive: provide key via env)
docker run --rm -e HYP_KEY=0xYOUR_PRIVATE_KEY -v $(pwd)/config:/config hyperlane-rebalancer:oft --config /config/rebalancer.json --monitorOnly

# Or using an args-file (Kurtosis-style)
docker run --rm -e HYP_KEY=0xYOUR_PRIVATE_KEY -v $(pwd)/config:/config hyperlane-rebalancer:oft --args-file /config/oft.args.example.yaml --monitorOnly

Config
See hyperlane-monorepo/typescript/cli/examples/rebalancer.oft.example.json and set per-chain bridge addresses to TokenBridgeOft to enable OFT.
