# Hyperlane Kurtosis Package

Launch Hyperlane offchain infrastructure on any EVM chain via external RPCs. Supports Warp Routes 2.0 (HWR 2.0). No observability stack.

Key features
- Multi-chain via args.yaml (N>=2); defaults: Ethereum + Arbitrum mainnets
- Secrets passed via args.yaml and injected into services
- Orchestrates Hyperlane CLI for core deploy and HWR 2.0 warp routes
- Launches validator(s) and relayer; local checkpoint syncer by default (S3/GCS optional)
- No public RPC fallbacks: agents and CLI use only the RPCs you provide
- No rebalancer service included: use Hyperlane’s official CCTP rebalancer separately if needed

Usage
- kurtosis clean -a
- kurtosis run --enclave hyperlane ./hyperlane-package --args-file ./hyperlane-package/config/config.yaml
- View logs:
  - kurtosis service logs hyperlane hyperlane-cli
  - kurtosis service logs hyperlane relayer
  - kurtosis service logs hyperlane validator-ethereum
  - kurtosis service logs hyperlane validator-arbitrum

Configuration
Args schema overview
- chains[]:
  - name (string), rpc_url (string), chain_id (int), deploy_core (bool), existing_addresses (object: mailbox, igp, validatorAnnounce, ism)
- agents:
  - deployer: { key }
  - relayer: { key, allow_local_checkpoint_syncers }
  - validators[]: { chain, signing_key, checkpoint_syncer: { type: local|s3|gcs, params: {...} } }
- warp_routes[]:
  - symbol, decimals, topology { chain: collateral|synthetic }, token_addresses { chain: token }, owner
- global:
  - registry_mode: local|public, agent_image_tag, cli_version

- See ./config/schema.yaml for full schema
Agent keys in args.yaml
- agents.deployer.key: used by hyperlane-cli for core/warp operations
- agents.relayer.key: used by relayer
- agents.validators[].signing_key: per-chain validators

- Default example: ./config/config.yaml

Providing RPCs and secrets
- rpc_url values are consumed by the CLI service via CHAIN_RPCS. No chain containers are started; only your external RPCs are used.
- Do not commit secrets. Create a local override file and pass it with --args-file.

Local override example (do not commit)
- Save this as ~/local.args.yaml and customize keys:
  chains:
    - name: ethereum
      rpc_url: https://65d1c7945fa54cfe8325e61562fe97f3-rpc.network.bloctopus.io/
      chain_id: 1
      deploy_core: true
    - name: arbitrum
      rpc_url: https://d88be824605745c0a09b1111da4727fd-rpc.network.bloctopus.io/
      chain_id: 42161
      deploy_core: true

  agents:
    deployer:
      key: 0xYOUR_PRIVATE_KEY
    relayer:
      key: 0xYOUR_PRIVATE_KEY
      allow_local_checkpoint_syncers: true
    validators:
      - chain: ethereum
        signing_key: 0xYOUR_PRIVATE_KEY
        checkpoint_syncer: { type: local, params: { path: /validator-checkpoints } }
      - chain: arbitrum
        signing_key: 0xYOUR_PRIVATE_KEY
        checkpoint_syncer: { type: local, params: { path: /validator-checkpoints } }

  warp_routes:
    - symbol: TEST
      decimals: 18
      topology:
        ethereum: collateral
        arbitrum: synthetic
      owner: 0xOWNER_EOA

  global:
    registry_mode: local
    agent_image_tag: agents-v1.4.0
    cli_version: latest

Run with:
- kurtosis clean -a
- kurtosis run --enclave hyperlane ./hyperlane-package --args-file ~/local.args.yaml

Warp routes (HWR 2.0) example snippet
- Configure a simple test route between Ethereum (collateral) and Arbitrum (synthetic):
  warp_routes:
    - symbol: TEST
      decimals: 18
      topology:
        ethereum: collateral
        arbitrum: synthetic
      owner: 0xOWNER_EOA

Checkpoint syncers
- Local (default): validators write to /data/validator-checkpoints (container-local path).
- S3: set agents.validators[].checkpoint_syncer to:
    type: s3
    params: { bucket: YOUR_BUCKET, region: YOUR_REGION, prefix: optional/prefix, basePath: optionalBasePath }
- GCS: set:
    type: gcs
    params: { bucket: YOUR_BUCKET, prefix: optional/prefix, basePath: optionalBasePath }

Notes
- With deploy_core=true, the CLI deploys core and writes addresses into /configs/addresses-<chain>.json.
- agent-config.json is generated from those deployed artifacts; no public registry lookups are used.
- Provide valid RPC URLs and funded keys. Defaults use mainnets; switch to testnets by editing config.yaml.

Smoke tests (manual)
- Start the enclave and check:
  - hyperlane-cli: core deploy writes addresses-*.json; warp init/deploy stamps
  - agent-config-gen: writes /configs/agent-config.json from deployed addresses
  - Relayer: watches chains and runs; no CONFIG_FILES errors
  - Validators: start and write to /data/validator-checkpoints

Notes on agent-config.json generation
- Generated inside the enclave by a one-shot container (agent-config-gen) based on your args file and any deployed addresses in /configs/addresses-*.json.
- Public registry fallback is disabled; ensure deploy_core=true or provide existing_addresses when deploy_core=false.
