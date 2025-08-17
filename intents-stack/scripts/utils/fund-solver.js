#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const SOLVER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877';
const FUNDER_PRIVATE_KEY = process.env.FUNDER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default test key

const CHAINS = {
  sepolia: {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
  },
  arbitrum: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73'
  }
};

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256) public',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

async function main() {
  console.log('💰 Funding OIF Solver with WETH');
  console.log('================================\n');

  const funderWallet = new ethers.Wallet(FUNDER_PRIVATE_KEY);
  console.log(`Funder wallet: ${funderWallet.address}`);
  console.log(`Solver wallet: ${SOLVER_ADDRESS}\n`);

  // Fund on Sepolia
  console.log('🔹 Funding on Sepolia...');
  try {
    const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
    const sepoliaFunder = funderWallet.connect(sepoliaProvider);
    const sepoliaWeth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, sepoliaFunder);

    // Check funder balance
    const funderBalance = await sepoliaProvider.getBalance(funderWallet.address);
    console.log(`Funder ETH balance: ${ethers.utils.formatEther(funderBalance)}`);

    if (funderBalance.lt(ethers.utils.parseEther('0.01'))) {
      console.log('❌ Funder needs at least 0.01 ETH on Sepolia');
      console.log(`Please fund ${funderWallet.address} with ETH first`);
      return;
    }

    // Check current solver WETH balance
    const currentBalance = await sepoliaWeth.balanceOf(SOLVER_ADDRESS);
    console.log(`Current solver WETH balance: ${ethers.utils.formatEther(currentBalance)}`);

    // Deposit 0.01 ETH to get WETH
    console.log('Depositing 0.01 ETH to WETH...');
    const depositAmount = ethers.utils.parseEther('0.01');
    const depositTx = await sepoliaWeth.deposit({ value: depositAmount });
    console.log(`Deposit tx: ${depositTx.hash}`);
    await depositTx.wait();

    // Transfer WETH to solver
    console.log('Transferring WETH to solver...');
    const transferTx = await sepoliaWeth.transfer(SOLVER_ADDRESS, depositAmount);
    console.log(`Transfer tx: ${transferTx.hash}`);
    await transferTx.wait();

    const newBalance = await sepoliaWeth.balanceOf(SOLVER_ADDRESS);
    console.log(`✅ Solver now has ${ethers.utils.formatEther(newBalance)} WETH on Sepolia\n`);
  } catch (error) {
    console.error('❌ Failed on Sepolia:', error.message);
  }

  // Fund on Arbitrum
  console.log('🔹 Funding on Arbitrum Sepolia...');
  try {
    const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);
    const arbitrumFunder = funderWallet.connect(arbitrumProvider);
    const arbitrumWeth = new ethers.Contract(CHAINS.arbitrum.weth, WETH_ABI, arbitrumFunder);

    // Check funder balance
    const funderBalance = await arbitrumProvider.getBalance(funderWallet.address);
    console.log(`Funder ETH balance: ${ethers.utils.formatEther(funderBalance)}`);

    if (funderBalance.lt(ethers.utils.parseEther('0.01'))) {
      console.log('❌ Funder needs at least 0.01 ETH on Arbitrum Sepolia');
      console.log(`Please fund ${funderWallet.address} with ETH first`);
      return;
    }

    // Check current solver WETH balance
    const currentBalance = await arbitrumWeth.balanceOf(SOLVER_ADDRESS);
    console.log(`Current solver WETH balance: ${ethers.utils.formatEther(currentBalance)}`);

    // Deposit 0.01 ETH to get WETH
    console.log('Depositing 0.01 ETH to WETH...');
    const depositAmount = ethers.utils.parseEther('0.01');
    const depositTx = await arbitrumWeth.deposit({ value: depositAmount });
    console.log(`Deposit tx: ${depositTx.hash}`);
    await depositTx.wait();

    // Transfer WETH to solver
    console.log('Transferring WETH to solver...');
    const transferTx = await arbitrumWeth.transfer(SOLVER_ADDRESS, depositAmount);
    console.log(`Transfer tx: ${transferTx.hash}`);
    await transferTx.wait();

    const newBalance = await arbitrumWeth.balanceOf(SOLVER_ADDRESS);
    console.log(`✅ Solver now has ${ethers.utils.formatEther(newBalance)} WETH on Arbitrum\n`);
  } catch (error) {
    console.error('❌ Failed on Arbitrum:', error.message);
  }

  console.log('✅ Funding complete!');
}

main().catch(console.error);
