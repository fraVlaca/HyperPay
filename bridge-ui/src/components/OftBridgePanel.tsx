import dynamic from "next/dynamic";
import { ChainKey, UnifiedRegistry } from "@config/types";

const OftWidget = dynamic(() => import("@layerzerolabs/ui-bridge-oft").then((m: any) => m.OftBridge || m.default || m), {
  ssr: false
}) as any;

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
  const tokenRoute = registry.routes.find(
    (r) => r.bridgeType === "OFT" && r.oft.token === token
  );
  const addresses =
    tokenRoute && tokenRoute.bridgeType === "OFT" ? tokenRoute.oft.oft : {};

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">LayerZero OFT</h3>
      </div>
      <div className="pt-2">
        <div className="text-sm text-gray-600">
          This panel renders the OFT widget when dependencies are installed.
        </div>
        <div className="mt-2">
          <OftWidget
            tokenSymbol={token}
            tokenAddresses={addresses}
            originKey={origin}
            destinationKey={destination}
            amount={amount}
          />
        </div>
      </div>
    </div>
  );
}
