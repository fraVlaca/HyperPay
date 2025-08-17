#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const SOLVER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877';
const ORDER_ID = '0x6d2be32b698ca1b3b73993257bd29da35385d474378ea6ed00674c56dfd95922';

const CHAINS = {
  sepolia: {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563'
  },
  arbitrum: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388'
  }
};

// ABIs
const WETH_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const INPUT_SETTLER_ABI = [
  'function orderStatus(bytes32) view returns (uint8)'
];

const OUTPUT_SETTLER_ABI = [
  'function fillStatuses(bytes32) view returns (bool)',
  'event IntentFilled(bytes32 indexed intentId, address indexed outputToken, uint256 outputAmount, address indexed recipient)'
];

async function main() {
  console.log('📊 Complete Flow Monitoring');
  console.log('===========================\n');
  console.log(`Order ID: ${ORDER_ID}\n`);

  // Setup providers
  const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);

  // Contract instances
  const sepoliaWeth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, sepoliaProvider);
  const arbitrumWeth = new ethers.Contract(CHAINS.arbitrum.weth, WETH_ABI, arbitrumProvider);
  const inputSettler = new ethers.Contract(CHAINS.sepolia.inputSettler, INPUT_SETTLER_ABI, sepoliaProvider);
  const outputSettler = new ethers.Contract(CHAINS.arbitrum.outputSettler, OUTPUT_SETTLER_ABI, arbitrumProvider);

  // Check order status on input chain
  console.log('🔍 Input Chain (Sepolia) Status:');
  try {
    const orderStatus = await inputSettler.orderStatus(ORDER_ID);
    const statusNames = ['None', 'Deposited', 'Claimed', 'Refunded'];
    console.log(`  Order Status: ${statusNames[orderStatus]} (${orderStatus})`);
  } catch (error) {
    console.log(`  Error checking order status: ${error.message}`);
  }

  // Check solver WETH balances
  console.log('\n💰 Solver WETH Balances:');
  const solverSepoliaWeth = await sepoliaWeth.balanceOf(SOLVER_ADDRESS);
  const solverArbitrumWeth = await arbitrumWeth.balanceOf(SOLVER_ADDRESS);
  console.log(`  Sepolia: ${ethers.utils.formatEther(solverSepoliaWeth)}`);
  console.log(`  Arbitrum: ${ethers.utils.formatEther(solverArbitrumWeth)}`);

  // Check solver approvals on Arbitrum
  console.log('\n✅ Solver Approvals on Arbitrum:');
  const solverApproval = await arbitrumWeth.allowance(SOLVER_ADDRESS, CHAINS.arbitrum.outputSettler);
  console.log(`  WETH approval to OutputSettler: ${ethers.utils.formatEther(solverApproval)}`);

  // Check if intent was filled on Arbitrum
  console.log('\n🎯 Output Chain (Arbitrum) Status:');
  try {
    const fillStatus = await outputSettler.fillStatuses(ORDER_ID);
    console.log(`  Fill Status: ${fillStatus ? 'Filled' : 'Not Filled'}`);
  } catch (error) {
    console.log(`  Error checking fill status: ${error.message}`);
  }

  // Check recent events
  console.log('\n📜 Recent Events:');
  
  // Check for Open events on Sepolia
  const openFilter = inputSettler.filters.Open(ORDER_ID);
  const openEvents = await inputSettler.queryFilter(openFilter, -1000);
  console.log(`  Open events found: ${openEvents.length}`);

  // Check for IntentFilled events on Arbitrum
  const fillFilter = outputSettler.filters.IntentFilled(ORDER_ID);
  const fillEvents = await outputSettler.queryFilter(fillFilter, -1000);
  console.log(`  IntentFilled events found: ${fillEvents.length}`);

  // Recommendations
  console.log('\n💡 Debugging Info:');
  if (solverApproval.eq(0)) {
    console.log('  ⚠️  Solver needs WETH approval on Arbitrum for OutputSettler');
  }
  if (solverArbitrumWeth.lt(ethers.utils.parseEther('0.0009'))) {
    console.log('  ⚠️  Solver has insufficient WETH on Arbitrum to fill the order');
  }
  console.log('  📋 Check failed transaction: https://sepolia.arbiscan.io/tx/0xf21c32afa0ed381bee2e9c98c2cddcd15060edbae14fa76ea7163ef5bac79503');
}

main().catch(console.error);
