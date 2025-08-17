#!/usr/bin/env bash
# Deploy Hyperlane core contracts to specified chains

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# ============================================================================
# MAIN DEPLOYMENT LOGIC
# ============================================================================

deploy_core_to_chain() {
    local chain_name="$1"
    local rpc_url="$2"
    local chain_id="$3"
    local stamp_file="${CONFIGS_DIR}/.done-core-${chain_name}"
    
    # Check if already deployed
    if check_stamp_file "$stamp_file"; then
        log_info "Core already deployed for ${chain_name}, skipping"
        return 0
    fi
    
    # Setup registry directory for this chain
    local reg_chain_dir="${REGISTRY_DIR}/chains/${chain_name}"
    ensure_directories "$reg_chain_dir"
    
    # Create chain metadata
    create_chain_metadata "$chain_name" "$rpc_url" "$chain_id" "$reg_chain_dir"
    
    # Initialize core configuration
    local core_cfg="${CONFIGS_DIR}/core-${chain_name}.yaml"
    if ! initialize_core_config "$core_cfg"; then
        log_error "Failed to initialize core config for ${chain_name}"
        exit $ERROR_DEPLOYMENT_FAILED
    fi
    
    # Deploy core contracts with retry logic
    if deploy_core_with_retry "$chain_name" "$core_cfg"; then
        # Copy deployment artifacts
        copy_deployment_artifacts "$chain_name" "$reg_chain_dir"
        create_stamp_file "$stamp_file"
        log_info "Successfully deployed core contracts to ${chain_name}"
    else
        log_error "Failed to deploy core contracts to ${chain_name}"
        exit $ERROR_DEPLOYMENT_FAILED
    fi
}

create_chain_metadata() {
    local chain_name="$1"
    local rpc_url="$2"
    local chain_id="$3"
    local output_dir="$4"
    
    cat > "${output_dir}/metadata.yaml" <<EOF
name: ${chain_name}
protocol: ethereum
chainId: ${chain_id}
domainId: ${chain_id}
rpcUrls:
  - http: ${rpc_url}
nativeToken:
  name: Ether
  symbol: ETH
  decimals: 18
EOF
    
    log_debug "Created metadata for ${chain_name}"
}

initialize_core_config() {
    local config_file="$1"
    
    log_info "Initializing core config"
    
    # Use yes to provide empty responses to prompts
    yes "" | hyperlane core init -y > /dev/null 2>&1 || true
    
    if [ -f "./configs/core-config.yaml" ]; then
        cp "./configs/core-config.yaml" "$config_file"
        return 0
    else
        log_error "Core init did not produce expected config file"
        return 1
    fi
}

deploy_core_with_retry() {
    local chain_name="$1"
    local config_file="$2"
    local log_file="/tmp/deploy-${chain_name}.log"
    
    log_info "Deploying Hyperlane core to ${chain_name}"
    
    # Define the deployment command
    local deploy_cmd="hyperlane core deploy --chain '${chain_name}' -o '${config_file}' -r '${REGISTRY_DIR}' -k '${HYP_KEY}' -y 2>&1 | tee '${log_file}'"
    
    # Try deployment with retry on nonce errors
    local attempt=0
    while [ $attempt -lt $MAX_RETRY_ATTEMPTS ]; do
        attempt=$((attempt + 1))
        
        if eval "$deploy_cmd"; then
            return 0
        fi
        
        # Check for nonce errors
        if grep -q "nonce has already been used\|nonce too low" "$log_file"; then
            if [ $attempt -lt $MAX_RETRY_ATTEMPTS ]; then
                log_info "Nonce error detected, retrying (attempt $attempt/$MAX_RETRY_ATTEMPTS)..."
                sleep $RETRY_DELAY
            fi
        else
            log_error "Deployment failed with non-recoverable error"
            cat "$log_file"
            return 1
        fi
    done
    
    log_error "Deployment failed after $MAX_RETRY_ATTEMPTS attempts"
    return 1
}

copy_deployment_artifacts() {
    local chain_name="$1"
    local target_dir="$2"
    local addresses_file="$HOME/.hyperlane/chains/${chain_name}/addresses.yaml"
    
    if [ -f "$addresses_file" ]; then
        cp "$addresses_file" "${target_dir}/addresses.yaml" || true
        log_debug "Copied deployment artifacts for ${chain_name}"
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    # Validate required environment variables
    require_env_var "CHAIN_NAMES" "CHAIN_NAMES not set"
    require_env_var "HYP_KEY" "HYP_KEY not set (agents.deployer.key). Required for core deployment."
    
    # Install CLI if needed
    ensure_hyperlane_cli
    
    # Create necessary directories
    ensure_directories "$CONFIGS_DIR" "${REGISTRY_DIR}/chains"
    
    # Parse chain configurations
    declare -A RPCS
    declare -A IDS
    parse_key_value_pairs "${CHAIN_RPCS:-}" RPCS
    parse_key_value_pairs "${CHAIN_IDS:-}" IDS
    
    # Deploy to each chain
    IFS=',' read -r -a CHAINS <<< "${CHAIN_NAMES}"
    for chain in "${CHAINS[@]}"; do
        # Validate chain name
        validate_chain_name "$chain"
        
        # Get RPC URL
        rpc="${RPCS[$chain]:-}"
        if [ -z "$rpc" ]; then
            log_error "No RPC URL provided for chain ${chain}"
            exit $ERROR_MISSING_ENV
        fi
        
        # Get or detect chain ID
        chain_id=$(get_chain_id "$chain" "$rpc" "${IDS[$chain]:-}")
        
        # Deploy core to this chain
        deploy_core_to_chain "$chain" "$rpc" "$chain_id"
    done
    
    # Mark overall deployment as complete
    create_stamp_file "${CONFIGS_DIR}/.deploy-core"
    log_info "Core deployment completed for all chains"
}

# Run main function
main "$@"