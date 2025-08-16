# HyperPay Bridge UI

Unified bridge UI that routes between:
- Hyperlane Warp Routes (HWR, incl. 2.0 multi-source)
- LayerZero OFT

The app auto-detects the available route for a token/chain pair and shows a badge indicating the bridge type. If only one bridge is available, it selects it by default.

## Quick start

- Copy `.env.example` to `.env.local` and set:
  - `NEXT_PUBLIC_WALLET_CONNECT_ID` (WalletConnect)
  - `NEXT_PUBLIC_HYPERLANE_REGISTRY_URL` (optional, merge remote HWR registry)
  - `NEXT_PUBLIC_RPC_OVERRIDES` (optional JSON)

- Install and run:

```
pnpm install
pnpm dev
```

or `npm`/`yarn`.

Open http://localhost:3000.

## Config

- Local sample registry: `src/config/registry.sample.ts`
- Types: `src/config/types.ts`
- Loader merges local with optional `NEXT_PUBLIC_HYPERLANE_REGISTRY_URL`

Seeded chains: Ethereum (1), Arbitrum (42161), Base (8453).

## Route detection

`src/lib/routeDetector.ts` selects HWR if a direct edge exists; otherwise OFT if token exists on both chains; else no route.

## Multi-source

When the HWR route marks `supportsMultiSource: true`, the UI enables adding additional sources for the same token to the same destination.

## LayerZero OFT

The OFT panel uses a lightweight custom form that integrates with the OFT Transfer API (or direct ABI calls) and reads EIDs/addresses from the merged registry.

## Scripts

- `dev` start dev server
- `build` production build
- `start` run prod server
- `lint` lint
- `typecheck` TypeScript check
## Testnet wiring: Sepolia triangle (Native ETH OFT + HWR 2.0)

- OFT (LayerZero v2, Native ETH): Ethereum Sepolia ↔ Arbitrum Sepolia
- HWR 2.0 (Hyperlane): {Sepolia, Arb Sepolia} → Base Sepolia (synthetic)

Artifacts flow:
- Use `hyperlane-tools` to produce artifacts in `hyperlane-tools/artifacts/` and a merged registry at `hyperlane-tools/out/registry.artifact.json`
- Serve the merged registry via URL and set `NEXT_PUBLIC_REGISTRY_JSON_URL`, or paste its JSON into `localStorage.bridgeRegistryArtifact`

Env:
- `NEXT_PUBLIC_WALLET_CONNECT_ID` required for wallet connectors
- `NEXT_PUBLIC_OFT_API_BASE` optional (defaults to https://api.layerzero.app/oft)
- `NEXT_PUBLIC_REGISTRY_JSON_URL` optional to load generated registry
