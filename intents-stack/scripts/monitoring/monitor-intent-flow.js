#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const SOLVER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877';
const USER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877'; // Same as solver for this test

const CHAINS = {
  sepolia: {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563',
    outputSettler: '0x331B0c3b82C8C3CF06DFD2a12905Cc311589FB6D',
    hyperlaneOracle: '0xa39434521088d9a50325BC50eC2f50660e06Df34'
  },
  arbitrum: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    inputSettler: '0xCe81010d0A47FF13Cc19105E8Ef7B597aA8D3460',
    outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388',
    hyperlaneOracle: '0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa'
  }
};

// Contract ABIs
const WETH_ABI = ['function balanceOf(address) view returns (uint256)'];

const OUTPUT_SETTLER_ABI = [
  'event IntentFilled(bytes32 indexed intentId, address indexed outputToken, uint256 outputAmount, address indexed recipient)',
  'event IntentSettled(bytes32 indexed intentId, address indexed solver)'
];

const HYPERLANE_ORACLE_ABI = [
  'event MessageDispatched(bytes32 indexed messageId, uint32 indexed destinationDomain, bytes32 recipient, bytes message)'
];

async function monitorBalances() {
  const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);

  const sepoliaWeth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, sepoliaProvider);
  const arbitrumWeth = new ethers.Contract(CHAINS.arbitrum.weth, WETH_ABI, arbitrumProvider);

  const solverSepoliaBalance = await sepoliaWeth.balanceOf(SOLVER_ADDRESS);
  const solverArbitrumBalance = await arbitrumWeth.balanceOf(SOLVER_ADDRESS);
  const userSepoliaBalance = await sepoliaWeth.balanceOf(USER_ADDRESS);
  const userArbitrumBalance = await arbitrumWeth.balanceOf(USER_ADDRESS);

  console.log('\n💰 Current Balances:');
  console.log('Sepolia WETH:');
  console.log(`  Solver: ${ethers.utils.formatEther(solverSepoliaBalance)}`);
  console.log(`  User: ${ethers.utils.formatEther(userSepoliaBalance)}`);
  console.log('Arbitrum WETH:');
  console.log(`  Solver: ${ethers.utils.formatEther(solverArbitrumBalance)}`);
  console.log(`  User: ${ethers.utils.formatEther(userArbitrumBalance)}`);

  return {
    solverSepoliaBalance,
    solverArbitrumBalance,
    userSepoliaBalance,
    userArbitrumBalance
  };
}

async function main() {
  console.log('📊 Monitoring Intent Flow');
  console.log('=========================\n');

  const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);

  // Get initial balances
  console.log('Initial state:');
  const initialBalances = await monitorBalances();

  // Set up event listeners
  const outputSettlerArbitrum = new ethers.Contract(
    CHAINS.arbitrum.outputSettler,
    OUTPUT_SETTLER_ABI,
    arbitrumProvider
  );

  const hyperlaneOracleSepolia = new ethers.Contract(
    CHAINS.sepolia.hyperlaneOracle,
    HYPERLANE_ORACLE_ABI,
    sepoliaProvider
  );

  console.log('\n👂 Listening for events...\n');

  // Listen for fill events on Arbitrum
  outputSettlerArbitrum.on('IntentFilled', (intentId, outputToken, outputAmount, recipient) => {
    console.log('🎯 Intent Filled on Arbitrum!');
    console.log(`  Intent ID: ${intentId}`);
    console.log(`  Token: ${outputToken}`);
    console.log(`  Amount: ${ethers.utils.formatEther(outputAmount)} WETH`);
    console.log(`  Recipient: ${recipient}`);
  });

  // Listen for settlement events
  outputSettlerArbitrum.on('IntentSettled', (intentId, solver) => {
    console.log('✅ Intent Settled!');
    console.log(`  Intent ID: ${intentId}`);
    console.log(`  Solver: ${solver}`);
    console.log('\n🎉 Settlement complete! The solver can now claim funds on the source chain.');
  });

  // Listen for Hyperlane messages
  hyperlaneOracleSepolia.on('MessageDispatched', (messageId, destinationDomain, recipient, message) => {
    console.log('📬 Hyperlane Message Dispatched!');
    console.log(`  Message ID: ${messageId}`);
    console.log(`  Destination: ${destinationDomain}`);
    console.log(`  Recipient: ${recipient}`);
  });

  // Check balances periodically
  let lastCheck = Date.now();
  setInterval(async () => {
    const now = Date.now();
    if (now - lastCheck > 30000) { // Every 30 seconds
      console.log(`\n⏰ Status check at ${new Date().toISOString()}`);
      const currentBalances = await monitorBalances();
      
      // Check for changes
      if (!initialBalances.solverArbitrumBalance.eq(currentBalances.solverArbitrumBalance)) {
        console.log('🔄 Solver Arbitrum balance changed!');
      }
      if (!initialBalances.userArbitrumBalance.eq(currentBalances.userArbitrumBalance)) {
        console.log('🔄 User Arbitrum balance changed!');
      }
      
      lastCheck = now;
    }
  }, 5000);

  console.log('Press Ctrl+C to stop monitoring\n');
}

main().catch(console.error);
