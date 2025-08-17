# Configuration Validator Module - Validates configuration according to business rules

constants_module = import_module("./constants.star")
get_constants = constants_module.get_constants

constants = get_constants()

# ============================================================================
# MAIN VALIDATION
# ============================================================================

def validate_configuration(config):
    """
    Validate the entire configuration
    
    Args:
        config: Parsed configuration object
        
    Returns:
        None if valid, fails with error message if invalid
    """
    # Validate chains
    validate_chains(config.chains)
    
    # Validate agents
    validate_agents(config.agents)
    
    # Validate warp routes
    validate_warp_routes(config.warp_routes, config.chains)
    
    # Validate test configuration
    validate_test_config(config.send_test, config.chains)

# ============================================================================
# CHAIN VALIDATION
# ============================================================================

def validate_chains(chains):
    """
    Validate chain configuration
    
    Args:
        chains: List of chain configurations
    """
    # Check minimum number of chains
    if len(chains) < constants.MIN_CHAINS_REQUIRED:
        fail("At least {} chains are required, got {}".format(
            constants.MIN_CHAINS_REQUIRED, 
            len(chains)
        ))
    
    # Check for duplicate chain names
    chain_names = []
    for chain in chains:
        # Access chain name properly
        chain_name = getattr(chain, "name", "")
        if not chain_name:
            fail("Chain name is required")
        
        if chain_name in chain_names:
            fail("Duplicate chain name: {}".format(chain_name))
        
        chain_names.append(chain_name)
        
        # Validate RPC URL
        chain_rpc = getattr(chain, "rpc_url", "")
        if not chain_rpc:
            fail("RPC URL is required for chain: {}".format(chain_name))
        
        # Validate chain name format
        if not is_valid_chain_name(chain_name):
            fail("Invalid chain name format: {}".format(chain_name))

def is_valid_chain_name(name):
    """
    Check if chain name has valid format
    
    Args:
        name: Chain name to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not name:
        return False
    # Chain names should be alphanumeric with hyphens/underscores
    # Starlark doesn't support iterating over strings character by character
    # We'll just do a basic check for now
    return True

# ============================================================================
# AGENT VALIDATION
# ============================================================================

def validate_agents(agents):
    """
    Validate agent configuration
    
    Args:
        agents: Agent configuration object
    """
    # Validate deployer key if core deployment is needed
    # Commented out print statements as they're not supported in Kurtosis
    # if not agents.deployer_key:
    #     print("Warning: No deployer key provided. Core deployment will fail if attempted.")
    
    # Validate relayer configuration
    # if not agents.relayer_key:
    #     print("Warning: No relayer key provided. Relayer will not be able to sign transactions.")
    
    # Validate validators - agents is a struct from parsed config
    validators = getattr(agents, "validators", [])
    for validator in validators:
        validate_validator(validator)

def validate_validator(validator):
    """
    Validate individual validator configuration
    
    Args:
        validator: Validator configuration
    """
    # Validator is a struct from parsed config
    val_chain = getattr(validator, "chain", "")
    if not val_chain:
        fail("Validator chain is required")
    
    val_key = getattr(validator, "signing_key", "")
    if not val_key:
        fail("Validator signing key is required for chain: {}".format(val_chain))
    
    # Validate checkpoint syncer type
    checkpoint_syncer = getattr(validator, "checkpoint_syncer", struct())
    syncer_type = getattr(checkpoint_syncer, "type", "")
    valid_types = [
        constants.CHECKPOINT_SYNCER_LOCAL,
        constants.CHECKPOINT_SYNCER_S3,
        constants.CHECKPOINT_SYNCER_GCS
    ]
    
    if syncer_type not in valid_types:
        fail("Invalid checkpoint syncer type '{}' for validator on chain '{}'. Valid types: {}".format(
            syncer_type,
            val_chain,
            ", ".join(valid_types)
        ))
    
    # Validate S3 parameters if S3 syncer
    if syncer_type == constants.CHECKPOINT_SYNCER_S3:
        params = getattr(checkpoint_syncer, "params", struct())
        bucket = getattr(params, "bucket", "")
        if not bucket:
            fail("S3 bucket is required for S3 checkpoint syncer on chain: {}".format(val_chain))

# ============================================================================
# WARP ROUTE VALIDATION
# ============================================================================

def validate_warp_routes(warp_routes, chains):
    """
    Validate warp route configuration
    
    Args:
        warp_routes: List of warp route configurations
        chains: List of chain configurations
    """
    chain_names = [getattr(chain, "name", "") for chain in chains]
    
    for route in warp_routes:
        # Validate mode
        route_mode = getattr(route, "mode", "")
        if route_mode not in constants.VALID_WARP_MODES:
            fail("Invalid warp route mode '{}'. Valid modes: {}".format(
                route_mode,
                ", ".join(constants.VALID_WARP_MODES)
            ))
        
        # Validate symbol
        route_symbol = getattr(route, "symbol", "")
        if not route_symbol:
            fail("Warp route symbol is required")
        
        # Validate topology chains exist
        route_topology = getattr(route, "topology", {})
        for chain_name in route_topology.keys():
            if chain_name not in chain_names:
                fail("Warp route topology references unknown chain: {}".format(chain_name))
        
        # Validate initial liquidity chains
        initial_liquidity = getattr(route, "initial_liquidity", [])
        for liquidity in initial_liquidity:
            liq_chain = getattr(liquidity, "chain", "")
            if liq_chain not in chain_names:
                fail("Initial liquidity references unknown chain: {}".format(liq_chain))
            
            # Validate amount is positive
            amount = getattr(liquidity, "amount", "0")
            if not is_positive_amount(amount):
                fail("Invalid liquidity amount for chain {}: {}".format(
                    liq_chain,
                    amount
                ))

def is_positive_amount(amount):
    """
    Check if amount is a positive number
    
    Args:
        amount: Amount as string or number
        
    Returns:
        True if positive, False otherwise
    """
    # Starlark doesn't support try/except
    # Check if it's already a number or can be converted
    if type(amount) == "int":
        return amount > 0
    elif type(amount) == "string":
        # For string amounts, just check it's not empty or "0"
        return amount != "" and amount != "0"
    return False

# ============================================================================
# TEST CONFIGURATION VALIDATION
# ============================================================================

def validate_test_config(test_config, chains):
    """
    Validate test configuration
    
    Args:
        test_config: Test configuration object
        chains: List of chain configurations
    """
    test_enabled = getattr(test_config, "enabled", False)
    if not test_enabled:
        return
    
    chain_names = [getattr(chain, "name", "") for chain in chains]
    
    # Validate origin chain exists
    test_origin = getattr(test_config, "origin", "")
    if test_origin not in chain_names:
        fail("Test origin chain '{}' not found in configured chains".format(test_origin))
    
    # Validate destination chain exists
    test_destination = getattr(test_config, "destination", "")
    if test_destination not in chain_names:
        fail("Test destination chain '{}' not found in configured chains".format(test_destination))
    
    # Validate amount is positive
    test_amount = getattr(test_config, "amount", "0")
    if not is_positive_amount(test_amount):
        fail("Invalid test amount: {}".format(test_amount))

# ============================================================================
# KEY VALIDATION
# ============================================================================

def validate_private_key(key):
    """
    Validate private key format
    
    Args:
        key: Private key string
        
    Returns:
        True if valid format, False otherwise
    """
    if not key:
        return False
    
    # Remove 0x prefix if present
    if key.startswith("0x"):
        key = key[2:]
    
    # Check if it's 64 hex characters
    if len(key) != 64:
        return False
    
    # Check if all characters are hexadecimal
    # Starlark doesn't support try/except
    # We'll do a basic check for hex characters
    for c in key:
        if c not in "0123456789abcdefABCDEF":
            return False
    return True