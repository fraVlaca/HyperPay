import { ethers } from "hardhat";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("ePyUSD");
  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  const addr = await contract.getAddress();

  const outDir = resolve(__dirname, "..", "deployments");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const network = await deployer.provider!.getNetwork();
  const chainId = Number(network.chainId);

  const payload = {
    name: "ePyUSD",
    address: addr,
    deployTxHash: tx?.hash || "",
    chainId
  };
  const outPath = resolve(outDir, `optimism.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
