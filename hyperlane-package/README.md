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
- Default example: ./config/config.yaml

Providing RPCs and secrets
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
- Next: wire hyperlane-cli steps (core deploy + warp routes) and generate /configs/agent-config.json from args/deploy outputs

Notes
- Provide valid RPC URLs and funded keys where required
- Defaults use mainnets; switch to testnets by editing config.yaml
