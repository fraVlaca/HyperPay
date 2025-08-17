import { parseUnits } from "viem";
import type { ChainKey, UnifiedRegistry } from "@config/types";

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
