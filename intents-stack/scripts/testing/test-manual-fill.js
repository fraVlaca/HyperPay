#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const SOLVER_PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';
const ORDER_ID = '0x6d2be32b698ca1b3b73993257bd29da35385d474378ea6ed00674c56dfd95922';

const ARBITRUM_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
const OUTPUT_SETTLER = '0x92DAe04879b394104491d5153C36d814bEbcB388';
const ARBITRUM_WETH = '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73';

// ABI for OutputSettler based on IDestinationSettler interface
const OUTPUT_SETTLER_ABI = [
  'function fill(bytes32 orderId, bytes calldata originData, bytes calldata fillerData) external returns (bytes32)',
  'event IntentFilled(bytes32 indexed intentId, address indexed outputToken, uint256 outputAmount, address indexed recipient)'
];

const WETH_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

// Helper to convert address to bytes32
function addressToBytes32(address) {
  return ethers.utils.hexZeroPad(address, 32);
}

async function main() {
  console.log('🧪 Testing Manual Fill');
  console.log('======================\n');

  const wallet = new ethers.Wallet(SOLVER_PRIVATE_KEY);
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const signer = wallet.connect(provider);
  
  console.log(`Solver: ${wallet.address}`);
  console.log(`Order ID: ${ORDER_ID}\n`);

  const outputSettler = new ethers.Contract(OUTPUT_SETTLER, OUTPUT_SETTLER_ABI, signer);
  const weth = new ethers.Contract(ARBITRUM_WETH, WETH_ABI, signer);

  // Check solver WETH balance
  const balance = await weth.balanceOf(wallet.address);
  console.log(`Solver WETH balance: ${ethers.utils.formatEther(balance)}`);

  // Create origin data based on the order structure
  // This should match what was submitted on the source chain
  const originData = ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(bytes32 oracle, bytes32 settler, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes call, bytes context)'
    ],
    [{
      oracle: addressToBytes32('0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa'), // Arbitrum Hyperlane oracle
      settler: addressToBytes32(OUTPUT_SETTLER),
      chainId: 421614, // Arbitrum Sepolia
      token: addressToBytes32(ARBITRUM_WETH),
      amount: ethers.utils.parseEther('0.0009'),
      recipient: addressToBytes32(wallet.address),
      call: '0x',
      context: '0x'
    }]
  );

  // Filler data (can be empty for simple fills)
  const fillerData = '0x';

  console.log('Attempting to fill order...');
  console.log(`Origin data length: ${originData.length} bytes`);
  console.log(`Filler data: ${fillerData}\n`);

  try {
    // First, let's try to estimate gas to see if the call would succeed
    const gasEstimate = await outputSettler.estimateGas.fill(
      ORDER_ID,
      originData,
      fillerData
    );
    console.log(`Gas estimate: ${gasEstimate.toString()}`);

    // If gas estimation succeeds, submit the transaction
    const tx = await outputSettler.fill(
      ORDER_ID,
      originData,
      fillerData,
      { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
    );
    
    console.log(`Transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    
    console.log('✅ Fill successful!');
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Check for events
    const fillEvent = receipt.logs.find(log => {
      try {
        const parsed = outputSettler.interface.parseLog(log);
        return parsed.name === 'IntentFilled';
      } catch {
        return false;
      }
    });

    if (fillEvent) {
      const parsed = outputSettler.interface.parseLog(fillEvent);
      console.log('\nIntentFilled event:');
      console.log(`  Intent ID: ${parsed.args.intentId}`);
      console.log(`  Token: ${parsed.args.outputToken}`);
      console.log(`  Amount: ${ethers.utils.formatEther(parsed.args.outputAmount)}`);
      console.log(`  Recipient: ${parsed.args.recipient}`);
    }

  } catch (error) {
    console.error('❌ Fill failed:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
    
    // Try to decode the error
    if (error.data) {
      console.log('\nError data:', error.data);
      
      // Common error selectors
      const errorSelectors = {
        '0x08c379a0': 'Error(string)',
        '0x4e487b71': 'Panic(uint256)',
        '0x22cdde4c': 'VerificationFailed()',
        '0xd4d0290e': 'FillDeadline()'
      };
      
      const selector = error.data.slice(0, 10);
      if (errorSelectors[selector]) {
        console.log(`Error type: ${errorSelectors[selector]}`);
      }
    }
  }
}

main().catch(console.error);
