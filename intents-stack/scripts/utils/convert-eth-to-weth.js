#!/usr/bin/env node

const { ethers } = require('ethers');

// Use the solver's private key to convert its own ETH to WETH
const SOLVER_PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';

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

const WETH_ABI = [
  'function deposit() payable',
  'function balanceOf(address) view returns (uint256)'
];

async function main() {
  console.log('💱 Converting ETH to WETH for Solver');
  console.log('=====================================\n');

  const solverWallet = new ethers.Wallet(SOLVER_PRIVATE_KEY);
  console.log(`Solver address: ${solverWallet.address}\n`);

  // Convert on Sepolia
  console.log('🔹 Converting on Sepolia...');
  try {
    const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
    const sepoliaSigner = solverWallet.connect(sepoliaProvider);
    const sepoliaWeth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, sepoliaSigner);

    const ethBalance = await sepoliaProvider.getBalance(solverWallet.address);
    console.log(`ETH balance: ${ethers.utils.formatEther(ethBalance)}`);

    // Convert 0.01 ETH to WETH
    const depositAmount = ethers.utils.parseEther('0.01');
    console.log('Depositing 0.01 ETH to WETH...');
    
    const depositTx = await sepoliaWeth.deposit({ value: depositAmount });
    console.log(`Transaction: ${depositTx.hash}`);
    await depositTx.wait();

    const wethBalance = await sepoliaWeth.balanceOf(solverWallet.address);
    console.log(`✅ WETH balance: ${ethers.utils.formatEther(wethBalance)}\n`);
  } catch (error) {
    console.error('❌ Failed on Sepolia:', error.message);
  }

  // Convert on Arbitrum
  console.log('🔹 Converting on Arbitrum Sepolia...');
  try {
    const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);
    const arbitrumSigner = solverWallet.connect(arbitrumProvider);
    const arbitrumWeth = new ethers.Contract(CHAINS.arbitrum.weth, WETH_ABI, arbitrumSigner);

    const ethBalance = await arbitrumProvider.getBalance(solverWallet.address);
    console.log(`ETH balance: ${ethers.utils.formatEther(ethBalance)}`);

    // Convert 0.01 ETH to WETH
    const depositAmount = ethers.utils.parseEther('0.01');
    console.log('Depositing 0.01 ETH to WETH...');
    
    const depositTx = await arbitrumWeth.deposit({ value: depositAmount });
    console.log(`Transaction: ${depositTx.hash}`);
    await depositTx.wait();

    const wethBalance = await arbitrumWeth.balanceOf(solverWallet.address);
    console.log(`✅ WETH balance: ${ethers.utils.formatEther(wethBalance)}\n`);
  } catch (error) {
    console.error('❌ Failed on Arbitrum:', error.message);
  }

  console.log('✅ Conversion complete!');
}

main().catch(console.error);
