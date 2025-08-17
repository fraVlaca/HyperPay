import { useEffect, useMemo, useRef, useState } from "react";
import { ChainKey, UnifiedRegistry } from "@config/types";
import { loadRegistry, readLastSelection, saveLastSelection } from "@lib/registryLoader";
import { detectRoute } from "@lib/routeDetector";
import BridgeSelector from "@components/BridgeSelector";
import HwrBridgePanel from "@components/HwrBridgePanel";
import OftBridgePanel from "@components/OftBridgePanel";
import MultiSourcePanel, { Source } from "@components/MultiSourcePanel";
import WidgetCard from "@components/ui/WidgetCard";

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
  useEffect(() => {
    if (step === 1) {
      setExtraSources([{ chain: selection.origin, amount: selection.amount || "" }]);
    }
  }, [step, selection.origin, selection.amount]);

  useEffect(() => {
    if (step !== 2) return;
    if (detection?.bridge === "HWR") {
      setExtraSources([{ chain: selection.origin, amount: selection.amount || "" }]);
    } else if (extraSources.length) {
      setExtraSources([]);
    }
  }, [step, detection?.bridge, selection.origin, selection.amount, selection.destination]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        console.debug("[sources-debug]", { step, origin: selection.origin, amount: selection.amount, extraSources });
      } catch {}
    }
  }, [step, selection.origin, selection.amount, extraSources]);



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
    <div className="min-h-screen p-6 flex items-start justify-center md:items-center">
      <div className="w-full max-w-md">
        {step === 1 && (
          <div className="space-y-3 animate-[fadeIn_.25s_cubic-bezier(0.22,1,0.36,1)]">
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
              canAddSource={false}
            />
            <button
              disabled={!canProceed}
              className={`w-full rounded-xl px-4 py-2.5 text-sm text-white transition ${
                canProceed ? "bg-brand-700 hover:bg-brand-800" : "bg-gray-300"
              }`}
              onClick={() => {
                setExtraSources([{ chain: selection.origin, amount: selection.amount || "" }]);
                setStep(2);
              }}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div
            key={`step2-${selection.origin}-${selection.destination}-${selection.amount}-${extraSources.length}`}
            className="space-y-4 animate-[fadeIn_.25s_cubic-bezier(0.22,1,0.36,1)]">
            <div className="flex justify-between">
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
            </div>

            {detection?.bridge === "HWR" ? (
              <WidgetCard className="space-y-4">
                {detection.supportsMultiSource ? (
                  <MultiSourcePanel
                    key={`${selection.origin}-${selection.destination}-${selection.amount}-${extraSources.length}`}
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
              </WidgetCard>
            ) : detection?.bridge === "OFT" ? (
              <WidgetCard>
                <OftBridgePanel
                  registry={registry}
                  token={selection.token}
                  origin={selection.origin}
                  destination={selection.destination}
                  amount={selection.amount}
                />
              </WidgetCard>
            ) : (
              <WidgetCard>
                <div className="rounded-lg border border-dashed p-6 text-sm text-gray-600">
                  No route available for this selection.
                </div>
              </WidgetCard>
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
    </div>
  );
}
