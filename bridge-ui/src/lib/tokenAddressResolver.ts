import { UnifiedRegistry, ChainKey, RouteConfig } from "@config/types";

export function getDecimals(reg: UnifiedRegistry, symbol: string): number | undefined {
  return reg.tokens.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase())?.decimals;
}

export function getTokenAddressForBalance(
  reg: UnifiedRegistry,
  symbol: string,
  chain: ChainKey
): string | null {
  const oft = reg.routes.find(
    (r): r is Extract<RouteConfig, { bridgeType: "OFT" }> =>
      r.bridgeType === "OFT" && r.oft.token.toLowerCase() === symbol.toLowerCase()
  );
  if (oft) {
    const addr = (oft as any)?.oft?.oft?.[chain] as string | undefined;
    return addr ?? null;
  }

  const hwr = reg.routes.find(
    (r): r is Extract<RouteConfig, { bridgeType: "HWR" }> =>
      r.bridgeType === "HWR" && r.hwr.token.toLowerCase() === symbol.toLowerCase()
  );
  if (hwr) {
    if (chain === "optimism") {
      const synth = (hwr as any)?.hwr?.syntheticToken?.optimism as string | undefined;
      return synth ?? null;
    }
    const coll = (hwr as any)?.hwr?.collateralTokens?.[chain] as string | undefined;
    return coll ?? null;
  }

  return null;
}
