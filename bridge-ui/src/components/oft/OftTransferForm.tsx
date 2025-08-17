import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { ChainKey, UnifiedRegistry } from "@config/types";
import clsx from "clsx";
import { toast } from "react-toastify";
import { sendOft } from "@lib/oftSend";
import { getDevWalletClient } from "@lib/wallet";
import Collapsible from "@components/ui/Collapsible";
import { toUnits, sendFastIntent, getOutputSettlerAddress } from "@lib/fastIntent";

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
  optimism: 10,
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

  const [note, setNote] = useState<string>("");
  const [settlementAddress, setSettlementAddress] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [minOut, setMinOut] = useState<string>("");
  const [initiateDeadline, setInitiateDeadline] = useState<number>(3600);
  const [fillDeadline, setFillDeadline] = useState<number>(7200);

  useEffect(() => {
    if (address && !destinationAddress) setDestinationAddress(address);
  }, [address, destinationAddress]);

  useEffect(() => {
    const dec = registry.tokens.find((t) => t.symbol === token)?.decimals ?? 6;
    const amt = amount && amount.length > 0 ? amount : "0";
    const ninetyFive = (() => {
      try {
        const v = Number(amt);
        if (!isFinite(v)) return "0";
        return (v * 0.95).toString();
      } catch {
        return "0";
      }
    })();
    setMinOut(ninetyFive);
  }, [amount, token, registry]);

  useEffect(() => {
    const val = getOutputSettlerAddress(destination);
    if (val) setSettlementAddress(val);
  }, [destination]);

  const cfg = useMemo(() => {
    const route = registry.routes.find(
      (r) => r.bridgeType === "OFT" && r.oft.token === token
    );
    const addresses = route && route.bridgeType === "OFT" ? route.oft.oft : {};
    const eids = route && route.bridgeType === "OFT" ? (route.oft.endpointIds || {}) : {};
    return { addresses, eids };
  }, [registry, token]);

  const summarySubtitle = `${origin} → ${destination} · ${amount || "0"} ${token}`;

  function resolveOftTokens() {
    const route = registry.routes.find((r) => r.bridgeType === "OFT" && r.oft.token === token);
    if (!route || route.bridgeType !== "OFT") throw new Error("OFT route not found");
    const addrs = route.oft.oft as Record<string, `0x${string}`>;
    const input = addrs[origin];
    const output = addrs[destination];
    if (!input || !output) throw new Error("Missing OFT token addresses");
    return { inputToken: input as `0x${string}`, outputToken: output as `0x${string}` };
  }

  async function handleFastSubmit() {
    try {
      let client = walletClient as any;
      let from = address as `0x${string}` | undefined;
      if (!client || !from) {
        const devClient = await getDevWalletClient(origin);
        if (!devClient) {
          toast.error("Connect a wallet first");
          return;
        }
        client = devClient as any;
        from = (devClient.account?.address as `0x${string}`) as any;
      }
      const expectedChainId = CHAIN_IDS[origin];
      if (expectedChainId && client?.chain && client.chain.id !== expectedChainId) {
        toast.error(`Switch wallet to ${origin} to send`);
        return;
      }
      const decimals = registry.tokens.find((t) => t.symbol === token)?.decimals ?? 6;
      const { inputToken, outputToken } = resolveOftTokens();
      const inputAmount = toUnits(amount || "0", decimals);
      const minOutputAmount = toUnits(minOut || "0", decimals);
      const destAddr = (destinationAddress || from) as `0x${string}`;
      const now = Math.floor(Date.now() / 1000);
      const absFill = now + (fillDeadline || 7200);
 
      const { hash } = await sendFastIntent({
        origin,
        destination,
        walletClient: client,
        sender: from as `0x${string}`,
        inputToken,
        inputAmount,
        outputToken,
        outputAmount: minOutputAmount,
        outputRecipient: destAddr,
        fillDeadline: absFill
      });
 
      toast.success(`Intent submitted: ${hash.slice(0, 10)}…`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to submit fast transfer intent");
    }
  }

  return (
    <div className="space-y-3">
      <Collapsible title="Connection route" subtitle={summarySubtitle} defaultOpen={false}>
        <div className="text-xs text-gray-700 space-y-1">
          <div>Token: {token}</div>
          <div>Route: {origin} -&gt; {destination}</div>
          <div>Amount: {amount || "0"}</div>
        </div>
        <div className="mt-3 space-y-2">
          <label className="text-xs text-gray-500">Note (optional)</label>
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
            placeholder="Add a note for your records"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Collapsible>

      <div className="flex items-center justify-between -mt-1">
        <button
          disabled={busy}
          className={clsx(
            "rounded-xl px-4 py-2.5 text-sm text-white",
            busy ? "bg-gray-700" : "bg-gray-900",
            busy && "opacity-50"
          )}
          onClick={async () => {
          try {
            setBusy(true);
            let client = walletClient;
            let fromAddr = address;
            if (!client || !fromAddr) {
              const devClient = await getDevWalletClient(origin);
              if (!devClient) {
                toast.error("Connect a wallet first");
                setBusy(false);
                return;
              }
              client = devClient as any;
              fromAddr = (devClient as any).account?.address as any;
            }
            const expectedChainId = CHAIN_IDS[origin];
            if (expectedChainId && (client as any)?.chain && (client as any).chain.id !== expectedChainId) {
              toast.error(`Switch wallet to ${origin} to send`);
              setBusy(false);
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
          Submit normal transfer
        </button>
        <div className="inline-flex items-center gap-1 text-[11px] text-gray-600 leading-none relative top-[3px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-80"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2"/></svg>
          <span>3m</span>
        </div>
      </div>

      <Collapsible title="Fast transfer parameters" subtitle="Configure solver intent" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500">Settlement address</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="0x..."
              value={settlementAddress}
              onChange={(e) => setSettlementAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-gray-500">Destination address</div>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="0x..."
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500">Min output amount ({token})</div>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="0.0"
                value={minOut}
                onChange={(e) => setMinOut(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-gray-500">Initiate deadline (seconds from now)</div>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                type="number"
                min={60}
                value={initiateDeadline}
                onChange={(e) => setInitiateDeadline(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500">Fill deadline (seconds from now)</div>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                type="number"
                min={120}
                value={fillDeadline}
                onChange={(e) => setFillDeadline(parseInt(e.target.value || "0", 10))}
              />
            </div>
          </div>

        </div>
      </Collapsible>

      <div className="flex items-center justify-between -mt-1">
        <button
          className="rounded-xl bg-brand-700 hover:bg-brand-800 px-4 py-2.5 text-sm text-white"
          onClick={handleFastSubmit}
        >
          Submit Fast Transfer
        </button>
        <div className="inline-flex items-center gap-1 text-[11px] text-gray-600 leading-none relative top-[3px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-80"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2"/></svg>
          <span>20s</span>
        </div>
      </div>
    </div>
  );
}
