import { useMemo, useState } from "react";
import { ChainLogo } from "@hyperlane-xyz/widgets";
import { ChainKey, UnifiedRegistry } from "@config/types";
import { Source } from "../MultiSourcePanel";
import { isEdgeAvailable } from "@lib/hwrAdapter";

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

  const edgesOk = useMemo(() => {
    const primaryOk = isEdgeAvailable(registry, token, origin, destination);
    const extrasOk = extraSources.every((s) =>
      isEdgeAvailable(registry, token, s.chain as ChainKey, destination)
    );
    return primaryOk && extrasOk;
  }, [registry, token, origin, destination, extraSources]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChainLogo chainName={origin} size={18} />
        <span className="text-sm">{origin}</span>
        <span className="text-gray-400">→</span>
        <ChainLogo chainName={destination} size={18} />
        <span className="text-sm">{destination}</span>
      </div>

      <div className="rounded-md border p-3 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <ChainLogo chainName={s.chain as ChainKey} size={16} />
                <span>{s.chain}</span>
                <span className="text-gray-400">→</span>
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

      <div className="space-y-2">
        <label className="text-xs text-gray-500">Note (optional)</label>
        <input
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="Add a note for your records"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        disabled={!edgesOk}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        onClick={() => {
          alert(
            JSON.stringify(
              {
                type: "HWR",
                token,
                destination,
                primary: { origin, amount },
                extras: extraSources
              },
              null,
              2
            )
          );
        }}
      >
        Review & Continue
      </button>
    </div>
  );
}
