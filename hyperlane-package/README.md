# Hyperlane Kurtosis Package

Launch Hyperlane offchain infrastructure on any EVM chain via external RPCs. Supports Warp Routes 2.0 (HWR 2.0) and a modular rebalancer (CCTP + OFT). No observability stack.

Key features
- Multi-chain via args.yaml (N>=2); defaults: Ethereum + Arbitrum mainnets
- Secrets passed via args.yaml and injected into services
- Orchestrates Hyperlane CLI for registry/core deploy and HWR 2.0 warp routes
- Launches validator(s) and relayer; local checkpoint syncer by default (S3/GCS optional)
- Modular rebalancer with CCTP and OFT adapters

Usage
- kurtosis clean -a
- kurtosis run --enclave hyperlane ./hyperlane-package --args-file ./hyperlane-package/config/config.yaml
- View logs:
  - kurtosis service logs hyperlane relayer
  - kurtosis service logs hyperlane validator-ethereum
  - kurtosis service logs hyperlane validator-arbitrum
  - kurtosis service logs hyperlane rebalancer

Configuration
- See ./config/schema.yaml for full schema
Agent keys in args.yaml
- agents.deployer.key: used by hyperlane-cli for core/warp operations
- agents.relayer.key: used by relayer
- agents.validators[].signing_key: per-chain validators
- agents.rebalancer.key: used by rebalancer service when executing transfers via adapters

- Default example: ./config/config.yaml

Providing RPCs and secrets
Warp routes (HWR 2.0) example snippet
- Configure a simple USDC route between Ethereum (collateral) and Arbitrum (synthetic):
  warp_routes:
    - symbol: USDC
      decimals: 6
      topology:
        ethereum: collateral
        arbitrum: synthetic
      token_addresses:
        ethereum: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
      owner: 0xOWNER_EOA
      rebalancer:
        address: 0xREBALANCER_EOA
        policy:
          low_watermark_pct: 0.30
          high_watermark_pct: 0.60
          min_rebalance_amount: "5000"
        adapters:
          - type: cctp
            params:
              circle_domain_ids:
                ethereum: 0
                arbitrum: 110

Rebalancer adapter selection
- Default adapter is CCTP; set REBALANCER_ADAPTER=oft in args if you intend to use an OFT route.
Checkpoint syncers
- Local (default): validators write to /validator-checkpoints (shared Kurtosis volume).
- S3: set agents.validators[].checkpoint_syncer to:
    type: s3
    params: { bucket: YOUR_BUCKET, region: YOUR_REGION, prefix: optional/prefix, basePath: optionalBasePath }
- GCS: set:
    type: gcs
    params: { bucket: YOUR_BUCKET, prefix: optional/prefix, basePath: optionalBasePath }

- Adapters are placeholders; you must supply appropriate params and fund the rebalancer key when moving real value.
- Edit ./config/config.yaml (or create your own and pass via --args-file)
- Set per-chain rpc_url values to your providers (e.g., Alchemy/Infura)
- Set agent keys:
  - agents.relayer.key: 0x-prefixed private key for relayer
  - agents.validators[].signing_key: per-chain validator private keys
- Optional: configure S3/GCS checkpoint syncers by switching type and providing params

Smoke tests (manual)
- With deploy_core=false (default), ensure existing_addresses are set in your args or that the public registry is sufficient for your needs
- Start the enclave and check:
  - Relayer: reports watching chains and running; no missing CONFIG_FILES errors
  - Validators: start and write to /validator-checkpoints
  - Rebalancer: HTTP 200 at / (ok response)
- Optional: once CLI wiring is complete, run a hello-world Hyperlane message or a warp route send

Status (milestone 1)
- Scaffolded package structure and images
- Validators and relayer services are wired; rebalancer scaffold (CCTP+OFT) included
Notes on agent-config.json generation
- The agent-config is generated inside the enclave by a one-shot container (agent-config-gen) based on your args file and any existing_addresses provided.
- If you set deploy_core: true, the hyperlane-cli service will later be wired to write deployed addresses to /configs, and the generator will be extended to include them automatically.

- Next: wire hyperlane-cli steps (core deploy + warp routes) and generate /configs/agent-config.json from args/deploy outputs

Notes
- Provide valid RPC URLs and funded keys where required
- Defaults use mainnets; switch to testnets by editing config.yaml
