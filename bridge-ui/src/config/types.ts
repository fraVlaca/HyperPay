export type ChainKey = "ethereum" | "arbitrum" | "optimism" | "base";

export type ChainConfig = {
  key: ChainKey;
  chainId: number;
  name: string;
  rpcUrl?: string;
  logoUrl?: string;
  hyperlaneDomain?: number;
  lzEid?: number;
};

export type TokenConfig = {
  symbol: string;
  decimals: number;
  logoUrl?: string;
};

export type HwrRouterAddresses = Record<ChainKey, string | undefined>;

export type HwrTopology = {
  token: string;
  routers: HwrRouterAddresses;
  edges: Array<{ from: ChainKey; to: ChainKey }>; 
  supportsMultiSource: boolean;
  balances?: Record<ChainKey, string | undefined>;

};

export type OftTokenAddresses = Record<ChainKey, string | undefined>;

export type OftRoute = {
  token: string;
  oft: OftTokenAddresses;
  endpointIds?: Record<ChainKey, number | undefined>;
  balances?: Record<ChainKey, string | undefined>;

};

export type RouteConfig =
  | { bridgeType: "HWR"; hwr: HwrTopology }
  | { bridgeType: "OFT"; oft: OftRoute };

export type UnifiedRegistry = {
  chains: ChainConfig[];
  tokens: TokenConfig[];
  routes: RouteConfig[];
};
