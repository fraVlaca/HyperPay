import React, { useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { ChainKey, UnifiedRegistry } from "@config/types";
import clsx from "clsx";
import { toast } from "react-toastify";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
};

async function fetchOftTx(
  apiBase: string,
  params: {
    token: string;
    origin: string;
    destination: string;
    amount: string;
    addresses: Record<string, string>;
    eids: Record<string, number>;
    sender: string;
  }
) {
  const res = await fetch(`${apiBase}/transfer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error("Failed to get OFT tx");
  return res.json();
}

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453
};

export default function OftTransferForm({
  registry,
  token,
  origin,
  destination,
  amount
}: Props) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);
  const apiBase =
    process.env.NEXT_PUBLIC_OFT_API_BASE || "https://api.layerzero.app/oft";

  const cfg = useMemo(() => {
    const route = registry.routes.find(
      (r) => r.bridgeType === "OFT" && r.oft.token === token
    );
    const addresses = route && route.bridgeType === "OFT" ? route.oft.oft : {};
    const eids = route && route.bridgeType === "OFT" ? (route.oft.endpointIds || {}) : {};
    return { addresses, eids };
  }, [registry, token]);

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
        <div>Token: {token}</div>
        <div>
          Route: {origin} -&gt; {destination}
        </div>
        <div>Amount: {amount || "0"}</div>
      </div>

      <button
        disabled={!address || busy}
        className={clsx(
          "w-full rounded-md px-3 py-2 text-sm text-white",
          busy ? "bg-gray-700" : "bg-gray-900",
          (!address || busy) && "opacity-50"
        )}
        onClick={async () => {
          if (!address || !walletClient) {
            toast.error("Connect a wallet first");
            return;
          }
          const expectedChainId = CHAIN_IDS[origin];
          if (expectedChainId && walletClient.chain && walletClient.chain.id !== expectedChainId) {
            toast.error(`Switch wallet to ${origin} to send`);
            return;
          }
          setBusy(true);
          try {
            const txResp = await fetchOftTx(apiBase, {
              token,
              origin,
              destination,
              amount: amount || "0",
              addresses: cfg.addresses as Record<string, string>,
              eids: cfg.eids as Record<string, number>,
              sender: address
            });

            const tx = txResp?.tx || txResp;
            if (!tx?.to || !tx?.data) {
              console.log("Unexpected OFT API response", txResp);
              toast.error("Invalid OFT API response");
              return;
            }

            const hash = await walletClient.sendTransaction({
              to: tx.to as `0x${string}`,
              data: tx.data as `0x${string}`,
              value: tx.value ? BigInt(tx.value) : undefined
            });

            toast.success(`Submitted: ${hash.slice(0, 10)}…`);
          } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "OFT transfer failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        Review &amp; Send
      </button>
    </div>
  );
}
