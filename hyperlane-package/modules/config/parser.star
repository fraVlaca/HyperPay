# Configuration Parser Module - Handles parsing and structuring of configuration

constants_module = import_module("./constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
as_bool = helpers_module.as_bool

constants = get_constants()

# ============================================================================
# MAIN CONFIGURATION PARSER
# ============================================================================

def parse_configuration(args):
    """
    Parse and structure the main configuration from arguments
    
    Args:
        args: Raw arguments passed to the package
        
    Returns:
        Structured configuration object
    """
    # Parse chains into structs
    raw_chains = safe_get(args, "chains", [])
    parsed_chains = []
    for chain in raw_chains:
        parsed_chains.append(parse_chain_config(chain))
    
    # Parse warp routes into structs
    raw_warp_routes = safe_get(args, "warp_routes", [])
    parsed_warp_routes = []
    for route in raw_warp_routes:
        parsed_warp_routes.append(parse_warp_route(route))
    
    config = struct(
        chains = parsed_chains,
        agents = safe_get(args, "agents", {}),
        warp_routes = parsed_warp_routes,
        send_test = safe_get(args, "send_test", {}),
        global_config = safe_get(args, "global", {})
    )
    
    return config

# ============================================================================
# AGENT CONFIGURATION PARSER
# ============================================================================

def parse_agent_config(agents):
    """
    Extract and structure agent configuration
    
    Args:
        agents: Raw agent configuration
        
    Returns:
        Structured agent configuration
    """
    relayer_cfg = safe_get(agents, "relayer", {})
    deployer_cfg = safe_get(agents, "deployer", {})
    
    # Parse validators into structs
    raw_validators = safe_get(agents, "validators", [])
    parsed_validators = []
    for validator in raw_validators:
        parsed_validators.append(parse_validator_config(validator))
    
    return struct(
        relayer_key = safe_get(relayer_cfg, "key", ""),
        allow_local_sync = as_bool(
            safe_get(relayer_cfg, "allow_local_checkpoint_syncers", True), 
            True
        ),
        deployer_key = safe_get(deployer_cfg, "key", ""),
        validators = parsed_validators
    )

# ============================================================================
# GLOBAL CONFIGURATION PARSER
# ============================================================================

def parse_global_config(global_config):
    """
    Extract global configuration settings
    
    Args:
        global_config: Raw global configuration
        
    Returns:
        Structured global settings
    """
    return struct(
        agent_tag = safe_get(
            global_config, 
            "agent_image_tag", 
            constants.DEFAULT_AGENT_TAG
        ),
        cli_version = safe_get(
            global_config, 
            "cli_version", 
            constants.DEFAULT_CLI_VERSION
        ),
        registry_mode = safe_get(
            global_config, 
            "registry_mode", 
            constants.DEFAULT_REGISTRY_MODE
        )
    )

# ============================================================================
# CHAIN CONFIGURATION PARSER
# ============================================================================

def parse_chain_config(chain):
    """
    Parse individual chain configuration
    
    Args:
        chain: Raw chain configuration
        
    Returns:
        Structured chain configuration
    """
    return struct(
        name = safe_get(chain, "name", ""),
        rpc_url = safe_get(chain, "rpc_url", ""),
        chain_id = safe_get(chain, "chain_id", None),
        deploy_core = as_bool(safe_get(chain, "deploy_core", False), False),
        existing_addresses = safe_get(chain, "existing_addresses", {})
    )

# ============================================================================
# WARP ROUTE PARSER
# ============================================================================

def parse_warp_route(warp_route):
    """
    Parse warp route configuration
    
    Args:
        warp_route: Raw warp route configuration
        
    Returns:
        Structured warp route configuration
    """
    # Parse initial liquidity into structs
    raw_liquidity = safe_get(warp_route, "initialLiquidity", [])
    parsed_liquidity = []
    for liq in raw_liquidity:
        parsed_liquidity.append(struct(
            chain = safe_get(liq, "chain", ""),
            amount = safe_get(liq, "amount", "0")
        ))
    
    return struct(
        symbol = safe_get(warp_route, "symbol", constants.DEFAULT_ROUTE_SYMBOL),
        mode = safe_get(warp_route, "mode", constants.DEFAULT_WARP_MODE),
        decimals = safe_get(warp_route, "decimals", 18),
        topology = safe_get(warp_route, "topology", {}),
        token_addresses = safe_get(warp_route, "token_addresses", {}),
        owner = safe_get(warp_route, "owner", ""),
        initial_liquidity = parsed_liquidity
    )

# ============================================================================
# VALIDATOR CONFIGURATION PARSER
# ============================================================================

def parse_validator_config(validator):
    """
    Parse validator configuration
    
    Args:
        validator: Raw validator configuration
        
    Returns:
        Structured validator configuration
    """
    checkpoint_syncer = safe_get(validator, "checkpoint_syncer", {})
    params = safe_get(checkpoint_syncer, "params", {})
    
    # Parse params into a struct
    parsed_params = struct(
        path = safe_get(params, "path", ""),
        bucket = safe_get(params, "bucket", ""),
        region = safe_get(params, "region", "")
    )
    
    return struct(
        chain = safe_get(validator, "chain", ""),
        signing_key = safe_get(validator, "signing_key", ""),
        checkpoint_syncer = struct(
            type = safe_get(checkpoint_syncer, "type", constants.CHECKPOINT_SYNCER_LOCAL),
            params = parsed_params
        )
    )

# ============================================================================
# TEST CONFIGURATION PARSER
# ============================================================================

def parse_test_config(send_test):
    """
    Parse test configuration
    
    Args:
        send_test: Raw test configuration
        
    Returns:
        Structured test configuration
    """
    return struct(
        enabled = as_bool(safe_get(send_test, "enabled", False), False),
        origin = safe_get(send_test, "origin", constants.DEFAULT_TEST_ORIGIN),
        destination = safe_get(send_test, "destination", constants.DEFAULT_TEST_DESTINATION),
        amount = safe_get(send_test, "amount", constants.DEFAULT_TEST_AMOUNT)
    )