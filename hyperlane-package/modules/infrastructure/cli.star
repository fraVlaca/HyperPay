# CLI Infrastructure Module - Manages Hyperlane CLI service setup

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
join_strings = helpers_module.join_strings
format_key_value_pairs = helpers_module.format_key_value_pairs
create_persistent_directory = helpers_module.create_persistent_directory

constants = get_constants()

# ============================================================================
# CLI SERVICE BUILDER
# ============================================================================

def build_cli_service(plan, chains, global_settings, deployer_key):
    """
    Build and deploy the Hyperlane CLI service
    
    Args:
        plan: Kurtosis plan object
        chains: List of chain configurations
        global_settings: Global configuration settings
        deployer_key: Deployer private key
        
    Returns:
        Comma-separated list of chain names
    """
    # Extract chain information
    chain_info = extract_chain_info(chains)
    
    # Build CLI environment variables
    cli_env = build_cli_environment(
        chain_info,
        global_settings,
        deployer_key
    )
    
    # Build CLI Docker image
    cli_image = build_cli_image()
    
    # Create persistent configs directory
    configs_dir = create_persistent_directory("configs")
    
    # Add the CLI service to the plan
    plan.add_service(
        name = "hyperlane-cli",
        config = ServiceConfig(
            image = cli_image,
            env_vars = cli_env,
            files = {
                constants.CONFIGS_DIR: configs_dir,
            },
        ),
    )
    
    return chain_info.relay_chains

# ============================================================================
# CHAIN INFORMATION EXTRACTION
# ============================================================================

def extract_chain_info(chains):
    """
    Extract and format chain information for CLI
    
    Args:
        chains: List of chain configurations
        
    Returns:
        Structured chain information
    """
    chain_names = []
    rpc_pairs = {}
    id_pairs = {}
    
    for chain in chains:
        name = getattr(chain, "name", "")
        chain_names.append(name)
        
        # Add RPC URL
        rpc_url = getattr(chain, "rpc_url", "")
        rpc_pairs[name] = rpc_url
        
        # Add chain ID if available
        chain_id = getattr(chain, "chain_id", None)
        if chain_id != None:
            id_pairs[name] = str(chain_id)
    
    return struct(
        chain_names = chain_names,
        relay_chains = join_strings(chain_names, ","),
        chain_rpcs = format_key_value_pairs(rpc_pairs, "=", ","),
        chain_ids = format_key_value_pairs(id_pairs, "=", ",")
    )

# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

def build_cli_environment(chain_info, global_settings, deployer_key):
    """
    Build environment variables for CLI service
    
    Args:
        chain_info: Extracted chain information
        global_settings: Global configuration settings
        deployer_key: Deployer private key
        
    Returns:
        Dictionary of environment variables
    """
    return {
        "CLI_VERSION": str(global_settings.cli_version),
        "REGISTRY_MODE": str(global_settings.registry_mode),
        "CHAIN_NAMES": chain_info.relay_chains,
        "CHAIN_RPCS": chain_info.chain_rpcs,
        "CHAIN_IDS": chain_info.chain_ids,
        "HYP_KEY": str(deployer_key),
        # Additional environment variables for scripts
        "CONFIGS_DIR": constants.CONFIGS_DIR,
        "REGISTRY_DIR": constants.REGISTRY_DIR,
        "MAX_RETRY_ATTEMPTS": str(constants.MAX_RETRY_ATTEMPTS),
        "RETRY_DELAY": str(constants.RETRY_DELAY),
    }

# ============================================================================
# IMAGE BUILDING
# ============================================================================

def build_cli_image():
    """
    Build the CLI Docker image specification
    
    Returns:
        ImageBuildSpec for CLI
    """
    return ImageBuildSpec(
        image_name = constants.CLI_IMAGE_NAME,
        build_context_dir = "../../src/deployments/hyperlane-deployer",
    )

# ============================================================================
# CLI OPERATIONS
# ============================================================================

def execute_cli_command(plan, command, description=""):
    """
    Execute a command in the CLI service
    
    Args:
        plan: Kurtosis plan object
        command: Command to execute
        description: Optional description of the command
    """
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = ["sh", "-lc", command],
        ),
    )