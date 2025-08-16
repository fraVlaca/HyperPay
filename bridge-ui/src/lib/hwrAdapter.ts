import { UnifiedRegistry, ChainKey } from "@config/types";

export function getHwrRoute(registry: UnifiedRegistry, token: string) {
  const route = registry.routes.find((r) => r.bridgeType === "HWR" && r.hwr.token === token);
  if (!route || route.bridgeType !== "HWR") return null;
  return route.hwr;
}

export function isEdgeAvailable(registry: UnifiedRegistry, token: string, origin: ChainKey, destination: ChainKey) {
  const hwr = getHwrRoute(registry, token);
  if (!hwr) return false;
  return hwr.edges.some((e) => e.from === origin && e.to === destination);
}
