#!/usr/bin/env node

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563';
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// Try different function signatures
const POSSIBLE_ABIS = [
  // Signature 1: Standard EIP-7683
  'function openIntent(address outputToken, uint256 outputAmount, uint256 outputChainId, bytes32 outputRecipient, uint256 fillDeadline, address inputToken, uint256 inputAmount) returns (bytes32)',
  
  // Signature 2: Without input params (native ETH)
  'function openIntent(address outputToken, uint256 outputAmount, uint256 outputChainId, bytes32 outputRecipient, uint256 fillDeadline) payable returns (bytes32)',
  
  // Signature 3: Recipient as address instead of bytes32
  'function openIntent(address outputToken, uint256 outputAmount, uint256 outputChainId, address outputRecipient, uint256 fillDeadline, address inputToken, uint256 inputAmount) returns (bytes32)',
  
  // Common view functions
  'function owner() view returns (address)',
  'function intents(bytes32) view returns (address, address, uint256, address, uint256, uint256, bytes32, uint256, bool)',
];

async function main() {
  console.log('🔍 Checking InputSettler Contract');
  console.log('=================================\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}\n`);

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Get contract code to verify it exists
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === '0x') {
    console.log('❌ No contract found at this address');
    return;
  }
  console.log('✅ Contract exists\n');

  // Try each function signature
  console.log('Testing function signatures:\n');
  
  for (const abi of POSSIBLE_ABIS) {
    try {
      const iface = new ethers.utils.Interface([abi]);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, [abi], provider);
      
      // Try to parse the function
      const funcName = abi.split(' ')[1].split('(')[0];
      console.log(`Testing: ${funcName}`);
      
      // For view functions, try to call them
      if (abi.includes(' view ')) {
        try {
          const result = await contract[funcName]();
          console.log(`  ✅ Works! Result: ${result}`);
        } catch (e) {
          console.log(`  ❌ Call failed: ${e.reason || e.message}`);
        }
      } else {
        // For non-view functions, just check if we can encode a call
        try {
          if (funcName === 'openIntent') {
            // Try to encode a dummy call
            const encoded = iface.encodeFunctionData(funcName, [
              '0x0000000000000000000000000000000000000001', // outputToken
              ethers.utils.parseEther('1'), // outputAmount
              421614, // outputChainId
              abi.includes('bytes32') ? ethers.utils.hexZeroPad('0x1234', 32) : '0x0000000000000000000000000000000000000001', // outputRecipient
              Math.floor(Date.now() / 1000) + 3600, // fillDeadline
              ...(abi.includes('inputToken') ? [
                '0x0000000000000000000000000000000000000002', // inputToken
                ethers.utils.parseEther('1') // inputAmount
              ] : [])
            ]);
            console.log(`  ✅ Can encode! Selector: ${encoded.slice(0, 10)}`);
          }
        } catch (e) {
          console.log(`  ❌ Cannot encode: ${e.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Invalid: ${error.message}`);
    }
    console.log('');
  }
}

main().catch(console.error);
