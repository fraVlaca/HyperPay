# Constants Module - Central location for all constants used across the package

# ============================================================================
# DEPLOYMENT CONSTANTS
# ============================================================================

MIN_CHAINS_REQUIRED = 2
DEFAULT_AGENT_TAG = "agents-v1.4.0"
DEFAULT_CLI_VERSION = "latest"
DEFAULT_REGISTRY_MODE = "public"

# ============================================================================
# DIRECTORY PATHS
# ============================================================================

CONFIGS_DIR = "/configs"
REGISTRY_DIR = "/configs/registry"
VALIDATOR_CHECKPOINTS_DIR = "/data/validator-checkpoints"
RELAYER_DB_DIR = "/data/relayer-db"

# ============================================================================
# IMAGE NAMES
# ============================================================================

CLI_IMAGE_NAME = "hyperlane-cli-img"
AGENT_CONFIG_IMAGE_NAME = "agent-config-gen-img"
AGENT_IMAGE_BASE = "gcr.io/abacus-labs-dev/hyperlane-agent"

# ============================================================================
# SCRIPT PATHS
# ============================================================================

DEPLOY_CORE_SCRIPT = "/usr/local/bin/deploy_core.sh"
WARP_ROUTES_SCRIPT = "/usr/local/bin/warp_routes.sh"
SEED_LIQUIDITY_SCRIPT = "/usr/local/bin/seed_liquidity.sh"
SEND_WARP_SCRIPT = "/usr/local/bin/send_warp.sh"

# ============================================================================
# ERROR CODES
# ============================================================================

ERROR_MISSING_ENV = 1
ERROR_INVALID_CONFIG = 2
ERROR_DEPLOYMENT_FAILED = 3

# ============================================================================
# WARP ROUTE CONSTANTS
# ============================================================================

VALID_WARP_MODES = ["lock_release", "lock_mint", "burn_mint"]
DEFAULT_ROUTE_SYMBOL = "route"
DEFAULT_WARP_MODE = "lock_release"

# ============================================================================
# TEST CONSTANTS
# ============================================================================

DEFAULT_TEST_ORIGIN = "ethereum"
DEFAULT_TEST_DESTINATION = "arbitrum"
DEFAULT_TEST_AMOUNT = "1"
DEFAULT_TEST_SYMBOL = "TEST"

# ============================================================================
# RETRY CONFIGURATION
# ============================================================================

MAX_RETRY_ATTEMPTS = 3
RETRY_DELAY = 5
DEFAULT_TIMEOUT = 120000  # 2 minutes in milliseconds

# ============================================================================
# CHECKPOINT SYNCER TYPES
# ============================================================================

CHECKPOINT_SYNCER_LOCAL = "local"
CHECKPOINT_SYNCER_S3 = "s3"
CHECKPOINT_SYNCER_GCS = "gcs"

# ============================================================================
# EXPORT ALL CONSTANTS
# ============================================================================

def get_constants():
    """Return all constants as a struct for easy access"""
    return struct(
        # Deployment
        MIN_CHAINS_REQUIRED = MIN_CHAINS_REQUIRED,
        DEFAULT_AGENT_TAG = DEFAULT_AGENT_TAG,
        DEFAULT_CLI_VERSION = DEFAULT_CLI_VERSION,
        DEFAULT_REGISTRY_MODE = DEFAULT_REGISTRY_MODE,
        
        # Directories
        CONFIGS_DIR = CONFIGS_DIR,
        REGISTRY_DIR = REGISTRY_DIR,
        VALIDATOR_CHECKPOINTS_DIR = VALIDATOR_CHECKPOINTS_DIR,
        RELAYER_DB_DIR = RELAYER_DB_DIR,
        
        # Images
        CLI_IMAGE_NAME = CLI_IMAGE_NAME,
        AGENT_CONFIG_IMAGE_NAME = AGENT_CONFIG_IMAGE_NAME,
        AGENT_IMAGE_BASE = AGENT_IMAGE_BASE,
        
        # Scripts
        DEPLOY_CORE_SCRIPT = DEPLOY_CORE_SCRIPT,
        WARP_ROUTES_SCRIPT = WARP_ROUTES_SCRIPT,
        SEED_LIQUIDITY_SCRIPT = SEED_LIQUIDITY_SCRIPT,
        SEND_WARP_SCRIPT = SEND_WARP_SCRIPT,
        
        # Error codes
        ERROR_MISSING_ENV = ERROR_MISSING_ENV,
        ERROR_INVALID_CONFIG = ERROR_INVALID_CONFIG,
        ERROR_DEPLOYMENT_FAILED = ERROR_DEPLOYMENT_FAILED,
        
        # Warp routes
        VALID_WARP_MODES = VALID_WARP_MODES,
        DEFAULT_ROUTE_SYMBOL = DEFAULT_ROUTE_SYMBOL,
        DEFAULT_WARP_MODE = DEFAULT_WARP_MODE,
        
        # Testing
        DEFAULT_TEST_ORIGIN = DEFAULT_TEST_ORIGIN,
        DEFAULT_TEST_DESTINATION = DEFAULT_TEST_DESTINATION,
        DEFAULT_TEST_AMOUNT = DEFAULT_TEST_AMOUNT,
        DEFAULT_TEST_SYMBOL = DEFAULT_TEST_SYMBOL,
        
        # Retry config
        MAX_RETRY_ATTEMPTS = MAX_RETRY_ATTEMPTS,
        RETRY_DELAY = RETRY_DELAY,
        DEFAULT_TIMEOUT = DEFAULT_TIMEOUT,
        
        # Checkpoint syncers
        CHECKPOINT_SYNCER_LOCAL = CHECKPOINT_SYNCER_LOCAL,
        CHECKPOINT_SYNCER_S3 = CHECKPOINT_SYNCER_S3,
        CHECKPOINT_SYNCER_GCS = CHECKPOINT_SYNCER_GCS,
    )