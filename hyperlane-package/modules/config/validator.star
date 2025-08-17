# Configuration Validator Module - Validates configuration according to business rules

load("./constants.star", "get_constants")

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
        if not chain.name:
            fail("Chain name is required")
        
        if chain.name in chain_names:
            fail("Duplicate chain name: {}".format(chain.name))
        
        chain_names.append(chain.name)
        
        # Validate RPC URL
        if not chain.rpc_url:
            fail("RPC URL is required for chain: {}".format(chain.name))
        
        # Validate chain name format
        if not is_valid_chain_name(chain.name):
            fail("Invalid chain name format: {}".format(chain.name))

def is_valid_chain_name(name):
    """
    Check if chain name has valid format
    
    Args:
        name: Chain name to validate
        
    Returns:
        True if valid, False otherwise
    """
    # Chain names should be alphanumeric with hyphens/underscores
    for char in name:
        if not (char.isalnum() or char in ["-", "_"]):
            return False
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
    if not agents.deployer_key:
        print("Warning: No deployer key provided. Core deployment will fail if attempted.")
    
    # Validate relayer configuration
    if not agents.relayer_key:
        print("Warning: No relayer key provided. Relayer will not be able to sign transactions.")
    
    # Validate validators
    for validator in agents.validators:
        validate_validator(validator)

def validate_validator(validator):
    """
    Validate individual validator configuration
    
    Args:
        validator: Validator configuration
    """
    if not validator.chain:
        fail("Validator chain is required")
    
    if not validator.signing_key:
        fail("Validator signing key is required for chain: {}".format(validator.chain))
    
    # Validate checkpoint syncer type
    syncer_type = validator.checkpoint_syncer.type
    valid_types = [
        constants.CHECKPOINT_SYNCER_LOCAL,
        constants.CHECKPOINT_SYNCER_S3,
        constants.CHECKPOINT_SYNCER_GCS
    ]
    
    if syncer_type not in valid_types:
        fail("Invalid checkpoint syncer type '{}' for validator on chain '{}'. Valid types: {}".format(
            syncer_type,
            validator.chain,
            ", ".join(valid_types)
        ))
    
    # Validate S3 parameters if S3 syncer
    if syncer_type == constants.CHECKPOINT_SYNCER_S3:
        params = validator.checkpoint_syncer.params
        if not params.get("bucket"):
            fail("S3 bucket is required for S3 checkpoint syncer on chain: {}".format(validator.chain))

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
    chain_names = [chain.name for chain in chains]
    
    for route in warp_routes:
        # Validate mode
        if route.mode not in constants.VALID_WARP_MODES:
            fail("Invalid warp route mode '{}'. Valid modes: {}".format(
                route.mode,
                ", ".join(constants.VALID_WARP_MODES)
            ))
        
        # Validate symbol
        if not route.symbol:
            fail("Warp route symbol is required")
        
        # Validate topology chains exist
        for chain_name in route.topology.keys():
            if chain_name not in chain_names:
                fail("Warp route topology references unknown chain: {}".format(chain_name))
        
        # Validate initial liquidity chains
        for liquidity in route.initial_liquidity:
            if liquidity.get("chain") not in chain_names:
                fail("Initial liquidity references unknown chain: {}".format(
                    liquidity.get("chain")
                ))
            
            # Validate amount is positive
            amount = liquidity.get("amount", "0")
            if not is_positive_amount(amount):
                fail("Invalid liquidity amount for chain {}: {}".format(
                    liquidity.get("chain"),
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
    try:
        return int(str(amount)) > 0
    except:
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
    if not test_config.enabled:
        return
    
    chain_names = [chain.name for chain in chains]
    
    # Validate origin chain exists
    if test_config.origin not in chain_names:
        fail("Test origin chain '{}' not found in configured chains".format(
            test_config.origin
        ))
    
    # Validate destination chain exists
    if test_config.destination not in chain_names:
        fail("Test destination chain '{}' not found in configured chains".format(
            test_config.destination
        ))
    
    # Validate amount is positive
    if not is_positive_amount(test_config.amount):
        fail("Invalid test amount: {}".format(test_config.amount))

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
    try:
        int(key, 16)
        return True
    except:
        return False