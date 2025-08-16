# PYUSD Bridging (Ethereum ↔ Optimism ↔ Arbitrum)

This repository contains:
- contracts/epyusd-hardhat: OpenZeppelin ERC20 "ePyUSD" (6 decimals) to deploy on Optimism mainnet.
- hyperlane-tools: scripts to generate/deploy Hyperlane HWR 2.0 lock/mint routes and build a unified registry JSON for the UI.

Environment
- Do not commit private keys.
- Use very small amounts for tests: $0.5–$1 (e.g., 0.6 PYUSD).

RPCs
- ETH: https://eth-mainnet.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk
- OP:  https://opt-mainnet.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk
- ARB: https://arb-mainnet.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk

Canonical Tokens
- PYUSD (Ethereum): 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8
- PYUSD (Arbitrum): 0x46850aD61C2B7d64d08c9C754F45254596696984
- ePyUSD (Optimism): deployed via this repo (address recorded after deploy)

1) Deploy ePyUSD on Optimism
- cd contracts/epyusd-hardhat
- cp .env.example .env
- Set DEPLOYER_PRIVATE_KEY in .env (never commit).
- npm i
- npm run deploy:optimism
- The script writes deployments/optimism.json with address and tx hash.

2) Generate Hyperlane HWR 2.0 lock/mint config
- cd hyperlane-tools
- pnpm i (or npm i)
- Edit samples/mainnet-pyusd-multicollateral.json:
  - Set chains.optimism.token to the ePyUSD address.
  - Optionally set "owner" to your deployer.
- Dry-run to generate YAML and artifact:
  - pnpm extend -- --config ./samples/mainnet-pyusd-multicollateral.json
  - Generated YAML path is printed; artifacts/hwr.pyusd.ethereum-arbitrum-to-optimism.json is written.

3) Deploy the warp route and read routers
- Ensure your wallet env is available to Hyperlane CLI (HYP_KEY or compatible env). Do not commit secrets.
- Deploy and read:
  - pnpm extend -- --config ./samples/mainnet-pyusd-multicollateral.json --deploy
  - npx @hyperlane-xyz/cli warp read --symbol PYUSD
- Capture router addresses and keep the generated artifacts.

4) Build registry for the UI
- cd hyperlane-tools
- pnpm registry:build
- out/registry.artifact.json is produced.

5) UI configuration
- Option A: Host hyperlane-tools/out/registry.artifact.json and set bridge-ui/.env.local:
  - NEXT_PUBLIC_REGISTRY_JSON_URL=https://.../registry.artifact.json
- Option B: LocalStorage testing:
  - In devtools: localStorage.setItem("bridgeRegistryArtifact", JSON.stringify(require("&lt;path&gt;/registry.artifact.json")));

6) LayerZero (ETH ↔ ARB) for PYUSD
- Use LayerZero OFT adapter addresses for PYUSD on Ethereum/Arbitrum.
- Perform a small send ETH→ARB and back. Record tx hashes and post-transfer balances.
- Keep artifacts and verification notes in docs/test-logs.

7) Testing notes
- Always verify tx receipts on explorers and check balances before/after.
- Prefer relay-assisted Hyperlane sends for quicker testing if available.

Security
- Never commit private keys or sensitive envs.
