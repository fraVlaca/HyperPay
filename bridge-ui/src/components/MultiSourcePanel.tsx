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
    const allowed = registry.chains.filter((c) =>
      ["ethereum", "optimism", "arbitrum"].includes(c.key)
    );
    const first = allowed[0]?.key ?? "ethereum";
    onSourcesChange([...sources, { chain: first as ChainKey, amount: "" }]);
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Multi-source send (Ethereum + Arbitrum → {destination})</h3>

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
                          : undefined
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
            className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-100"
          >
            Add source
          </button>
        </div>
      </div>
    </div>
  );
}
