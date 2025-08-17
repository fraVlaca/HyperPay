#!/usr/bin/env node

const { ethers } = require('ethers');

const SOLVER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877';

const CHAINS = {
  sepolia: {
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
  },
  arbitrum: {
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73'
  }
};

const WETH_ABI = ['function balanceOf(address) view returns (uint256)'];

async function main() {
  console.log('💰 Checking Solver Balances');
  console.log('===========================\n');
  console.log(`Solver address: ${SOLVER_ADDRESS}\n`);

  // Check Sepolia
  const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const sepoliaWeth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, sepoliaProvider);
  
  const sepoliaETH = await sepoliaProvider.getBalance(SOLVER_ADDRESS);
  const sepoliaWETH = await sepoliaWeth.balanceOf(SOLVER_ADDRESS);
  
  console.log('Ethereum Sepolia:');
  console.log(`  ETH:  ${ethers.utils.formatEther(sepoliaETH)}`);
  console.log(`  WETH: ${ethers.utils.formatEther(sepoliaWETH)}`);

  // Check Arbitrum
  const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);
  const arbitrumWeth = new ethers.Contract(CHAINS.arbitrum.weth, WETH_ABI, arbitrumProvider);
  
  const arbitrumETH = await arbitrumProvider.getBalance(SOLVER_ADDRESS);
  const arbitrumWETH = await arbitrumWeth.balanceOf(SOLVER_ADDRESS);
  
  console.log('\nArbitrum Sepolia:');
  console.log(`  ETH:  ${ethers.utils.formatEther(arbitrumETH)}`);
  console.log(`  WETH: ${ethers.utils.formatEther(arbitrumWETH)}`);
}

main().catch(console.error);
