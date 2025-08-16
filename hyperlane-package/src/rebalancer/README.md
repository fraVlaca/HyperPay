# Rebalancer

Minimal rebalancer service scaffold that exposes an HTTP status endpoint and supports pluggable adapters.

- Adapters: CCTP and OFT
- Policy: high/low watermarks and minimum batch amount
- Scope: for development; production integrations must supply proper RPCs/keys and adapter params

How it works
- Periodically evaluates a simple policy and, if needed, triggers a transfer using the selected adapter.
- Reads configuration from environment variables and from files mounted under /configs (future work to read warp outputs).

Environment variables
- PORT: default 8080
- REBALANCER_ADAPTER: cctp | oft (default: cctp)
- LOW_WATERMARK_PCT: default 0.3
- HIGH_WATERMARK_PCT: default 0.6
- MIN_REBALANCE_AMOUNT: default "0"

Build and run locally
- npm ci
- npm run build
- node dist/index.js

Within Kurtosis
- The service is built from ./src/rebalancer/Dockerfile and started automatically when warp_routes are configured in args.yaml.
- It mounts:
  - /configs: shared artifacts (warp outputs, agent-config.json)
  - /rebalancer-db: internal state
