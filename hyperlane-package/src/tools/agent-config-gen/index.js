#!/usr/bin/env node
/**
 * Agent Config Generator
 * Generates agent configuration for Hyperlane validators and relayers
 * based on deployed contract addresses and chain configurations
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import YAML from 'yaml';

// ============================================================================
// CONSTANTS
// ============================================================================

const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/main/chains';
const CONFIGS_DIR = '/configs';
const REGISTRY_DIR = '/configs/registry/chains';
const DEFAULT_TIMEOUT = 5000;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logger utility with different log levels
 */
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`[DEBUG] ${msg}`),
};

/**
 * Safely read and parse a file
 */
function readFile(filePath, format = 'json') {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return format === 'yaml' ? YAML.parse(content) : JSON.parse(content);
  } catch (error) {
    logger.debug(`Failed to read ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Write JSON output with proper formatting
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`Successfully wrote config to ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write to ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Parse command line arguments or configuration file
 */
function parseInput(inputPath) {
  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  
  // Try YAML first, then JSON
  try {
    return YAML.parse(raw);
  } catch (yamlError) {
    try {
      return JSON.parse(raw);
    } catch (jsonError) {
      throw new Error('Failed to parse input as YAML or JSON');
    }
  }
}

// ============================================================================
// NETWORK OPERATIONS
// ============================================================================

/**
 * Fetch YAML configuration from a URL with timeout and error handling
 */
function fetchYaml(url) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.debug(`Request to ${url} timed out`);
      resolve(null);
    }, DEFAULT_TIMEOUT);

    https
      .get(url, (res) => {
        clearTimeout(timeout);
        
        if (res.statusCode !== 200) {
          res.resume();
          logger.debug(`Request to ${url} returned status ${res.statusCode}`);
          return resolve(null);
        }
        
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(YAML.parse(data));
          } catch (error) {
            logger.debug(`Failed to parse YAML from ${url}: ${error.message}`);
            resolve(null);
          }
        });
      })
      .on('error', (error) => {
        clearTimeout(timeout);
        logger.debug(`Request to ${url} failed: ${error.message}`);
        resolve(null);
      });
  });
}

// ============================================================================
// CORE ADDRESS RESOLUTION
// ============================================================================

/**
 * Read core contract addresses from various possible locations
 */
function readCoreAddresses(chainName) {
  const addresses = {
    mailbox: '',
    igp: '',
    validatorAnnounce: '',
    ism: '',
  };

  // Try JSON format in configs directory
  const jsonPath = path.resolve(CONFIGS_DIR, `addresses-${chainName}.json`);
  const jsonData = readFile(jsonPath, 'json');
  
  if (jsonData) {
    addresses.mailbox = jsonData.mailbox || jsonData.Mailbox || '';
    addresses.igp = jsonData.interchainGasPaymaster || jsonData.igp || '';
    addresses.validatorAnnounce = jsonData.validatorAnnounce || jsonData.ValidatorAnnounce || '';
    addresses.ism = jsonData.interchainSecurityModule || jsonData.defaultIsm || jsonData.ism || '';
    
    if (addresses.mailbox) {
      logger.debug(`Found addresses for ${chainName} in JSON format`);
      return addresses;
    }
  }

  // Try YAML format in registry directory
  const yamlPath = path.resolve(REGISTRY_DIR, chainName, 'addresses.yaml');
  const yamlData = readFile(yamlPath, 'yaml');
  
  if (yamlData) {
    addresses.mailbox = yamlData.mailbox || '';
    addresses.igp = yamlData.interchainGasPaymaster || '';
    addresses.validatorAnnounce = yamlData.validatorAnnounce || '';
    addresses.ism = yamlData.interchainSecurityModule || '';
    
    if (addresses.mailbox) {
      logger.debug(`Found addresses for ${chainName} in YAML format`);
      return addresses;
    }
  }

  return addresses;
}

/**
 * Fetch addresses from public registry if enabled
 */
async function fetchPublicAddresses(chainName) {
  if (process.env.ENABLE_PUBLIC_FALLBACK !== 'true') {
    return null;
  }

  const url = `${REGISTRY_BASE_URL}/${chainName}/addresses.yaml`;
  logger.debug(`Fetching public registry for ${chainName} from ${url}`);
  
  const doc = await fetchYaml(url);
  
  if (doc && typeof doc === 'object') {
    return {
      mailbox: doc.mailbox || '',
      igp: doc.interchainGasPaymaster || '',
      validatorAnnounce: doc.validatorAnnounce || '',
      ism: doc.interchainSecurityModule || '',
    };
  }
  
  return null;
}

// ============================================================================
// CONFIGURATION BUILDER
// ============================================================================

/**
 * Build configuration for a single chain
 */
async function buildChainConfig(chain) {
  const config = {
    connection: { url: chain.rpc_url },
    mailbox: '',
    igp: '',
    validatorAnnounce: '',
    ism: '',
  };

  // Start with existing addresses from input
  const existing = chain.existing_addresses || {};
  config.mailbox = existing.mailbox || '';
  config.igp = existing.igp || '';
  config.validatorAnnounce = existing.validatorAnnounce || '';
  config.ism = existing.ism || '';

  // Override with deployed addresses if available
  const deployed = readCoreAddresses(chain.name);
  config.mailbox = deployed.mailbox || config.mailbox;
  config.igp = deployed.igp || config.igp;
  config.validatorAnnounce = deployed.validatorAnnounce || config.validatorAnnounce;
  config.ism = deployed.ism || config.ism;

  // Check if we need to fetch from public registry
  const needsPublic = !config.mailbox || !config.igp || !config.validatorAnnounce || !config.ism;
  
  if (needsPublic) {
    const publicAddresses = await fetchPublicAddresses(chain.name);
    if (publicAddresses) {
      config.mailbox = config.mailbox || publicAddresses.mailbox;
      config.igp = config.igp || publicAddresses.igp;
      config.validatorAnnounce = config.validatorAnnounce || publicAddresses.validatorAnnounce;
      config.ism = config.ism || publicAddresses.ism;
    }
  }

  // Log missing addresses
  if (!config.mailbox) {
    logger.error(`Missing mailbox address for ${chain.name}`);
  }
  if (!config.igp) {
    logger.error(`Missing IGP address for ${chain.name}`);
  }

  return config;
}

/**
 * Build complete agent configuration
 */
async function buildAgentConfig(args) {
  const chains = args.chains || [];
  const config = { chains: {} };

  logger.info(`Building agent config for ${chains.length} chains`);

  // Process each chain
  for (const chain of chains) {
    logger.debug(`Processing chain: ${chain.name}`);
    config.chains[chain.name] = await buildChainConfig(chain);
  }

  return config;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const [,, inputPath, outputPath] = process.argv;

  // Validate arguments
  if (!inputPath || !outputPath) {
    console.error('Usage: agent-config-gen <input-args.(yaml|json)> <output-agent-config.json>');
    process.exit(1);
  }

  try {
    // Parse input
    logger.info(`Reading configuration from ${inputPath}`);
    const args = parseInput(inputPath);

    // Build configuration
    const config = await buildAgentConfig(args);

    // Write output
    writeJsonFile(path.resolve(outputPath), config);
    
    logger.info('Agent configuration generated successfully');
  } catch (error) {
    logger.error(`Failed to generate agent config: ${error.message}`);
    
    // Write empty config as fallback
    try {
      writeJsonFile(path.resolve(outputPath), { chains: {} });
    } catch (writeError) {
      logger.error(`Failed to write fallback config: ${writeError.message}`);
    }
    
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});