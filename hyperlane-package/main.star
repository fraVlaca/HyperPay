# Hyperlane Kurtosis Package - Main Orchestrator
# This is the entry point that coordinates all modules for deploying Hyperlane infrastructure

# ============================================================================
# MODULE IMPORTS
# ============================================================================

# Configuration modules
load("./modules/config/constants.star", "get_constants")
load("./modules/config/parser.star", "parse_configuration", "parse_agent_config", "parse_global_config", "parse_test_config")
load("./modules/config/validator.star", "validate_configuration")

# Contract deployment modules
load("./modules/contracts/core.star", "deploy_core_contracts")
load("./modules/contracts/warp.star", "deploy_warp_routes")

# Infrastructure modules
load("./modules/infrastructure/cli.star", "build_cli_service")
load("./modules/infrastructure/agents.star", "build_agent_config_service", "get_agent_image")

# Service modules
load("./modules/services/validator.star", "deploy_validators")
load("./modules/services/relayer.star", "build_relayer_service")

# Testing modules
load("./modules/testing/send_test.star", "run_send_test")

# Utility modules
load("./modules/utils/helpers.star", "create_persistent_directory", "log_info")

# Get constants
constants = get_constants()

# ============================================================================
# MAIN ORCHESTRATION
# ============================================================================

def run(plan, args):
    """
    Main entry point for the Hyperlane package
    
    Args:
        plan: Kurtosis plan object
        args: User-provided arguments
        
    Returns:
        None
    """
    log_info("Starting Hyperlane deployment")
    
    # ========================================
    # PHASE 1: Configuration Parsing
    # ========================================
    
    log_info("Phase 1: Parsing configuration")
    
    # Parse main configuration
    config = parse_configuration(args)
    
    # Parse sub-configurations
    agent_config = parse_agent_config(config.agents)
    global_settings = parse_global_config(config.global_config)
    test_config = parse_test_config(config.send_test)
    
    # ========================================
    # PHASE 2: Configuration Validation
    # ========================================
    
    log_info("Phase 2: Validating configuration")
    
    # Validate entire configuration
    validate_configuration(config)
    
    # ========================================
    # PHASE 3: Infrastructure Setup
    # ========================================
    
    log_info("Phase 3: Setting up infrastructure")
    
    # Create persistent directories
    configs_dir = create_persistent_directory("configs")
    
    # Build and deploy CLI service
    relay_chains = build_cli_service(
        plan,
        config.chains,
        global_settings,
        agent_config.deployer_key
    )
    
    # ========================================
    # PHASE 4: Contract Deployment
    # ========================================
    
    log_info("Phase 4: Deploying contracts")
    
    # Deploy core contracts if needed
    deploy_core_contracts(
        plan,
        config.chains,
        agent_config.deployer_key
    )
    
    # Deploy warp routes
    deploy_warp_routes(plan, config.warp_routes)
    
    # ========================================
    # PHASE 5: Agent Configuration
    # ========================================
    
    log_info("Phase 5: Generating agent configuration")
    
    # Build agent configuration generator
    build_agent_config_service(plan, config.chains, configs_dir)
    
    # ========================================
    # PHASE 6: Agent Services Deployment
    # ========================================
    
    log_info("Phase 6: Deploying agent services")
    
    # Get agent Docker image
    agent_image = get_agent_image(global_settings.agent_tag)
    
    # Deploy validators
    deploy_validators(
        plan,
        agent_config.validators,
        config.chains,
        agent_image,
        configs_dir
    )
    
    # Deploy relayer
    build_relayer_service(
        plan,
        config.chains,
        relay_chains,
        agent_config.relayer_key,
        agent_config.allow_local_sync,
        agent_image,
        configs_dir
    )
    
    # ========================================
    # PHASE 7: Testing
    # ========================================
    
    log_info("Phase 7: Running tests")
    
    # Run send test if configured
    run_send_test(plan, test_config, config.warp_routes)
    
    # ========================================
    # COMPLETION
    # ========================================
    
    log_info("Hyperlane deployment completed successfully")
    
    # Return deployment summary
    return struct(
        chains = len(config.chains),
        validators = len(agent_config.validators),
        warp_routes = len(config.warp_routes),
        test_enabled = test_config.enabled,
    )