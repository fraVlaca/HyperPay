"""
Solver Service Module
Manages solver configuration generation and service deployment.
"""

# Default configuration constants
DEFAULT_SOLVER_IMAGE = "ghcr.io/openintentsframework/oif-solvers:latest"
DEFAULT_BUILD_IMAGE = "rust:1.79-bullseye"
DEFAULT_SOLVER_PORT = 3000
DEFAULT_GIT_REF = "main"
SOLVER_REPO_URL = "https://github.com/LZeroAnalytics/oif-solvers.git"

# Configuration section headers for better readability
SECTION_HEADERS = {
    "NETWORKS": "Central configuration for all chains",
    "STORAGE": "Data persistence settings",
    "ACCOUNT": "Wallet and account management",
    "DELIVERY": "Transaction delivery settings",
    "DISCOVERY": "Intent discovery configuration",
    "ORDER": "Order processing settings",
    "SETTLEMENT": "Cross-chain settlement configuration",
    "API": "API server configuration",
}

def launch(plan, args, addresses, settlement):
    """
    Launch the solver service with generated configuration.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments
        addresses: Contract addresses by chain
        settlement: Settlement configuration overrides
    
    Returns:
        Dictionary with service name and port information
    """
    # Generate configuration
    config_content = render_config(addresses, args, settlement)
    
    # Create config artifact
    config_artifact = plan.render_templates(
        config={
            "config.toml": struct(
                template=config_content,
                data={}
            )
        },
        name="solver-config"
    )
    
    # Prepare service configuration
    mode = args.get("mode", {}).get("solver", {})
    service_config = _prepare_service_config(plan, args, mode, config_artifact)
    
    # Launch service
    api_port = int(args.get("solver", {}).get("api", {}).get("port", DEFAULT_SOLVER_PORT))
    service = plan.add_service(
        name="solver-service",
        config=service_config
    )
    
    return {
        "service": "solver-service",
        "port": api_port
    }

def render_config(addresses, args, settlement):
    """
    Render the complete solver configuration file.
    
    Args:
        addresses: Contract addresses by chain
        args: Configuration arguments
        settlement: Settlement configuration overrides
    
    Returns:
        String containing the complete TOML configuration
    """
    config_sections = []
    solver_args = args.get("solver", {})
    
    # Build each configuration section
    config_sections.append(_build_solver_section())
    config_sections.append(_build_networks_section(addresses))
    config_sections.append(_build_storage_section(solver_args))
    config_sections.append(_build_account_section(args, solver_args))
    config_sections.append(_build_delivery_section(solver_args, addresses))
    config_sections.append(_build_discovery_section(addresses))
    config_sections.append(_build_order_section())
    config_sections.append(_build_settlement_section(solver_args, addresses, settlement))
    config_sections.append(_build_api_section())
    
    return "\n".join(config_sections)

def _build_solver_section():
    """Build the [solver] configuration section."""
    lines = [
        "[solver]",
        'id = "oif-solver-kurtosis"',
        "monitoring_timeout_minutes = 5",
    ]
    return "\n".join(lines)

def _build_networks_section(addresses):
    """Build the [networks] configuration section."""
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["NETWORKS"],
        "# " + "=" * 76,
    ]
    
    for chain_id_str, data in addresses.items():
        lines.append("[networks.%s]" % chain_id_str)
        lines.append('rpc_url = "%s"' % data.get("rpc_url"))
        lines.append('input_settler_address = "%s"' % data.get("input_settler_address"))
        lines.append('output_settler_address = "%s"' % data.get("output_settler_address"))
        
        # Add token configurations
        tokens = data.get("tokens", [])
        for token in tokens:
            lines.append("[[networks.%s.tokens]]" % chain_id_str)
            lines.append('address = "%s"' % token.get("address"))
            lines.append('symbol = "%s"' % token.get("symbol"))
            lines.append("decimals = %d" % int(token.get("decimals", 18)))
    
    return "\n".join(lines)

def _build_storage_section(solver_args):
    """Build the [storage] configuration section."""
    storage = solver_args.get("storage", {})
    file_config = storage.get("file", {})
    
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["STORAGE"],
        "# " + "=" * 76,
        "[storage]",
        'primary = "%s"' % storage.get("primary", "file"),
        "cleanup_interval_seconds = %d" % int(storage.get("cleanup_interval_seconds", 3600)),
        "",
        "[storage.implementations.memory]",
        "# Memory storage has no configuration",
        "",
        "[storage.implementations.file]",
        'storage_path = "%s"' % file_config.get("storage_path", "./data/storage"),
        "ttl_orders = %d" % int(file_config.get("ttl_orders", 0)),
        "ttl_intents = %d" % int(file_config.get("ttl_intents", 86400)),
        "ttl_order_by_tx_hash = %d" % int(file_config.get("ttl_order_by_tx_hash", 86400)),
    ]
    
    return "\n".join(lines)

def _build_account_section(args, solver_args):
    """Build the [account] configuration section."""
    # Extract private key from chain configs or solver config
    private_key = _extract_private_key(args, solver_args)
    
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["ACCOUNT"],
        "# " + "=" * 76,
        "[account]",
        'primary = "local"',
        "",
        "[account.implementations.local]",
        'private_key = "%s"' % private_key,
    ]
    
    return "\n".join(lines)

def _build_delivery_section(solver_args, addresses):
    """Build the [delivery] configuration section."""
    min_confirmations = int(solver_args.get("delivery", {}).get("min_confirmations", 1))
    network_ids = ", ".join([str(cid) for cid in addresses.keys()])
    
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["DELIVERY"],
        "# " + "=" * 76,
        "[delivery]",
        "min_confirmations = %d" % min_confirmations,
        "",
        "[delivery.implementations.evm_alloy]",
        "network_ids = [%s]" % network_ids,
    ]
    
    return "\n".join(lines)

def _build_discovery_section(addresses):
    """Build the [discovery] configuration section."""
    network_ids = ", ".join([str(cid) for cid in addresses.keys()])
    
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["DISCOVERY"],
        "# " + "=" * 76,
        "[discovery]",
        "",
        "[discovery.implementations.onchain_eip7683]",
        "network_ids = [%s]" % network_ids,
    ]
    
    return "\n".join(lines)

def _build_order_section():
    """Build the [order] configuration section."""
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["ORDER"],
        "# " + "=" * 76,
        "[order]",
        "",
        "[order.implementations.eip7683]",
        "",
        "[order.strategy]",
        'primary = "simple"',
        "",
        "[order.strategy.implementations.simple]",
        "max_gas_price_gwei = 100",
    ]
    
    return "\n".join(lines)

def _build_settlement_section(solver_args, addresses, settlement):
    """Build the [settlement] configuration section."""
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["SETTLEMENT"],
        "# " + "=" * 76,
        "[settlement]",
        "",
    ]
    
    # Domain configuration
    domain_config = _get_domain_config(solver_args, addresses)
    lines.extend([
        "[settlement.domain]",
        "chain_id = %d" % domain_config["chain_id"],
        'address = "%s"' % domain_config["address"],
        "",
    ])
    
    # EIP7683 implementation
    network_ids = ", ".join([str(cid) for cid in addresses.keys()])
    lines.extend([
        "[settlement.implementations.eip7683]",
        "network_ids = [%s]" % network_ids,
    ])
    
    # Add oracle addresses if provided
    if settlement and "eip7683" in settlement and "oracle_addresses" in settlement["eip7683"]:
        oracle_mapping = _format_oracle_addresses(settlement["eip7683"]["oracle_addresses"])
        lines.append("oracle_addresses = { %s }" % oracle_mapping)
    
    lines.append("dispute_period_seconds = 1")
    
    return "\n".join(lines)

def _build_api_section():
    """Build the [api] configuration section."""
    lines = [
        "",
        "# " + "=" * 76,
        "# " + SECTION_HEADERS["API"],
        "# " + "=" * 76,
        "[api]",
        "enabled = true",
        'host = "0.0.0.0"',
        "port = %d" % DEFAULT_SOLVER_PORT,
        "timeout_seconds = 30",
        "max_request_size = 1048576  # 1MB",
    ]
    
    return "\n".join(lines)

# Helper functions

def _extract_private_key(args, solver_args):
    """Extract private key from configuration."""
    # Try chain configs first
    for chain in args.get("chains", []):
        wallet_key = chain.get("wallet", {}).get("private_key")
        if wallet_key:
            return wallet_key
    
    # Fallback to solver chain configs
    chain_configs = solver_args.get("chain_configs", [])
    if chain_configs and len(chain_configs) > 0:
        return chain_configs[0].get("wallet", {}).get("private_key", "")
    
    return ""

def _get_domain_config(solver_args, addresses):
    """Get domain configuration for settlement."""
    domain_cfg = solver_args.get("settlement", {}).get("domain", {})
    
    # Default to first configured network if not set
    default_chain = int(list(addresses.keys())[0]) if addresses else 1
    
    return {
        "chain_id": int(domain_cfg.get("chain_id", default_chain)),
        "address": domain_cfg.get("address", "0x0000000000000000000000000000000000000000"),
    }

def _format_oracle_addresses(oracle_addrs):
    """Format oracle addresses for TOML configuration."""
    parts = []
    for chain_id, address in oracle_addrs.items():
        parts.append('%s = "%s"' % (chain_id, address))
    return ", ".join(parts)

def _prepare_service_config(plan, args, mode, config_artifact):
    """
    Prepare service configuration based on mode.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments
        mode: Solver mode configuration
        config_artifact: Configuration file artifact
    
    Returns:
        ServiceConfig object for the solver service
    """
    api_port = int(args.get("solver", {}).get("api", {}).get("port", DEFAULT_SOLVER_PORT))
    
    if mode.get("build_from_source", False):
        return _prepare_build_from_source_config(plan, mode, config_artifact, api_port)
    else:
        return _prepare_prebuilt_config(mode, config_artifact, api_port)

def _prepare_prebuilt_config(mode, config_artifact, api_port):
    """Prepare configuration for prebuilt image."""
    image = mode.get("image", DEFAULT_SOLVER_IMAGE)
    
    return ServiceConfig(
        image=image,
        cmd=["--config", "/config/config.toml"],
        files={"/config": config_artifact},
        ports={"api": PortSpec(number=api_port, transport_protocol="TCP")},
    )

def _prepare_build_from_source_config(plan, mode, config_artifact, api_port):
    """Prepare configuration for building from source."""
    git_ref = mode.get("git_ref", DEFAULT_GIT_REF)
    
    # Create build script
    build_script = _create_build_script(git_ref)
    script_artifact = plan.render_templates(
        config={
            "build.sh": struct(
                template=build_script,
                data={}
            )
        },
        name="build-scripts"
    )
    
    # Command to build and run
    cmd = [
        "sh", "-c",
        _create_build_and_run_command()
    ]
    
    return ServiceConfig(
        image=DEFAULT_BUILD_IMAGE,
        cmd=cmd,
        files={
            "/config": config_artifact,
            "/scripts": script_artifact,
        },
        ports={"api": PortSpec(number=api_port, transport_protocol="TCP")},
    )

def _create_build_script(git_ref):
    """Create script for building solver from source."""
    return """#!/bin/sh
set -e
echo "Installing dependencies..."
apt-get update && apt-get install -y git pkg-config libssl-dev
echo "Cloning repository..."
git clone %s /src
cd /src
git checkout %s
echo "Building solver..."
cargo build --release
echo "Build complete!"
""" % (SOLVER_REPO_URL, git_ref)

def _create_build_and_run_command():
    """Create command for building and running solver."""
    return """
# Start placeholder server
python3 -m http.server %d &
SERVER_PID=$!

# Build solver
chmod +x /scripts/build.sh && /scripts/build.sh

# Stop placeholder and run solver
kill $SERVER_PID
exec /src/target/release/solver --config /config/config.toml
""" % DEFAULT_SOLVER_PORT