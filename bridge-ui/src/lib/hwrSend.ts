import type { UnifiedRegistry, ChainKey } from "@config/types";
import { ERC20_ABI, HWR_ROUTER_ABI } from "./abis";
import { toHex, getAddress, parseUnits } from "viem";
import { createPublicClient, http } from "viem";
import { mainnet, arbitrum, optimism } from "viem/chains";

const CHAIN_TO_VIEM: Record<string, any> = {
  ethereum: mainnet,
  arbitrum,
  optimism
};

export function resolveHwr(reg: UnifiedRegistry, token: string, origin: ChainKey, destination: ChainKey) {
  const route = reg.routes.find((r) => r.bridgeType === "HWR" && r.hwr.token === token);
  if (!route || route.bridgeType !== "HWR") throw new Error("HWR route not found");
  const routers = route.hwr.routers as Record<string, `0x${string}`>;
  const router = routers[origin];
  if (!router) throw new Error("No router for origin");
  const chains = reg.chains as any;
  const destDomain = chains?.[destination]?.hyperlaneDomain as number | undefined;
  if (!destDomain) throw new Error("Missing destination Hyperlane domain");
  const collateralTokens = (route.hwr as any).collateralTokens as Record<string, `0x${string}`> | undefined;
  if (!collateralTokens?.[origin]) throw new Error("Missing collateral token for origin");
  return {
    router,
    collateralToken: collateralTokens[origin],
    destDomain
  };
}

export async function sendHwr(params: {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
  sender: `0x${string}`;
  walletClient: any;
  rpcUrls?: Partial<Record<ChainKey, string>>;
}) {
  const { registry, token, origin, destination, amount, sender, walletClient, rpcUrls } = params;
  const { router, collateralToken, destDomain } = resolveHwr(registry, token, origin, destination);

  const tokenMeta = registry.tokens.find((t) => t.symbol === token);
  const decimals = tokenMeta?.decimals ?? 6;
  const amountWei = parseUnits((amount && amount.length > 0 ? amount : "0"), decimals);

  const viemChain = CHAIN_TO_VIEM[origin];
  const transport = http(rpcUrls?.[origin] || (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC`] : undefined));
  const publicClient = createPublicClient({ chain: viemChain, transport });

  const allowance = await publicClient.readContract({
    address: collateralToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [sender, router]
  }) as bigint;

  if (allowance < amountWei) {
    await walletClient.writeContract({
      address: collateralToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [router, amountWei]
    });
  }

  let gasPayment: bigint = 0n;
  try {
    gasPayment = await publicClient.readContract({
      address: router,
      abi: HWR_ROUTER_ABI,
      functionName: "quoteGasPayment",
      args: [Number(destDomain)]
    }) as bigint;
  } catch {}

  const recipientBytes32 = toHex(getAddress(sender), { size: 32 });

  const hash: `0x${string}` = await walletClient.writeContract({
    address: router,
    abi: HWR_ROUTER_ABI,
    functionName: "transferRemote",
    args: [BigInt(destDomain), recipientBytes32, amountWei],
    value: gasPayment > 0n ? gasPayment : undefined
  });

  return { hash, router, gasPayment: gasPayment.toString() };
}
