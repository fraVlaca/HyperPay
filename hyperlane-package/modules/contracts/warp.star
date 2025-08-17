# Warp Route Deployment Module - Handles warp route deployment and liquidity seeding

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
join_strings = helpers_module.join_strings
log_info = helpers_module.log_info
is_empty = helpers_module.is_empty

constants = get_constants()

# ============================================================================
# WARP ROUTE DEPLOYMENT
# ============================================================================

def deploy_warp_routes(plan, warp_routes):
    """
    Deploy all configured warp routes
    
    Args:
        plan: Kurtosis plan object
        warp_routes: List of warp route configurations
    """
    if len(warp_routes) == 0:
        # log_info("No warp routes to deploy")
        return
    
    # log_info("Deploying {} warp routes".format(len(warp_routes)))
    
    for route in warp_routes:
        deploy_single_warp_route(plan, route)
        seed_route_liquidity(plan, route)

# ============================================================================
# SINGLE ROUTE DEPLOYMENT
# ============================================================================

def deploy_single_warp_route(plan, warp_route):
    """
    Deploy a single warp route
    
    Args:
        plan: Kurtosis plan object
        warp_route: Warp route configuration
    """
    symbol = safe_get(warp_route, "symbol", constants.DEFAULT_ROUTE_SYMBOL)
    mode = safe_get(warp_route, "mode", constants.DEFAULT_WARP_MODE)
    
    # log_info("Deploying warp route: {} (mode: {})".format(symbol, mode))
    
    # Build environment variables for the deployment script
    env_vars = "ROUTE_SYMBOL={} MODE={}".format(symbol, mode)
    
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = ["sh", "-lc", "{} {}".format(env_vars, constants.WARP_ROUTES_SCRIPT)],
        ),
    )

# ============================================================================
# LIQUIDITY SEEDING
# ============================================================================

def seed_route_liquidity(plan, warp_route):
    """
    Seed initial liquidity for a warp route
    
    Args:
        plan: Kurtosis plan object
        warp_route: Warp route configuration
    """
    # NOTE: The parser stores this field as 'initial_liquidity' (snake_case).
    # For robustness, support both the snake_case and camelCase keys.
    initial_liquidity = safe_get(warp_route, "initial_liquidity", [])
    if len(initial_liquidity) == 0:
        initial_liquidity = safe_get(warp_route, "initialLiquidity", [])
    
    if len(initial_liquidity) == 0:
        return
    
    # Build liquidity pairs string
    liquidity_pairs = build_liquidity_pairs(initial_liquidity)
    
    if is_empty(liquidity_pairs):
        return
    
    # log_info("Seeding initial liquidity for route: {}".format(safe_get(warp_route, "symbol", constants.DEFAULT_ROUTE_SYMBOL)))
    
    # Execute liquidity seeding
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = [
                "sh", 
                "-lc", 
                'REGISTRY_DIR={} INITIAL_LIQUIDITY="{}" {}'.format(
                    constants.REGISTRY_DIR,
                    liquidity_pairs,
                    constants.SEED_LIQUIDITY_SCRIPT
                )
            ],
        ),
    )

def build_liquidity_pairs(initial_liquidity):
    """
    Build liquidity pairs string from configuration
    
    Args:
        initial_liquidity: List of initial liquidity configurations
        
    Returns:
        Formatted liquidity pairs string
    """
    pairs = []
    
    for liquidity in initial_liquidity:
        chain = safe_get(liquidity, "chain", "")
        amount = safe_get(liquidity, "amount", "")
        
        if chain and amount:
            pairs.append("{}={}".format(chain, str(amount)))
    
    return join_strings(pairs, ",")

# ============================================================================
# WARP ROUTE CONFIGURATION
# ============================================================================

def generate_warp_config(warp_route, chains):
    """
    Generate warp route configuration for deployment
    
    Args:
        warp_route: Warp route configuration
        chains: List of chain configurations
        
    Returns:
        Warp configuration as a struct
    """
    config = struct(
        symbol = safe_get(warp_route, "symbol", constants.DEFAULT_ROUTE_SYMBOL),
        mode = safe_get(warp_route, "mode", constants.DEFAULT_WARP_MODE),
        decimals = safe_get(warp_route, "decimals", 18),
        topology = safe_get(warp_route, "topology", {}),
        chains = []
    )
    
    # Add chain-specific configuration
    for chain in chains:
        chain_name = getattr(chain, "name", "")
        if chain_name in config.topology:
            config.chains.append(struct(
                name = chain_name,
                type = config.topology[chain_name],
                rpc_url = getattr(chain, "rpc_url", "")
            ))
    
    return config

# ============================================================================
# VALIDATION
# ============================================================================

def validate_warp_route(warp_route, chains):
    """
    Validate warp route configuration
    
    Args:
        warp_route: Warp route configuration
        chains: List of available chains
        
    Returns:
        True if valid, fails with error if not
    """
    symbol = safe_get(warp_route, "symbol", "")
    if not symbol:
        fail("Warp route symbol is required")
    
    mode = safe_get(warp_route, "mode", "")
    if mode not in constants.VALID_WARP_MODES:
        fail("Invalid warp route mode: {}. Valid modes: {}".format(
            mode,
            ", ".join(constants.VALID_WARP_MODES)
        ))
    
    # Validate topology chains exist
    chain_names = [getattr(chain, "name", "") for chain in chains]
    topology = safe_get(warp_route, "topology", {})
    
    for chain_name in topology.keys():
        if chain_name not in chain_names:
            fail("Warp route references unknown chain: {}".format(chain_name))
    
    return True