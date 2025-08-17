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
    token: "PYUSD",
    origin: "ethereum" as ChainKey,
    destination: "optimism" as ChainKey,
    amount: ""
  });
  const [extraSources, setExtraSources] = useState<Source[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    loadRegistry().then(setRegistry);
    const last = readLastSelection();
    if (last && last.origin && last.destination) {
      setSelection({
        token: (last.token as any) || "PYUSD",
        origin: last.origin as ChainKey,
        destination: last.destination as ChainKey,
        amount: last.amount || ""
      });
    } else {
      setSelection((prev) => ({ ...prev, token: "PYUSD", origin: "ethereum", destination: "optimism" }));
    }
  }, []);

  useEffect(() => {
    saveLastSelection(selection);
  }, [selection]);

  const detection = useMemo(() => {
    if (!registry) return null;
    const res = detectRoute(registry, {
      token: selection.token,
      origin: selection.origin,
      destination: selection.destination
    });
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

  const canProceed =
    detection?.bridge === "HWR" || detection?.bridge === "OFT"
      ? Boolean(selection.amount && selection.amount.length > 0 && selection.origin !== selection.destination)
      : false;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {step === 1 && (
        <div className="space-y-4 animate-[fadeIn_.2s_ease]">
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
          <div className="flex justify-end">
            <button
              disabled={!canProceed}
              className={`rounded-md px-4 py-2 text-sm text-white transition ${
                canProceed ? "bg-brand-700 hover:bg-brand-800" : "bg-gray-300"
              }`}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-[fadeIn_.2s_ease]">
          <div className="flex justify-between">
            <button
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <div className="text-xs text-gray-500">{badge.text}</div>
          </div>

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
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
