#!/usr/bin/env node

const { ethers } = require('ethers');
const axios = require('axios');

// Configuration
const SOLVER_URL = 'http://localhost:3000';
const PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';
const SOLVER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877';

// Network configs
const CHAINS = {
  sepolia: {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563',
    outputSettler: '0x331B0c3b82C8C3CF06DFD2a12905Cc311589FB6D'
  },
  arbitrum: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    inputSettler: '0xCe81010d0A47FF13Cc19105E8Ef7B597aA8D3460',
    outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388'
  }
};

// EIP-7683 Intent structure
function createIntent(fromChainId, toChainId, amount) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    source: fromChainId,
    destination: toChainId,
    intents: [
      {
        tokenAddress: CHAINS.sepolia.weth, // Source token (WETH on Sepolia)
        amount: amount.toString(),
        sender: SOLVER_ADDRESS,
        recipient: SOLVER_ADDRESS, // Same address on destination
        calldata: '0x', // No calldata for simple transfer
        // Intent should be fillable for 1 hour
        fillDeadline: timestamp + 3600,
        // Give solver 30 minutes to settle
        exclusivityDeadline: timestamp + 1800,
        exclusiveFiller: SOLVER_ADDRESS
      }
    ],
    nonce: Date.now(), // Simple nonce using timestamp
    deadline: timestamp + 3600 // 1 hour deadline
  };
}

async function main() {
  console.log('🚀 OIF Solver Intent Submission Test');
  console.log('=====================================\n');

  // Check solver health
  try {
    console.log('Checking solver status...');
    const health = await axios.get(`${SOLVER_URL}/health`).catch(() => null);
    if (!health) {
      console.log('⚠️  Health endpoint not available, but solver may still be running');
    }
  } catch (error) {
    console.log('⚠️  Could not reach health endpoint:', error.message);
  }

  // Create wallet
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`\nUsing wallet: ${wallet.address}`);

  // Check balances
  console.log('\nChecking balances...');
  const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const arbitrumProvider = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);
  
  const sepoliaBalance = await sepoliaProvider.getBalance(wallet.address);
  const arbitrumBalance = await arbitrumProvider.getBalance(wallet.address);
  
  console.log(`Sepolia ETH: ${ethers.utils.formatEther(sepoliaBalance)}`);
  console.log(`Arbitrum ETH: ${ethers.utils.formatEther(arbitrumBalance)}`);

  // Check WETH balances
  const wethAbi = ['function balanceOf(address) view returns (uint256)'];
  const sepoliaWeth = new ethers.Contract(CHAINS.sepolia.weth, wethAbi, sepoliaProvider);
  const arbitrumWeth = new ethers.Contract(CHAINS.arbitrum.weth, wethAbi, arbitrumProvider);
  
  const sepoliaWethBalance = await sepoliaWeth.balanceOf(wallet.address);
  const arbitrumWethBalance = await arbitrumWeth.balanceOf(wallet.address);
  
  console.log(`\nSepolia WETH: ${ethers.utils.formatEther(sepoliaWethBalance)}`);
  console.log(`Arbitrum WETH: ${ethers.utils.formatEther(arbitrumWethBalance)}`);

  // Create intent to transfer 0.001 WETH from Sepolia to Arbitrum
  const amount = ethers.utils.parseEther('0.001');
  const intent = createIntent(CHAINS.sepolia.chainId, CHAINS.arbitrum.chainId, amount);

  console.log('\nCreating intent:');
  console.log(`- From: Sepolia (${CHAINS.sepolia.chainId})`);
  console.log(`- To: Arbitrum (${CHAINS.arbitrum.chainId})`);
  console.log(`- Amount: 0.001 WETH`);
  console.log(`- Sender/Recipient: ${SOLVER_ADDRESS}`);

  // Submit intent to solver
  console.log('\nSubmitting intent to solver...');
  try {
    const response = await axios.post(`${SOLVER_URL}/order/submit`, intent, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Intent submitted successfully!');
    console.log(`Order ID: ${response.data.orderId || response.data.id || 'N/A'}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));

    // Check order status
    if (response.data.orderId || response.data.id) {
      const orderId = response.data.orderId || response.data.id;
      console.log(`\nChecking order status...`);
      
      setTimeout(async () => {
        try {
          const status = await axios.get(`${SOLVER_URL}/order/${orderId}`);
          console.log('Order status:', JSON.stringify(status.data, null, 2));
        } catch (error) {
          console.log('Could not fetch order status:', error.message);
        }
      }, 5000);
    }
  } catch (error) {
    console.error('❌ Failed to submit intent:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n⚠️  The /order/submit endpoint was not found.');
      console.log('This might be because the solver needs offchain discovery enabled.');
      console.log('Check the solver logs for more information.');
    }
  }
}

main().catch(console.error);
