import { ChainKey, RouteConfig, UnifiedRegistry } from "@config/types";

export type DetectionInput = {
  token: string;
  origin: ChainKey;
  destination: ChainKey;
};

export type DetectionResult =
  | {
      bridge: "HWR";
      route: Extract<RouteConfig, { bridgeType: "HWR" }>;
      supportsMultiSource: boolean;
    }
  | {
      bridge: "OFT";
      route: Extract<RouteConfig, { bridgeType: "OFT" }>;
    }
  | {
      bridge: "NONE";
      reason: string;
    };

function findHwr(reg: UnifiedRegistry, token: string) {
  return reg.routes.find(
    (r) => r.bridgeType === "HWR" && r.hwr.token === token
  ) as Extract<RouteConfig, { bridgeType: "HWR" }> | undefined;
}

function findOft(reg: UnifiedRegistry, token: string) {
  return reg.routes.find(
    (r) => r.bridgeType === "OFT" && r.oft.token === token
  ) as Extract<RouteConfig, { bridgeType: "OFT" }> | undefined;
}

export function detectRoute(
  reg: UnifiedRegistry,
  input: DetectionInput
): DetectionResult {
  const hwr = findHwr(reg, input.token);
  const oft = findOft(reg, input.token);

  const hwrHasPath =
    !!hwr &&
    hwr.hwr.edges.some(
      (e) => e.from === input.origin && e.to === input.destination
    );

  const oftHasBoth =
    !!oft &&
    !!oft.oft.oft[input.origin] &&
    !!oft.oft.oft[input.destination];


  if (hwrHasPath) {
    return { bridge: "HWR", route: hwr!, supportsMultiSource: hwr!.hwr.supportsMultiSource };
  }

  if (oftHasBoth) {
    return { bridge: "OFT", route: oft! };
  }

  if (hwr && !oft) {
    return {
      bridge: "NONE",
      reason: "Only HWR route exists but no direct path between selected chains"
    };
  }

  if (oft && !hwr) {
    if (!oftHasBoth) {
      return {
        bridge: "NONE",
        reason: "Only OFT route exists but token not available on both chains"
      };
    }
  }

  return { bridge: "NONE", reason: "No route available for this selection" };
}
