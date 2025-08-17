import React, { useEffect, useMemo, useState } from "react";
import type { ChainKey, UnifiedRegistry } from "@config/types";
import { isEdgeAvailable } from "@lib/hwrAdapter";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-toastify";
import { sendHwr } from "@lib/hwrSend";
import { getDevWalletClient } from "@lib/wallet";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  destination: ChainKey; // should be "optimism"
};

export default function MultiSourceToOp({ registry, token, destination }: Props) {
  const [amountEth, setAmountEth] = useState<string>("");
  const [amountArb, setAmountArb] = useState<string>("");
  const [busy, setBusy] = useState<"idle" | "eth" | "arb">("idle");
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const ethOk = useMemo(() => isEdgeAvailable(registry, token, "ethereum", destination), [registry, token, destination]);
  const arbOk = useMemo(() => isEdgeAvailable(registry, token, "arbitrum", destination), [registry, token, destination]);
  const canSubmit = useMemo(
    () => (Number(amountEth || "0") > 0 || Number(amountArb || "0") > 0) && (ethOk || arbOk),
    [amountEth, amountArb, ethOk, arbOk]
  );

  useEffect(() => {
    try {
      const routeAny = (registry.routes as any[] | undefined)?.find(
        (r: any) => r?.bridgeType === "HWR" && r?.hwr?.token === token
      ) as any;
      const edges = routeAny?.hwr?.edges;
      // eslint-disable-next-line no-console
      console.debug(
        "[MultiSourceToOp] token=",
        token,
        "destination=",
        destination,
        "ethOk=",
        ethOk,
        "arbOk=",
        arbOk,
        "edges=",
        edges
      );
    } catch {}
  }, [registry, token, destination, ethOk, arbOk]);

  async function getClient(origin: ChainKey) {
    if (address && walletClient) return walletClient as any;
    const dev = await getDevWalletClient(origin);
    return dev as any;
  }

  async function sendLeg(origin: ChainKey, amount: string) {
    let client = await getClient(origin);
    if (!client) throw new Error("Connect a wallet or set NEXT_PUBLIC_DEV_PRIVATE_KEY");
    const sender = (address || (client?.account?.address as `0x${string}`)) as `0x${string}`;
    const { hash } = await sendHwr({
      registry,
      token,
      origin,
      destination,
      amount: amount || "0",
      sender,
      walletClient: client
    });
    return hash;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">Send from multiple sources to Optimism</div>
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl border p-3">
          <div className="mb-1 text-xs text-gray-500">From Ethereum</div>
          <input
            value={amountEth}
            onChange={(e) => setAmountEth(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          {!ethOk && <div className="mt-1 text-xs text-red-500">No HWR route from Ethereum → {destination}</div>}
          <button
            disabled={!ethOk || !amountEth || Number(amountEth) <= 0 || busy !== "idle"}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 bg-gray-900"
            onClick={async () => {
              if (!ethOk) return;
              try {
                setBusy("eth");
                const hash = await sendLeg("ethereum", amountEth);
                toast.success(`ETH→${destination} submitted: ${hash.slice(0, 10)}…`);
              } catch (e: any) {
                console.error(e);
                toast.error(e?.message || "ETH leg failed");
              } finally {
                setBusy("idle");
              }
            }}
          >
            {busy === "eth" ? "Submitting…" : "Send from Ethereum"}
          </button>
        </div>

        <div className="rounded-xl border p-3">
          <div className="mb-1 text-xs text-gray-500">From Arbitrum</div>
          <input
            value={amountArb}
            onChange={(e) => setAmountArb(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          {!arbOk && <div className="mt-1 text-xs text-red-500">No HWR route from Arbitrum → {destination}</div>}
          <button
            disabled={!arbOk || !amountArb || Number(amountArb) <= 0 || busy !== "idle"}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-50 bg-gray-900"
            onClick={async () => {
              if (!arbOk) return;
              try {
                setBusy("arb");
                const hash = await sendLeg("arbitrum", amountArb);
                toast.success(`ARB→${destination} submitted: ${hash.slice(0, 10)}…`);
              } catch (e: any) {
                console.error(e);
                toast.error(e?.message || "ARB leg failed");
              } finally {
                setBusy("idle");
              }
            }}
          >
            {busy === "arb" ? "Submitting…" : "Send from Arbitrum"}
          </button>
        </div>
      </div>

      <button
        disabled={!canSubmit || busy !== "idle"}
        className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-50"
        onClick={async () => {
          try {
            if (Number(amountEth || "0") > 0 && ethOk) {
              setBusy("eth");
              const h = await sendLeg("ethereum", amountEth);
              toast.success(`ETH→${destination} submitted: ${h.slice(0, 10)}…`);
            }
            if (Number(amountArb || "0") > 0 && arbOk) {
              setBusy("arb");
              const h = await sendLeg("arbitrum", amountArb);
              toast.success(`ARB→${destination} submitted: ${h.slice(0, 10)}…`);
            }
          } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "Multi-source send failed");
          } finally {
            setBusy("idle");
          }
        }}
      >
        {busy !== "idle" ? "Submitting…" : "Send Both"}
      </button>
    </div>
  );
}
