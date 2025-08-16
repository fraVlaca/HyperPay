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
  erc20: {
    sepolia: Hex;
    arbSepolia: Hex;
  };
  chains: {
    sepolia: ChainCfg;
    arbSepolia: ChainCfg;
  };
  deployer?: {
    privateKey?: string;
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

function pickRpc(urlFromCfg?: string, envKey?: string) {
  const v = (urlFromCfg && urlFromCfg.trim()) || (envKey ? process.env[envKey] : undefined);
  if (!v || !v.trim()) {
    throw new Error(`Missing RPC URL. Provide in config or set ${envKey}`);
  }
  return v.trim();
}

function pickPk(pkFromCfg?: string) {
  const v =
    (pkFromCfg && pkFromCfg.trim()) ||
    process.env.LZ_DEPLOYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;
  if (!v || !v.trim()) {
    throw new Error(
      "Missing deployer private key. Provide in config.deployer.privateKey or set LZ_DEPLOYER_PRIVATE_KEY"
    );
  }
  return v.trim();
}

async function main() {
  const idx = process.argv.findIndex((a) => a === "--config");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error("Usage: tsx src/deploy-oft-erc20.ts --config ./input.json [--dry-run]");
    console.error(
      "Env fallback: LZ_DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC_URL, ARB_SEPOLIA_RPC_URL, OFT_ERC20_SEPOLIA, OFT_ERC20_ARBSEPOLIA"
    );
    process.exit(1);
  }
  const input = readJson(process.argv[idx + 1]) as Input;
  const dryRun = process.argv.includes("--dry-run") || !!input.dryRun;

  const sepoliaCfg = input.chains.sepolia;
  const arbCfg = input.chains.arbSepolia;

  const pk = pickPk(input.deployer?.privateKey);
  const account = privateKeyToAccount(pk as Hex);

  const sepoliaRpc = pickRpc(sepoliaCfg.rpcUrl, "SEPOLIA_RPC_URL");
  const arbRpc = pickRpc(arbCfg.rpcUrl, "ARB_SEPOLIA_RPC_URL");

  const wcSepolia = createWalletClient({
    account,
    chain: { ...sepolia, id: sepoliaCfg.chainId || sepolia.id },
    transport: http(sepoliaRpc),
  });

  const wcArb = createWalletClient({
    account,
    chain: { ...arbitrumSepolia, id: arbCfg.chainId || arbitrumSepolia.id },
    transport: http(arbRpc),
  });

  const adapterSepolia =
    (process.env.OFT_ERC20_SEPOLIA as Hex | undefined) || undefined;
  const adapterArb =
    (process.env.OFT_ERC20_ARBSEPOLIA as Hex | undefined) || undefined;

  if (!adapterSepolia || !adapterArb) {
    console.log(
      "No OFTAdapter addresses in env; expecting deploy handled outside of this script."
    );
    console.log(
      "Provide OFT_ERC20_SEPOLIA and OFT_ERC20_ARBSEPOLIA to proceed with setPeer and artifact emission."
    );
    process.exit(1);
  }

  const abi = [
    {
      type: "function",
      name: "setPeer",
      stateMutability: "nonpayable",
      inputs: [
        { name: "eid", type: "uint32" },
        { name: "peer", type: "bytes32" },
      ],
      outputs: [],
    },
  ] as const;

  if (!dryRun) {
    const tx1 = await wcSepolia.writeContract({
      address: adapterSepolia,
      abi,
      functionName: "setPeer",
      args: [arbCfg.eid, encodePacked(["address"], [adapterArb])],
    });
    console.log("sepolia setPeer tx:", tx1);
    const tx2 = await wcArb.writeContract({
      address: adapterArb,
      abi,
      functionName: "setPeer",
      args: [sepoliaCfg.eid, encodePacked(["address"], [adapterSepolia])],
    });
    console.log("arbSepolia setPeer tx:", tx2);
  }

  const artifact = {
    asset: input.token.symbol || "WETH",
    type: "OFT_ERC20",
    deployments: {
      sepolia: adapterSepolia,
      arbSepolia: adapterArb,
    },
    erc20: {
      sepolia: input.erc20.sepolia,
      arbSepolia: input.erc20.arbSepolia,
    },
    eids: {
      sepolia: sepoliaCfg.eid,
      arbSepolia: arbCfg.eid,
    },
    decimals: input.token.decimals || 18,
  };

  const outPath =
    input.out ||
    resolve(process.cwd(), "artifacts", "oft-erc20.weth.sepolia-arbSepolia.json");
  ensureDir(dirname(outPath));
  writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log("Wrote artifact:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
