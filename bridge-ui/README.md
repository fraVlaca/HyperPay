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

The OFT panel uses `@layerzerolabs/ui-bridge-oft`. After installing dependencies, the widget renders dynamically in the panel. Addresses and endpoint IDs are provided by the registry.

## Scripts

- `dev` start dev server
- `build` production build
- `start` run prod server
- `lint` lint
- `typecheck` TypeScript check
