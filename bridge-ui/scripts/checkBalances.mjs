import { createPublicClient, http } from "viem";
import { mainnet, arbitrum } from "viem/chains";

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }
];

async function main() {
  const addr = process.env.ADDR || "0x84C69E428bC8f2f1bc359F9f1c2a49559df07722";
  const eth = createPublicClient({ chain: mainnet, transport: http(process.env.ETH_RPC || "https://ethereum.publicnode.com") });
  const arb = createPublicClient({ chain: arbitrum, transport: http(process.env.ARB_RPC || "https://arb1.arbitrum.io/rpc") });
  const pyusdEth = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
  const pyusdArb = "0x46850aD61C2B7d64d08c9C754F45254596696984";

  const [symEth, decEth, balEth] = await Promise.all([
    eth.readContract({ address: pyusdEth, abi: ERC20_ABI, functionName: "symbol" }),
    eth.readContract({ address: pyusdEth, abi: ERC20_ABI, functionName: "decimals" }),
    eth.readContract({ address: pyusdEth, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] })
  ]);
  const [symArb, decArb, balArb] = await Promise.all([
    arb.readContract({ address: pyusdArb, abi: ERC20_ABI, functionName: "symbol" }),
    arb.readContract({ address: pyusdArb, abi: ERC20_ABI, functionName: "decimals" }),
    arb.readContract({ address: pyusdArb, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] })
  ]);

  function fmt(bal, dec) {
    const s = bal.toString().padStart(Number(dec)+1, "0");
    return `${s.slice(0, -Number(dec))}.${s.slice(-Number(dec))}`;
  }
  console.log(`ETH ${symEth} balance: ${fmt(balEth, decEth)} (dec ${decEth})`);
  console.log(`ARB ${symArb} balance: ${fmt(balArb, decArb)} (dec ${decArb})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
