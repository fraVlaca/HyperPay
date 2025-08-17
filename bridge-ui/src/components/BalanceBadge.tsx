import { UnifiedRegistry, ChainKey, RouteConfig } from "@config/types";
import { useTokenBalance } from "../hooks/useTokenBalance";

function resolveTokenInfo(registry: UnifiedRegistry, symbol: string, chain: ChainKey) {
  const token = registry.tokens.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
  const decimals = token?.decimals;

  const oft = registry.routes.find(
    (r): r is Extract<RouteConfig, { bridgeType: "OFT" }> =>
      r.bridgeType === "OFT" && r.oft.token.toLowerCase() === symbol.toLowerCase()
  );
  if (oft) {
    const addr = (oft as any)?.oft?.oft?.[chain] as string | undefined;
    return { address: addr ?? null, decimals };
  }

  const hwr = registry.routes.find(
    (r): r is Extract<RouteConfig, { bridgeType: "HWR" }> =>
      r.bridgeType === "HWR" && r.hwr.token.toLowerCase() === symbol.toLowerCase()
  );
  if (hwr) {
    const addr = (hwr as any)?.hwr?.routers?.[chain] as string | undefined;
    return { address: addr ?? null, decimals };
  }

  return { address: null as string | null, decimals };
}

export default function BalanceBadge({
  registry,
  token,
  origin
}: {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
}) {
  const { address, decimals } = resolveTokenInfo(registry, token, origin);
  const { balance, isConnected } = useTokenBalance({
    tokenAddress: (address as any) || null,
    decimals
  });

  if (!isConnected) {
    return <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">Connect wallet</span>;
  }
  if (!address) {
    return <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">Balance unavailable</span>;
  }
  return (
    <span className="rounded bg-brand-50 px-2 py-1 text-xs text-brand-800">
      Bal: {balance ?? "—"}
    </span>
  );
}
