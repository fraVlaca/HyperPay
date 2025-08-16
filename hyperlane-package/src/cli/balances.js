#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

function usage() {
  console.log('Usage: balances.js <artifactPath> <rpcEth> <rpcArb> [deployerPrivKey]');
  process.exit(1);
}

if (process.argv.length < 5) usage();

const artifactPath = process.argv[2];
const rpcEth = process.argv[3];
const rpcArb = process.argv[4];
const priv = process.argv[5] || process.env.HYP_KEY || process.env.DEPLOYER_KEY || '';

if (!fs.existsSync(artifactPath)) {
  console.error(`Artifact not found: ${artifactPath}`);
  process.exit(2);
}
if (!priv) {
  console.error('Missing private key (provide via arg or HYP_KEY env)');
  process.exit(3);
}

const txt = fs.readFileSync(artifactPath, 'utf8');
function pickTokenAddr(chain) {
  const re = new RegExp(`chainName:\\s*${chain}[\\s\\S]*?addressOrDenom:\\s*"(0x[0-9a-fA-F]{40})"`, 'm');
  const m = re.exec(txt);
  return m ? m[1] : null;
}

(async () => {
  const ethToken = pickTokenAddr('ethereum');
  const arbToken = pickTokenAddr('arbitrum');
  if (!ethToken || !arbToken) {
    console.error('Could not parse token addresses from artifact');
    process.exit(4);
  }
  const deployer = new ethers.Wallet(priv).address;
  const abi = ['function balanceOf(address) view returns (uint256)'];

  const pEth = new ethers.JsonRpcProvider(rpcEth);
  const pArb = new ethers.JsonRpcProvider(rpcArb);
  const cEth = new ethers.Contract(ethToken, abi, pEth);
  const cArb = new ethers.Contract(arbToken, abi, pArb);
  const bEth = await cEth.balanceOf(deployer);
  const bArb = await cArb.balanceOf(deployer);

  const out = {
    ethToken,
    arbToken,
    deployer,
    balances: {
      ethereum: bEth.toString(),
      arbitrum: bArb.toString(),
    },
  };
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(5);
});
