#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const USER_PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';

const CHAINS = {
  sepolia: {
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563',
    hyperlaneOracle: '0xa39434521088d9a50325BC50eC2f50660e06Df34'
  },
  arbitrum: {
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388',
    hyperlaneOracle: '0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa'
  }
};

// Contract ABIs
const WETH_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const INPUT_SETTLER_ABI = [
  'function open(bytes calldata order) external',
  'function orderStatus(bytes32) view returns (uint8)',
  'event Open(bytes32 indexed orderId, bytes order)'
];

// Helper to convert address to bytes32
function addressToBytes32(address) {
  return ethers.utils.hexZeroPad(address, 32);
}

async function main() {
  console.log('🚀 Submitting Proper OIF Intent');
  console.log('================================\n');

  const wallet = new ethers.Wallet(USER_PRIVATE_KEY);
  const provider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const signer = wallet.connect(provider);
  
  console.log(`User: ${wallet.address}\n`);

  // Contract instances
  const weth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, signer);
  const inputSettler = new ethers.Contract(CHAINS.sepolia.inputSettler, INPUT_SETTLER_ABI, signer);

  // Check balances
  const wethBalance = await weth.balanceOf(wallet.address);
  console.log(`WETH balance: ${ethers.utils.formatEther(wethBalance)}`);

  // Ensure approval
  const currentAllowance = await weth.allowance(wallet.address, CHAINS.sepolia.inputSettler);
  if (currentAllowance.lt(ethers.constants.MaxUint256)) {
    console.log('Setting approval...');
    const approveTx = await weth.approve(CHAINS.sepolia.inputSettler, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log('✅ Approval set\n');
  }

  // Create StandardOrder
  const now = Math.floor(Date.now() / 1000);
  const standardOrder = {
    user: wallet.address,
    nonce: Date.now(), // Simple nonce
    originChainId: CHAINS.sepolia.chainId,
    expires: now + 7200, // 2 hours expiry
    fillDeadline: now + 3600, // 1 hour to fill
    inputOracle: CHAINS.sepolia.hyperlaneOracle,
    inputs: [
      [CHAINS.sepolia.weth, ethers.utils.parseEther('0.001')] // 0.001 WETH input
    ],
    outputs: [
      {
        oracle: addressToBytes32(CHAINS.arbitrum.hyperlaneOracle),
        settler: addressToBytes32(CHAINS.arbitrum.outputSettler),
        chainId: CHAINS.arbitrum.chainId,
        token: addressToBytes32(CHAINS.arbitrum.weth),
        amount: ethers.utils.parseEther('0.0009'), // 0.0009 WETH output (10% fee)
        recipient: addressToBytes32(wallet.address),
        call: '0x', // Empty callback
        context: '0x' // Empty context
      }
    ]
  };

  console.log('Order details:');
  console.log(`- User: ${standardOrder.user}`);
  console.log(`- Input: 0.001 WETH on Sepolia`);
  console.log(`- Output: 0.0009 WETH on Arbitrum`);
  console.log(`- Fill deadline: ${new Date(standardOrder.fillDeadline * 1000).toISOString()}`);
  console.log(`- Expires: ${new Date(standardOrder.expires * 1000).toISOString()}\n`);

  // Encode the order
  const encodedOrder = ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(address user, uint256 nonce, uint256 originChainId, uint32 expires, uint32 fillDeadline, address inputOracle, uint256[2][] inputs, tuple(bytes32 oracle, bytes32 settler, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes call, bytes context)[] outputs)'
    ],
    [standardOrder]
  );

  console.log(`Encoded order length: ${encodedOrder.length} bytes`);

  // Submit the order
  console.log('\nSubmitting order...');
  try {
    const tx = await inputSettler.open(encodedOrder, { gasLimit: 500000 });
    console.log(`Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log('✅ Order opened successfully!');
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Find the Open event
    const openEvent = receipt.logs.find(log => {
      try {
        const parsed = inputSettler.interface.parseLog(log);
        return parsed.name === 'Open';
      } catch {
        return false;
      }
    });

    if (openEvent) {
      const parsed = inputSettler.interface.parseLog(openEvent);
      console.log(`\nOrder ID: ${parsed.args.orderId}`);
      
      // Check order status
      const status = await inputSettler.orderStatus(parsed.args.orderId);
      console.log(`Order status: ${['None', 'Deposited', 'Claimed', 'Refunded'][status]}`);
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
  }
}

main().catch(console.error);
