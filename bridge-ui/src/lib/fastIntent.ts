import { createPublicClient, encodeAbiParameters, getAddress, http, padHex, parseUnits } from "viem";
import type { ChainKey } from "@config/types";
import { mainnet, arbitrum, optimism, base } from "viem/chains";
import { ERC20_ABI } from "./abis";

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

export function toUnits(amount: string, decimals: number): string {
  return parseUnits((amount && amount.length > 0 ? amount : "0"), decimals).toString();
}

export const INPUT_SETTLER_ABI = [
  {
    type: "function",
    name: "open",
    stateMutability: "nonpayable",
    inputs: [{ name: "order", type: "bytes" }],
    outputs: [],
  },
  {
    type: "event",
    name: "Open",
    inputs: [
      { name: "orderId", type: "bytes32", indexed: true },
      { name: "order", type: "bytes", indexed: false },
    ],
    anonymous: false,
  },
] as const;

const INPUT_SETTLERS_STATIC: Partial<Record<ChainKey, string | undefined>> = {
  ethereum: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_INPUT_SETTLER_ETHEREUM : undefined),
  arbitrum: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_INPUT_SETTLER_ARBITRUM : undefined),
  optimism: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_INPUT_SETTLER_OPTIMISM : undefined),
  base: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_INPUT_SETTLER_BASE : undefined),
};

export function getInputSettlerAddress(origin: ChainKey): `0x${string}` | undefined {
  const val = INPUT_SETTLERS_STATIC[origin];
  return val ? (getAddress(val) as `0x${string}`) : undefined;
}

export function getOutputSettlerAddress(dest: ChainKey): `0x${string}` | undefined {
  const map: Partial<Record<ChainKey, string | undefined>> = {
    ethereum: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_OUTPUT_SETTLER_ETHEREUM : undefined),
    arbitrum: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_OUTPUT_SETTLER_ARBITRUM : undefined),
    optimism: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_OUTPUT_SETTLER_OPTIMISM : undefined),
    base: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_OUTPUT_SETTLER_BASE : undefined),
  };
  const val = map[dest];
  return val ? (getAddress(val) as `0x${string}`) : undefined;
}

export function getOracleAddress(chain: ChainKey): `0x${string}` | undefined {
  const map: Partial<Record<ChainKey, string | undefined>> = {
    ethereum: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_HYPERLANE_ORACLE_ETHEREUM : undefined) || "0xc005dc82818d67AF737725bD4bf75435d065D239",
    arbitrum: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_HYPERLANE_ORACLE_ARBITRUM : undefined) || "0x77818DE6a93f0335E9A5817314Bb1e879d319C6F",
    optimism: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_HYPERLANE_ORACLE_OPTIMISM : undefined) || "0x77818DE6a93f0335E9A5817314Bb1e879d319C6F",
    base: (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_HYPERLANE_ORACLE_BASE : undefined),
  };
  const val = map[chain];
  return val ? (getAddress(val) as `0x${string}`) : undefined;
}

function addressToBytes32(addr: `0x${string}`): `0x${string}` {
  return padHex(getAddress(addr), { size: 32 });
}

function addressToUint(addr: `0x${string}`): bigint {
  return BigInt(getAddress(addr));
}

function encodeStandardOrder(params: {
  user: `0x${string}`;
  originChainId: number;
  expires: number;
  fillDeadline: number;
  inputOracle: `0x${string}`;
  inputs: { token: `0x${string}`; amount: bigint }[];
  outputs: {
    oracle: `0x${string}`;
    settler: `0x${string}`;
    chainId: number;
    token: `0x${string}`;
    amount: bigint;
    recipient: `0x${string}`;
    call?: `0x${string}`;
    context?: `0x${string}`;
  }[];
}): `0x${string}` {
  const tuple = {
    user: params.user,
    nonce: BigInt(Math.floor(Date.now() / 1000)),
    originChainId: BigInt(params.originChainId),
    expires: params.expires,
    fillDeadline: params.fillDeadline,
    inputOracle: params.inputOracle,
    inputs: params.inputs.map((i) => [addressToUint(i.token), i.amount]),
    outputs: params.outputs.map((o) => ({
      oracle: addressToBytes32(o.oracle),
      settler: addressToBytes32(o.settler),
      chainId: BigInt(o.chainId),
      token: addressToBytes32(o.token),
      amount: o.amount,
      recipient: addressToBytes32(o.recipient),
      call: o.call || "0x",
      context: o.context || "0x",
    })),
  };

  return (encodeAbiParameters as any)(
    [
      {
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "originChainId", type: "uint256" },
          { name: "expires", type: "uint32" },
          { name: "fillDeadline", type: "uint32" },
          { name: "inputOracle", type: "address" },
          { name: "inputs", type: "uint256[2][]" },
          {
            name: "outputs",
            type: "tuple[]",
            components: [
              { name: "oracle", type: "bytes32" },
              { name: "settler", type: "bytes32" },
              { name: "chainId", type: "uint256" },
              { name: "token", type: "bytes32" },
              { name: "amount", type: "uint256" },
              { name: "recipient", type: "bytes32" },
              { name: "call", type: "bytes" },
              { name: "context", type: "bytes" }
            ],
          },
        ],
      } as const,
    ],
    [tuple]
  );
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

  const inputOracle = getOracleAddress(origin);
  const outputOracle = getOracleAddress(destination);
  const outputSettler = getOutputSettlerAddress(destination);
  if (!inputOracle || !outputOracle || !outputSettler) {
    throw new Error("Missing oracle or output settler configuration");
  }

  const encodedOrder = encodeStandardOrder({
    user: sender,
    originChainId: resolveChainId(origin),
    expires: Math.max(Math.floor(Date.now() / 1000) + 7200, fillDeadline + 3600),
    fillDeadline,
    inputOracle,
    inputs: [{ token: inputToken, amount: BigInt(inputAmount) }],
    outputs: [
      {
        oracle: outputOracle,
        settler: outputSettler,
        chainId: resolveChainId(destination),
        token: outputToken,
        amount: BigInt(outputAmount),
        recipient: outputRecipient,
      },
    ],
  });

  const hash: `0x${string}` = await walletClient.writeContract({
    address: settler,
    abi: INPUT_SETTLER_ABI,
    functionName: "open",
    args: [encodedOrder],
    account: sender,
  });

  return { hash };
}
