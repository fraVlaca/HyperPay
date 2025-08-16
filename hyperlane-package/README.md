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
- View logs: kurtosis service logs hyperlane relayer

Configuration
- See ./config/schema.yaml for full schema
- Default example: ./config/config.yaml

Notes
- Provide valid RPC URLs and funded keys where required
- Defaults use mainnets; switch to testnets by editing config.yaml
