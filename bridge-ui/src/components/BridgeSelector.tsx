import { ChainConfig, ChainKey, UnifiedRegistry } from "@config/types";
import Badge from "./Badge";

type Selection = {
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
};

type Props = {
  registry: UnifiedRegistry;
  selection: Selection;
  onChange: (s: Selection) => void;
  bridgeBadge: { text: string; tone?: "neutral" | "success" | "warning" };
  canAddSource: boolean;
  onAddSource?: () => void;
};

export default function BridgeSelector({
  registry,
  selection,
  onChange,
  bridgeBadge,
  canAddSource,
  onAddSource
}: Props) {
  const tokens = registry.tokens.map((t) => t.symbol);
  const chains = registry.chains;

  function update(partial: Partial<Selection>) {
    onChange({ ...selection, ...partial });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">HyperPay Bridge</h1>
        <Badge text={bridgeBadge.text} tone={bridgeBadge.tone} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Select
          label="Token"
          value={selection.token}
          onChange={(v) => update({ token: v })}
          options={tokens}
        />
        <Select
          label="From"
          value={selection.origin}
          onChange={(v) => update({ origin: v as ChainKey })}
          options={chains.map((c) => c.key)}
          renderOption={(k) => chainName(chains, k as ChainKey)}
        />
        <Select
          label="To"
          value={selection.destination}
          onChange={(v) => update({ destination: v as ChainKey })}
          options={chains.map((c) => c.key)}
          renderOption={(k) => chainName(chains, k as ChainKey)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div>
          <label className="text-sm text-gray-600">Amount</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="0.0"
            value={selection.amount}
            onChange={(e) => update({ amount: e.target.value })}
          />
        </div>
      </div>

      {canAddSource ? (
        <div className="pt-2">
          <button
            onClick={onAddSource}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
          >
            Add another source
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  renderOption
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (v: string) => string;
}) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <select
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}

function chainName(chains: ChainConfig[], key: ChainKey) {
  return chains.find((c) => c.key === key)?.name ?? key;
}
