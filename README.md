OFT rebalancer quickstart

Update or deploy a warp route
- hyperlane warp deploy --config /path/to/warp-deploy.yaml
- hyperlane warp read --symbol &lt;SYMBOL&gt; --json &gt; /tmp/warp.json
- jq -r '.warpRouteId // .routeId // empty' /tmp/warp.json

Run via Docker
docker run --rm \
  -e HYP_KEY=&lt;PK&gt; \
  -v ~/.hyperlane:/root/.hyperlane \
  -v /absolute/path/to/config:/config \
  fravlaca/hyperlane-monorepo:1.0.0 \
  warp rebalancer \
    --config /config/rebalancer.oft.json \
    --monitorOnly \
    --registry /root/.hyperlane \
    --registry https://github.com/hyperlane-xyz/hyperlane-registry

Notes
- The rebalancer reads balances held by the route’s router contracts; fresh deployments may show zero until you fund the routers with the OFT.
- Ensure on-chain LayerZero EID mappings are set via TokenBridgeOft.addDomain and router enrollments are configured both ways on the warp route.
 # HyperPay

 ## Hyperlane tools (HWR 2.0 + OFT deploy helpers)
A minimal TS toolkit to:
- Generate HWR 2.0 multi-collateral warp-route-deployment.yaml and optionally deploy/read via Hyperlane CLI.
- Emit artifacts for OFT Native ETH adapters (Sepolia ↔ Arbitrum Sepolia) and HWR routes, then build a merged registry JSON for the UI.

Location: `hyperlane-tools/`

Quickstart:
- `cd hyperlane-tools`
- `pnpm i` (or `npm i`)
- Generate HWR config (dry-run): `pnpm extend -- --config ./samples/sepolia-triangle.json`
- Build registry (after producing artifacts): `pnpm registry:build`

Native OFT adapters (wiring peers and emitting artifact):
- Prepare input JSON with EIDs and RPCs; export already-deployed adapter addresses via env:
  - `OFT_NATIVE_SEPOLIA=0x... OFT_NATIVE_ARBSEPOLIA=0x... pnpm deploy:oft:native -- --config ./samples/oft-native.json`
- This writes `artifacts/oft-native.eth.sepolia-arbSepolia.json` and you can then run `pnpm registry:build` to merge.

Point the UI:
- Host `hyperlane-tools/out/registry.artifact.json` and set `bridge-ui/.env.local` → `NEXT_PUBLIC_REGISTRY_JSON_URL=https://.../registry.artifact.json`
- Or copy its JSON into `localStorage.bridgeRegistryArtifact`

A unified bridge UI lives in ./bridge-ui. It routes between Hyperlane Warp Routes (incl. 2.0) and LayerZero OFT based on config.
