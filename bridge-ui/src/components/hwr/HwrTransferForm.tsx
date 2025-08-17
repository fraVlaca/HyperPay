import { useEffect, useMemo, useState } from "react";
import { ChainLogo } from "@hyperlane-xyz/widgets";
import { ChainKey, UnifiedRegistry } from "@config/types";
import { Source } from "../MultiSourcePanel";
import { isEdgeAvailable } from "@lib/hwrAdapter";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-toastify";
import { sendHwr } from "@lib/hwrSend";
import { getDevWalletClient } from "@lib/wallet";
import Collapsible from "@components/ui/Collapsible";
import { buildCrossChainOrder, toUnits } from "@lib/fastIntent";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
  extraSources: Source[];
};

export default function HwrTransferForm({
  registry,
  token,
  origin,
  destination,
  amount,
  extraSources
}: Props) {
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

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
    const envKey = `NEXT_PUBLIC_OUTPUT_SETTLER_${destination.toUpperCase()}`;
    const val = (typeof process !== "undefined" ? (process as any).env?.[envKey] : undefined) as string | undefined;
    if (val) setSettlementAddress(val);
  }, [destination]);

  const edgesOk = useMemo(() => {
    const primaryOk = isEdgeAvailable(registry, token, origin, destination);
    const extrasOk = extraSources.every((s) =>
      isEdgeAvailable(registry, token, s.chain as ChainKey, destination)
    );
    return primaryOk && extrasOk;
  }, [registry, token, origin, destination, extraSources]);

  const summarySubtitle = `${origin} → ${destination} · ${amount || "0"} ${token}`;

  function resolveHwrTokens() {
    const route = registry.routes.find((r) => r.bridgeType === "HWR" && r.hwr.token === token);
    if (!route || route.bridgeType !== "HWR") throw new Error("HWR route not found");
    const collateral = (route.hwr as any).collateralTokens as Record<string, `0x${string}`> | undefined;
    const synthetic = ((route.hwr as any).syntheticToken || {}) as Record<string, `0x${string}`>;
    const input =
      origin === "optimism" ? synthetic?.[origin] : collateral?.[origin];
    const output =
      destination === "optimism" ? synthetic?.[destination] : collateral?.[destination];
    if (!input || !output) throw new Error("Missing token addresses for route");
    return { inputToken: input as `0x${string}`, outputToken: output as `0x${string}` };
  }

  async function handleFastSubmit() {
    try {
      if (!edgesOk) {
        toast.error("No valid HWR edge for this route");
        return;
      }
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
      const decimals = registry.tokens.find((t) => t.symbol === token)?.decimals ?? 6;
      const { inputToken, outputToken } = resolveHwrTokens();
      const inputAmount = toUnits(amount || "0", decimals);
      const minOutputAmount = toUnits(minOut || "0", decimals);
      const destAddr = (destinationAddress || from) as `0x${string}`;
      const settle = settlementAddress as `0x${string}`;

      const order = buildCrossChainOrder({
        registry,
        tokenSymbol: token,
        origin,
        destination,
        decimals,
        swapper: from as `0x${string}`,
        destinationAddress: destAddr,
        inputAmount,
        minOutputAmount,
        settlementAddress: settle,
        inputToken,
        outputToken,
        initiateInSeconds: initiateDeadline,
        fillInSeconds: fillDeadline
      });

      console.debug("[fast-intent][HWR] order", order);
      toast.info("Fast transfer intent prepared. Check console for details.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to prepare fast transfer");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChainLogo chainName={origin} size={18} />
        <span className="text-sm">{origin}</span>
        <span className="text-gray-400">→</span>
        <ChainLogo chainName={destination} size={18} />
        <span className="text-sm">{destination}</span>
      </div>

      <Collapsible title="Connection route" subtitle={summarySubtitle} defaultOpen={false}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-gray-500">Token</div>
            <div className="text-sm">{token}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Amount</div>
            <div className="text-sm">{amount || "0"}</div>
          </div>
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

      {!edgesOk && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No HWR edge found for one of the selected paths. Adjust your selection.
        </div>
      )}


      <div className="flex items-center justify-between -mt-1">
        <button
          disabled={!edgesOk || busy}
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-50"
          onClick={async () => {
          if (!edgesOk) {
            toast.error("No valid HWR edge for this route");
            return;
          }
          let client = walletClient;
          if (!address || !client) {
            const devClient = await getDevWalletClient(origin);
            if (!devClient) {
              toast.error("Connect a wallet first");
              return;
            }
            client = devClient as any;
          }
          try {
            setBusy(true);
            const tx = await sendHwr({
              registry,
              token,
              origin,
              destination,
              amount: amount || "0",
              sender: (address || (client?.account?.address as `0x${string}`)) as `0x${string}`,
              walletClient: client
            });
            toast.success(`Submitted: ${tx.hash.slice(0, 10)}…`);
          } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "HWR transfer failed");
          } finally {
            setBusy(false);
          }
          }}
        >
          {busy ? "Submitting…" : "Submit normal transfer"}
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
          disabled={!edgesOk}
          className="rounded-xl bg-brand-700 hover:bg-brand-800 px-4 py-2.5 text-sm text-white disabled:opacity-50"
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
