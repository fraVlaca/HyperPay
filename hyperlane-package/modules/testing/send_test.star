# Testing Module - Handles test transaction execution

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
log_info = helpers_module.log_info

constants = get_constants()

# ============================================================================
# TEST EXECUTION
# ============================================================================

def run_send_test(plan, test_config, warp_routes):
    """
    Run a test transaction if enabled
    
    Args:
        plan: Kurtosis plan object
        test_config: Test configuration
        warp_routes: List of warp routes
    """
    test_enabled = getattr(test_config, "enabled", False)
    if not test_enabled:
        # log_info("Send test is disabled")
        return
    
    test_origin = getattr(test_config, "origin", "")
    test_destination = getattr(test_config, "destination", "")
    # log_info("Running send test from {} to {}".format(test_origin, test_destination))
    
    # Get test parameters
    test_params = build_test_parameters(test_config, warp_routes)
    
    # Execute test
    execute_test_transaction(plan, test_params)

# ============================================================================
# TEST PARAMETER BUILDING
# ============================================================================

def build_test_parameters(test_config, warp_routes):
    """
    Build parameters for test transaction
    
    Args:
        test_config: Test configuration
        warp_routes: List of warp routes
        
    Returns:
        Test parameters struct
    """
    # Get test symbol from first warp route or use default
    test_symbol = constants.DEFAULT_TEST_SYMBOL
    if len(warp_routes) > 0:
        test_symbol = safe_get(warp_routes[0], "symbol", test_symbol)
    
    return struct(
        origin = getattr(test_config, "origin", ""),
        destination = getattr(test_config, "destination", ""),
        amount = str(getattr(test_config, "amount", "0")),
        symbol = test_symbol
    )

# ============================================================================
# TEST EXECUTION
# ============================================================================

def execute_test_transaction(plan, test_params):
    """
    Execute the test transaction
    
    Args:
        plan: Kurtosis plan object
        test_params: Test parameters
    """
    # Build environment variables for the test script
    env_vars = "REGISTRY_DIR={} SYMBOL={} ORIGIN={} DESTINATION={} AMOUNT={}".format(
        constants.REGISTRY_DIR,
        test_params.symbol,
        test_params.origin,
        test_params.destination,
        test_params.amount
    )
    
    # Execute test
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = [
                "sh", 
                "-lc", 
                "{} {}".format(env_vars, constants.SEND_WARP_SCRIPT)
            ],
        ),
    )
    
    # log_info("Test transaction submitted successfully")

# ============================================================================
# TEST VALIDATION
# ============================================================================

def validate_test_config(test_config, chains):
    """
    Validate test configuration
    
    Args:
        test_config: Test configuration
        chains: List of available chains
        
    Returns:
        True if valid, fails with error if not
    """
    test_enabled = getattr(test_config, "enabled", False)
    if not test_enabled:
        return True
    
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
    # Starlark doesn't support try/except
    if type(test_amount) == "int":
        if test_amount <= 0:
            fail("Test amount must be positive, got: {}".format(test_amount))
    elif type(test_amount) == "string":
        # For string amounts, we'll assume they're valid
        # The actual validation will happen at runtime
        pass
    else:
        fail("Invalid test amount type: {}".format(type(test_amount)))
    
    return True