"""
OIF Solver Stack Kurtosis Package
Main orchestration entry point for deploying the OIF solver infrastructure.

This module coordinates the deployment of:
- Smart contracts (deploy new or import existing)
- Settlement layer configuration (Hyperlane/Custom)
- Solver service with API
- API documentation (Swagger UI)
"""

# Module names as constants for clarity
MODULE_CONTRACTS = "contracts"
MODULE_SOLVER = "solver"
MODULE_SPECS = "specs"

def run(plan, args):
    """
    Main entry point for the Kurtosis package.
    
    Args:
        plan: Kurtosis plan object for service orchestration
        args: Configuration arguments from args.yaml
    
    Returns:
        Dictionary containing deployment artifacts and service information
    """
    # Get module configuration
    modules_config = args.get("modules", {})
    artifacts = {}
    
    # Step 1: Deploy or import smart contracts
    if modules_config.get(MODULE_CONTRACTS, True):
        contracts_module = import_module("./modules/contracts.star")
        addresses = contracts_module.deploy_or_import(plan, args)
        artifacts["addresses"] = addresses
        plan.print("Contracts configured for %d chains" % len(addresses))
    else:
        # When contracts module is disabled, build addresses from chains config
        addresses = {}
        chains = args.get("chains", [])
        for chain_config in chains:
            chain_id = str(chain_config.get("chain_id"))
            addresses[chain_id] = {
                "rpc_url": chain_config.get("rpc_url"),
                "input_settler_address": chain_config.get("input_settler_address"),
                "output_settler_address": chain_config.get("output_settler_address"),
                "tokens": chain_config.get("tokens", [])
            }
        artifacts["addresses"] = addresses
        if addresses:
            plan.print("Using existing contracts for %d chains" % len(addresses))
    
    # Step 2: Configure settlement layer (always runs for oracle mapping)
    settlement_module = import_module("./modules/settlement/hyperlane.star")
    settlement_config = settlement_module.build_oracle_mapping(
        plan, 
        args, 
        artifacts.get("addresses", {})
    )
    
    # Step 3: Launch solver service
    if modules_config.get(MODULE_SOLVER, True):
        solver_module = import_module("./modules/solver.star")
        solver_info = solver_module.launch(
            plan, 
            args, 
            artifacts.get("addresses", {}), 
            settlement_config
        )
        artifacts["solver"] = solver_info
        plan.print("Solver service launched on port %d" % solver_info.get("port"))
    
    # Step 4: Launch API documentation
    specs_enabled = (
        modules_config.get(MODULE_SPECS, True) and 
        args.get("mode", {}).get("specs", {}).get("enabled", True)
    )
    
    if specs_enabled:
        specs_module = import_module("./modules/specs.star")
        specs_info = specs_module.launch(
            plan, 
            args, 
            artifacts.get("solver", {})
        )
        artifacts["specs"] = specs_info
        plan.print("API documentation available on port %d" % specs_info.get("port"))
    
    # Return all deployment artifacts
    plan.print("Deployment complete!")
    return artifacts