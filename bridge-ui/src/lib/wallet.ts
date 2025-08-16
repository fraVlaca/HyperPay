import { createWalletClient, custom, http } from "viem";
import { mainnet, arbitrum, optimism } from "viem/chains";

const CHAIN_TO_VIEM: Record<string, any> = {
  ethereum: mainnet,
  arbitrum,
  optimism
};

export async function getDevWalletClient(origin: string) {
  const pk = (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_DEV_PRIVATE_KEY : undefined) as string | undefined;
  if (!pk) return null;
  const chain = CHAIN_TO_VIEM[origin];
  if (!chain) return null;
  const rpc =
    (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC_URL`] : undefined) ||
    (typeof process !== "undefined" ? (process as any).env?.[`NEXT_PUBLIC_${origin.toUpperCase()}_RPC`] : undefined);
  const transport = http(rpc);
  const account = `0x${pk.replace(/^0x/, "")}` as `0x${string}`;
  const walletClient = createWalletClient({
    chain,
    transport,
    account
  });
  return walletClient;
}
