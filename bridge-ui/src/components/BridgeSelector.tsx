import { ChainConfig, ChainKey, UnifiedRegistry } from "@config/types";
import Badge from "./Badge";
import DirectionSwap from "./DirectionSwap";
import BalanceBadge from "./BalanceBadge";

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
  const chains = registry.chains;
  const pyusdSymbol =
    registry.tokens.find((t) => t.symbol.toLowerCase() === "pyusd")?.symbol || "PYUSD";

  function update(partial: Partial<Selection>) {
    onChange({ ...selection, ...partial });
  }

  function swap() {
    if (!selection.origin || !selection.destination) return;
    onChange({
      ...selection,
      origin: selection.destination,
      destination: selection.origin
    });
  }

  const toOptions = chains.map((c) => c.key).filter((k) => k !== selection.origin);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">HyperPay Bridge</h1>
        <Badge text={bridgeBadge.text} tone={bridgeBadge.tone} />
      </div>

      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        <Select
          label="Token"
          value={pyusdSymbol}
          onChange={() => update({ token: pyusdSymbol })}
          options={[pyusdSymbol]}
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
          options={toOptions}
          renderOption={(k) => chainName(chains, k as ChainKey)}
        />
      </div>

      <div className="flex justify-center">
        <DirectionSwap onSwap={swap} disabled={!selection.origin || !selection.destination} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div>
          <label className="text-sm text-gray-600">Amount</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="0.0"
              value={selection.amount}
              onChange={(e) => update({ amount: e.target.value })}
            />
            <BalanceBadge registry={registry} token={pyusdSymbol} origin={selection.origin} />
          </div>
        </div>
      </div>

      {canAddSource ? (
        <div className="pt-2">
          <button
            onClick={onAddSource}
            className="rounded-md bg-brand-700 px-3 py-2 text-sm text-white hover:bg-brand-800"
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
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-600"
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
