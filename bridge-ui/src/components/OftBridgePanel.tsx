import { ChainKey, UnifiedRegistry } from "@config/types";
import OftTransferForm from "./oft/OftTransferForm";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
};

export default function OftBridgePanel({
  registry,
  token,
  origin,
  destination,
  amount
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">LayerZero OFT</h3>
      </div>
      <div className="pt-2">
        <OftTransferForm
          registry={registry}
          token={token}
          origin={origin}
          destination={destination}
          amount={amount}
        />
      </div>
    </div>
  );
}
