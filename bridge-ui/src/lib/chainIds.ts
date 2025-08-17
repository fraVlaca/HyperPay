import { mainnet, optimism, arbitrum } from "wagmi/chains";

export const chainKeyToId: Record<string, number> = {
  ethereum: mainnet.id,
  optimism: optimism.id,
  arbitrum: arbitrum.id
};
