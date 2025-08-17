import { ChainKey, UnifiedRegistry } from "@config/types";

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
    const first = registry.chains[0]?.key ?? "ethereum";
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

      <div className="rounded-md border p-3">
        <div className="text-xs text-gray-600">Send from multiple sources to {destination}</div>

        <div className="mt-3 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="rounded-md border bg-white p-2 shadow-sm transition-all">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                <select
                  className="rounded-md border border-gray-300 px-3 py-2"
                  value={s.chain}
                  onChange={(e) => update(i, { chain: e.target.value as ChainKey })}
                >
                  {registry.chains.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-gray-300 px-3 py-2"
                  placeholder="0.00"
                  value={s.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                />
                <button
                  onClick={() => remove(i)}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
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
            className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800 hover:bg-brand-100"
          >
            Add source
          </button>
        </div>
      </div>
    </div>
  );
}
