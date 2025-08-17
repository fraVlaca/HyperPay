# Relayer Service Module - Builds and manages the relayer service

load("../config/constants.star", "get_constants")
load("../utils/helpers.star", "log_info")

constants = get_constants()

# ============================================================================
# RELAYER SERVICE BUILDER
# ============================================================================

def build_relayer_service(plan, chains, relay_chains, relayer_key, allow_local_sync, agent_image, configs_dir):
    """
    Build and deploy the relayer service
    
    Args:
        plan: Kurtosis plan object
        chains: List of chain configurations
        relay_chains: Comma-separated list of chain names
        relayer_key: Relayer private key
        allow_local_sync: Whether to allow local checkpoint syncers
        agent_image: Docker image for the agent
        configs_dir: Configs directory artifact
    """
    log_info("Setting up relayer for chains: {}".format(relay_chains))
    
    # Build environment variables
    env_vars = build_relayer_env(relay_chains, relayer_key, allow_local_sync)
    
    # Build command
    command = build_relayer_command(chains, relay_chains, relayer_key, allow_local_sync)
    
    # Add the service to the plan
    plan.add_service(
        name = "relayer",
        config = ServiceConfig(
            image = agent_image,
            env_vars = env_vars,
            files = {
                constants.CONFIGS_DIR: configs_dir,
            },
            cmd = ["sh", "-lc", command],
        ),
    )

# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

def build_relayer_env(relay_chains, relayer_key, allow_local_sync):
    """
    Build environment variables for relayer service
    
    Args:
        relay_chains: Comma-separated list of chain names
        relayer_key: Relayer private key
        allow_local_sync: Whether to allow local checkpoint syncers
        
    Returns:
        Dictionary of environment variables
    """
    return {
        "RELAYER_KEY": relayer_key,
        "ALLOW_LOCAL": "true" if allow_local_sync else "false",
        "RELAY_CHAINS": relay_chains,
        "CONFIG_FILES": "/configs/agent-config.json",
        "RUST_LOG": "debug",
    }

# ============================================================================
# COMMAND BUILDING
# ============================================================================

def build_relayer_command(chains, relay_chains, relayer_key, allow_local_sync):
    """
    Build the relayer startup command
    
    Args:
        chains: List of chain configurations
        relay_chains: Comma-separated list of chain names
        relayer_key: Relayer private key
        allow_local_sync: Whether to allow local checkpoint syncers
        
    Returns:
        Relayer command string
    """
    # Create directories
    mkdir_cmd = "mkdir -p {} {}".format(
        constants.RELAYER_DB_DIR,
        constants.VALIDATOR_CHECKPOINTS_DIR
    )
    
    # Build base relayer command
    relayer_cmd = build_base_relayer_command(relay_chains, relayer_key)
    
    # Add chain RPC URLs
    relayer_cmd = add_chain_rpcs(relayer_cmd, chains)
    
    # Add local sync option if enabled
    if allow_local_sync:
        relayer_cmd += " --allowLocalCheckpointSyncers true"
    
    # Combine all commands
    return "{} && {}".format(mkdir_cmd, relayer_cmd)

def build_base_relayer_command(relay_chains, relayer_key):
    """
    Build the base relayer command
    
    Args:
        relay_chains: Comma-separated list of chain names
        relayer_key: Relayer private key
        
    Returns:
        Base relayer command string
    """
    return "/app/relayer --relayChains {} --defaultSigner.key {} --db {}".format(
        relay_chains,
        relayer_key,
        constants.RELAYER_DB_DIR
    )

def add_chain_rpcs(command, chains):
    """
    Add chain RPC URLs to the relayer command
    
    Args:
        command: Base command string
        chains: List of chain configurations
        
    Returns:
        Command with RPC URLs added
    """
    for chain in chains:
        command += " --chains.{}.connection.url {}".format(
            chain["name"],
            chain["rpc_url"]
        )
    
    return command

# ============================================================================
# HEALTH CHECKS
# ============================================================================

def get_relayer_health_check():
    """
    Get health check configuration for the relayer
    
    Returns:
        Health check configuration
    """
    return struct(
        interval = "30s",
        timeout = "10s",
        retries = 3,
        command = ["sh", "-c", "ps aux | grep -v grep | grep relayer"],
    )