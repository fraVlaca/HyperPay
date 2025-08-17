# Agent Infrastructure Module - Manages agent configuration generator service

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
log_info = helpers_module.log_info

constants = get_constants()

# ============================================================================
# AGENT CONFIG GENERATOR SERVICE
# ============================================================================

def build_agent_config_service(plan, chains, configs_dir):
    """
    Build and deploy the agent configuration generator service
    
    Args:
        plan: Kurtosis plan object
        chains: List of chain configurations
        configs_dir: Configs directory artifact
    """
    # log_info("Setting up agent configuration generator")
    
    # Generate YAML content for agent config
    yaml_content = generate_chains_yaml(chains)
    
    # Create template files
    files_artifact = create_config_templates(plan, yaml_content)
    
    # Build agent config image
    agent_cfg_image = build_agent_config_image()
    
    # Add the service to the plan
    plan.add_service(
        name = "agent-config-gen",
        config = ServiceConfig(
            image = agent_cfg_image,
            env_vars = {
                "ENABLE_PUBLIC_FALLBACK": "false",
                "DEBUG": "1",  # Enable debug logging
            },
            files = {
                "/seed": files_artifact,
                constants.CONFIGS_DIR: configs_dir,
            },
            cmd = ["/seed/args.yaml", "/configs/agent-config.json"],
        ),
    )

# ============================================================================
# CONFIGURATION GENERATION
# ============================================================================

def generate_chains_yaml(chains):
    """
    Generate YAML content for chains configuration
    
    Args:
        chains: List of chain configurations
        
    Returns:
        YAML content as string
    """
    yaml_content = "chains:\n"
    
    for chain in chains:
        yaml_content += "  - name: {}\n".format(getattr(chain, "name", ""))
        yaml_content += "    rpc_url: {}\n".format(getattr(chain, "rpc_url", ""))
        
        # Add existing addresses if available
        existing = getattr(chain, "existing_addresses", {})
        if existing:
            yaml_content += "    existing_addresses:\n"
            for key, value in existing.items():
                yaml_content += "      {}: {}\n".format(key, value)
        else:
            yaml_content += "    existing_addresses: {}\n"
    
    return yaml_content

def create_config_templates(plan, yaml_content):
    """
    Create configuration template files
    
    Args:
        plan: Kurtosis plan object
        yaml_content: YAML content for chains configuration
        
    Returns:
        Files artifact with templates
    """
    return plan.render_templates(
        config = {
            "args.yaml": struct(
                template = yaml_content,
                data = struct()
            ),
            "agent-config.json": struct(
                template = "{}",
                data = struct()
            ),
        },
        name = "agent-config-seed",
        description = "Seed files for agent configuration generator",
    )

# ============================================================================
# IMAGE BUILDING
# ============================================================================

def build_agent_config_image():
    """
    Build the agent config generator Docker image specification
    
    Returns:
        ImageBuildSpec for agent config generator
    """
    return ImageBuildSpec(
        image_name = constants.AGENT_CONFIG_IMAGE_NAME,
        build_context_dir = "../../src/deployments/config-generator",
    )

# ============================================================================
# AGENT IMAGE MANAGEMENT
# ============================================================================

def get_agent_image(agent_tag):
    """
    Get the full agent Docker image name
    
    Args:
        agent_tag: Agent image tag
        
    Returns:
        Full agent image name with tag
    """
    return "{}:{}".format(constants.AGENT_IMAGE_BASE, agent_tag)