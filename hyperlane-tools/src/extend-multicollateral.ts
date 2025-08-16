#!/usr/bin/env node
import { writeFileSync, mkdtempSync, existsSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawn } from "child_process";
import YAML from "yaml";

type ChainKey = string;

type Input = {
  token: {
    symbol: string;
    decimals: number;
  };
  collaterals: ChainKey[];
  synthetic: ChainKey;
  chains: Record<
    ChainKey,
    {
      evmChainId: number;
      hyperlaneDomain: number;
      rpcUrl?: string;
      mailbox?: string;
    }
  >;
  owner?: string;
  deploy?: boolean;
  configOut?: string;
  routers?: Record<ChainKey, string>;
  artifactOut?: string;
};

function readJson(p: string) {
  const abs = resolve(p);
  const raw = readFileSync(abs, "utf-8");
  return JSON.parse(raw);
}

function buildWarpYaml(input: Input) {
  const chainKeys = input.collaterals.concat([input.synthetic]);

  const root = Object.fromEntries(
    chainKeys.map((ck) => {
      const c: any = input.chains[ck] as any;
      const isSynthetic = ck === input.synthetic;
      const entry: any = {
        type: isSynthetic ? "synthetic" : "collateral",
      };
      if (c?.token) {
        entry.address = c.token;
        if (!isSynthetic) {
          entry.token = c.token;
        }
      }
      if (c?.mailbox) {
        entry.mailbox = c.mailbox;
      }
      if (input.token?.symbol) entry.symbol = input.token.symbol;
      if (typeof input.token?.decimals === "number") entry.decimals = input.token.decimals;
      return [ck, entry];
    })
  );

  return YAML.stringify(root);
}

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function writeArtifact(input: Input, outDir: string) {
  const artifact = {
    asset: input.token.symbol,
    topology: Object.fromEntries(
      [...input.collaterals, input.synthetic].map((ck) => [
        ck,
        ck === input.synthetic ? "synthetic" : "collateral",
      ])
    ),
    routers:
      input.routers ||
      Object.fromEntries(
        [...input.collaterals, input.synthetic].map((ck) => [ck, ""])
      ),
    domains: Object.fromEntries(
      Object.entries(input.chains).map(([k, v]) => [k, v.hyperlaneDomain])
    ),
  };
  const ap =
    input.artifactOut ||
    resolve(
      outDir,
      `hwr.${input.token.symbol.toLowerCase()}.${input.collaterals.join(
        "-"
      )}-to-${input.synthetic}.json`
    );
  ensureDir(resolve(outDir));
  writeFileSync(ap, JSON.stringify(artifact, null, 2));
  console.log("Wrote HWR artifact:", ap);
}

async function run() {
  const argFileIdx = process.argv.findIndex((a) => a === "--config");
  if (argFileIdx === -1 || !process.argv[argFileIdx + 1]) {
    console.error(
      "Usage: pnpm --filter hyperlane-tools run extend -- --config ./path/to/input.json [--deploy]"
    );
    process.exit(1);
  }
  const inputPath = process.argv[argFileIdx + 1];
  const deploy = process.argv.includes("--deploy");

  const input = readJson(inputPath) as Input;

  const yaml = buildWarpYaml(input);

  const outDir = input.configOut
    ? resolve(input.configOut)
    : mkdtempSync(join(tmpdir(), "hwr-"));
  ensureDir(outDir);
  const yamlPath = join(outDir, "warp-route-deployment.yaml");
  writeFileSync(yamlPath, yaml, "utf-8");

  console.log("Generated warp-route-deployment.yaml at:", yamlPath);
  console.log("Preview:\n---\n" + yaml + "\n---");

  writeArtifact(input, resolve(process.cwd(), "artifacts"));

  if (!deploy && !input.deploy) {
    console.log("Next steps:");
    console.log(`1) npx @hyperlane-xyz/cli warp deploy --config ${yamlPath}`);
    console.log(`2) npx @hyperlane-xyz/cli warp read --symbol ${input.token.symbol}`);
    process.exit(0);
  }

  const cli = spawn(
    "npx",
    ["@hyperlane-xyz/cli@latest", "warp", "deploy", "--config", yamlPath],
    { stdio: "inherit", env: process.env }
  );

  cli.on("exit", (code) => {
    if (code !== 0) {
      console.error("hyperlane warp deploy failed");
      process.exit(code || 1);
    }
    const read = spawn(
      "npx",
      ["@hyperlane-xyz/cli@latest", "warp", "read", "--symbol", input.token.symbol],
      { stdio: "inherit", env: process.env }
    );
    read.on("exit", (code2) => {
      process.exit(code2 || 0);
    });
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
