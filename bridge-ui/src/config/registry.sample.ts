import { UnifiedRegistry } from "./types";

export const REGISTRY_SAMPLE: UnifiedRegistry = {
  chains: [
    { key: "ethereum", chainId: 1, name: "Ethereum" },
    { key: "arbitrum", chainId: 42161, name: "Arbitrum" },
    { key: "base", chainId: 8453, name: "Base" }
  ],
  tokens: [
    { symbol: "ETH", decimals: 18 },
    { symbol: "USDC", decimals: 6 }
  ],
  routes: [
    {
      bridgeType: "HWR",
      hwr: {
        token: "ETH",
        routers: {
          ethereum: "0x0000000000000000000000000000000000000001",
          arbitrum: "0x0000000000000000000000000000000000000002",
          base: "0x0000000000000000000000000000000000000003"
        },
        edges: [
          { from: "arbitrum", to: "ethereum" },
          { from: "base", to: "ethereum" },
          { from: "ethereum", to: "arbitrum" }
        ],
        supportsMultiSource: true
      }
    },
    {
      bridgeType: "OFT",
      oft: {
        token: "USDC",
        oft: {
          ethereum: "0x0000000000000000000000000000000000000011",
          arbitrum: "0x0000000000000000000000000000000000000012",
          base: "0x0000000000000000000000000000000000000013"
        },
        endpointIds: {
          ethereum: 30101,
          arbitrum: 30110,
          base: 30184
        }
      }
    }
  ]
};
