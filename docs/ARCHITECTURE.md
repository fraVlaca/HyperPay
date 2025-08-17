# HyperPay Architecture Deep Dive

## System Overview

HyperPay implements a modular intent-driven bridging architecture that unifies Hyperlane Warp Routes 2.0 and LayerZero OFT under a single interface. The system follows the ERC-7683 standard for cross-chain intent execution and settlement.

## Core Architecture Principles

### 1. Modular Design
Each component can be deployed and operated independently:
- **bridge-ui**: Frontend interface and route detection
- **intents-stack**: Solver infrastructure and settlement
- **hyperlane-package**: Hyperlane infrastructure deployment
- **hyperlane-tools**: Registry generation and artifact management

### 2. Intent-Driven Flow
Instead of direct bridging, users declare intents that solvers fulfill:
1. User submits intent with desired outcome
2. Solvers compete to fulfill intent optimally
3. Settlement occurs through Hyperlane messaging
4. User receives tokens on destination chain

### 3. Unified Registry
A single registry coordinates multiple bridge types:
- Hyperlane Warp Routes (HWR) for multi-collateral bridging
- LayerZero OFT for direct token transfers
- Automatic route selection based on availability and efficiency

## Component Architecture

### Bridge UI Architecture

```typescript
// Route Detection Flow
Registry → RouteDetector → BridgeSelector → IntentSubmission

// Key Components:
interface DetectionResult {
  bridge: "HWR" | "OFT" | "NONE";
  route: RouteConfig;
  supportsMultiSource?: boolean;
}

// Registry Structure:
interface UnifiedRegistry {
  chains: ChainConfig[];
  tokens: TokenConfig[];
  routes: RouteConfig[];
}
```

**Route Detection Logic:**
1. Check for HWR routes with direct path between chains
2. Fallback to OFT if both chains support the token
3. Return optimal route or error with reason

**Intent Submission Process:**
```typescript
// ERC-7683 Compliant Intent Encoding
const encodedOrder = encodeStandardOrder({
  user: sender,
  nonce: BigInt(Math.floor(Date.now() / 1000)),
  originChainId: BigInt(params.originChainId),
  expires: params.expires,
  fillDeadline: params.fillDeadline,
  inputOracle: params.inputOracle,
  inputs: params.inputs.map(i => [addressToUint(i.token), i.amount]),
  outputs: params.outputs.map(o => ({
    oracle: addressToBytes32(o.oracle),
    settler: addressToBytes32(o.settler),
    chainId: BigInt(o.chainId),
    token: addressToBytes32(o.token),
    amount: o.amount,
    recipient: addressToBytes32(o.recipient),
    call: o.call || "0x",
    context: o.context || "0x",
  })),
});
```

### Intent Stack Architecture

```python
# Orchestration Flow
def run(plan, args):
    # Phase 1: Contract Management
    if modules_config.get("contracts", True):
        addresses = contracts_module.deploy_or_import(plan, args)
    
    # Phase 2: Settlement Configuration
    settlement_config = settlement_module.build_oracle_mapping(plan, args, addresses)
    
    # Phase 3: Solver Service
    if modules_config.get("solver", True):
        solver_info = solver_module.launch(plan, args, addresses, settlement_config)
    
    # Phase 4: API Documentation
    if modules_config.get("specs", True):
        specs_info = specs_module.launch(plan, args, solver_info)
```

**Settlement Module Design:**
- **Hyperlane Backend**: Uses Hyperlane oracles for cross-chain verification
- **Custom Backend**: Allows custom oracle configurations
- **Oracle Mapping**: Automatic preset application with override support
- **EIP-7683 Compliance**: Standard intent processing and settlement

**Solver Configuration Generation:**
```toml
# Generated TOML configuration sections:
[solver]           # Basic solver identification
[networks]         # Chain configurations and tokens
[storage]          # Data persistence settings
[account]          # Wallet management
[delivery]         # Transaction delivery
[discovery]        # Intent discovery
[order]            # Order processing strategy
[settlement]       # Cross-chain settlement
[api]              # REST API configuration
```

### Hyperlane Package Architecture

```python
# Phase-Based Deployment
def run(plan, args):
    # Phase 1: Configuration Parsing & Validation
    config = parse_configuration(args)
    validate_configuration(config)
    
    # Phase 2: Infrastructure Setup
    relay_chains = build_cli_service(plan, config.chains, global_settings)
    
    # Phase 3: Contract Deployment
    deploy_core_contracts(plan, config.chains)
    deploy_warp_routes(plan, config.warp_routes)
    
    # Phase 4: Agent Configuration
    build_agent_config_service(plan, config.chains, configs_dir)
    
    # Phase 5: Agent Services
    deploy_validators(plan, agent_config.validators, config.chains)
    build_relayer_service(plan, config.chains, relay_chains)
    
    # Phase 6: Testing
    run_send_test(plan, test_config, config.warp_routes)
```

**Warp Route Deployment:**
- **Multi-collateral Support**: Multiple collateral chains to single synthetic
- **Topology Configuration**: Flexible chain role assignment
- **Liquidity Seeding**: Automatic initial liquidity provision
- **Mode Selection**: Lock/release vs mint/burn operations

**Agent Infrastructure:**
- **Validators**: Multi-signature validation of cross-chain messages
- **Relayers**: Message delivery between chains
- **Configuration Generator**: Dynamic agent config based on deployed contracts

## Data Flow Architecture

### 1. Registry Generation Flow

```
hyperlane-tools → HWR Artifacts → Registry Builder → Unified Registry → bridge-ui
                ↓
              OFT Artifacts
```

**Process:**
1. `hyperlane-tools` generates HWR configurations and deploys routes
2. OFT adapter addresses are configured for LayerZero integration
3. `build-registry.ts` merges HWR and OFT artifacts into unified registry
4. `bridge-ui` consumes registry for route detection and UI rendering

### 2. Intent Execution Flow

```
User Intent → Route Detection → Intent Encoding → Solver Processing → Settlement
     ↓              ↓               ↓                ↓                ↓
  bridge-ui    RouteDetector   fastIntent.ts    intents-stack   Hyperlane
```

**Detailed Flow:**
1. **Intent Creation**: User specifies origin/destination chains and amounts
2. **Route Detection**: System determines optimal bridge (HWR vs OFT)
3. **Intent Encoding**: ERC-7683 compliant order encoding with oracles and settlers
4. **Solver Processing**: Rust solver monitors events and processes intents
5. **Settlement**: Cross-chain verification through Hyperlane oracles
6. **Fulfillment**: Tokens delivered to recipient on destination chain

### 3. Settlement Verification Flow

```
Origin Chain → Input Settler → Intent Event → Solver → Output Settler → Destination Chain
     ↓              ↓              ↓           ↓           ↓                ↓
  User Tx      ERC-7683 Order   Event Log   Processing   Settlement    Token Delivery
```

**Oracle Integration:**
- **Input Oracle**: Validates intent parameters on origin chain
- **Output Oracle**: Verifies settlement conditions on destination chain
- **Hyperlane Messaging**: Provides secure cross-chain communication
- **Dispute Resolution**: Configurable dispute periods for settlement finality

## Security Architecture

### 1. Intent Validation

```typescript
// Multi-layer validation
interface IntentValidation {
  // Client-side validation
  routeAvailability: boolean;
  tokenBalance: boolean;
  allowanceCheck: boolean;
  
  // Contract-level validation
  signatureVerification: boolean;
  nonceValidation: boolean;
  expirationCheck: boolean;
  
  // Solver validation
  oracleVerification: boolean;
  settlementValidation: boolean;
  disputePeriodRespect: boolean;
}
```

### 2. Oracle Security Model

**Hyperlane Oracle Presets:**
```python
HYPERLANE_ORACLE_PRESETS = {
    "mainnet": {
        1: "0xc005dc82818d67AF737725bD4bf75435d065D239",      # Ethereum
        10: "0x77818DE6a93f0335E9A5817314Bb1e879d319C6F",     # Optimism
        42161: "0x77818DE6a93f0335E9A5817314Bb1e879d319C6F",  # Arbitrum
        8453: "0x...",                                        # Base
    },
    "testnet": {
        11155111: "0xa39434521088d9a50325BC50eC2f50660e06Df34",  # Sepolia
        421614: "0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa",    # Arbitrum Sepolia
    }
}
```

**Security Features:**
- **Multi-signature Validation**: Hyperlane validators provide consensus
- **Oracle Verification**: Cross-chain message authenticity
- **Dispute Periods**: Time windows for challenge and resolution
- **Nonce Management**: Prevents replay attacks
- **Expiration Handling**: Automatic intent expiration

### 3. Solver Security

**Isolation and Monitoring:**
```toml
[solver]
id = "oif-solver-kurtosis"
monitoring_timeout_minutes = 5

[order.strategy.implementations.simple]
max_gas_price_gwei = 100  # Gas price limits

[delivery]
min_confirmations = 1     # Confirmation requirements
```

**Risk Mitigation:**
- **Gas Price Limits**: Prevents excessive transaction costs
- **Confirmation Requirements**: Ensures transaction finality
- **Timeout Handling**: Automatic cleanup of stale intents
- **Storage Isolation**: Separate data persistence per solver instance

## Scalability Architecture

### 1. Horizontal Scaling

**Solver Scaling:**
- Multiple solver instances can run in parallel
- Each solver can specialize in specific chain pairs
- Load balancing through intent discovery mechanisms

**Infrastructure Scaling:**
- Independent Hyperlane agent deployment per chain
- Validator set scaling through multi-signature schemes
- Relayer redundancy for message delivery

### 2. Performance Optimization

**Caching Strategies:**
```typescript
// Registry caching in bridge-ui
const registryCache = {
  ttl: 300000, // 5 minutes
  data: UnifiedRegistry,
  lastUpdate: timestamp
};

// Route detection optimization
const routeCache = new Map<string, DetectionResult>();
```

**Batch Processing:**
- Intent batching for gas optimization
- Bulk oracle updates for settlement efficiency
- Aggregated message delivery through Hyperlane

### 3. Monitoring and Observability

**Metrics Collection:**
- Intent submission rates and success ratios
- Solver processing times and error rates
- Settlement latency and gas consumption
- Cross-chain message delivery statistics

**Logging Architecture:**
```toml
# Solver logging configuration
[logging]
level = "info"
format = "json"
outputs = ["stdout", "file"]

[monitoring]
metrics_enabled = true
health_check_interval = 30
```

## Integration Patterns

### 1. Registry Integration

**Static Registry (Development):**
```typescript
// Local storage override for testing
localStorage.setItem("bridgeRegistryArtifact", JSON.stringify(registry));
```

**Dynamic Registry (Production):**
```typescript
// Remote registry URL
NEXT_PUBLIC_REGISTRY_JSON_URL=https://example.com/registry.artifact.json
```

### 2. RPC Integration

**Environment Configuration:**
```bash
# Chain-specific RPC URLs
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://ethereum-rpc-url/
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arbitrum-rpc-url/
NEXT_PUBLIC_OPTIMISM_RPC_URL=https://optimism-rpc-url/
```

**Fallback Mechanisms:**
- Primary RPC with automatic fallback
- Public RPC endpoints for development
- Private RPC endpoints for production

### 3. Contract Integration

**Settler Addresses:**
```typescript
// Environment-based configuration
const INPUT_SETTLERS_STATIC = {
  ethereum: process.env.NEXT_PUBLIC_INPUT_SETTLER_ETHEREUM,
  arbitrum: process.env.NEXT_PUBLIC_INPUT_SETTLER_ARBITRUM,
  optimism: process.env.NEXT_PUBLIC_INPUT_SETTLER_OPTIMISM,
};
```

**Oracle Addresses:**
```typescript
// Hyperlane oracle configuration with fallbacks
const ORACLE_ADDRESSES = {
  ethereum: process.env.NEXT_PUBLIC_HYPERLANE_ORACLE_ETHEREUM || "0xc005dc82818d67AF737725bD4bf75435d065D239",
  arbitrum: process.env.NEXT_PUBLIC_HYPERLANE_ORACLE_ARBITRUM || "0x77818DE6a93f0335E9A5817314Bb1e879d319C6F",
};
```

## Deployment Architecture

### 1. Environment Separation

**Development:**
- Local Kurtosis enclaves for testing
- Testnet deployments for integration testing
- Mock services for isolated component testing

**Staging:**
- Testnet infrastructure with production-like configuration
- End-to-end testing with real cross-chain transactions
- Performance testing under load

**Production:**
- Mainnet deployments with security hardening
- Monitoring and alerting infrastructure
- Disaster recovery and backup procedures

### 2. Configuration Management

**Hierarchical Configuration:**
```yaml
# Base configuration
base_config: &base
  global:
    registry_mode: local
    agent_image_tag: agents-v1.4.0

# Environment-specific overrides
development:
  <<: *base
  chains:
    - name: ethereum
      rpc_url: ${DEV_ETHEREUM_RPC}
      
production:
  <<: *base
  chains:
    - name: ethereum
      rpc_url: ${PROD_ETHEREUM_RPC}
```

**Secret Management:**
- Environment variable injection
- Kubernetes secrets for container deployments
- Hardware security modules for production keys

### 3. Continuous Integration

**Testing Pipeline:**
1. Unit tests for individual components
2. Integration tests with Kurtosis
3. End-to-end tests on testnets
4. Security audits and static analysis
5. Performance benchmarking

**Deployment Pipeline:**
1. Automated testing and validation
2. Staging deployment and verification
3. Production deployment with rollback capability
4. Post-deployment monitoring and validation

This architecture provides a robust, scalable, and secure foundation for intent-driven cross-chain bridging while maintaining modularity and flexibility for future enhancements.
