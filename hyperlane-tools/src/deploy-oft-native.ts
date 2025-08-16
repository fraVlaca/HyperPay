#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { createWalletClient, http, Hex, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia, sepolia } from "viem/chains";

type ChainCfg = {
  rpcUrl: string;
  eid: number;
  chainId?: number;
};

type Input = {
  token: { symbol: string; decimals: number };
  chains: {
    sepolia: ChainCfg;
    arbSepolia: ChainCfg;
  };
  deployer: {
    privateKey: string;
  };
  out?: string;
  dryRun?: boolean;
};

function readJson(p: string) {
  const abs = resolve(p);
  return JSON.parse(readFileSync(abs, "utf-8"));
}

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

async function main() {
  const idx = process.argv.findIndex((a) => a === "--config");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error("Usage: tsx src/deploy-oft-native.ts --config ./input.json [--dry-run]");
    process.exit(1);
  }
  const input = readJson(process.argv[idx + 1]) as Input;
  const dryRun = process.argv.includes("--dry-run") || input.dryRun;

  const sepoliaCfg = input.chains.sepolia;
  const arbCfg = input.chains.arbSepolia;

  const account = privateKeyToAccount(input.deployer.privateKey as Hex);

  const wcSepolia = createWalletClient({
    account,
    chain: { ...sepolia, id: sepoliaCfg.chainId || sepolia.id },
    transport: http(sepoliaCfg.rpcUrl)
  });

  const wcArb = createWalletClient({
    account,
    chain: { ...arbitrumSepolia, id: arbCfg.chainId || arbitrumSepolia.id },
    transport: http(arbCfg.rpcUrl)
  });

  const adapterSepolia = process.env.OFT_NATIVE_SEPOLIA as Hex | undefined;
  const adapterArb = process.env.OFT_NATIVE_ARBSEPOLIA as Hex | undefined;

  if (!adapterSepolia || !adapterArb) {
    console.log("No adapter addresses in env; expecting manual deploy handled outside of this script.");
    console.log("Provide OFT_NATIVE_SEPOLIA and OFT_NATIVE_ARBSEPOLIA to proceed with setPeer and artifact emission.");
    process.exit(1);
  }

  const abi = [
    {
      type: "function",
      name: "setPeer",
      stateMutability: "nonpayable",
      inputs: [
        { name: "eid", type: "uint32" },
        { name: "peer", type: "bytes32" }
      ],
      outputs: []
    }
  ] as const;

  if (!dryRun) {
    await wcSepolia.writeContract({
      address: adapterSepolia,
      abi,
      functionName: "setPeer",
      args: [arbCfg.eid, encodePacked(["address"], [adapterArb])]
    });
    await wcArb.writeContract({
      address: adapterArb,
      abi,
      functionName: "setPeer",
      args: [sepoliaCfg.eid, encodePacked(["address"], [adapterSepolia])]
    });
  }

  const artifact = {
    asset: input.token.symbol,
    type: "OFT_NATIVE",
    deployments: {
      sepolia: adapterSepolia,
      arbSepolia: adapterArb
    },
    eids: {
      sepolia: sepoliaCfg.eid,
      arbSepolia: arbCfg.eid
    },
    decimals: input.token.decimals
  };

  const outPath =
    input.out ||
    resolve(process.cwd(), "artifacts", "oft-native.eth.sepolia-arbSepolia.json");
  ensureDir(dirname(outPath));
  writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log("Wrote artifact:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
