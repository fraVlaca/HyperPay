import { createPublicClient, getAddress, http, padHex, parseUnits } from "viem";
import type { ChainKey, UnifiedRegistry } from "@config/types";
import { mainnet, arbitrum, optimism, base } from "viem/chains";
import { ERC20_ABI } from "./abis";

export type CrossChainOrder = {
  settlementAddress: `0x${string}`;
  swapper: `0x${string}`;
  nonce: string;
  originChainId: number;
  initiateDeadline: number;
  fillDeadline: number;
  orderData: {
    inputToken: `0x${string}`;
    inputAmount: string;
    outputToken: `0x${string}`;
    minOutputAmount: string;
    destinationChainId: number;
    destinationAddress: `0x${string}`;
  };
};

const CHAIN_TO_VIEM: Record<string, any> = {
  ethereum: mainnet,
  arbitrum,
  optimism,
  base,
};

export function resolveChainId(chain: ChainKey): number {
  const map: Record<string, number> = {
    ethereum: 1,
    arbitrum: 42161,
    optimism: 10,
    base: 8453,
  };
  const id = map[chain];
  if (!id) throw new Error(`Unsupported chain id for ${chain}`);
  return id;
}

export function buildCrossChainOrder(params: {
  registry: UnifiedRegistry;
  tokenSymbol: string;
  origin: ChainKey;
  destination: ChainKey;
  decimals?: number;
  swapper: `0x${string}`;
  destinationAddress: `0x${string}`;
  inputAmount: string;
  minOutputAmount: string;
  settlementAddress: `0x${string}`;
  now?: number;
  inputToken: `0x${string}`;
  outputToken: `0x${string}`;
  initiateInSeconds?: number;
  fillInSeconds?: number;
}): CrossChainOrder {
  const now = params.now || Math.floor(Date.now() / 1000);
  const originChainId = resolveChainId(params.origin);
  const destinationChainId = resolveChainId(params.destination);

  const initiateSeconds = typeof params.initiateInSeconds === "number" ? params.initiateInSeconds : 3600;
  const fillSeconds = typeof params.fillInSeconds === "number" ? params.fillInSeconds : 7200;

  const order: CrossChainOrder = {
    settlementAddress: params.settlementAddress,
    swapper: params.swapper,
    nonce: BigInt(now).toString(),
    originChainId,
    initiateDeadline: now + initiateSeconds,
    fillDeadline: now + fillSeconds,
  orderData: {
      inputToken: params.inputToken,
      inputAmount: params.inputAmount,
      outputToken: params.outputToken,
      minOutputAmount: params.minOutputAmount,
      destinationChainId,
      destinationAddress: params.destinationAddress,
    },
  };
  return order;
}

export function toUnits(amount: string, decimals: number): string {
  return parseUnits((amount && amount.length > 0 ? amount : "0"), decimals).toString();
}

export const INPUT_SETTLER_ABI = [
  {
    type: "function",
    name: "openIntent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "outputToken", type: "address" },
      { name: "outputAmount", type: "uint256" },
      { name: "outputChainId", type: "uint256" },
      { name: "outputRecipient", type: "bytes32" },
      { name: "fillDeadline", type: "uint256" },
      { name: "inputToken", type: "address" },
      { name: "inputAmount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
] as const;

export function getInputSettlerAddress(origin: ChainKey): `0x${string}` | undefined {
  const envKey = `NEXT_PUBLIC_INPUT_SETTLER_${origin.toUpperCase()}`;
  const val = (typeof process !== "undefined" ? (process as any).env?.[envKey] : undefined) as string | undefined;
  return val ? (getAddress(val) as `0x${string}`) : undefined;
}

export async function sendFastIntent(params: {
  origin: ChainKey;
  destination: ChainKey;
  walletClient: any;
  sender: `0x${string}`;
  inputToken: `0x${string}`;
  inputAmount: string;
  outputToken: `0x${string}`;
  outputAmount: string;
  outputRecipient: `0x${string}`;
  fillDeadline: number;
  inputSettler?: `0x${string}`;
  rpcUrls?: Partial<Record<ChainKey, string>>;
}) {
  const {
    origin,
    destination,
    walletClient,
    sender,
    inputToken,
    inputAmount,
    outputToken,
    outputAmount,
    outputRecipient,
    fillDeadline,
    inputSettler,
    rpcUrls
  } = params;

  const settler =
    inputSettler ||
    (getInputSettlerAddress(origin) as `0x${string}` | undefined);

  if (!settler) {
    throw new Error(`Missing input settler for ${origin}. Set NEXT_PUBLIC_INPUT_SETTLER_${origin.toUpperCase()}`);
  }

  const viemChain = CHAIN_TO_VIEM[origin];
  const envUrl =
    (typeof process !== "undefined"
      ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC_URL`]
      : undefined) ||
    (typeof process !== "undefined"
      ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC`]
      : undefined);
  const transport = http(rpcUrls?.[origin] || envUrl);
  const publicClient = createPublicClient({ chain: viemChain, transport });

  const allowance = (await publicClient.readContract({
    address: inputToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [sender, settler]
  })) as bigint;

  const needed = BigInt(inputAmount);
  if (allowance < needed) {
    await walletClient.writeContract({
      address: inputToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [settler, needed],
      account: sender
    });
  }

  const outputRecipientBytes32 = padHex(getAddress(outputRecipient), { size: 32 });
  const outputChainId = resolveChainId(destination);

  const hash: `0x${string}` = await walletClient.writeContract({
    address: settler,
    abi: INPUT_SETTLER_ABI,
    functionName: "openIntent",
    args: [
      outputToken,
      BigInt(outputAmount),
      BigInt(outputChainId),
      outputRecipientBytes32,
      BigInt(fillDeadline),
      inputToken,
      BigInt(inputAmount)
    ],
    account: sender
  });

  return { hash };
}
