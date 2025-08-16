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

function findHwrRoutes(reg: UnifiedRegistry, token: string) {
  return reg.routes.filter(
    (r) => r.bridgeType === "HWR" && r.hwr.token === token
  ) as Extract<RouteConfig, { bridgeType: "HWR" }>[];
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
  if (!input?.origin || !input?.destination) {
    if (typeof window !== "undefined") {
      try {
        console.debug("[detectRoute] waiting for complete selection", JSON.stringify(input));
      } catch {}
    }
    return { bridge: "NONE", reason: "Incomplete selection" };
  }

  const hwrCandidates = findHwrRoutes(reg, input.token);
  if (typeof window !== "undefined") {
    try {
      console.debug("[detectRoute] input =", JSON.stringify(input));
      console.debug("[detectRoute] HWR candidates =", JSON.stringify(hwrCandidates.map(r => ({ token: r.hwr.token, edges: r.hwr.edges }))));
    } catch {}
  }
  const hwr = hwrCandidates.find((r) =>
    r.hwr.edges.some((e) => e.from === input.origin && e.to === input.destination)
  );
  const oft = findOft(reg, input.token);

  const hwrHasPath = !!hwr;

  const oftHasBoth =
    !!oft &&
    !!oft.oft.oft?.[input.origin] === false ? false : !!oft?.oft.oft?.[input.origin] &&
    !!oft?.oft.oft?.[input.destination];

  if (hwrHasPath) {
    return { bridge: "HWR", route: hwr!, supportsMultiSource: hwr!.hwr.supportsMultiSource };
  }

  if (oft && !!oft.oft.oft?.[input.origin] && !!oft.oft.oft?.[input.destination]) {
    return { bridge: "OFT", route: oft };
  }

  if (hwrCandidates.length > 0 && !oft) {
    return {
      bridge: "NONE",
      reason: "Only HWR route exists but no direct path between selected chains"
    };
  }

  if (oft && hwrCandidates.length === 0) {
    if (!oftHasBoth) {
      return {
        bridge: "NONE",
        reason: "Only OFT route exists but token not available on both chains"
      };
    }
  }

  return { bridge: "NONE", reason: "No route available for this selection" };
}
