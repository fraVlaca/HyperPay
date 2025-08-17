import { createPublicClient, createWalletClient, http, padHex, getAddress } from "viem";
import { mainnet, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { Options } from "@layerzerolabs/lz-v2-utilities";

const ERC20_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }
];

const OFT_V2_ABI = [
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
];

const toHexBytes = (b) => (typeof b === "string" && b.startsWith("0x")) ? b : ("0x" + Buffer.from(b).toString("hex"));

async function main() {
  const origin = (process.env.ORIGIN || "ethereum").toLowerCase();
  const pk = process.env.DEV_PK || process.env.NEXT_PUBLIC_DEV_PRIVATE_KEY;
  if (!pk) throw new Error("Set DEV_PK env var with the testing private key");
  const account = privateKeyToAccount((pk.startsWith("0x") ? pk : `0x${pk}`));
  const recipient = padHex(getAddress(process.env.RECIPIENT || account.address), { size: 32 });

  let chain, transport, publicClient, walletClient, adapter, token, toEid;
  if (origin === "ethereum") {
    chain = mainnet;
    transport = http(process.env.ETH_RPC || "https://ethereum.publicnode.com");
    adapter = "0xa2C323fE5A74aDffAd2bf3E007E36bb029606444";
    token = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
    toEid = 30110;
  } else if (origin === "arbitrum") {
    chain = arbitrum;
    transport = http(process.env.ARB_RPC || "https://arb1.arbitrum.io/rpc");
    adapter = "0xFaB5891ED867a1195303251912013b92c4fc3a1D";
    token = "0x46850aD61C2B7d64d08c9C754F45254596696984";
    toEid = 30101;
  } else {
    throw new Error("Unsupported ORIGIN; use ethereum or arbitrum");
  }

  publicClient = createPublicClient({ chain, transport });
  walletClient = createWalletClient({ chain, transport, account });

  const amountLD = BigInt(process.env.AMOUNT_LD || "1000000"); // default 1 PYUSD (6d)
  const options = toHexBytes(Options.newOptions().addExecutorLzReceiveOption(300_000, 0).toBytes());

  try {
    const allowance = await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "allowance", args: [account.address, adapter] });
    if (allowance < amountLD) {
      console.log("Approving adapter to spend PYUSD...");
      const approveHash = await walletClient.writeContract({ address: token, abi: ERC20_ABI, functionName: "approve", args: [adapter, amountLD] });
      console.log("approve tx:", approveHash);
    }
  } catch (e) {
    console.log("Allowance/approve step failed or token not standard ERC20 on this chain:", e?.shortMessage || e?.message || e);
  }

  const sendParam = { dstEid: Number(toEid), to: recipient, amountLD, minAmountLD: amountLD, extraOptions: options, composeMsg: "0x", oftCmd: "0x" };
  const fee = await publicClient.readContract({ address: adapter, abi: OFT_V2_ABI, functionName: "quoteSend", args: [sendParam, false] });
  console.log("fee:", fee);

  const receipt = await walletClient.writeContract({
    address: adapter,
    abi: OFT_V2_ABI,
    functionName: "send",
    args: [sendParam, { nativeFee: fee.nativeFee, lzTokenFee: 0n }, account.address],
    value: fee.nativeFee > 0n ? fee.nativeFee : undefined
  });
  console.log("send tx:", receipt);
}

main().catch((e) => { console.error(e); process.exit(1); });
