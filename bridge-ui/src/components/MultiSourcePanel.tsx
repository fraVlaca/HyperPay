import { ChainKey, UnifiedRegistry } from "@config/types";
import ChainSelect from "./ui/ChainSelect";

export type Source = { chain: ChainKey; amount: string };

type Props = {
  registry: UnifiedRegistry;
  token: string;
  destination: ChainKey;
  sources: Source[];
  onSourcesChange: (s: Source[]) => void;
};

export default function MultiSourcePanel({
  registry,
  token,
  destination,
  sources,
  onSourcesChange
}: Props) {
  function add() {
    const ALL: ChainKey[] = ["ethereum", "optimism", "arbitrum"] as unknown as ChainKey[];
    const used = new Set<ChainKey>(sources.map((s) => s.chain));
    const available = ALL.filter((k) => k !== destination && !used.has(k));
    const first = available[0];
    if (!first) return; // nothing left to add
    onSourcesChange([...sources, { chain: first, amount: "" }]);
  }
  function update(i: number, patch: Partial<Source>) {
    const copy = [...sources];
    copy[i] = { ...copy[i], ...patch };
    onSourcesChange(copy);
  }
  function remove(i: number) {
    const copy = [...sources];
    copy.splice(i, 1);
    onSourcesChange(copy);
  }

  // --- helpers ---
  function getChainName(key: ChainKey): string {
    return (
      registry.chains.find((c) => c.key === key)?.name ||
      (key.charAt(0).toUpperCase() + key.slice(1))
    );
  }

  function allowedKeysForIndex(index: number): string[] {
    const ALL = ["ethereum", "optimism", "arbitrum"] as const;
    const usedElsewhere = new Set(
      sources.filter((_, i) => i !== index).map((s) => s.chain)
    );
    return ALL.filter((k) => k !== destination && !usedElsewhere.has(k as ChainKey));
  }

  const canAdd = (() => {
    const ALL: ChainKey[] = ["ethereum", "optimism", "arbitrum"] as unknown as ChainKey[];
    const used = new Set<ChainKey>(sources.map((s) => s.chain));
    const available = ALL.filter((k) => k !== destination && !used.has(k));
    return available.length > 0;
  })();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">
        {(() => {
          const srcNames = sources.map((s) => getChainName(s.chain)).join(" + ");
          const destName = getChainName(destination);
          return `Hyperlane (${srcNames} → ${destName})`;
        })()}
      </h3>

      <div className="rounded-xl border border-black/10 p-3">
        <div className="text-xs text-gray-600">Send from multiple sources to {destination}</div>

        <div className="mt-3 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="rounded-xl border border-black/10 bg-white p-2 shadow-sm transition-all">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <ChainSelect
                  label="From chain"
                  value={s.chain}
                  options={registry.chains
                    .filter((c) => ["ethereum", "optimism", "arbitrum"].includes(c.key))
                    .filter((c) => {
                      const allowed = allowedKeysForIndex(i);
                      return c.key === s.chain || allowed.includes(c.key);
                    })
                    .map((c) => ({
                      key: c.key,
                      name: c.name,
                      iconUrl:
                        c.key === "ethereum"
                          ? "/img/ethereum.png"
                          : c.key === "optimism"
                          ? "/img/optimism.png"
                          : c.key === "arbitrum"
                          ? "/img/arbitrum.png"
                          : undefined,
                    }))}
                  onChange={(val: string) => update(i, { chain: val as ChainKey })}
                />
                <input
                  className="rounded-xl border border-black/10 px-3 py-2"
                  placeholder="0.00"
                  value={s.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                />
                <button
                  onClick={() => remove(i)}
                  className="w-[96px] rounded-xl border px-4 py-2.5 text-sm hover:bg-brand-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={add}
            disabled={!canAdd}
            className={`rounded-xl px-4 py-2.5 text-sm ${
              canAdd
                ? "bg-brand-50 text-brand-800 hover:bg-brand-100"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Add source
          </button>
        </div>
      </div>
    </div>
  );
}
