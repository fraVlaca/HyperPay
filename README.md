# HyperPay: Intent-Driven PyUSD Bridging

## Product Overview

With HyperPay, no matter where your PyUSD lives, declare the outcome and it will fulfill it.

Driven by a composable intent engine over Hyperlane Warp Routes 2.0 + LayerZero OFT, HyperPay lets you bring PyUSD to additional chains and connects your chain with a unified messaging layer, bridges and intents.

### Key Features

- **Unified Routing**: Automatically selects and lets you interact with the optimal path between Hyperlane Warp Routes 2.0 and LayerZero OFT
- **Fast Intent Path**: Declare an intent; solvers fulfill it on-chain. Approve-then-call is handled under the hood for a single-confirm flow that settles in seconds—an almost-instant transfer experience
- **Composable Infrastructure**: Each component can be deployed independently to bring messaging, bridging, or intent capabilities to any new chain
- **Modular by Design**: Mix and match components without vendor lock-in - use just the messaging layer, add HWR routes, or deploy the full intent stack
- **ERC-7683 Compliance**: Follows the Open Intents Framework standard for cross-chain intent execution and settlement

## System Architecture

![HyperPay Architecture](docs/hyperpay-architecture.png)

HyperPay creates a unified bridging experience by combining Hyperlane Warp Routes 2.0 and LayerZero OFT technologies:

### Core Architecture Components

- **L Vault (Liquidity Vault)**: Central liquidity management on Optimism - *deployable to any chain as a liquidity hub*
- **Hyperlane and Layer Zero Messaging Layer**: Secure cross-chain communication infrastructure - *spin up hyperlane on any new chain to enable messaging*
- **Hyperlane Lock & Mint**: Connects Ethereum and Arbitrum to Optimism via collateral locking and synthetic minting - *modular warp routes deployable to any chain pair*
- **LayerZero OFT Integration**: Direct ETH ↔ ARB transfers using OFT standard - *composable with any LayerZero-supported chain*
- **Custody Vaults**: Secure token storage infrastructure - *reusable vault contracts for any token/chain*
- **OFT Adapters**: LayerZero integration points - *modular adapters for cross-chain transfers*
- **Rebalancer**: Automated liquidity management - *composable rebalancing logic for any vault setup*
- **Intent Infrastructure**: Solver-driven execution framework - *deployable intent stack for any chain ecosystem*

### Unified Bridging Flow

1. **Intent Declaration**: Users declare desired outcomes (amount, destination, recipient)
2. **Route Detection**: System automatically selects optimal path (Hyperlane vs LayerZero)
3. **Solver Fulfillment**: Decentralized solvers compete to fulfill intents optimally
4. **Cross-Chain Settlement**: Hyperlane oracles verify and settle transactions
5. **Token Delivery**: Recipients receive tokens on destination chain in seconds

## Modular & Composable Architecture

HyperPay is built as a **composable infrastructure stack** where each component can be deployed independently or combined to create custom bridging solutions. The four main packages are designed for maximum reusability across different chains and use cases:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   bridge-ui     │    │  intents-stack  │    │ hyperlane-pkg   │
│  (Frontend UI)  │    │ (Intent Infra)  │    │ (Messaging Infra)│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Route Detection│    │ • OIF Solver    │    │ • Hyperlane     │
│ • Intent Submit │    │ • Settlement    │    │   Messaging     │
│ • Registry Mgmt │    │ • ERC-7683      │    │ • Warp Routes   │
│ • Multi-Bridge  │    │ • Modular Stack │    │ • Agents/Relayer│
│   Support       │    │ • Pluggable     │    │ • New Chain     │
│                 │    │   Backends      │    │   Onboarding    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ hyperlane-tools │
                    │ (Deploy Tools)  │
                    ├─────────────────┤
                    │ • Registry Build│
                    │ • HWR Deploy    │
                    │ • Chain Setup   │
                    │ • Artifacts     │
                    └─────────────────┘

🔧 COMPOSABLE: Each package can be used independently
🚀 REUSABLE: Deploy messaging/bridging/intents to any new chain
🔌 PLUGGABLE: Mix and match components for custom solutions
```

### Modular Deployment Patterns

**🌐 Bring Messaging to New Chains**
- Deploy `hyperlane-package` alone to add secure cross-chain messaging to any new chain
- Spin up validators, relayers, and mailbox contracts with one-click Kurtosis deployment
- Instantly connect new chains to the Hyperlane network

**🌉 Add Bridging Infrastructure**
- Use `hyperlane-tools` to deploy HWR 2.0 warp routes between any chain pairs
- Configure multi-collateral to synthetic topologies for any token
- Reuse existing messaging infrastructure or deploy fresh

**⚡ Deploy Intent Infrastructure**
- Spin up `intents-stack` on any chain to enable solver-driven intent execution
- Modular settlement backends: plug in Hyperlane, Wormhole, or custom oracles
- ERC-7683 compliant contracts work with any intent ecosystem

**🎯 Complete Bridging Solution**
- Combine all packages for full-featured intent-driven bridging
- `bridge-ui` provides unified interface across all deployed infrastructure
- Registry system automatically discovers and routes across available bridges

### Component Interactions & Reusability

1. **Messaging Layer**: `hyperlane-package` provides reusable cross-chain messaging for any application
2. **Bridge Infrastructure**: `hyperlane-tools` deploys composable warp routes that work with any messaging layer
3. **Intent Execution**: `intents-stack` creates pluggable solver infrastructure that works with any settlement backend
4. **Unified Interface**: `bridge-ui` provides composable frontend that can route across any deployed bridges

## Component Deep Dive

### 1. Bridge UI (Composable Frontend)

**Reusable Interface Layer**: The bridge UI is designed as a composable frontend that can work with any combination of deployed bridge infrastructure. It automatically discovers available routes and provides a unified interface regardless of the underlying bridge technology.

**Multi-Bridge Support**: Seamlessly routes between Hyperlane Warp Routes 2.0, LayerZero OFT, and any other bridges added to the registry system.

**Key Files:**
- `src/lib/routeDetector.ts` - Intelligent route detection logic
- `src/lib/fastIntent.ts` - ERC-7683 intent submission implementation
- `src/components/BridgeSelector.tsx` - Main bridge interface component
- `public/registry.artifact.json` - Route registry configuration

**Route Detection Logic:**
```typescript
// Automatically detects optimal path between HWR and OFT
export function detectRoute(reg: UnifiedRegistry, input: DetectionInput): DetectionResult {
  // 1. Check for HWR routes with direct path
  // 2. Fallback to OFT if both chains supported
  // 3. Return appropriate bridge type or error
}
```

**Fast Intent Flow:**
1. User selects origin/destination chains and amount
2. Route detector determines optimal bridge (HWR vs OFT)
3. For fast transfers, intent is encoded using ERC-7683 standard
4. Intent submitted to input settler contract
5. Solvers monitor and fulfill intent on destination chain

### 2. Intents Stack (Modular Intent Infrastructure)

**Composable Intent Framework**: Built on the Open Intents Framework, this package provides **modular intent infrastructure** that can be deployed to any chain ecosystem. Each component is designed for maximum reusability and composability.

**Pluggable Architecture**: The intent stack is designed with pluggable backends - you can mix and match settlement layers (Hyperlane, Wormhole, custom), storage backends (file, memory, database), and solver strategies based on your specific needs.

**Independent Deployment**: Deploy just the solver infrastructure to add intent capabilities to existing bridges, or combine with messaging and bridge packages for a complete solution.

**Key Files:**
- `main.star` - Main orchestration entry point
- `modules/solver.star` - Solver service configuration and deployment
- `modules/settlement/hyperlane.star` - Hyperlane settlement backend
- `modules/contracts.star` - Smart contract deployment module

**Orchestration Flow:**
```python
def run(plan, args):
    # Phase 1: Deploy or import smart contracts
    addresses = contracts_module.deploy_or_import(plan, args)
    
    # Phase 2: Configure settlement layer (Hyperlane oracles)
    settlement_config = settlement_module.build_oracle_mapping(plan, args, addresses)
    
    # Phase 3: Launch solver service
    solver_info = solver_module.launch(plan, args, addresses, settlement_config)
    
    # Phase 4: Launch API documentation
    specs_info = specs_module.launch(plan, args, solver_info)
```

**Modular Settlement Backends:**
- **Hyperlane Backend**: Plug into existing Hyperlane messaging infrastructure
- **Custom Backends**: Bring your own oracle system or settlement layer
- **Wormhole Support**: Easy integration with Wormhole messaging (configurable)
- **Multi-Backend**: Run multiple settlement backends simultaneously

**Composable Solver Infrastructure:**
- **Rust Microservice**: Containerized solver that can run anywhere
- **Pluggable Storage**: File, memory, database, or custom storage backends
- **Modular Discovery**: Monitor any EVM chain or custom event sources
- **RESTful API**: Standard interface that works with any frontend

**Reusable Components:**
- **Contract Templates**: ERC-7683 compliant contracts deployable to any EVM chain
- **Configuration Generator**: Dynamic config generation for any chain setup
- **Monitoring Stack**: Reusable event monitoring for any blockchain

### 3. Hyperlane Package (Messaging Infrastructure)

**One-Click Chain Onboarding**: This package enables **any new chain** to join the Hyperlane network with a single deployment. Spin up the complete messaging infrastructure needed to connect any long-tail or custom chain to the broader ecosystem.

**Modular Infrastructure Deployment**: Deploy just the components you need - messaging only, bridges only, or the complete stack. Each module is designed to work independently or as part of a larger system.

**Reusable for Any Use Case**: While HyperPay uses this for PyUSD bridging, the same infrastructure can power any cross-chain application - DeFi protocols, NFT bridges, governance systems, or custom dApps.

**Key Files:**
- `main.star` - Phase-based deployment orchestration
- `modules/contracts/warp.star` - Warp route deployment
- `modules/infrastructure/agents.star` - Agent configuration and deployment
- `config/config.yaml` - Example configuration

**Deployment Phases:**
```python
def run(plan, args):
    # Phase 1: Configuration parsing and validation
    config = parse_configuration(args)
    validate_configuration(config)
    
    # Phase 2: Infrastructure setup (CLI service)
    relay_chains = build_cli_service(plan, config.chains, global_settings)
    
    # Phase 3: Contract deployment (core + warp routes)
    deploy_core_contracts(plan, config.chains)
    deploy_warp_routes(plan, config.warp_routes)
    
    # Phase 4: Agent configuration generation
    build_agent_config_service(plan, config.chains, configs_dir)
    
    # Phase 5: Agent services deployment (validators + relayer)
    deploy_validators(plan, agent_config.validators, config.chains)
    build_relayer_service(plan, config.chains, relay_chains)
    
    # Phase 6: Testing
    run_send_test(plan, test_config, config.warp_routes)
```

**Composable Warp Route System:**
- **Flexible Topologies**: Multi-collateral to synthetic, hub-and-spoke, or custom arrangements
- **Any Token Support**: Deploy warp routes for any ERC-20 token on any supported chain
- **Liquidity Management**: Automatic seeding with configurable liquidity strategies
- **Mode Selection**: Lock/release, mint/burn, or hybrid modes based on token requirements
- **Reusable Templates**: Standard configurations that work across different token types

**Infrastructure Modules:**
- **Messaging Core**: Mailbox contracts and core messaging infrastructure
- **Validator Network**: Configurable validator sets for any security requirements
- **Relayer Services**: Message delivery infrastructure that scales with usage
- **Agent Configuration**: Dynamic configuration generation for any chain setup

### 4. Hyperlane Tools (Deployment & Registry Tools)

**Chain Setup Automation**: Minimal TypeScript CLI toolkit that automates the deployment of Hyperlane infrastructure to any new chain. Generate configurations, deploy contracts, and build registries with simple commands.

**Composable Registry System**: Build unified registries that can include any combination of bridge types - HWR routes, LayerZero OFT, custom bridges, or future bridge technologies. The registry system is designed to be extensible and bridge-agnostic.

**Reusable Deployment Patterns**: Standard deployment scripts that work across different chains, tokens, and bridge configurations. Easily adapt for new tokens or chain combinations.

**Key Scripts:**
- `extend-multicollateral.ts` - Generate and deploy HWR configurations
- `deploy-oft-native.ts` - Deploy LayerZero OFT Native ETH adapters
- `build-registry.ts` - Build merged registry JSON for UI consumption

**Modular Deployment Commands:**
```bash
# Deploy messaging infrastructure to new chain
pnpm extend -- --config ./configs/new-chain-messaging.json

# Add HWR routes for any token
pnpm extend -- --config ./configs/custom-token-routes.json --deploy

# Build registry including all available bridges
pnpm registry:build --include-all-bridges

# Generate config templates for new chains
pnpm generate-config -- --chain-id 12345 --rpc-url https://new-chain-rpc
```

## Composability & Reusability Examples

### 🚀 Scenario 1: Bring Messaging to a New Chain

**Goal**: Add secure cross-chain messaging to a new L2 or custom chain

**Components Needed**: `hyperlane-package` only

```yaml
# Deploy just messaging infrastructure
chains:
  - name: new-l2-chain
    rpc_url: https://new-l2-rpc-url/
    chain_id: 12345
    deploy_core: true        # Deploy mailbox and core contracts
    deploy_warp: false       # Skip bridge contracts
    
agents:
  validators: 3              # Minimal validator set
  relayer: true             # Enable message delivery
```

**Result**: New chain can send/receive secure cross-chain messages, ready for any dApp integration.

---

### 🌉 Scenario 2: Add Token Bridging to Existing Chains

**Goal**: Create warp routes for a new token between existing Hyperlane-connected chains

**Components Needed**: `hyperlane-tools` + existing messaging infrastructure

```json
{
  "token": { "symbol": "NEWTOKEN", "decimals": 18 },
  "collaterals": ["ethereum", "polygon"],
  "synthetic": "arbitrum",
  "reuse_messaging": true,    // Use existing Hyperlane infrastructure
  "deploy_only_warp": true    // Skip core messaging contracts
}
```

**Result**: New token can be bridged between chains without deploying new messaging infrastructure.

---

### ⚡ Scenario 3: Add Intent Capabilities to Existing Bridges

**Goal**: Enable fast intent-driven transfers on existing bridge infrastructure

**Components Needed**: `intents-stack` only

```yaml
# Plug intent layer into existing bridges
settlement:
  backend: hyperlane          # Use existing Hyperlane messaging
  reuse_infrastructure: true  # Don't deploy new messaging
  
solver:
  monitor_existing_bridges: true  # Watch existing bridge contracts
  custom_settlement_contracts: false  # Use existing settlement
```

**Result**: Existing bridges now support fast intent-driven transfers with solver competition.

---

### 🎯 Scenario 4: Complete Custom Bridging Solution

**Goal**: Deploy full intent-driven bridging for a custom token ecosystem

**Components Needed**: All packages with custom configuration

```yaml
# Full stack deployment with custom parameters
messaging:
  deploy_to_chains: ["custom-chain-1", "custom-chain-2"]
  validator_set: "custom"
  
bridges:
  tokens: ["CUSTOM-TOKEN-A", "CUSTOM-TOKEN-B"]
  topology: "hub-and-spoke"
  hub_chain: "custom-chain-1"
  
intents:
  settlement_backend: "hyperlane"
  solver_network: "permissionless"
  api_endpoints: ["api1.custom.com", "api2.custom.com"]
```

**Result**: Complete intent-driven bridging solution tailored to specific ecosystem needs.

## Configuration Examples

### Intent Stack Configuration

```yaml
# intents-stack/examples/args.yaml
chains:
  - chain_id: 8453
    chain_type: ethereum
    rpc_url: https://base.llamarpc.com
    deploy: false
    input_settler_address: 0x0000000000000000000000000000000000000001
    output_settler_address: 0x0000000000000000000000000000000000000002

solver:
  settlement:
    backend: hyperlane
    hyperlane:
      preset_mode: chain_type
      oracle_addresses: {}
  api:
    enabled: true
    host: 0.0.0.0
    port: 3000
```

### Hyperlane Package Configuration

```yaml
# hyperlane-package/config/config.yaml
chains:
  - name: ethereum
    rpc_url: https://ethereum-rpc-url/
    chain_id: 1
    deploy_core: true
  - name: arbitrum
    rpc_url: https://arbitrum-rpc-url/
    chain_id: 42161
    deploy_core: true

warp_routes:
  - symbol: PYUSD
    decimals: 6
    topology:
      ethereum: collateral
      arbitrum: synthetic
    mode: lock_release
```

### Registry Artifact Structure

```json
{
  "chains": {
    "ethereum": { "evmChainId": 1, "lzEid": 30101, "hyperlaneDomain": 1 },
    "arbitrum": { "evmChainId": 42161, "lzEid": 30110, "hyperlaneDomain": 42161 }
  },
  "tokens": {
    "PYUSD": {
      "symbol": "PYUSD",
      "decimals": 6,
      "routes": {
        "hyperlane": [
          { "from": "ethereum", "to": "arbitrum", "type": "collateral_to_synthetic" }
        ],
        "layerzero": [
          { "from": "ethereum", "to": "arbitrum", "type": "oft_native" }
        ]
      }
    }
  }
}
```

## Deployment Guide

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Kurtosis CLI
- Access to target chain RPCs
- Private keys for deployment (store securely)

### Quick Start

1. **Clone and Setup**
   ```bash
   git clone https://github.com/fraVlaca/HyperPay.git
   cd HyperPay
   git submodule update --init --recursive
   ```

2. **Deploy Hyperlane Infrastructure**
   ```bash
   cd hyperlane-package
   kurtosis run --enclave hyperlane-infra . --args-file config/config.yaml
   ```

3. **Deploy Intent Stack**
   ```bash
   cd ../intents-stack
   kurtosis run --enclave intent-stack . --args-file examples/args.yaml
   ```

4. **Build Registry and Start UI**
   ```bash
   cd ../hyperlane-tools
   pnpm install
   pnpm registry:build
   
   cd ../bridge-ui
   pnpm install
   pnpm dev
   ```

### Environment Variables

```bash
# Required for deployment
PRIVATE_KEY=0x...
ETHEREUM_RPC_URL=https://...
ARBITRUM_RPC_URL=https://...
OPTIMISM_RPC_URL=https://...

# Optional for UI
NEXT_PUBLIC_REGISTRY_JSON_URL=https://your-registry-url/registry.artifact.json
```

### Security Considerations

- **Private Key Management**: Never commit private keys to version control
- **RPC Security**: Use authenticated RPC endpoints for production
- **Contract Verification**: Verify all deployed contracts on block explorers
- **Access Control**: Implement proper access controls for admin functions
- **Monitoring**: Set up monitoring for all deployed services

## Testing Guide

### Local Testing

1. **Unit Tests**
   ```bash
   # Test bridge UI components
   cd bridge-ui && pnpm test
   
   # Test Hyperlane tools
   cd hyperlane-tools && pnpm test
   ```

2. **Integration Testing**
   ```bash
   # Test full deployment flow
   cd hyperlane-package
   kurtosis run --enclave test-env . --args-file config/test-config.yaml
   ```

### Testnet Deployment

Follow the deployment guide using testnet configurations:
- Use testnet RPC URLs
- Deploy with test tokens
- Verify cross-chain message delivery
- Test intent submission and fulfillment

### Production Checklist

- [ ] All contracts deployed and verified
- [ ] Agent services running and monitored
- [ ] Registry artifacts generated and hosted
- [ ] UI deployed and accessible
- [ ] Security audit completed
- [ ] Monitoring and alerting configured

## Additional Documentation

For more detailed technical information, see:

- [Architecture Deep Dive](docs/ARCHITECTURE.md) - Detailed system architecture and design patterns
- [Deployment Guide](docs/DEPLOYMENT.md) - Step-by-step deployment instructions
- [Testing Procedures](docs/TESTING.md) - Comprehensive testing checklist

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
