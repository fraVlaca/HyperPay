import { ChainConfig, ChainKey, UnifiedRegistry } from "@config/types";
import Badge from "./Badge";
import DirectionSwap from "./DirectionSwap";
import BalanceBadge from "./BalanceBadge";
import WidgetCard from "./ui/WidgetCard";
import TokenBadge from "./ui/TokenBadge";
import ChainSelect from "./ui/ChainSelect";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { getDecimals, getTokenAddressForBalance } from "@lib/tokenAddressResolver";

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
  const chains = registry.chains.filter((c) =>
    ["ethereum", "optimism", "arbitrum"].includes(c.key)
  );
  const pyusdSymbol =
    registry.tokens.find((t) => t.symbol.toLowerCase() === "pyusd")?.symbol || "PYUSD";
  const decimals = getDecimals(registry, pyusdSymbol);
  const tokenAddr = getTokenAddressForBalance(registry, pyusdSymbol, selection.origin);
  const { raw } = useTokenBalance({ tokenAddress: (tokenAddr as any) || null, decimals });

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


  function setMax() {
    if (!raw || !decimals) return;
    const denom = 10n ** BigInt(decimals);
    const whole = raw / denom;
    const frac = raw % denom;
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    const formatted = fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
    onChange({ ...selection, amount: formatted });
  }

  const options = chains.map((c) => ({
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
  }));

  return (
    <WidgetCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">HyperPay Bridge</div>
        <Badge text={bridgeBadge.text} tone={bridgeBadge.tone} />
      </div>

      <div className="flex items-center justify-between">
        <TokenBadge />
      </div>

      <div className="space-y-3">
        <ChainSelect
          label="From"
          value={selection.origin}
          options={options}
          onChange={(v: string) => update({ origin: v as ChainKey })}
        />

        <div className="flex justify-center">
          <DirectionSwap onSwap={swap} disabled={!selection.origin || !selection.destination} />
        </div>

        <ChainSelect
          label="To"
          value={selection.destination}
          options={options.map((o) => ({ ...o, disabled: o.key === selection.origin }))}
          onChange={(v: string) => update({ destination: v as ChainKey })}
        />
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">Amount</div>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-xl border border-black/10 px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="0.0"
            value={selection.amount}
            onChange={(e) => update({ amount: e.target.value })}
          />
          <button
            type="button"
            onClick={setMax}
            className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs text-brand-800 hover:bg-brand-100"
            disabled={!raw}
          >
            Max
          </button>
        </div>
        <div className="mt-1">
          <BalanceBadge registry={registry} token={pyusdSymbol} origin={selection.origin} />
        </div>
      </div>

      {canAddSource ? (
        <div className="pt-2">
          <button
            onClick={onAddSource}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm text-white transition hover:bg-brand-700"
          >
            Add another source
          </button>
        </div>
      ) : null}
    </WidgetCard>
  );
}

function chainName(chains: ChainConfig[], key: ChainKey) {
  return chains.find((c) => c.key === key)?.name ?? key;
}
