# HyperPay: Intent-Driven PyUSD Bridging

## Product Overview

With HyperPay, no matter where your PyUSD lives, declare the outcome and it will fulfill it.

Driven by a composable intent engine over Hyperlane Warp Routes 2.0 + LayerZero OFT, HyperPay lets you bring PyUSD to additional chains and connects your chain with a unified messaging layer, bridges and intents.

### Key Features

- **Unified Routing**: Automatically selects and lets you interact with the optimal path between Hyperlane Warp Routes 2.0 and LayerZero OFT
- **Fast Intent Path**: Declare an intent; solvers fulfill it on-chain. Approve-then-call is handled under the hood for a single-confirm flow that settles in seconds—an almost-instant transfer experience
- **Modular Architecture**: Built on composable packages that can be mixed and matched for specific needs without vendor lock-in
- **ERC-7683 Compliance**: Follows the Open Intents Framework standard for cross-chain intent execution and settlement

## Architecture Overview

HyperPay is composed of three main modular packages that work together to provide a complete intent-driven bridging solution:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   bridge-ui     │    │  intents-stack  │    │ hyperlane-pkg   │
│  (Next.js/React)│    │ (Kurtosis pkg)  │    │ (Kurtosis pkg)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Route Detection│    │ • OIF Solver    │    │ • Hyperlane     │
│ • Intent Submit │    │ • Settlement    │    │   Infrastructure│
│ • Registry Mgmt │    │ • ERC-7683      │    │ • Warp Routes   │
│ • HWR/OFT UI    │    │ • Contracts     │    │ • Agents/Relayer│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ hyperlane-tools │
                    │   (CLI Tools)   │
                    ├─────────────────┤
                    │ • Registry Build│
                    │ • HWR Deploy    │
                    │ • OFT Wiring    │
                    │ • Artifacts     │
                    └─────────────────┘
```

### Component Interactions

1. **Registry Coordination**: `hyperlane-tools` generates unified registry artifacts that `bridge-ui` consumes for route detection
2. **Intent Submission**: `bridge-ui` submits ERC-7683 compliant intents to contracts deployed by `intents-stack`
3. **Settlement**: `intents-stack` solvers monitor and fulfill intents using Hyperlane oracles and settlement contracts
4. **Infrastructure**: `hyperlane-package` provides the underlying Hyperlane messaging and bridging infrastructure

## Component Deep Dive

### 1. Bridge UI (Next.js/React)

The unified frontend interface that provides seamless routing between Hyperlane Warp Routes 2.0 and LayerZero OFT.

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

### 2. Intents Stack (Kurtosis Package)

Built on the Open Intents Framework, this package orchestrates the solver-side infrastructure for intent processing and settlement.

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

**Settlement Configuration:**
- Supports Hyperlane and custom settlement backends
- Oracle address mapping for cross-chain verification
- ERC-7683 compliant intent processing
- Configurable dispute periods and confirmation requirements

**Solver Implementation:**
- Rust microservice that monitors on-chain events
- Processes intents following ERC-7683 standard
- Modular storage backends (file, memory)
- RESTful API for intent submission and status

### 3. Hyperlane Package (Kurtosis Package)

Launches Hyperlane off-chain agents (validators, relayer) and on-chain contracts in one click, supporting HWR 2.0 deployment.

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

**Warp Route Features:**
- Multi-collateral to synthetic token topology
- Automatic liquidity seeding
- Lock/release and mint/burn modes
- Integration with Hyperlane CLI for deployment

### 4. Hyperlane Tools (CLI Utilities)

Minimal TypeScript CLI toolkit for generating and deploying Hyperlane HWR 2.0 multi-collateral routes and building unified registry JSON.

**Key Scripts:**
- `extend-multicollateral.ts` - Generate and deploy HWR configurations
- `deploy-oft-native.ts` - Deploy LayerZero OFT Native ETH adapters
- `build-registry.ts` - Build merged registry JSON for UI consumption

**Registry Building:**
```bash
# Generate HWR configuration and artifacts
pnpm extend -- --config ./samples/mainnet-pyusd-multicollateral.json

# Deploy warp routes
pnpm extend -- --config ./samples/mainnet-pyusd-multicollateral.json --deploy

# Build unified registry for UI
pnpm registry:build
```

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
  "tokens": [
    { "symbol": "PYUSD", "decimals": 6 }
  ],
  "routes": [
    {
      "bridgeType": "HWR",
      "hwr": {
        "token": "PYUSD",
        "supportsMultiSource": true,
        "routers": {
          "ethereum": "0x76886b63257244CA00dAdE349d8Aa92b0a541fd9",
          "arbitrum": "0xDe95b0d8C5a1Cd9939A63A51ebf07732F1aCc92D"
        }
      }
    },
    {
      "bridgeType": "OFT",
      "oft": {
        "token": "PYUSD",
        "oft": {
          "ethereum": "0xa2C323fE5A74aDffAd2bf3E007E36bb029606444",
          "arbitrum": "0xFaB5891ED867a1195303251912013b92c4fc3a1D"
        }
      }
    }
  ]
}
```

## Intent Submission and Settlement Flow

### 1. Intent Creation (ERC-7683)

```typescript
// bridge-ui/src/lib/fastIntent.ts
export async function sendFastIntent(params) {
  // 1. Check token allowance and approve if needed
  const allowance = await publicClient.readContract({
    address: inputToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [sender, settler]
  });
  
  // 2. Encode standard order following ERC-7683
  const encodedOrder = encodeStandardOrder({
    user: sender,
    originChainId: resolveChainId(origin),
    expires: Math.max(Math.floor(Date.now() / 1000) + 7200, fillDeadline + 3600),
    fillDeadline,
    inputOracle,
    inputs: [{ token: inputToken, amount: BigInt(inputAmount) }],
    outputs: [{
      oracle: outputOracle,
      settler: outputSettler,
      chainId: resolveChainId(destination),
      token: outputToken,
      amount: BigInt(outputAmount),
      recipient: outputRecipient,
    }],
  });
  
  // 3. Submit intent to input settler
  const hash = await walletClient.writeContract({
    address: settler,
    abi: INPUT_SETTLER_ABI,
    functionName: "open",
    args: [encodedOrder],
    account: sender,
  });
}
```

### 2. Solver Processing

```toml
# Generated solver configuration
[solver]
id = "oif-solver-kurtosis"
monitoring_timeout_minutes = 5

[settlement.implementations.eip7683]
network_ids = [1, 42161, 10]
oracle_addresses = { 1 = "0xc005dc82818d67AF737725bD4bf75435d065D239", 42161 = "0x77818DE6a93f0335E9A5817314Bb1e879d319C6F" }
dispute_period_seconds = 1

[order.strategy.implementations.simple]
max_gas_price_gwei = 100
```

### 3. Settlement Verification

The settlement module configures Hyperlane oracle addresses for cross-chain verification:

```python
# intents-stack/modules/settlement/hyperlane.star
def build_oracle_mapping(plan, args, addresses):
    # Apply chain-type presets for oracle addresses
    # Override with explicit configurations
    # Validate all chains have oracle coverage
    return {
        "eip7683": {
            "network_ids": chain_ids,
            "oracle_addresses": oracle_mapping
        }
    }
```

## Deployment Guide

### Prerequisites

- Node.js 18+ and pnpm/npm
- Kurtosis CLI installed
- Docker for containerized deployments
- Private keys for deployment (never commit to repo)

### 1. Deploy Hyperlane Infrastructure

```bash
# Configure chains and agents
cd hyperlane-package
cp config/config.yaml config/my-config.yaml
# Edit my-config.yaml with your RPC URLs and keys

# Deploy using Kurtosis
kurtosis clean -a
kurtosis run . --args-file config/my-config.yaml
```

### 2. Deploy Intent Stack

```bash
# Configure solver and settlement
cd intents-stack
cp examples/args.yaml my-args.yaml
# Edit my-args.yaml with your chain configurations

# Deploy solver stack
kurtosis run . --args-file my-args.yaml
```

### 3. Generate Registry Artifacts

```bash
# Configure PYUSD routes
cd hyperlane-tools
cp samples/mainnet-pyusd-multicollateral.json my-config.json
# Edit my-config.json with deployed contract addresses

# Generate and deploy routes
pnpm extend -- --config my-config.json --deploy

# Build unified registry
pnpm registry:build
```

### 4. Configure Bridge UI

```bash
cd bridge-ui
cp .env.example .env.local
# Set registry URL and contract addresses in .env.local

# Install and run
npm install
npm run dev
```

## Testing Guide

### Pre-deployment Testing

1. **Verify Chain Configurations**
   ```bash
   # Check chain IDs and RPC connectivity
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
     $ETHEREUM_RPC_URL
   ```

2. **Validate Contract Deployments**
   ```bash
   # Verify deployed contract addresses
   npx @hyperlane-xyz/cli warp read --symbol PYUSD
   ```

### Integration Testing

1. **Hyperlane Route Testing**
   - ETH → OP: Send 0.6 PYUSD, verify ePyUSD +0.6 on Optimism
   - ARB → OP: Send PYUSD from Arbitrum, verify ePyUSD increase
   - OP → ETH/ARB: Send ePyUSD back, verify PYUSD credit

2. **LayerZero Route Testing**
   - ETH → ARB: Bridge 0.6 PYUSD, verify ARB +0.6 PYUSD
   - ARB → ETH: Bridge back, verify ETH balance increase

3. **Intent Flow Testing**
   - Submit fast intent through UI
   - Monitor solver logs for intent processing
   - Verify settlement on destination chain

### Monitoring and Debugging

```bash
# View Kurtosis service logs
kurtosis service logs <enclave-name> solver-service
kurtosis service logs <enclave-name> hyperlane-cli

# Check intent submission status
curl http://localhost:3000/api/intents/<intent-id>

# Monitor Hyperlane message delivery
# Use Hyperlane Explorer: https://explorer.hyperlane.xyz/
```

## Security Considerations

- **Private Key Management**: Never commit private keys or sensitive environment variables
- **Testing Amounts**: Use small amounts for testing ($0.5-$1 per route)
- **RPC Security**: Use private RPC endpoints for production deployments
- **Contract Verification**: Always verify deployed contract addresses on block explorers
- **Intent Validation**: Solvers validate intent parameters before execution
- **Oracle Security**: Hyperlane oracles provide cross-chain message verification

## Repository Structure

```
HyperPay/
├── bridge-ui/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── lib/              # Core logic (routing, intents)
│   │   └── pages/            # Next.js pages
│   └── public/               # Static assets and registry
├── intents-stack/            # OIF solver Kurtosis package
│   ├── modules/              # Modular components
│   │   ├── settlement/       # Settlement backends
│   │   ├── solver.star       # Solver configuration
│   │   └── contracts.star    # Contract deployment
│   └── examples/             # Configuration examples
├── hyperlane-package/        # Hyperlane infrastructure package
│   ├── modules/              # Deployment modules
│   │   ├── contracts/        # Contract deployment
│   │   ├── infrastructure/   # Agent setup
│   │   └── services/         # Service configuration
│   └── config/               # Configuration examples
├── hyperlane-tools/          # CLI utilities
│   ├── src/                  # TypeScript source
│   ├── samples/              # Configuration samples
│   └── artifacts/            # Generated artifacts
└── docs/                     # Documentation
    ├── DEPLOYMENT.md         # Deployment instructions
    ├── TESTING.md           # Testing procedures
    └── README.md            # This comprehensive guide
```

## Contributing

1. **Development Setup**
   ```bash
   # Clone repository
   git clone https://github.com/fraVlaca/HyperPay.git
   cd HyperPay
   
   # Install dependencies for each component
   cd bridge-ui && npm install && cd ..
   cd hyperlane-tools && pnpm install && cd ..
   ```

2. **Testing Changes**
   - Test individual components in isolation
   - Use Kurtosis for integration testing
   - Verify on testnets before mainnet deployment

3. **Documentation Updates**
   - Update relevant README files
   - Include configuration examples
   - Document any new environment variables

## Support and Resources

- **Hyperlane Documentation**: https://docs.hyperlane.xyz/
- **LayerZero Documentation**: https://layerzero.gitbook.io/
- **Open Intents Framework**: https://www.erc7683.org/
- **Kurtosis Documentation**: https://docs.kurtosis.com/

For technical support or questions about HyperPay implementation, please refer to the individual component README files or create an issue in the repository.
