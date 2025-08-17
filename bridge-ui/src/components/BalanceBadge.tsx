import { UnifiedRegistry, ChainKey } from "@config/types";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { getDecimals, getTokenAddressForBalance } from "@lib/tokenAddressResolver";

export default function BalanceBadge({
  registry,
  token,
  origin
}: {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
}) {
  const decimals = getDecimals(registry, token);
  const address = getTokenAddressForBalance(registry, token, origin);
  const { balance, isConnected } = useTokenBalance({
    tokenAddress: (address as any) || null,
    decimals
  });

  if (!isConnected) {
    return null;
  }
  if (!address) {
    return <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">Balance unavailable</span>;
  }
  return (
    <span className="rounded bg-brand-50 px-2 py-1 text-xs text-brand-800">
      Balance: {balance ?? "—"}
    </span>
  );
}
