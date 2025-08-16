import { ChainKey, UnifiedRegistry } from "@config/types";
import { Source } from "./MultiSourcePanel";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import HwrTransferForm from "./hwr/HwrTransferForm";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
  extraSources: Source[];
};

export default function HwrBridgePanel({
  registry,
  token,
  origin,
  destination,
  amount,
  extraSources
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Hyperlane HWR</h3>
        <ConnectButton />
      </div>

      <div className="mt-4">
        <HwrTransferForm
          registry={registry}
          token={token}
          origin={origin}
          destination={destination}
          amount={amount}
          extraSources={extraSources}
        />
      </div>
    </div>
  );
}
