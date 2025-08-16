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
  - kurtosis service logs hyperlane hyperlane-cli
  - kurtosis service logs hyperlane relayer
  - kurtosis service logs hyperlane validator-ethereum
  - kurtosis service logs hyperlane validator-arbitrum
  - kurtosis service logs hyperlane rebalancer

Configuration
Args schema overview
- chains[]:
  - name (string), rpc_url (string), chain_id (int), deploy_core (bool), existing_addresses (object: mailbox, igp, validatorAnnounce, ism)
- agents:
  - deployer: { key }
  - relayer: { key, allow_local_checkpoint_syncers }
  - validators[]: { chain, signing_key, checkpoint_syncer: { type: local|s3|gcs, params: {...} } }
  - rebalancer: { key }
- warp_routes[]:
  - symbol, decimals, topology { chain: collateral|synthetic }, token_addresses { chain: token }, owner, rebalancer { address, policy, adapters[] }
- global:
  - registry_mode: local|public, agent_image_tag, cli_version

- See ./config/schema.yaml for full schema
Agent keys in args.yaml
- agents.deployer.key: used by hyperlane-cli for core/warp operations
- agents.relayer.key: used by relayer
- agents.validators[].signing_key: per-chain validators
- agents.rebalancer.key: used by rebalancer service when executing transfers via adapters

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
      deploy_core: false
    - name: arbitrum
      rpc_url: https://d88be824605745c0a09b1111da4727fd-rpc.network.bloctopus.io/
      chain_id: 42161
      deploy_core: false

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
    rebalancer:
      key: 0xYOUR_PRIVATE_KEY

  warp_routes: []

  global:
    registry_mode: public
    agent_image_tag: agents-v1.4.0
    cli_version: latest

Run with:
- kurtosis clean -a
- kurtosis run --enclave hyperlane ./hyperlane-package --args-file ~/local.args.yaml

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

Notes
- Adapters are placeholders; supply appropriate params and fund the rebalancer key when moving real value.
- With deploy_core=false (default), ensure existing_addresses are set or rely on the public registry.
- Provide valid RPC URLs and funded keys. Defaults use mainnets; switch to testnets by editing config.yaml.

Smoke tests (manual)
- Start the enclave and check:
  - hyperlane-cli: core/warp steps execute or skip with stamps in /configs
  - agent-config-gen: writes /configs/agent-config.json
  - Relayer: watches chains and runs; no CONFIG_FILES errors
  - Validators: start and write to /validator-checkpoints or cloud syncer
  - Rebalancer: HTTP 200 at / (ok response)

Notes on agent-config.json generation
- Generated inside the enclave by a one-shot container (agent-config-gen) based on your args file and any existing_addresses provided.
- If you set deploy_core: true, the CLI outputs can be parsed in a future step to automatically populate agent-config.
