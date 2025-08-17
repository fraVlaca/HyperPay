import type { UnifiedRegistry, ChainKey } from "@config/types";
import { createPublicClient, http, getAddress, padHex, parseUnits } from "viem";
import { mainnet, arbitrum } from "viem/chains";

const CHAIN_TO_VIEM: Record<string, any> = {
  ethereum: mainnet,
  arbitrum
};

export const OFT_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },

  { type: "function", name: "quoteSend", stateMutability: "view", inputs: [{ type: "uint32" }, { type: "bytes32" }, { type: "uint256" }, { type: "bytes" }], outputs: [{ name: "nativeFee", type: "uint256" }, { name: "lzTokenFee", type: "uint256" }] },
  { type: "function", name: "send", stateMutability: "payable", inputs: [{ type: "uint32" }, { type: "bytes32" }, { type: "uint256" }, { type: "bytes" }, { type: "bytes" }], outputs: [] },

  { type: "function", name: "sendFrom", stateMutability: "payable", inputs: [{ type: "address" }, { type: "uint16" }, { type: "bytes" }, { type: "uint256" }, { type: "address" }, { type: "address" }, { type: "bytes" }], outputs: [] }
] as const;

function resolveOft(reg: UnifiedRegistry, token: string, origin: ChainKey, destination: ChainKey) {
  const route = reg.routes.find((r) => r.bridgeType === "OFT" && r.oft.token === token);
  if (!route || route.bridgeType !== "OFT") throw new Error("OFT route not found");
  const addrs = route.oft.oft as Record<string, `0x${string}`>;
  const eids = (route.oft.endpointIds || {}) as Record<string, number>;
  const tokenAddr = addrs[origin];
  const toEid = eids[destination];
  if (!tokenAddr) throw new Error(`No OFT adapter address configured on ${origin} for ${token}`);
  if (!toEid) throw new Error(`Missing LayerZero endpoint id for destination ${destination}`);
  return { tokenAddr, toEid };
}

export async function sendOft(params: {
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
  const { tokenAddr, toEid } = resolveOft(registry, token, origin, destination);

  const tokenMeta = registry.tokens.find((t) => t.symbol === token);
  const decimals = tokenMeta?.decimals ?? 6;
  const amountWei = parseUnits((amount && amount.length > 0 ? amount : "0"), decimals);

  const viemChain = CHAIN_TO_VIEM[origin];
  const envUrl = (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC_URL`] : undefined) ||
                  (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC`] : undefined);
  const transport = http(rpcUrls?.[origin] || envUrl);
  const publicClient = createPublicClient({ chain: viemChain, transport });

  const recipientBytes32 = padHex(getAddress(sender), { size: 32 });
  const emptyBytes = "0x";

  let out: readonly [bigint, bigint];
  try {
    out = await publicClient.readContract({
      address: tokenAddr,
      abi: OFT_ABI,
      functionName: "quoteSend",
      args: [Number(toEid), recipientBytes32, amountWei, emptyBytes]
    }) as any;
  } catch (e: any) {
    throw new Error(e?.shortMessage || e?.message || "quoteSend reverted; verify OFT adapter address and peers");
  }
  const nativeFee = (out?.[0] || 0n) as bigint;

  const hash: `0x${string}` = await walletClient.writeContract({
    address: tokenAddr,
    abi: OFT_ABI,
    functionName: "send",
    args: [Number(toEid), recipientBytes32, amountWei, emptyBytes, emptyBytes],
    value: nativeFee > 0n ? nativeFee : undefined
  });
  return { hash, fee: nativeFee.toString() };
}
