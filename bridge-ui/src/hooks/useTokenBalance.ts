import { useMemo } from "react";
import { useAccount, useReadContract, useChainId } from "wagmi";
import { erc20Abi } from "viem";

type Args = {
  tokenAddress?: `0x${string}` | null;
  decimals?: number;
  chainIdOverride?: number;
};

export function useTokenBalance({ tokenAddress, decimals, chainIdOverride }: Args) {
  const { address } = useAccount();
  const chainId = useChainId();

  const enabled = Boolean(address && tokenAddress);
  const { data } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress as any,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chainIdOverride || chainId,
    query: { enabled }
  } as any);

  const formatted = useMemo(() => {
    if (!data || typeof data !== "bigint" || !decimals) return null;
    const denom = 10n ** BigInt(decimals);
    const whole = data / denom;
    const frac = data % denom;
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    return fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
  }, [data, decimals]);

  return { balance: formatted, raw: data as bigint | undefined, isConnected: Boolean(address) };
}
