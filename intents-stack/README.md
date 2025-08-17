OIF Solver Stack Kurtosis Package

Overview
- Orchestrates the OIF solver-side stack only:
  - OIF contracts (deploy or import per-chain)
  - OIF solver-service (Rust)
  - API Specs (Swagger UI)
  - Settlement presets (Hyperlane by default; Custom supported; Wormhole stub)
- No blockchain network orchestration. You must provide RPC endpoints.

Upstream reuse (no forks, updatable via args)
- Contracts: LZeroAnalytics/oif-contracts
- Solver: LZeroAnalytics/oif-solvers
- API Specs: openintentsframework/oif-specs

Defaults
- Contracts: InputSettlerEscrow by default when deploy=true
- Images: prebuilt by default; override via args; build-from-source supported via git_ref
- Settlement: Hyperlane default; chain-type preset mapping with args overrides; “Custom” mode for full mappings
- Discovery: offchain disabled by default; toggleable via args
- Chains: supports arbitrary EVM chain_ids (incl. sandbox/random)

Quick start
1) Install Kurtosis
2) Prepare args
   - Copy and edit examples/args.yaml
   - Ensure RPC URLs are reachable and private keys set via environment (e.g., SOLVER_PK)
3) Run
   - kurtosis clean -a
   - kurtosis run --enclave oif-solver . --args-file examples/args.yaml
4) Inspect logs
   - kurtosis service logs oif-solver solver-service
   - kurtosis service logs oif-solver contracts-<chain_id> (if deploy=true)

Module structure
- kurtosis.yml
- main.star: Orchestrates modules in order: contracts -> settlement mapping -> solver -> specs
- modules/
  - contracts.star: Deploy (Foundry) or import addresses; emits in-memory addresses map
  - solver.star: Renders config.toml from addresses + args (exactly matches upstream schema); launches solver-service
  - specs.star: Serves Swagger UI pointing at solver /api
  - settlement/
    - hyperlane.star: Builds oracle_addresses via chain-type presets, merges overrides; supports Custom backend
    - wormhole.star: stub
  - extensions/template-extension.star: template for add-ons
- templates/
  - solver-config.toml.tmpl: Upstream-aligned TOML for reference
- examples/args.yaml: Working defaults

Configuration highlights (examples/args.yaml)
- mode.contracts|solver|specs:
  - build_from_source: false (default)
  - image: prebuilt image refs (overrideable)
  - git_ref: used only if build_from_source=true
- chains:
  - chain_id, chain_type, rpc_url
  - deploy: false to import addresses; true to deploy InputSettlerEscrow (and optional OutputSettler)
  - input_settler_address, output_settler_address (required when deploy=false)
  - tokens: [] per-chain
- solver:
  - storage, account.private_key, delivery.providers[]
  - discovery: disabled by default; enable onchain_eip7683/offchain_eip7683 as needed
  - order.implementations.eip7683 and execution_strategy
  - settlement.domain and implementations.eip7683 (network_ids, oracle_addresses, dispute_period_seconds)
  - api: enabled, host, port, timeout_seconds, max_request_size
- specs:
  - enabled, port, servers[0] defaulting to http://localhost:<solver.api.port>/api

Settlement backends
- Hyperlane (default):
  - preset_mode: chain_type uses built-in table (seeded with Ethereum, Arbitrum, Base, Optimism, Polygon)
  - oracle_addresses overrides are merged
  - If chain_id not covered and no override provided, run fails with guidance
- Custom:
  - Provide full oracle_addresses mapping
- Wormhole:
  - Stub for future support

Auto-update strategy
- Prebuilt images: change image tags/digests in args (no code changes)
- Build-from-source: set build_from_source=true and select git_ref (branch/tag/commit)

Troubleshooting
- docker system prune may be necessary if builds fail due to disk space
- Always pull latest on upstream repos before testing build-from-source
- Use kurtosis clean -a to avoid conflicting enclaves

Development notes
- This package deliberately does not run local chains (Anvil/Hardhat). It targets existing networks provided via RPC.
- Contracts deployment is currently wired for deployment via a container runner; wire Foundry/forge commands and artifacts in your image or use build-from-source mode to execute upstream workflows.
