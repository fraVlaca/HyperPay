"""
Hyperlane Settlement Module
Configures Hyperlane oracle addresses for cross-chain settlement.
"""

# Hyperlane oracle presets organized by network type
HYPERLANE_ORACLE_PRESETS = {
    # Mainnet oracles
    "mainnet": {
        1: "0x0000000000000000000000000000000000000000",      # Ethereum Mainnet
        10: "0x0000000000000000000000000000000000000000",     # Optimism
        137: "0x0000000000000000000000000000000000000000",    # Polygon
        42161: "0x0000000000000000000000000000000000000000",  # Arbitrum One
        8453: "0x0000000000000000000000000000000000000000",   # Base
    },
    
    # Testnet oracles
    "testnet": {
        11155111: "0xa39434521088d9a50325BC50eC2f50660e06Df34",  # Ethereum Sepolia
        421614: "0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa",    # Arbitrum Sepolia
    }
}

# Default preset mode
DEFAULT_PRESET_MODE = "chain_type"
DEFAULT_CHAIN_TYPE = "ethereum"

def build_oracle_mapping(plan, args, addresses):
    """
    Build oracle address mapping for settlement configuration.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments
        addresses: Contract addresses by chain
    
    Returns:
        Dictionary with settlement configuration including oracle addresses
    """
    settlement_config = args.get("solver", {}).get("settlement", {})
    backend = settlement_config.get("backend", "hyperlane")
    
    # Handle custom backend
    if backend == "custom":
        return _handle_custom_backend(plan, settlement_config)
    
    # Build Hyperlane oracle mapping
    return _build_hyperlane_mapping(plan, args, addresses, settlement_config)

def _handle_custom_backend(plan, settlement_config):
    """
    Handle custom backend configuration.
    
    Args:
        plan: Kurtosis plan object
        settlement_config: Settlement configuration
    
    Returns:
        Dictionary with custom oracle mapping
    """
    custom_config = settlement_config.get("custom", {})
    oracle_map = custom_config.get("oracle_addresses", {})
    
    if not oracle_map:
        fail("Custom backend requires solver.settlement.custom.oracle_addresses mapping")
    
    # Convert keys to integers and return structured result
    return {
        "eip7683": {
            "network_ids": list(oracle_map.keys()),
            "oracle_addresses": {int(k): v for k, v in oracle_map.items()}
        }
    }

def _build_hyperlane_mapping(plan, args, addresses, settlement_config):
    """
    Build Hyperlane oracle mapping with presets and overrides.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments
        addresses: Contract addresses by chain
        settlement_config: Settlement configuration
    
    Returns:
        Dictionary with Hyperlane oracle mapping
    """
    # Extract configuration
    hyperlane_config = settlement_config.get("hyperlane", {})
    preset_mode = hyperlane_config.get("preset_mode", DEFAULT_PRESET_MODE)
    explicit_overrides = hyperlane_config.get("oracle_addresses", {}) or {}
    
    # Get chain IDs from addresses
    chain_ids = [int(k) for k in addresses.keys()]
    
    # Initialize result structure
    result = {
        "eip7683": {
            "network_ids": chain_ids,
            "oracle_addresses": {}
        }
    }
    
    # Step 1: Apply presets based on mode
    if preset_mode == "chain_type":
        _apply_chain_type_presets(plan, args, result)
    elif preset_mode == "override":
        # Skip presets, only use explicit overrides
        pass
    else:
        fail("Unknown preset_mode: %s" % preset_mode)
    
    # Step 2: Apply chain-level oracle addresses
    _apply_chain_level_oracles(args, result)
    
    # Step 3: Apply explicit overrides (highest priority)
    _apply_explicit_overrides(explicit_overrides, result)
    
    # Validate all chains have oracle addresses
    _validate_oracle_coverage(plan, chain_ids, result, explicit_overrides)
    
    return result

def _apply_chain_type_presets(plan, args, result):
    """
    Apply oracle presets based on chain type.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments
        result: Result dictionary to populate
    """
    for chain in args.get("chains", []):
        chain_id = int(chain.get("chain_id"))
        chain_type = chain.get("chain_type", DEFAULT_CHAIN_TYPE)
        
        # Look up preset for this chain
        oracle_address = _get_preset_oracle(chain_type, chain_id)
        
        if oracle_address:
            result["eip7683"]["oracle_addresses"][chain_id] = oracle_address

def _apply_chain_level_oracles(args, result):
    """
    Apply chain-level oracle addresses from chain configuration.
    
    Args:
        args: Configuration arguments
        result: Result dictionary to update
    """
    for chain in args.get("chains", []):
        chain_id = int(chain.get("chain_id"))
        oracle_address = chain.get("hyperlane_oracle_address")
        
        if oracle_address:
            result["eip7683"]["oracle_addresses"][chain_id] = oracle_address

def _apply_explicit_overrides(overrides, result):
    """
    Apply explicit oracle address overrides.
    
    Args:
        overrides: Dictionary of oracle address overrides
        result: Result dictionary to update
    """
    for chain_id_str, oracle_address in overrides.items():
        chain_id = int(chain_id_str)
        result["eip7683"]["oracle_addresses"][chain_id] = oracle_address

def _get_preset_oracle(chain_type, chain_id):
    """
    Get preset oracle address for a chain.
    
    Args:
        chain_type: Type of chain (ethereum, etc.)
        chain_id: Numeric chain ID
    
    Returns:
        Oracle address string or None if no preset exists
    """
    # Map chain type to preset category
    if chain_type in ["ethereum", "testnet"]:
        preset_category = chain_type
    else:
        # Default to ethereum presets for unknown types
        preset_category = "ethereum"
    
    # Check mainnet presets
    if chain_id in HYPERLANE_ORACLE_PRESETS.get("mainnet", {}):
        return HYPERLANE_ORACLE_PRESETS["mainnet"][chain_id]
    
    # Check testnet presets
    if chain_id in HYPERLANE_ORACLE_PRESETS.get("testnet", {}):
        return HYPERLANE_ORACLE_PRESETS["testnet"][chain_id]
    
    return None

def _validate_oracle_coverage(plan, chain_ids, result, explicit_overrides):
    """
    Validate that all chains have oracle addresses configured.
    
    Args:
        plan: Kurtosis plan object
        chain_ids: List of chain IDs that need oracles
        result: Result dictionary with oracle mappings
        explicit_overrides: Explicit overrides for error reporting
    """
    oracle_addresses = result["eip7683"]["oracle_addresses"]
    
    for chain_id in chain_ids:
        if chain_id not in oracle_addresses:
            # Check if there's an override we missed
            if str(chain_id) not in explicit_overrides:
                fail(
                    "No Hyperlane oracle preset found for chain_id=%d " % chain_id +
                    "and no override provided. Please add it to " +
                    "solver.settlement.hyperlane.oracle_addresses"
                )

def _preset_table():
    """
    Legacy function for backward compatibility.
    Returns the old preset table structure.
    """
    # Combine mainnet and testnet presets into old format
    combined = {}
    combined["ethereum"] = {}
    
    # Add all mainnet presets
    for chain_id, oracle in HYPERLANE_ORACLE_PRESETS.get("mainnet", {}).items():
        combined["ethereum"][chain_id] = {"oracle": oracle}
    
    # Add all testnet presets
    for chain_id, oracle in HYPERLANE_ORACLE_PRESETS.get("testnet", {}).items():
        combined["ethereum"][chain_id] = {"oracle": oracle}
    
    return combined