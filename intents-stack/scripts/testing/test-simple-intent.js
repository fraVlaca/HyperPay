#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const USER_PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';

const CHAINS = {
  sepolia: {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563'
  }
};

// Minimal ABI to test
const WETH_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

async function main() {
  console.log('🧪 Testing Simple WETH Transfer');
  console.log('================================\n');

  const userWallet = new ethers.Wallet(USER_PRIVATE_KEY);
  const provider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const signer = userWallet.connect(provider);
  
  console.log(`User wallet: ${userWallet.address}`);
  console.log(`InputSettler: ${CHAINS.sepolia.inputSettler}\n`);

  const weth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, signer);

  // Check balance
  const balance = await weth.balanceOf(userWallet.address);
  console.log(`WETH balance: ${ethers.utils.formatEther(balance)}`);

  // Check current allowance
  const currentAllowance = await weth.allowance(userWallet.address, CHAINS.sepolia.inputSettler);
  console.log(`Current allowance: ${ethers.utils.formatEther(currentAllowance)}`);

  // First, let's just test a simple transfer
  if (balance.gt(0)) {
    const testAmount = ethers.utils.parseEther('0.0001');
    
    console.log('\nTesting direct WETH transfer...');
    try {
      const tx = await weth.transfer(CHAINS.sepolia.inputSettler, testAmount);
      console.log(`Transfer tx: ${tx.hash}`);
      await tx.wait();
      console.log('✅ Transfer successful!');
    } catch (error) {
      console.error('❌ Transfer failed:', error.message);
    }
  }

  // Check InputSettler balance
  const settlerBalance = await weth.balanceOf(CHAINS.sepolia.inputSettler);
  console.log(`\nInputSettler WETH balance: ${ethers.utils.formatEther(settlerBalance)}`);

  // Try to understand what the InputSettler expects
  console.log('\nChecking contract bytecode size...');
  const code = await provider.getCode(CHAINS.sepolia.inputSettler);
  console.log(`Contract bytecode length: ${code.length} characters`);
  
  // Check if it's a proxy
  const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const implementationSlot = await provider.getStorageAt(CHAINS.sepolia.inputSettler, IMPLEMENTATION_SLOT);
  if (implementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    const implementation = '0x' + implementationSlot.slice(26);
    console.log(`Proxy implementation: ${implementation}`);
  } else {
    console.log('Not a proxy or using different proxy pattern');
  }
}

main().catch(console.error);
