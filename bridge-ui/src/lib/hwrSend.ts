import type { UnifiedRegistry, ChainKey } from "@config/types";
import { ERC20_ABI, HWR_ROUTER_ABI } from "./abis";
import { getAddress, parseUnits, padHex } from "viem";
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
  const rawRouter = routers[origin];
  if (!rawRouter) throw new Error("No router for origin");
  const router = getAddress((rawRouter as string).toLowerCase() as `0x${string}`);
  const destChain = (reg.chains as any[] | undefined)?.find((c: any) => c?.key === destination);
  const destDomain = destChain?.hyperlaneDomain as number | undefined;
  if (!destDomain) throw new Error("Missing destination Hyperlane domain");
  // eslint-disable-next-line no-console
  console.debug("[hwrSend] resolveHwr router", rawRouter, "->", router, "destDomain", destDomain);
  const collateralTokens = (route.hwr as any).collateralTokens as Record<string, `0x${string}`> | undefined;
  const syntheticToken = ((route.hwr as any).syntheticToken || {}) as Record<string, `0x${string}`>;
  const rawSpend =
    origin === "optimism" ? syntheticToken?.[origin] : collateralTokens?.[origin];
  if (!rawSpend) throw new Error("Missing token address for origin");
  const spendToken = getAddress((rawSpend as string).toLowerCase() as `0x${string}`);
  // eslint-disable-next-line no-console
  console.debug("[hwrSend] resolveHwr spendToken", rawSpend, "->", spendToken);

  return {
    router,
    spendToken,
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
  const { router, spendToken, destDomain } = resolveHwr(registry, token, origin, destination);

  const tokenMeta = registry.tokens.find((t) => t.symbol === token);
  const decimals = tokenMeta?.decimals ?? 6;
  const amountWei = parseUnits((amount && amount.length > 0 ? amount : "0"), decimals);

  const viemChain = CHAIN_TO_VIEM[origin];
  const envUrl = (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC_URL`] : undefined) ||
    (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC`] : undefined);
  const transport = http(rpcUrls?.[origin] || envUrl);
  const publicClient = createPublicClient({ chain: viemChain, transport });

  const allowance = await publicClient.readContract({
    address: spendToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [sender, router]
  }) as bigint;

  if (allowance < amountWei) {
    await walletClient.writeContract({
      address: spendToken,
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

  const recipientBytes32 = padHex(getAddress(sender), { size: 32 });

  let hash: `0x${string}`;
  try {
    hash = await walletClient.writeContract({
      address: router,
      abi: HWR_ROUTER_ABI,
      functionName: "transferRemote",
      args: [BigInt(destDomain), recipientBytes32, amountWei],
      value: gasPayment > 0n ? gasPayment : undefined,
      account: sender
    });
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (msg.toLowerCase().includes("underpriced") || msg.toLowerCase().includes("replacement")) {
      const base = await publicClient.getGasPrice().catch(() => 0n);
      const bumped = base > 0n ? (base * 120n) / 100n : undefined;
      hash = await walletClient.writeContract({
        address: router,
        abi: HWR_ROUTER_ABI,
        functionName: "transferRemote",
        args: [BigInt(destDomain), recipientBytes32, amountWei],
        value: gasPayment > 0n ? gasPayment : undefined,
        gasPrice: bumped,
        account: sender
      });
    } else {
      throw err;
    }
  }

  return { hash, router, gasPayment: gasPayment.toString() };
}
