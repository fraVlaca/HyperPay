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
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Additional sources</h3>
      <div className="space-y-2">
        {sources.map((s, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
              placeholder="Amount"
              value={s.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
            />
            <button
              onClick={() => remove(i)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="pt-1">
        <button onClick={add} className="rounded-md bg-gray-100 px-3 py-2 text-sm">
          Add source
        </button>
      </div>
    </div>
  );
}
