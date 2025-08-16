import React, { useMemo, useState } from "react";
import type { ChainKey, UnifiedRegistry } from "@config/types";
import { isEdgeAvailable } from "@lib/hwrAdapter";
import { ChainLogo } from "@hyperlane-xyz/widgets";
import clsx from "clsx";
type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
  extraSources?: { chain: ChainKey; amount: string }[];
};

export default function TransferTokenForm({
  registry,
  token,
  origin,
  destination,
  amount,
  extraSources = []
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const edgesOk = useMemo(() => {
    const primaryOk = isEdgeAvailable(registry, token, origin, destination);
    const extrasOk = extraSources.every((s) =>
      isEdgeAvailable(registry, token, s.chain, destination)
    );
    return primaryOk && extrasOk;
  }, [registry, token, origin, destination, extraSources]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChainLogo chainName={origin} size={18} />
        <span className="text-sm">{origin}</span>
        <span className="text-gray-400">-&gt;</span>
        <ChainLogo chainName={destination} size={18} />
        <span className="text-sm">{destination}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-gray-500">Token</div>
          <div className="text-sm">{token}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Amount</div>
          <div className="text-sm">{amount || "0"}</div>
        </div>
      </div>

      {extraSources.length > 0 && (
        <div className="rounded-md border p-3">
          <div className="text-xs text-gray-500">Additional sources</div>
          <div className="mt-1 space-y-1">
            {extraSources.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ChainLogo chainName={s.chain} size={16} />
                <span>{s.chain}</span>
                <span className="text-gray-400">-&gt;</span>
                <span>{destination}</span>
                <span className="ml-auto">{s.amount || "0"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!edgesOk && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No HWR edge found for one of the selected paths. Adjust your selection.
        </div>
      )}

      <button
        disabled={!edgesOk || submitting}
        className={clsx(
          "w-full rounded-md px-3 py-2 text-sm text-white",
          submitting ? "bg-gray-700" : "bg-gray-900",
          (!edgesOk || submitting) && "opacity-50"
        )}
        onClick={async () => {
          if (!edgesOk || submitting) return;
          setSubmitting(true);
          try {
            alert(
              JSON.stringify(
                {
                  type: "HWR",
                  token,
                  origin,
                  destination,
                  amount,
                  extras: extraSources
                },
                null,
                2
              )
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        Review & Continue
      </button>
    </div>
  );
}
