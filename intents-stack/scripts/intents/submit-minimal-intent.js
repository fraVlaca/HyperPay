#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const USER_PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const INPUT_SETTLER = '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563';
const SEPOLIA_WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
const ARBITRUM_WETH = '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73';

// Use the exact ABI that worked in our test
const INPUT_SETTLER_ABI = [{
  "inputs": [
    {"name": "outputToken", "type": "address"},
    {"name": "outputAmount", "type": "uint256"},
    {"name": "outputChainId", "type": "uint256"},
    {"name": "outputRecipient", "type": "bytes32"},
    {"name": "fillDeadline", "type": "uint256"},
    {"name": "inputToken", "type": "address"},
    {"name": "inputAmount", "type": "uint256"}
  ],
  "name": "openIntent",
  "outputs": [{"name": "", "type": "bytes32"}],
  "stateMutability": "nonpayable",
  "type": "function"
}];

async function main() {
  console.log('🚀 Submitting Minimal Intent');
  console.log('============================\n');

  const wallet = new ethers.Wallet(USER_PRIVATE_KEY);
  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const signer = wallet.connect(provider);
  
  console.log(`User: ${wallet.address}\n`);

  const inputSettler = new ethers.Contract(INPUT_SETTLER, INPUT_SETTLER_ABI, signer);

  // Very simple parameters
  const params = {
    outputToken: ARBITRUM_WETH,
    outputAmount: ethers.utils.parseEther('0.0009'), // 0.0009 WETH
    outputChainId: 421614, // Arbitrum Sepolia
    outputRecipient: ethers.utils.hexZeroPad(wallet.address, 32),
    fillDeadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    inputToken: SEPOLIA_WETH,
    inputAmount: ethers.utils.parseEther('0.001') // 0.001 WETH
  };

  console.log('Intent parameters:');
  console.log(`  outputToken: ${params.outputToken}`);
  console.log(`  outputAmount: ${ethers.utils.formatEther(params.outputAmount)} WETH`);
  console.log(`  outputChainId: ${params.outputChainId}`);
  console.log(`  outputRecipient: ${params.outputRecipient}`);
  console.log(`  fillDeadline: ${new Date(params.fillDeadline * 1000).toISOString()}`);
  console.log(`  inputToken: ${params.inputToken}`);
  console.log(`  inputAmount: ${ethers.utils.formatEther(params.inputAmount)} WETH`);

  // First encode the call to see what we're sending
  console.log('\nEncoding function call...');
  const encoded = inputSettler.interface.encodeFunctionData('openIntent', [
    params.outputToken,
    params.outputAmount,
    params.outputChainId,
    params.outputRecipient,
    params.fillDeadline,
    params.inputToken,
    params.inputAmount
  ]);
  console.log(`Function selector: ${encoded.slice(0, 10)}`);
  console.log(`Encoded data length: ${encoded.length} chars`);

  // Try to submit
  console.log('\nSubmitting intent...');
  try {
    const gasEstimate = await inputSettler.estimateGas.openIntent(
      params.outputToken,
      params.outputAmount,
      params.outputChainId,
      params.outputRecipient,
      params.fillDeadline,
      params.inputToken,
      params.inputAmount
    );
    console.log(`Gas estimate: ${gasEstimate.toString()}`);

    const tx = await inputSettler.openIntent(
      params.outputToken,
      params.outputAmount,
      params.outputChainId,
      params.outputRecipient,
      params.fillDeadline,
      params.inputToken,
      params.inputAmount,
      { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
    );

    console.log(`\n✅ Transaction submitted!`);
    console.log(`Hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Look for events
    if (receipt.logs.length > 0) {
      console.log(`\nEvents emitted: ${receipt.logs.length}`);
      receipt.logs.forEach((log, i) => {
        console.log(`Event ${i}: topic0 = ${log.topics[0]}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

main().catch(console.error);
