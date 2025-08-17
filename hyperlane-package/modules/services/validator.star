# Validator Service Module - Builds and manages validator services

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
log_info = helpers_module.log_info
find_item = helpers_module.find_item

constants = get_constants()

# ============================================================================
# VALIDATOR SERVICE BUILDER
# ============================================================================

def build_validator_service(plan, validator, chains, agent_image, configs_dir):
    """
    Build and deploy a validator service
    
    Args:
        plan: Kurtosis plan object
        validator: Validator configuration
        chains: List of chain configurations
        agent_image: Docker image for the agent
        configs_dir: Configs directory artifact
    """
    chain_name = getattr(validator, "chain", "")
    
    # Find the chain configuration
    chain = find_item(chains, "name", chain_name)
    if not chain:
        fail("No configuration found for validator chain: {}".format(chain_name))
    
    # log_info("Setting up validator for chain: {}".format(chain_name))
    
    # Build environment variables
    env_vars = build_validator_env(validator, chain)
    
    # Build command
    command = build_validator_command()
    
    # Add the service to the plan
    plan.add_service(
        name = "validator-{}".format(chain_name),
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

def build_validator_env(validator, chain):
    """
    Build environment variables for validator service
    
    Args:
        validator: Validator configuration
        chain: Chain configuration
        
    Returns:
        Dictionary of environment variables
    """
    base_env = {
        "VALIDATOR_KEY": getattr(validator, "signing_key", ""),
        "ORIGIN_CHAIN": getattr(chain, "name", ""),
        "RPC_URL": getattr(chain, "rpc_url", ""),
        "CONFIG_FILES": "/configs/agent-config.json",
        "RUST_LOG": "debug",
    }
    
    # Add checkpoint syncer configuration
    syncer_env = build_checkpoint_syncer_env(getattr(validator, "checkpoint_syncer", struct()))
    
    # Merge environments
    for key, value in syncer_env.items():
        base_env[key] = value
    
    return base_env

def build_checkpoint_syncer_env(checkpoint_syncer):
    """
    Build environment variables for checkpoint syncer
    
    Args:
        checkpoint_syncer: Checkpoint syncer configuration
        
    Returns:
        Dictionary of syncer-specific environment variables
    """
    syncer_type = getattr(checkpoint_syncer, "type", "")
    params = getattr(checkpoint_syncer, "params", struct())
    env = {}
    
    if syncer_type == constants.CHECKPOINT_SYNCER_LOCAL:
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        env["CHECKPOINT_SYNCER_PATH"] = safe_get(
            params, 
            "path", 
            constants.VALIDATOR_CHECKPOINTS_DIR
        )
    
    elif syncer_type == constants.CHECKPOINT_SYNCER_S3:
        env["CHECKPOINT_SYNCER_TYPE"] = "s3"
        bucket = safe_get(params, "bucket", "")
        if bucket:
            env["S3_BUCKET"] = str(bucket)
        region = safe_get(params, "region", "")
        if region:
            env["S3_REGION"] = str(region)
        prefix = safe_get(params, "prefix", "")
        if prefix:
            env["S3_PREFIX"] = str(prefix)
        if "basePath" in params:
            env["CHECKPOINT_BASE_PATH"] = str(params["basePath"])
    
    elif syncer_type == constants.CHECKPOINT_SYNCER_GCS:
        env["CHECKPOINT_SYNCER_TYPE"] = "gcs"
        if "bucket" in params:
            env["S3_BUCKET"] = str(params["bucket"])  # GCS uses same env var
        if "prefix" in params:
            env["S3_PREFIX"] = str(params["prefix"])
        if "basePath" in params:
            env["CHECKPOINT_BASE_PATH"] = str(params["basePath"])
    
    else:
        # Default to local
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        env["CHECKPOINT_SYNCER_PATH"] = "/validator-checkpoints"
    
    return env

# ============================================================================
# COMMAND BUILDING
# ============================================================================

def build_validator_command():
    """
    Build the validator startup command
    
    Returns:
        Validator command string
    """
    return (
        "mkdir -p {} && ".format(constants.VALIDATOR_CHECKPOINTS_DIR) +
        "/app/validator " +
        "--originChainName $ORIGIN_CHAIN " +
        "--validator.key $VALIDATOR_KEY " +
        "--chains.$ORIGIN_CHAIN.connection.url $RPC_URL " +
        "--checkpointSyncer.type $CHECKPOINT_SYNCER_TYPE " +
        "--checkpointSyncer.path ${CHECKPOINT_SYNCER_PATH:-" + constants.VALIDATOR_CHECKPOINTS_DIR + "} " +
        "--checkpointSyncer.bucket ${S3_BUCKET:-} " +
        "--checkpointSyncer.region ${S3_REGION:-} " +
        "--checkpointSyncer.prefix ${S3_PREFIX:-} " +
        "--checkpointSyncer.basePath ${CHECKPOINT_BASE_PATH:-}"
    )

# ============================================================================
# BATCH DEPLOYMENT
# ============================================================================

def deploy_validators(plan, validators, chains, agent_image, configs_dir):
    """
    Deploy all configured validators
    
    Args:
        plan: Kurtosis plan object
        validators: List of validator configurations
        chains: List of chain configurations
        agent_image: Docker image for agents
        configs_dir: Configs directory artifact
    """
    if len(validators) == 0:
        # log_info("No validators to deploy")
        return
    
    # log_info("Deploying {} validators".format(len(validators)))
    
    for validator in validators:
        build_validator_service(
            plan,
            validator,
            chains,
            agent_image,
            configs_dir
        )