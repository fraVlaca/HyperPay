import React, { useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { ChainKey, UnifiedRegistry } from "@config/types";
import clsx from "clsx";
import { toast } from "react-toastify";
import { sendOft } from "@lib/oftSend";
import { getDevWalletClient } from "@lib/wallet";
import { useSkateboard } from "@lib/skateboard";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
};


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
  const { show, hide } = useSkateboard();

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
        disabled={busy}
        className={clsx(
          "w-full rounded-md px-3 py-2 text-sm text-white",
          busy ? "bg-gray-700" : "bg-gray-900",
          busy && "opacity-50"
        )}
        onClick={async () => {
          try {
            setBusy(true);
            show();
            let client = walletClient;
            let fromAddr = address;
            if (!client || !fromAddr) {
              const devClient = await getDevWalletClient(origin);
              if (!devClient) {
                toast.error("Connect a wallet first");
                setBusy(false);
                hide();
                return;
              }
              // @ts-ignore
              client = devClient;
              // @ts-ignore
              fromAddr = (devClient.account?.address as string) as any;
            }
            const expectedChainId = CHAIN_IDS[origin];
            if (expectedChainId && (client as any)?.chain && (client as any).chain.id !== expectedChainId) {
              toast.error(`Switch wallet to ${origin} to send`);
              setBusy(false);
              hide();
              return;
            }
            const { hash } = await sendOft({
              registry,
              token,
              origin,
              destination,
              amount: amount || "0",
              sender: fromAddr as `0x${string}`,
              walletClient: client
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
        Review & Send
      </button>
    </div>
  );
}
