import { ChainKey, UnifiedRegistry } from "@config/types";

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
      <div className="pt-2 space-y-2">
        <div className="text-sm text-gray-700">
          OFT route detected. The LayerZero OFT widget is not exported as a React component from
          @layerzerolabs/ui-bridge-oft. This panel will be wired to the proper UI package next.
        </div>
        <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-600">
          <div>Token: {token}</div>
          <div>From: {origin} → To: {destination}</div>
          <div>Amount: {amount || "0"}</div>
          <div className="mt-1">Addresses: {JSON.stringify(addresses)}</div>
        </div>
      </div>
    </div>
  );
}
