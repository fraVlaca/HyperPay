import type { UnifiedRegistry, ChainKey } from "@config/types";
import { createPublicClient, http, getAddress, padHex, parseUnits } from "viem";
import { mainnet, arbitrum } from "viem/chains";

const CHAIN_TO_VIEM: Record<string, any> = {
  ethereum: mainnet,
  arbitrum
};

export const OFT_ABI = [
  {
    type: "function",
    name: "quoteSend",
    stateMutability: "view",
    inputs: [
      {
        type: "tuple",
        name: "sendParam",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" }
        ]
      },
      { name: "payInLzToken", type: "bool" }
    ],
    outputs: [
      {
        name: "fee",
        type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "send",
    stateMutability: "payable",
    inputs: [
      {
        type: "tuple",
        name: "sendParam",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" }
        ]
      },
      {
        type: "tuple",
        name: "fee",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" }
        ]
      },
      { name: "refundAddress", type: "address" }
    ],
    outputs: [
      {
        name: "receipt",
        type: "tuple",
        components: [
          { name: "guid", type: "bytes32" },
          { name: "nonce", type: "uint64" },
          { name: "fee", type: "uint256" },
          { name: "valueSent", type: "uint256" }
        ]
      }
    ]
  }
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

  const { Options } = await import("@layerzerolabs/lz-v2-utilities");
  const toHexBytes = (b: any) => (typeof b === "string" && b.startsWith("0x")) ? b : ("0x" + Buffer.from(b as Uint8Array).toString("hex"));
  const lzOptions = toHexBytes(Options.newOptions().addExecutorLzReceiveOption(300_000, 0).toBytes()) as `0x${string}`;

  const sendParam = {
    dstEid: Number(toEid),
    to: recipientBytes32,
    amountLD: amountWei,
    minAmountLD: amountWei,
    extraOptions: lzOptions,
    composeMsg: "0x",
    oftCmd: "0x"
  } as const;

  let fee: { nativeFee: bigint; lzTokenFee: bigint };
  try {
    fee = await publicClient.readContract({
      address: tokenAddr,
      abi: OFT_ABI,
      functionName: "quoteSend",
      args: [sendParam, false]
    }) as any;
  } catch (e: any) {
    throw new Error(e?.shortMessage || e?.message || "quoteSend reverted; verify OFT adapter address and peers");
  }
  const nativeFee = (fee?.nativeFee || 0n) as bigint;

  const receipt: { guid: `0x${string}` } = await walletClient.writeContract({
    address: tokenAddr,
    abi: OFT_ABI,
    functionName: "send",
    args: [sendParam, { nativeFee, lzTokenFee: 0n }, sender],
    value: nativeFee > 0n ? nativeFee : undefined
  });
  return { hash: (receipt as any)?.guid || (receipt as any), fee: nativeFee.toString() };
}
