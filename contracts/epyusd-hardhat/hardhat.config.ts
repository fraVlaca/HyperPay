import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, ".env") });

import "@nomicfoundation/hardhat-toolbox";

const pk = process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [];

const config: import("hardhat/config").HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    mainnet: {
      url: process.env.ETHEREUM_RPC_URL || "",
      accounts: pk
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "",
      accounts: pk
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: pk
    }
  },
  etherscan: {
    apiKey: {
      optimisticEthereum: process.env.OPTIMISM_ETHERSCAN_API_KEY || ""
    }
  }
};

export default config;
