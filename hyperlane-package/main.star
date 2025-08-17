# Hyperlane Kurtosis Package - Main Orchestration
# This package deploys Hyperlane infrastructure including validators, relayers, and warp routes

# ============================================================================
# CONSTANTS
# ============================================================================

MIN_CHAINS_REQUIRED = 2
DEFAULT_AGENT_TAG = "agents-v1.4.0"
DEFAULT_CLI_VERSION = "latest"
DEFAULT_REGISTRY_MODE = "public"

# Directory paths
CONFIGS_DIR = "/configs"
REGISTRY_DIR = "/configs/registry"
VALIDATOR_CHECKPOINTS_DIR = "/data/validator-checkpoints"
RELAYER_DB_DIR = "/data/relayer-db"

# ============================================================================
# CONFIGURATION PARSING
# ============================================================================

def parse_configuration(args):
    """Parse and validate configuration from arguments"""
    config = struct(
        chains = _get(args, "chains", []),
        agents = _get(args, "agents", {}),
        warp_routes = _get(args, "warp_routes", []),
        send_test = _get(args, "send_test", {}),
        global_config = _get(args, "global", {})
    )
    
    # Validate minimum chains requirement
    if len(config.chains) < MIN_CHAINS_REQUIRED:
        fail("At least {} chains are required, got {}".format(MIN_CHAINS_REQUIRED, len(config.chains)))
    
    return config

def extract_agent_config(agents):
    """Extract and validate agent configuration"""
    relayer_cfg = _get(agents, "relayer", {})
    deployer_cfg = _get(agents, "deployer", {})
    
    return struct(
        relayer_key = _get(relayer_cfg, "key", ""),
        allow_local_sync = _as_bool(_get(relayer_cfg, "allow_local_checkpoint_syncers", True), True),
        deployer_key = _get(deployer_cfg, "key", ""),
        validators = _get(agents, "validators", [])
    )

def extract_global_config(global_config):
    """Extract global configuration settings"""
    return struct(
        agent_tag = _get(global_config, "agent_image_tag", DEFAULT_AGENT_TAG),
        cli_version = _get(global_config, "cli_version", DEFAULT_CLI_VERSION),
        registry_mode = _get(global_config, "registry_mode", DEFAULT_REGISTRY_MODE)
    )

# ============================================================================
# SERVICE BUILDERS
# ============================================================================

def build_cli_service(plan, chains, global_settings, deployer_key):
    """Build and add the Hyperlane CLI service"""
    chain_names = [ch["name"] for ch in chains]
    relay_chains = _join(chain_names, ",")
    
    # Build RPC and chain ID pairs
    rpc_pairs = []
    id_pairs = []
    for ch in chains:
        rpc_pairs.append("{}={}".format(ch["name"], ch["rpc_url"]))
        if "chain_id" in ch:
            id_pairs.append("{}={}".format(ch["name"], str(ch["chain_id"])))
    
    cli_env = {
        "CLI_VERSION": str(global_settings.cli_version),
        "REGISTRY_MODE": str(global_settings.registry_mode),
        "CHAIN_NAMES": relay_chains,
        "CHAIN_RPCS": _join(rpc_pairs, ","),
        "CHAIN_IDS": _join(id_pairs, ","),
        "HYP_KEY": str(deployer_key),
    }
    
    cli_img = ImageBuildSpec(
        image_name = "hyperlane-cli-img",
        build_context_dir = "./src/cli",
    )
    
    plan.add_service(
        name = "hyperlane-cli",
        config = ServiceConfig(
            image = cli_img,
            env_vars = cli_env,
            files = {
                CONFIGS_DIR: Directory(persistent_key="configs"),
            },
        ),
    )
    
    return relay_chains

def build_validator_service(plan, validator, chains, agent_image, configs_dir):
    """Build and add a validator service"""
    vchain = validator["chain"]
    vkey = validator["signing_key"]
    cs = validator["checkpoint_syncer"]
    cstype = cs["type"]
    csp = _get(cs, "params", {})
    
    # Find RPC URL for the validator's chain
    rpc_url = ""
    for ch in chains:
        if ch["name"] == vchain:
            rpc_url = ch["rpc_url"]
            break
    
    if not rpc_url:
        fail("No RPC URL found for validator chain: {}".format(vchain))
    
    # Build environment variables
    env = build_validator_env(vkey, vchain, rpc_url, cstype, csp)
    
    # Build command
    cmd = build_validator_command()
    
    plan.add_service(
        name = "validator-{}".format(vchain),
        config = ServiceConfig(
            image = agent_image,
            env_vars = dict(env, CONFIG_FILES="/configs/agent-config.json", RUST_LOG="debug"),
            files = {
                CONFIGS_DIR: configs_dir,
            },
            cmd = ["sh", "-lc", cmd],
        ),
    )

def build_validator_env(vkey, vchain, rpc_url, cstype, params):
    """Build environment variables for validator"""
    env = {
        "VALIDATOR_KEY": vkey,
        "ORIGIN_CHAIN": vchain,
        "RPC_URL": rpc_url,
    }
    
    if cstype == "local":
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        env["CHECKPOINT_SYNCER_PATH"] = VALIDATOR_CHECKPOINTS_DIR
    elif cstype == "s3":
        env["CHECKPOINT_SYNCER_TYPE"] = "s3"
        if "bucket" in params:
            env["S3_BUCKET"] = str(params["bucket"])
        if "region" in params:
            env["S3_REGION"] = str(params["region"])
        if "prefix" in params:
            env["S3_PREFIX"] = str(params["prefix"])
        if "basePath" in params:
            env["CHECKPOINT_BASE_PATH"] = str(params["basePath"])
    elif cstype == "gcs":
        env["CHECKPOINT_SYNCER_TYPE"] = "gcs"
        if "bucket" in params:
            env["S3_BUCKET"] = str(params["bucket"])
        if "prefix" in params:
            env["S3_PREFIX"] = str(params["prefix"])
        if "basePath" in params:
            env["CHECKPOINT_BASE_PATH"] = str(params["basePath"])
    else:
        # Default to local
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        env["CHECKPOINT_SYNCER_PATH"] = "/validator-checkpoints"
    
    return env

def build_validator_command():
    """Build validator startup command"""
    return (
        "mkdir -p {} && ".format(VALIDATOR_CHECKPOINTS_DIR) +
        "/app/validator --originChainName $ORIGIN_CHAIN --validator.key $VALIDATOR_KEY" +
        " --chains.$ORIGIN_CHAIN.connection.url $RPC_URL" +
        " --checkpointSyncer.type $CHECKPOINT_SYNCER_TYPE" +
        " --checkpointSyncer.path ${CHECKPOINT_SYNCER_PATH:-" + VALIDATOR_CHECKPOINTS_DIR + "}" +
        " --checkpointSyncer.bucket ${S3_BUCKET:-}" +
        " --checkpointSyncer.region ${S3_REGION:-}" +
        " --checkpointSyncer.prefix ${S3_PREFIX:-}" +
        " --checkpointSyncer.basePath ${CHECKPOINT_BASE_PATH:-}"
    )

def build_relayer_service(plan, chains, relay_chains, relayer_key, allow_local_sync, agent_image, configs_dir):
    """Build and add the relayer service"""
    relayer_env = {
        "RELAYER_KEY": relayer_key,
        "ALLOW_LOCAL": "true" if allow_local_sync else "false",
        "RELAY_CHAINS": relay_chains,
        "CONFIG_FILES": "/configs/agent-config.json",
    }
    
    relayer_cmd = build_relayer_command(chains, relay_chains, relayer_key, allow_local_sync)
    
    plan.add_service(
        name = "relayer",
        config = ServiceConfig(
            image = agent_image,
            env_vars = dict(relayer_env, RUST_LOG="debug"),
            files = {
                CONFIGS_DIR: configs_dir,
            },
            cmd = ["sh", "-lc", "mkdir -p {} {} && {}".format(RELAYER_DB_DIR, VALIDATOR_CHECKPOINTS_DIR, relayer_cmd)],
        ),
    )

def build_relayer_command(chains, relay_chains, relayer_key, allow_local_sync):
    """Build relayer startup command"""
    cmd = "/app/relayer --relayChains {} --defaultSigner.key {} --db {}".format(
        relay_chains, relayer_key, RELAYER_DB_DIR
    )
    
    # Add chain RPC URLs
    for ch in chains:
        cmd += " --chains.{}.connection.url {}".format(ch["name"], ch["rpc_url"])
    
    if allow_local_sync:
        cmd += " --allowLocalCheckpointSyncers true"
    
    return cmd

def build_agent_config_service(plan, chains, configs_dir):
    """Build and add the agent config generator service"""
    # Generate YAML content for agent config
    yaml_content = generate_chains_yaml(chains)
    
    files_art = plan.render_templates(
        config = {
            "args.yaml": struct(template=yaml_content, data=struct()),
            "agent-config.json": struct(template="{}", data=struct()),
        },
        name = "agent-config-seed",
        description = "seed args.yaml and agent-config.json",
    )
    
    agent_cfg_img = ImageBuildSpec(
        image_name = "agent-config-gen-img",
        build_context_dir = "./src/tools/agent-config-gen",
    )
    
    plan.add_service(
        name = "agent-config-gen",
        config = ServiceConfig(
            image = agent_cfg_img,
            env_vars = {"ENABLE_PUBLIC_FALLBACK": "false"},
            files = {
                "/seed": files_art,
                CONFIGS_DIR: configs_dir,
            },
            cmd = ["/seed/args.yaml", "/configs/agent-config.json"],
        ),
    )

def generate_chains_yaml(chains):
    """Generate YAML content for chains configuration"""
    yaml_content = "chains:\n"
    for ch in chains:
        yaml_content += "  - name: {}\n".format(ch["name"])
        yaml_content += "    rpc_url: {}\n".format(ch["rpc_url"])
        yaml_content += "    existing_addresses: {}\n"
    return yaml_content

# ============================================================================
# CORE OPERATIONS
# ============================================================================

def deploy_core_if_needed(plan, chains):
    """Deploy core contracts if any chain requires it"""
    need_core = any(_as_bool(_get(ch, "deploy_core", False), False) for ch in chains)
    
    if need_core:
        plan.exec(
            service_name = "hyperlane-cli",
            recipe = ExecRecipe(
                command = ["sh", "-lc", "/usr/local/bin/deploy_core.sh"],
            ),
        )

def deploy_warp_routes(plan, warp_routes):
    """Deploy warp routes and seed initial liquidity"""
    for wr in warp_routes:
        deploy_single_warp_route(plan, wr)
        seed_initial_liquidity(plan, wr)

def deploy_single_warp_route(plan, warp_route):
    """Deploy a single warp route"""
    sym = _get(warp_route, "symbol", "route")
    mode = _get(warp_route, "mode", "lock_release")
    
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = ["sh", "-lc", "ROUTE_SYMBOL={} MODE={} /usr/local/bin/warp_routes.sh".format(sym, mode)],
        ),
    )

def seed_initial_liquidity(plan, warp_route):
    """Seed initial liquidity for a warp route"""
    init_liq = _get(warp_route, "initialLiquidity", [])
    if not init_liq:
        return
    
    pairs = []
    for il in init_liq:
        c = _get(il, "chain", "")
        a = _get(il, "amount", "")
        if c and a:
            pairs.append("{}={}".format(c, str(a)))
    
    liq_str = _join(pairs, ",")
    if liq_str:
        plan.exec(
            service_name = "hyperlane-cli",
            recipe = ExecRecipe(
                command = ["sh", "-lc", 'REGISTRY_DIR={} INITIAL_LIQUIDITY="{}" /usr/local/bin/seed_liquidity.sh'.format(
                    REGISTRY_DIR, liq_str
                )],
            ),
        )

def run_send_test(plan, send_test, warp_routes):
    """Run a test transaction if enabled"""
    if not _as_bool(_get(send_test, "enabled", False), False):
        return
    
    origin = _get(send_test, "origin", "ethereum")
    dest = _get(send_test, "destination", "arbitrum")
    amt = _get(send_test, "amount", "1")
    
    test_symbol = "TEST"
    if warp_routes:
        test_symbol = _get(warp_routes[0], "symbol", test_symbol)
    
    plan.exec(
        service_name = "hyperlane-cli",
        recipe = ExecRecipe(
            command = ["sh", "-lc", "REGISTRY_DIR={} SYMBOL={} ORIGIN={} DESTINATION={} AMOUNT={} /usr/local/bin/send_warp.sh".format(
                REGISTRY_DIR, test_symbol, origin, dest, str(amt)
            )],
        ),
    )

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def _get(arg_map, key, default=""):
    """Safely get a value from a map with a default"""
    return arg_map[key] if key in arg_map else default

def _as_bool(v, default=False):
    """Convert a value to boolean"""
    if type(v) == "bool":
        return v
    if type(v) == "string":
        lv = v.lower()
        if lv in ["true", "1", "yes"]:
            return True
        if lv in ["false", "0", "no"]:
            return False
    return default

def _join(arr, sep):
    """Join array elements with a separator"""
    out = ""
    for i, x in enumerate(arr):
        if i > 0:
            out += sep
        out += x
    return out

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def run(plan, args):
    """Main entry point for the Hyperlane package"""
    
    # Parse configuration
    config = parse_configuration(args)
    agent_config = extract_agent_config(config.agents)
    global_settings = extract_global_config(config.global_config)
    
    # Setup persistent directories
    configs_dir = Directory(persistent_key="configs")
    
    # Build CLI service
    relay_chains = build_cli_service(
        plan,
        config.chains,
        global_settings,
        agent_config.deployer_key
    )
    
    # Deploy core contracts if needed
    deploy_core_if_needed(plan, config.chains)
    
    # Deploy warp routes
    deploy_warp_routes(plan, config.warp_routes)
    
    # Build agent config generator
    build_agent_config_service(plan, config.chains, configs_dir)
    
    # Build agent image reference
    agent_image = "gcr.io/abacus-labs-dev/hyperlane-agent:{}".format(global_settings.agent_tag)
    
    # Deploy validators
    for validator in agent_config.validators:
        build_validator_service(
            plan,
            validator,
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
    
    # Run send test if configured
    run_send_test(plan, config.send_test, config.warp_routes)
    
    return None