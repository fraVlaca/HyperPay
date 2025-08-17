import { UnifiedRegistry } from "@config/types";
import { REGISTRY_SAMPLE } from "@config/registry.sample";

const STORAGE_KEY = "bridge-ui:last-selection";

export type LastSelection = {
  token: string;
  origin: string;
  destination: string;
  amount?: string;
};

function dedupeBy<T>(arr: T[], key: (v: T) => string) {
  const m = new Map<string, T>();
  for (const v of arr) {
    m.set(key(v), v);
  }
  return [...m.values()];
}

async function tryFetch(url?: string): Promise<any | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loadRegistry(): Promise<UnifiedRegistry> {
  const getEnv = (k: string) =>
    (typeof process !== "undefined" && (process as any)?.env?.[k]) || undefined;

  let merged: UnifiedRegistry = {
    chains: [...REGISTRY_SAMPLE.chains],
    tokens: [...REGISTRY_SAMPLE.tokens],
    routes: [...REGISTRY_SAMPLE.routes]
  };

  const remoteUrl = (getEnv("NEXT_PUBLIC_HYPERLANE_REGISTRY_URL") as string | undefined) || undefined;
  const remote = (await tryFetch(remoteUrl)) as UnifiedRegistry | null;
  if (remote) {
    merged = {
      chains: dedupeBy([...merged.chains, ...(remote.chains || [])], (c) => c.key),
      tokens: dedupeBy([...merged.tokens, ...(remote.tokens || [])], (t) => t.symbol),
      routes: [...merged.routes, ...(remote.routes || [])]
    };
  }

  const artifactUrl = (getEnv("NEXT_PUBLIC_REGISTRY_JSON_URL") as string | undefined) || "/registry.artifact.json";
  const artifact = await tryFetch(artifactUrl);
  if (artifact) {
    const chainsFromArtifact = Array.isArray(artifact.chains)
      ? artifact.chains
      : artifact.chains
      ? Object.entries(artifact.chains).map(([key, v]: any) => ({
          key,
          chainId: v.evmChainId,
          name: v.displayName || key,
          hyperlaneDomain: v.hyperlaneDomain,
          lzEid: v.lzEid
        }))
      : [];
    const tokensFromArtifact = Array.isArray(artifact.tokens)
      ? artifact.tokens
      : (artifact.routes || [])
          .map((r: any) =>
            r.bridgeType === "HWR"
              ? { symbol: r.hwr?.token, decimals: r.hwr?.decimals ?? 6 }
              : r.bridgeType === "OFT"
              ? { symbol: r.oft?.token, decimals: r.oft?.decimals ?? 6 }
              : null
          )
          .filter(Boolean);
    merged = {
      chains: dedupeBy([...merged.chains, ...chainsFromArtifact], (c) => c.key),
      tokens: dedupeBy([...merged.tokens, ...tokensFromArtifact], (t) => t.symbol),
      routes: [...merged.routes, ...(artifact.routes || [])]
    };
  }

  if (typeof window !== "undefined") {
    try {
      const local = window.localStorage.getItem("bridgeRegistryArtifact");
      if (local) {
        const j = JSON.parse(local);
        const chainsFromLocal = Array.isArray(j.chains)
          ? j.chains
          : j.chains
          ? Object.entries(j.chains).map(([key, v]: any) => ({
              key,
              chainId: v.evmChainId,
              name: v.displayName || key,
              hyperlaneDomain: v.hyperlaneDomain,
              lzEid: v.lzEid
            }))
          : [];
        const tokensFromLocal = Array.isArray(j.tokens)
          ? j.tokens
          : (j.routes || [])
              .map((r: any) =>
                r.bridgeType === "HWR"
                  ? { symbol: r.hwr?.token, decimals: r.hwr?.decimals ?? 6 }
                  : r.bridgeType === "OFT"
                  ? { symbol: r.oft?.token, decimals: r.oft?.decimals ?? 6 }
                  : null
              )
              .filter(Boolean);
        merged = {
          chains: dedupeBy([...merged.chains, ...chainsFromLocal], (c) => c.key),
          tokens: dedupeBy([...merged.tokens, ...tokensFromLocal], (t) => t.symbol),
          routes: [...merged.routes, ...(j.routes || [])]
        };
      }
    } catch {}
  }

  return merged;
}

export function saveLastSelection(sel: LastSelection) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
  } catch {}
}

export function readLastSelection(): LastSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    const parsed = JSON.parse(v) as LastSelection;
    const isValid = (s: any) => typeof s === "string" && s.length > 0;
    if (parsed && isValid(parsed.token) && isValid(parsed.origin) && isValid(parsed.destination)) {
      return parsed;
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}
