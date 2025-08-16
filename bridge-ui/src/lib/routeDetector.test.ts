import { detectRoute } from "./routeDetector";
import { UnifiedRegistry, ChainKey } from "@config/types";

const registry: UnifiedRegistry = {
  chains: [
    { key: "ethereum", chainId: 1, name: "Ethereum" },
    { key: "arbitrum", chainId: 42161, name: "Arbitrum" },
    { key: "base", chainId: 8453, name: "Base" },
  ],
  tokens: [
    { symbol: "ETH", decimals: 18 },
    { symbol: "USDC", decimals: 6 },
  ],
  routes: [
    {
      bridgeType: "HWR",
      hwr: {
        token: "ETH",
        routers: { ethereum: "0x1", arbitrum: "0x2", base: "0x3" },
        edges: [
          { from: "arbitrum", to: "ethereum" },
          { from: "base", to: "ethereum" },
          { from: "arbitrum", to: "base" },
        ],
        supportsMultiSource: true,
      },
    },
    {
      bridgeType: "OFT",
      oft: {
        token: "USDC",
        oft: { ethereum: "0xa", arbitrum: "0xb", base: "0xc" },
        endpointIds: { ethereum: 30101, arbitrum: 30110, base: 30184 },
      },
    },
  ],
};

describe("detectRoute", () => {
  it("selects HWR when there is a direct HWR edge", () => {
    const res = detectRoute(registry, {
      token: "ETH",
      origin: "arbitrum",
      destination: "ethereum",
    });
    expect(res.bridge).toBe("HWR");
    if (res.bridge === "HWR") {
      expect(res.supportsMultiSource).toBe(true);
    }
  });

  it("selects OFT when OFT addresses exist for both chains", () => {
    const res = detectRoute(registry, {
      token: "USDC",
      origin: "base",
      destination: "arbitrum",
    });
    expect(res.bridge).toBe("OFT");
  });

  it("returns NONE when only HWR exists but no path", () => {
    const res = detectRoute(registry, {
      token: "ETH",
      origin: "ethereum",
      destination: "base",
    });
    expect(res.bridge).toBe("NONE");
  });

  it("returns NONE when only OFT exists but token not on both chains", () => {
    const local: UnifiedRegistry = {
      ...registry,
      routes: [
        ...registry.routes.filter((r) => r.bridgeType !== "OFT"),
        {
          bridgeType: "OFT",
          oft: {
            token: "USDC",
            oft: { ethereum: "0xa", arbitrum: undefined as any, base: "0xc" },
          },
        },
      ],
    };
    const res = detectRoute(local, {
      token: "USDC",
      origin: "arbitrum",
      destination: "base",
    });
    expect(res.bridge).toBe("NONE");
  });
});
