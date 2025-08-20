#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration (Mainnet -> Arbitrum One)
// You can override RPCs/PK via env: USER_PK, MAINNET_RPC, ARB_RPC
const USER_PRIVATE_KEY = process.env.USER_PK;

const CHAINS = {
  mainnet: {
    chainId: 1,
    rpc: process.env.MAINNET_RPC || 'https://eth-mainnet.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk',
    token: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // PYUSD
    inputSettler: '0x00E846027c83b4c6238F2E34F12d3679BbaCc448',
    hyperlaneOracle: '0x95A0b66371d2cF28F312192D662e4b627eB88155'
  },
  arbitrum: {
    chainId: 42161,
    rpc: process.env.ARB_RPC || 'https://arb1.arbitrum.io/rpc',
    token: '0x46850aD61C2B7d64d08c9C754F45254596696984', // PYUSD on Arbitrum One
    outputSettler: '0x95A0b66371d2cF28F312192D662e4b627eB88155',
    hyperlaneOracle: '0x77818DE6a93f0335E9A5817314Bb1e879d319C6F'
  }
};

// Contract ABIs
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
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
  const provider = new ethers.providers.JsonRpcProvider(CHAINS.mainnet.rpc);
  const providerArb = new ethers.providers.JsonRpcProvider(CHAINS.arbitrum.rpc);
  const signer = wallet.connect(provider);
  
  console.log(`User: ${wallet.address}\n`);

  // Contract instances
  const originToken = new ethers.Contract(CHAINS.mainnet.token, ERC20_ABI, signer);
  const destTokenReader = new ethers.Contract(CHAINS.arbitrum.token, ERC20_ABI, providerArb);
  const inputSettler = new ethers.Contract(CHAINS.mainnet.inputSettler, INPUT_SETTLER_ABI, signer);

  // Check balances
  const [originDecimals, destDecimals] = await Promise.all([
    originToken.decimals(),
    destTokenReader.decimals(),
  ]);

  const tokenBalance = await originToken.balanceOf(wallet.address);
  console.log(`Origin token balance: ${ethers.utils.formatUnits(tokenBalance, originDecimals)}`);

  // Ensure approval
  const currentAllowance = await originToken.allowance(wallet.address, CHAINS.mainnet.inputSettler);
  if (currentAllowance.lt(ethers.constants.MaxUint256)) {
    console.log('Setting approval...');
    const approveTx = await originToken.approve(CHAINS.mainnet.inputSettler, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log('✅ Approval set\n');
  }

  // Create StandardOrder
  const now = Math.floor(Date.now() / 1000);
  // Amounts, expressed in human units and converted using token decimals
  const INPUT_AMOUNT = '0.001';
  const OUTPUT_AMOUNT = '0.0009';
  const inputAmount = ethers.utils.parseUnits(INPUT_AMOUNT, originDecimals);
  const outputAmount = ethers.utils.parseUnits(OUTPUT_AMOUNT, destDecimals);

  if (tokenBalance.lt(inputAmount)) {
    console.error(`Insufficient ${INPUT_AMOUNT} origin token. Balance: ${ethers.utils.formatUnits(tokenBalance, originDecimals)} required: ${INPUT_AMOUNT}`);
    process.exit(1);
  }

  const standardOrder = {
    user: wallet.address,
    nonce: Date.now(), // Simple nonce
    originChainId: CHAINS.mainnet.chainId,
    expires: now + 7200, // 2 hours expiry
    fillDeadline: now + 3600, // 1 hour to fill
    inputOracle: CHAINS.mainnet.hyperlaneOracle,
    inputs: [
      [CHAINS.mainnet.token, inputAmount]
    ],
    outputs: [
      {
        oracle: addressToBytes32(CHAINS.arbitrum.hyperlaneOracle),
        settler: addressToBytes32(CHAINS.arbitrum.outputSettler),
        chainId: CHAINS.arbitrum.chainId,
        token: addressToBytes32(CHAINS.arbitrum.token),
        amount: outputAmount, // example with ~10% fee
        recipient: addressToBytes32(wallet.address),
        call: '0x', // Empty callback
        context: '0x' // Empty context
      }
    ]
  };

  console.log('Order details:');
  console.log(`- User: ${standardOrder.user}`);
  console.log(`- Input: ${INPUT_AMOUNT} PYUSD on Mainnet`);
  console.log(`- Output: ${OUTPUT_AMOUNT} PYUSD on Arbitrum One`);
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
