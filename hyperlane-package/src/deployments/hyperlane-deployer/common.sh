#!/usr/bin/env bash
# Common utilities and functions for Hyperlane CLI scripts

# ============================================================================
# ERROR HANDLING
# ============================================================================

set -euo pipefail

# Error codes
readonly ERROR_MISSING_ENV=1
readonly ERROR_INVALID_CONFIG=2
readonly ERROR_DEPLOYMENT_FAILED=3

# Logging functions
log_info() {
    echo "[INFO] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

log_debug() {
    if [ "${DEBUG:-0}" = "1" ]; then
        echo "[DEBUG] $*" >&2
    fi
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

require_env_var() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    local error_msg="${2:-$var_name is required but not set}"
    
    if [ -z "$var_value" ]; then
        log_error "$error_msg"
        exit $ERROR_MISSING_ENV
    fi
}

validate_chain_name() {
    local chain="$1"
    if [[ ! "$chain" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid chain name: $chain"
        exit $ERROR_INVALID_CONFIG
    fi
}

# ============================================================================
# CLI INSTALLATION
# ============================================================================

ensure_hyperlane_cli() {
    if ! command -v hyperlane >/dev/null 2>&1; then
        log_info "Installing Hyperlane CLI version: ${CLI_VERSION:-latest}"
        npm i -g @hyperlane-xyz/cli@${CLI_VERSION:-latest}
    fi
}

# ============================================================================
# DIRECTORY MANAGEMENT
# ============================================================================

ensure_directories() {
    local dirs=("$@")
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log_debug "Creating directory: $dir"
            mkdir -p "$dir"
        fi
    done
}

# ============================================================================
# CONFIGURATION PARSING
# ============================================================================

parse_key_value_pairs() {
    local input="$1"
    local -n result_array=$2
    
    if [ -n "$input" ]; then
        IFS=',' read -r -a pairs <<< "$input"
        for pair in "${pairs[@]}"; do
            key="${pair%%=*}"
            value="${pair#*=}"
            result_array["$key"]="$value"
        done
    fi
}

# ============================================================================
# CHAIN OPERATIONS
# ============================================================================

get_chain_id() {
    local chain_name="$1"
    local rpc_url="$2"
    local fallback_id="${3:-}"
    
    log_debug "Detecting chainId for $chain_name via RPC: $rpc_url"
    
    # Try to detect chain ID from RPC
    local detected_id
    detected_id=$(detect_chain_id_from_rpc "$rpc_url")
    
    if [ -n "$detected_id" ]; then
        log_info "Detected chainId $detected_id for $chain_name"
        echo "$detected_id"
    elif [ -n "$fallback_id" ]; then
        log_info "Using provided chainId $fallback_id for $chain_name"
        echo "$fallback_id"
    else
        log_error "Could not determine chainId for $chain_name"
        exit $ERROR_INVALID_CONFIG
    fi
}

detect_chain_id_from_rpc() {
    local rpc_url="$1"
    
    # Use curl instead of inline Node.js for better maintainability
    local response
    response=$(curl -s -X POST "$rpc_url" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        2>/dev/null || echo "")
    
    if [ -n "$response" ]; then
        # Extract chain ID from response
        local chain_id_hex
        chain_id_hex=$(echo "$response" | grep -o '"result":"0x[0-9a-fA-F]*"' | cut -d'"' -f4)
        
        if [ -n "$chain_id_hex" ]; then
            # Convert hex to decimal
            printf "%d\n" "$chain_id_hex" 2>/dev/null || echo ""
        fi
    fi
}

# ============================================================================
# FILE OPERATIONS
# ============================================================================

create_stamp_file() {
    local stamp_file="$1"
    touch "$stamp_file"
    log_debug "Created stamp file: $stamp_file"
}

check_stamp_file() {
    local stamp_file="$1"
    if [ -f "$stamp_file" ]; then
        return 0
    else
        return 1
    fi
}

# ============================================================================
# RETRY LOGIC
# ============================================================================

retry_with_backoff() {
    local max_attempts="$1"
    local delay="$2"
    local command="${@:3}"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_debug "Attempt $attempt of $max_attempts: $command"
        
        if eval "$command"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_info "Command failed, retrying in ${delay}s (attempt $attempt/$max_attempts)"
            sleep "$delay"
            delay=$((delay * 2))  # Exponential backoff
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_error "Command failed after $max_attempts attempts"
    return 1
}

# ============================================================================
# EXPORT COMMON VARIABLES
# ============================================================================

export CONFIGS_DIR="${CONFIGS_DIR:-/configs}"
export REGISTRY_DIR="${REGISTRY_DIR:-/configs/registry}"
export MAX_RETRY_ATTEMPTS="${MAX_RETRY_ATTEMPTS:-3}"
export RETRY_DELAY="${RETRY_DELAY:-5}"