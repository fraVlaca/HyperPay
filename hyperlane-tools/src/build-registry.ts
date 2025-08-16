#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, join, basename } from "path";

type UnifiedRegistry = {
  chains: Record<
    string,
    {
      displayName?: string;
      evmChainId: number;
      lzEid?: number;
      hyperlaneDomain?: number;
      hyperlane?: { mailbox?: string };
    }
  >;
  routes: any[];
};

function readJson(p: string) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function main() {
  const artifactsDir = resolve(process.cwd(), "artifacts");
  const outDir = resolve(process.cwd(), "out");
  ensureDir(outDir);

  const files = existsSync(artifactsDir) ? readdirSync(artifactsDir) : [];
  const oftArtifacts = files.filter((f) => f.startsWith("oft-") || f.includes("oft-native"));
  const hwrArtifacts = files.filter((f) => f.startsWith("hwr-") || f.includes("hwr"));

  const chains: UnifiedRegistry["chains"] = {};
  const routes: any[] = [];

  const defaultChains: UnifiedRegistry["chains"] = {
    sepolia: { evmChainId: 11155111, lzEid: 40161, hyperlaneDomain: 11155111 },
    arbSepolia: { evmChainId: 421614, lzEid: 40231, hyperlaneDomain: 421614 },
    baseSepolia: { evmChainId: 84532, lzEid: 40245, hyperlaneDomain: 84532 }
  };

  Object.assign(chains, defaultChains);

  for (const f of oftArtifacts) {
    const p = join(artifactsDir, f);
    const a = readJson(p);
    if (a.type && a.type.toUpperCase().includes("OFT")) {
      routes.push({
        bridgeType: "OFT",
        oft: {
          token: a.asset,
          oft: {
            ...(a.deployments || {})
          },
          endpointIds: a.eids || {}
        }
      });
    }
  }

  for (const f of hwrArtifacts) {
    const p = join(artifactsDir, f);
    const a = readJson(p);
    if (a.routers && a.topology) {
      const edges: { from: string; to: string }[] = [];
      const keys = Object.keys(a.routers);
      for (const from of keys) {
        for (const to of keys) {
          if (from === to) continue;
          if (to === Object.keys(a.topology).find((k) => a.topology[k] === "synthetic")) {
            edges.push({ from, to });
          }
        }
      }
      routes.push({
        bridgeType: "HWR",
        hwr: {
          token: a.asset || "ETH",
          supportsMultiSource: true,
          routers: a.routers,
          edges
        }
      });
    }
  }

  const out: UnifiedRegistry = { chains, routes };
  const outPath = join(outDir, "registry.artifact.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote registry:", outPath);
}

main();
