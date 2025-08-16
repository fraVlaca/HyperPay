import { UnifiedRegistry } from "@config/types";
import { REGISTRY_SAMPLE } from "@config/registry.sample";

const STORAGE_KEY = "bridge-ui:last-selection";

export type LastSelection = {
  token: string;
  origin: string;
  destination: string;
  amount?: string;
};

export async function loadRegistry(): Promise<UnifiedRegistry> {
  const url = process.env.NEXT_PUBLIC_HYPERLANE_REGISTRY_URL;
  if (!url) return REGISTRY_SAMPLE;

  try {
    const res = await fetch(url);
    if (!res.ok) return REGISTRY_SAMPLE;
    const remote = (await res.json()) as UnifiedRegistry;
    const merged: UnifiedRegistry = {
      chains: dedupeBy(
        [...REGISTRY_SAMPLE.chains, ...remote.chains],
        (c) => c.key
      ),
      tokens: dedupeBy(
        [...REGISTRY_SAMPLE.tokens, ...remote.tokens],
        (t) => t.symbol
      ),
      routes: [...REGISTRY_SAMPLE.routes, ...remote.routes]
    };
    return merged;
  } catch {
    return REGISTRY_SAMPLE;
  }
}

function dedupeBy<T>(arr: T[], key: (v: T) => string) {
  const m = new Map<string, T>();
  for (const v of arr) {
    m.set(key(v), v);
  }
  return [...m.values()];
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
    return JSON.parse(v) as LastSelection;
  } catch {
    return null;
  }
}
