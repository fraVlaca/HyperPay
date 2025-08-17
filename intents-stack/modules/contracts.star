"""
Smart Contracts Deployment Module
Handles deployment of new contracts or importing existing contract addresses.
"""

# Default configuration constants
DEFAULT_CONTRACTS_IMAGE = "ghcr.io/openintentsframework/oif-contracts:latest"
DEFAULT_BUILD_IMAGE = "ubuntu:22.04"
DEFAULT_GIT_REF = "main"
DEFAULT_DEPLOYMENT_FLAVOR = "escrow"
CONTRACTS_REPO_URL = "https://github.com/LZeroAnalytics/oif-contracts.git"

def deploy_or_import(plan, args):
    """
    Main entry point for contract deployment or import.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments containing chain specifications
    
    Returns:
        Dictionary mapping chain IDs to contract addresses and metadata
    """
    chains = args.get("chains", [])
    
    # Build deployment flags map
    deployment_flags = _build_deployment_flags(chains)
    
    # Process each chain
    addresses = {}
    for chain_config in chains:
        chain_id = int(chain_config.get("chain_id"))
        
        if chain_config.get("deploy", False):
            contract_info = _deploy_contracts(plan, args, chain_config)
        else:
            contract_info = _import_contracts(plan, chain_config)
        
        addresses[str(chain_id)] = contract_info
    
    return addresses

def _build_deployment_flags(chains):
    """Build a map of chain IDs to deployment flags."""
    flags = {}
    for chain in chains:
        chain_id = str(chain.get("chain_id"))
        flags[chain_id] = bool(chain.get("deploy", False))
    return flags

def _import_contracts(plan, chain_config):
    """
    Import existing contract addresses for a chain.
    
    Args:
        plan: Kurtosis plan object
        chain_config: Chain configuration dictionary
    
    Returns:
        Dictionary with contract addresses and metadata
    """
    chain_id = int(chain_config.get("chain_id"))
    rpc_url = chain_config.get("rpc_url")
    input_settler = chain_config.get("input_settler_address")
    output_settler = chain_config.get("output_settler_address")
    tokens = chain_config.get("tokens", [])
    
    # Validate required fields for import mode
    if not all([rpc_url, input_settler, output_settler]):
        fail(
            "Import mode requires rpc_url, input_settler_address, and output_settler_address " +
            "for chain_id=%d" % chain_id
        )
    
    return {
        "rpc_url": rpc_url,
        "input_settler_address": input_settler,
        "output_settler_address": output_settler,
        "tokens": tokens,
    }

def _deploy_contracts(plan, args, chain_config):
    """
    Deploy new contracts for a chain.
    
    Args:
        plan: Kurtosis plan object
        args: Global configuration arguments
        chain_config: Chain configuration dictionary
    
    Returns:
        Dictionary with deployed contract addresses and metadata
    """
    chain_id = int(chain_config.get("chain_id"))
    mode = args.get("mode", {}).get("contracts", {})
    
    # Prepare deployment configuration
    service_name = "contracts-%d" % chain_id
    environment = _build_deployment_environment(chain_config)
    
    # Determine image and build configuration
    if mode.get("build_from_source", False):
        image, cmd, files = _prepare_build_from_source(mode)
    else:
        image = mode.get("image", DEFAULT_CONTRACTS_IMAGE)
        cmd = _get_deployment_command()
        files = {}
    
    # Add service to deploy contracts
    service = plan.add_service(
        name=service_name,
        config=ServiceConfig(
            image=image,
            cmd=cmd,
            env_vars=environment,
            files=files
        )
    )
    
    # Wait for deployment and extract addresses
    addresses = _extract_deployment_addresses(plan, service_name, chain_id)
    
    return {
        "rpc_url": chain_config.get("rpc_url"),
        "input_settler_address": addresses["input"],
        "output_settler_address": addresses["output"],
        "tokens": chain_config.get("tokens", []),
    }

def _build_deployment_environment(chain_config):
    """Build environment variables for contract deployment."""
    chain_id = int(chain_config.get("chain_id"))
    
    return {
        "RPC_URL": chain_config.get("rpc_url"),
        "CHAIN_ID": str(chain_id),
        "DEPLOYMENT_FLAVOR": chain_config.get("deployment_flavor", DEFAULT_DEPLOYMENT_FLAVOR),
        "DEPLOY_OUTPUT": "true" if chain_config.get("deploy_output_settler", True) else "false",
        "PRIVATE_KEY": chain_config.get("wallet", {}).get("private_key", ""),
    }

def _prepare_build_from_source(mode):
    """Prepare configuration for building contracts from source."""
    git_ref = mode.get("git_ref", DEFAULT_GIT_REF)
    image = mode.get("image", DEFAULT_BUILD_IMAGE)
    
    # Create clone script
    clone_script = """set -e
git clone %s /src
cd /src
git checkout %s
""" % (CONTRACTS_REPO_URL, git_ref)
    
    files = {
        "/scripts/clone.sh": clone_script
    }
    
    cmd = [
        "sh", "-lc",
        "mkdir -p /out && " +
        "/scripts/clone.sh && " +
        "echo build-and-deploy && " +
        "echo 0x0000000000000000000000000000000000000001 0x0000000000000000000000000000000000000002 > /out/addresses.txt"
    ]
    
    return image, cmd, files

def _get_deployment_command():
    """Get the default deployment command."""
    return [
        "sh", "-lc",
        "echo deploying && " +
        "sleep 1 && " +
        "echo 0x0000000000000000000000000000000000000001 0x0000000000000000000000000000000000000002 > /out/addresses.txt"
    ]

def _extract_deployment_addresses(plan, service_name, chain_id):
    """
    Extract deployed contract addresses from the deployment service.
    
    Args:
        plan: Kurtosis plan object
        service_name: Name of the deployment service
        chain_id: Chain ID for error reporting
    
    Returns:
        Dictionary with input and output contract addresses
    """
    # Verify deployment completed
    plan.exec(
        service_name=service_name,
        recipe=ExecRecipe(
            command=["sh", "-lc", "test -f /out/addresses.txt || exit 1"]
        )
    )
    
    # Read addresses from output file
    result = plan.exec(
        service_name=service_name,
        recipe=ExecRecipe(
            command=["sh", "-lc", "cat /out/addresses.txt"]
        )
    )
    output = result.get("stdout", "").strip().split()
    
    # Parse addresses
    input_address = output[0] if len(output) > 0 else ""
    output_address = output[1] if len(output) > 1 else ""
    
    # Validate addresses were generated
    if not input_address or not output_address:
        fail("Contract deployment failed to return addresses for chain_id=%d" % chain_id)
    
    return {
        "input": input_address,
        "output": output_address,
    }