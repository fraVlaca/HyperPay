import { ChainKey, UnifiedRegistry } from "@config/types";
import { Source } from "./MultiSourcePanel";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
  extraSources: Source[];
};

export default function HwrBridgePanel({
  token,
  origin,
  destination,
  amount,
  extraSources
}: Props) {
  function submit() {
    alert(
      `HWR transfer\nToken: ${token}\nFrom: ${origin}\nTo: ${destination}\nAmount: ${amount}\nExtra: ${extraSources
        .map((s) => `${s.chain}:${s.amount}`)
        .join(", ")}`
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Hyperlane HWR</h3>
        <button
          onClick={submit}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
        >
          Bridge
        </button>
      </div>
    </div>
  );
}
