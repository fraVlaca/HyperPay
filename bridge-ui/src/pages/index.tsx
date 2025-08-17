import { useEffect, useMemo, useState } from "react";
import { ChainKey, UnifiedRegistry } from "@config/types";
import { loadRegistry, readLastSelection, saveLastSelection } from "@lib/registryLoader";
import { detectRoute } from "@lib/routeDetector";
import BridgeSelector from "@components/BridgeSelector";
import HwrBridgePanel from "@components/HwrBridgePanel";
import OftBridgePanel from "@components/OftBridgePanel";
import MultiSourcePanel, { Source } from "@components/MultiSourcePanel";

export default function Home() {
  const [registry, setRegistry] = useState<UnifiedRegistry | null>(null);
  const [selection, setSelection] = useState({
    token: "ETH",
    origin: "arbitrum" as ChainKey,
    destination: "ethereum" as ChainKey,
    amount: ""
  });
  const [extraSources, setExtraSources] = useState<Source[]>([]);

  useEffect(() => {
    loadRegistry().then(setRegistry);
    const last = readLastSelection();
    if (last && last.origin && last.destination) {
      setSelection({
        token: last.token as any,
        origin: last.origin as ChainKey,
        destination: last.destination as ChainKey,
        amount: last.amount || ""
      });
    } else {
      // Ensure we never start with empty origin/destination
      setSelection((prev) => ({ ...prev, origin: "ethereum", destination: "optimism" }));
    }
  }, []);

  useEffect(() => {
    saveLastSelection(selection);
  }, [selection]);

  const detection = useMemo(() => {
    if (!registry) return null;
    if (typeof window !== "undefined") {
      try {
        console.debug("[index] selection =", JSON.stringify(selection));
      } catch {}
    }
    const res = detectRoute(registry, {
      token: selection.token,
      origin: selection.origin,
      destination: selection.destination
    });
    if (typeof window !== "undefined") {
      try {
        console.debug("[index] detection =", res);
      } catch {}
    }
    return res;
  }, [registry, selection]);

  if (!registry) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div>Loading…</div>
      </div>
    );
  }

  const badge =
    detection?.bridge === "HWR"
      ? { text: "Using Hyperlane HWR", tone: "success" as const }
      : detection?.bridge === "OFT"
      ? { text: "Using LayerZero OFT", tone: "warning" as const }
      : { text: "No route available" };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <BridgeSelector
        registry={registry}
        selection={selection}
        onChange={(next) =>
          setSelection((prev) => ({
            token: next.token || prev.token,
            origin: (next.origin && next.origin.length > 0 ? next.origin : prev.origin) as ChainKey,
            destination: (next.destination && next.destination.length > 0
              ? next.destination
              : prev.destination) as ChainKey,
            amount: typeof next.amount === "string" ? next.amount : prev.amount
          }))
        }
        bridgeBadge={badge}
        canAddSource={detection?.bridge === "HWR" && detection.supportsMultiSource === true}
        onAddSource={() => {
          if (detection?.bridge === "HWR" && detection.supportsMultiSource) {
            setExtraSources([...extraSources, { chain: selection.origin, amount: "" }]);
          }
        }}
      />

      {detection?.bridge === "HWR" ? (
        <div className="space-y-4">
          {detection.supportsMultiSource ? (
            <MultiSourcePanel
              registry={registry}
              token={selection.token}
              destination={selection.destination}
              sources={extraSources}
              onSourcesChange={setExtraSources}
            />
          ) : null}
          <HwrBridgePanel
            registry={registry}
            token={selection.token}
            origin={selection.origin}
            destination={selection.destination}
            amount={selection.amount}
            extraSources={extraSources}
          />
        </div>
      ) : detection?.bridge === "OFT" ? (
        <OftBridgePanel
          registry={registry}
          token={selection.token}
          origin={selection.origin}
          destination={selection.destination}
          amount={selection.amount}
        />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-gray-600">
          No route available for this selection.
        </div>
      )}
    </div>
  );
}
