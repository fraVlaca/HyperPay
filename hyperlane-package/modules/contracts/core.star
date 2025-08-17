# Core Contract Deployment Module - Handles Hyperlane core contract deployment

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
as_bool = helpers_module.as_bool
log_info = helpers_module.log_info

constants = get_constants()

# ============================================================================
# CORE DEPLOYMENT ORCHESTRATION
# ============================================================================

def deploy_core_contracts(plan, chains, deployer_key):
    """
    Deploy core contracts to chains that require them
    
    Args:
        plan: Kurtosis plan object
        chains: List of chain configurations
        deployer_key: Deployer private key
        
    Returns:
        True if deployment was needed and succeeded
    """
    # Check if any chain needs core deployment
    chains_needing_core = get_chains_needing_core(chains)
    
    if len(chains_needing_core) == 0:
        # log_info("No chains require core deployment")
        return False
    
    # log_info("Deploying core contracts to {} chains".format(len(chains_needing_core)))
    
    # Execute core deployment
    execute_core_deployment(plan)
    
    return True

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_chains_needing_core(chains):
    """
    Filter chains that need core deployment
    
    Args:
        chains: List of chain configurations
        
    Returns:
        List of chains requiring core deployment
    """
    result = []
    for chain in chains:
        deploy_core = getattr(chain, "deploy_core", False)
        if as_bool(deploy_core, False):
            result.append(chain)
    return result

def execute_core_deployment(plan):
    """
    Execute the core deployment script
    
    Args:
        plan: Kurtosis plan object
    """
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = ["sh", "-lc", constants.DEPLOY_CORE_SCRIPT],
        ),
    )

# ============================================================================
# CORE CONFIGURATION GENERATION
# ============================================================================

def generate_core_config(chains):
    """
    Generate core deployment configuration
    
    Args:
        chains: List of chain configurations
        
    Returns:
        Core configuration as a struct
    """
    core_config = {}
    
    for chain in chains:
        deploy_core = getattr(chain, "deploy_core", False)
        if as_bool(deploy_core, False):
            chain_name = getattr(chain, "name", "")
            core_config[chain_name] = struct(
                chain_id = getattr(chain, "chain_id", None),
                rpc_url = getattr(chain, "rpc_url", ""),
                deploy = True
            )
    
    return core_config

# ============================================================================
# VALIDATION
# ============================================================================

def validate_core_deployment_requirements(chains, deployer_key):
    """
    Validate that core deployment requirements are met
    
    Args:
        chains: List of chain configurations
        deployer_key: Deployer private key
        
    Returns:
        True if valid, fails with error if not
    """
    chains_needing_core = get_chains_needing_core(chains)
    
    if len(chains_needing_core) > 0 and not deployer_key:
        fail("Deployer key is required for core deployment but not provided")
    
    for chain in chains_needing_core:
        if not chain.get("rpc_url"):
            fail("RPC URL is required for core deployment on chain: {}".format(
                chain.get("name", "unknown")
            ))
    
    return True