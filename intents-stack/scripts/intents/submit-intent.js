#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const SOLVER_URL = 'http://localhost:3000';
const USER_PRIVATE_KEY = '0x0820e79cde729336c29c6d3f5102b522f625b4b1e5801f097848600a23e15cb2';

// Chain configs
const CHAINS = {
  eth_sepolia: {
    id: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    usdc: '0x352f1c7ffa598d0698c1D8D2fCAb02511c6fF3e9',
    inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563'
  },
  arb_sepolia: {
    id: 421614,
    rpc: 'https://api.zan.top/arb-sepolia',
    usdc: '0x61714300b991Cfc2BD336cb1745F01463163A988',
    outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388'
  }
};

// EIP-7683 CrossChainOrder structure
function createCrossChainOrder() {
  const wallet = new ethers.Wallet(USER_PRIVATE_KEY);
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    settlementAddress: CHAINS.arb_sepolia.outputSettler,
    swapper: wallet.address,
    nonce: BigInt(timestamp).toString(),
    originChainId: CHAINS.eth_sepolia.id,
    initiateDeadline: timestamp + 3600, // 1 hour
    fillDeadline: timestamp + 7200, // 2 hours
    orderData: {
      inputToken: CHAINS.eth_sepolia.usdc,
      inputAmount: ethers.parseUnits('10', 6).toString(), // 10 USDC
      outputToken: CHAINS.arb_sepolia.usdc,
      minOutputAmount: ethers.parseUnits('9.5', 6).toString(), // 9.5 USDC (allowing for fees)
      destinationChainId: CHAINS.arb_sepolia.id,
      destinationAddress: wallet.address
    }
  };
}

async function submitIntent() {
  console.log('Creating EIP-7683 cross-chain intent...');
  
  const order = createCrossChainOrder();
  
  console.log('Order details:');
  console.log(`- From: Ethereum Sepolia (${CHAINS.eth_sepolia.id})`);
  console.log(`- To: Arbitrum Sepolia (${CHAINS.arb_sepolia.id})`);
  console.log(`- Input: 10 USDC on Ethereum Sepolia`);
  console.log(`- Min Output: 9.5 USDC on Arbitrum Sepolia`);
  console.log(`- User: ${order.swapper}`);
  
  // Submit to solver
  console.log('\nSubmitting intent to solver...');
  
  try {
    const response = await fetch(`${SOLVER_URL}/api/v1/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order,
        signature: '0x' + '00'.repeat(65) // Placeholder signature
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Solver error: ${error}`);
    }
    
    const result = await response.json();
    console.log('\nIntent submitted successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Monitor intent status
    console.log('\nTo monitor the intent status:');
    console.log(`curl ${SOLVER_URL}/api/v1/intents/${result.id || order.nonce}`);
    
  } catch (error) {
    console.error('Error submitting intent:', error.message);
  }
}

// Check if ethers is installed
try {
  require.resolve('ethers');
  submitIntent();
} catch (e) {
  console.log('Installing ethers...');
  require('child_process').execSync('npm install ethers', { stdio: 'inherit' });
  console.log('Please run the script again.');
}
