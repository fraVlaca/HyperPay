#!/usr/bin/env bash
# Deploy Hyperlane warp routes

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# ============================================================================
# CONSTANTS
# ============================================================================

readonly VALID_MODES="lock_release lock_mint burn_mint"
readonly DEFAULT_ROUTE_SYMBOL="route"
readonly DEFAULT_MODE="lock_release"

# ============================================================================
# VALIDATION
# ============================================================================

validate_mode() {
    local mode="$1"
    
    if [[ ! " $VALID_MODES " =~ " $mode " ]]; then
        log_error "Invalid warp route mode: '$mode'. Valid modes: $VALID_MODES"
        exit $ERROR_INVALID_CONFIG
    fi
}

# ============================================================================
# WARP ROUTE DEPLOYMENT
# ============================================================================

create_warp_config() {
    local route_symbol="$1"
    local config_file="$2"
    
    log_info "Creating warp route configuration for symbol: ${route_symbol}"
    
    {
        echo "---"
        IFS=',' read -r -a chains <<< "${CHAIN_NAMES}"
        for chain in "${chains[@]}"; do
            cat <<EOF
${chain}:
  type: native
  name: "${route_symbol}"
  symbol: "${route_symbol}"
EOF
        done
    } > "$config_file"
    
    log_debug "Created warp config at: $config_file"
}

deploy_warp_route() {
    local config_file="$1"
    
    log_info "Deploying warp route using config: $config_file"
    
    if hyperlane warp deploy \
        --config "$config_file" \
        -r "$REGISTRY_DIR" \
        -k "$HYP_KEY" \
        -y; then
        log_info "Warp route deployed successfully"
        return 0
    else
        log_error "Failed to deploy warp route"
        return 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    # Get configuration from environment
    local route_symbol="${ROUTE_SYMBOL:-$DEFAULT_ROUTE_SYMBOL}"
    local mode="${MODE:-$DEFAULT_MODE}"
    
    # Validate required environment variables
    require_env_var "HYP_KEY" "HYP_KEY not set (agents.deployer.key). Required for warp route operations."
    require_env_var "CHAIN_NAMES" "CHAIN_NAMES not set"
    
    # Validate mode
    validate_mode "$mode"
    
    # Install CLI if needed
    ensure_hyperlane_cli
    
    # Create necessary directories
    ensure_directories "$CONFIGS_DIR" "$REGISTRY_DIR"
    
    # Check if already deployed
    local stamp_file="${CONFIGS_DIR}/.done-warp-${route_symbol}-${mode}"
    if check_stamp_file "$stamp_file"; then
        log_info "Warp route ${route_symbol} (${mode}) already configured, skipping"
        exit 0
    fi
    
    # Create warp configuration
    local warp_config="${CONFIGS_DIR}/warp-${route_symbol}.yaml"
    create_warp_config "$route_symbol" "$warp_config"
    
    # Deploy warp route
    if deploy_warp_route "$warp_config"; then
        create_stamp_file "$stamp_file"
        log_info "Warp route ${route_symbol} (${mode}) deployment completed"
    else
        log_error "Warp route deployment failed"
        exit $ERROR_DEPLOYMENT_FAILED
    fi
    
    # Mark warp routes as complete
    create_stamp_file "${CONFIGS_DIR}/.warp-routes"
}

# Run main function
main "$@"