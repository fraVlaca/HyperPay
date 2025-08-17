# Hyperlane Kurtosis Package - Main Orchestrator
# This is the entry point that coordinates all modules for deploying Hyperlane infrastructure

# ============================================================================
# MODULE IMPORTS
# ============================================================================

# Configuration modules
constants_module = import_module("./modules/config/constants.star")
get_constants = constants_module.get_constants

parser_module = import_module("./modules/config/parser.star")
parse_configuration = parser_module.parse_configuration
parse_agent_config = parser_module.parse_agent_config
parse_global_config = parser_module.parse_global_config
parse_test_config = parser_module.parse_test_config

validator_module = import_module("./modules/config/validator.star")
validate_configuration = validator_module.validate_configuration

# Contract deployment modules
core_module = import_module("./modules/contracts/core.star")
deploy_core_contracts = core_module.deploy_core_contracts

warp_module = import_module("./modules/contracts/warp.star")
deploy_warp_routes = warp_module.deploy_warp_routes

# Infrastructure modules
cli_module = import_module("./modules/infrastructure/cli.star")
build_cli_service = cli_module.build_cli_service

agents_module = import_module("./modules/infrastructure/agents.star")
build_agent_config_service = agents_module.build_agent_config_service
get_agent_image = agents_module.get_agent_image

# Service modules
validator_service = import_module("./modules/services/validator.star")
deploy_validators = validator_service.deploy_validators

relayer_service = import_module("./modules/services/relayer.star")
build_relayer_service = relayer_service.build_relayer_service

# Testing modules
test_module = import_module("./modules/testing/send_test.star")
run_send_test = test_module.run_send_test

# Utility modules
helpers_module = import_module("./modules/utils/helpers.star")
create_persistent_directory = helpers_module.create_persistent_directory
log_info = helpers_module.log_info

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
    plan.print("Starting Hyperlane deployment")
    
    # ========================================
    # PHASE 1: Configuration Parsing
    # ========================================
    
    plan.print("Phase 1: Parsing configuration")
    
    # Parse main configuration
    config = parse_configuration(args)
    
    # Parse sub-configurations
    agent_config = parse_agent_config(config.agents)
    global_settings = parse_global_config(config.global_config)
    test_config = parse_test_config(config.send_test)
    
    # ========================================
    # PHASE 2: Configuration Validation
    # ========================================
    
    plan.print("Phase 2: Validating configuration")
    
    # Validate entire configuration
    validate_configuration(config)
    
    # ========================================
    # PHASE 3: Infrastructure Setup
    # ========================================
    
    plan.print("Phase 3: Setting up infrastructure")
    
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
    
    plan.print("Phase 4: Deploying contracts")
    
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
    
    plan.print("Phase 5: Generating agent configuration")
    
    # Build agent configuration generator
    build_agent_config_service(plan, config.chains, configs_dir)
    
    # ========================================
    # PHASE 6: Agent Services Deployment
    # ========================================
    
    plan.print("Phase 6: Deploying agent services")
    
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
    
    plan.print("Phase 7: Running tests")
    
    # Run send test if configured
    run_send_test(plan, test_config, config.warp_routes)
    
    # ========================================
    # COMPLETION
    # ========================================
    
    plan.print("Hyperlane deployment completed successfully")
    
    # Return deployment summary
    return struct(
        chains = len(config.chains),
        validators = len(agent_config.validators),
        warp_routes = len(config.warp_routes),
        test_enabled = test_config.enabled,
    )