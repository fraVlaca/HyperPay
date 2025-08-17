export const ERC20_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }
] as const;

export const HWR_ROUTER_ABI = [
  { type: "function", name: "quoteGasPayment", stateMutability: "view", inputs: [{ name: "destinationDomain", type: "uint32" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transferRemote", stateMutability: "payable", inputs: [{ type: "uint32" }, { type: "bytes32" }, { type: "uint256" }], outputs: [] }
] as const;
