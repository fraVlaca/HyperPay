#!/usr/bin/env node

const { ethers } = require('ethers');

// Configuration
const USER_PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';
const SOLVER_ADDRESS = '0x9f5fD813Bb33eD5304dCe2f1D89E97fb14Cc7877';

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

// InputSettlerEscrow ABI
const INPUT_SETTLER_ABI = [
  'function openIntent(address outputToken, uint256 outputAmount, uint256 outputChainId, bytes32 outputRecipient, uint256 fillDeadline, address inputToken, uint256 inputAmount) returns (bytes32)',
  'function settleIntent(bytes32 intentId, bytes calldata intentData) external',
  'event IntentOpened(bytes32 indexed intentId, address indexed inputToken, uint256 inputAmount, address outputToken, uint256 outputAmount, uint256 outputChainId, bytes32 outputRecipient, address indexed sender, uint256 fillDeadline)'
];

// WETH ABI
const WETH_ABI = [
  'function deposit() payable',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  console.log('🚀 Submitting On-Chain EIP-7683 Intent');
  console.log('======================================\n');

  const userWallet = new ethers.Wallet(USER_PRIVATE_KEY);
  console.log(`User wallet: ${userWallet.address}`);

  // Connect to Sepolia (source chain)
  const sepoliaProvider = new ethers.providers.JsonRpcProvider(CHAINS.sepolia.rpc);
  const sepoliaSigner = userWallet.connect(sepoliaProvider);
  
  // Check balances
  console.log('Checking balances...');
  const ethBalance = await sepoliaProvider.getBalance(userWallet.address);
  console.log(`ETH balance: ${ethers.utils.formatEther(ethBalance)}`);

  const weth = new ethers.Contract(CHAINS.sepolia.weth, WETH_ABI, sepoliaSigner);
  const wethBalance = await weth.balanceOf(userWallet.address);
  console.log(`WETH balance: ${ethers.utils.formatEther(wethBalance)}`);

  // If no WETH, deposit some
  const requiredAmount = ethers.utils.parseEther('0.001'); // 0.001 WETH
  if (wethBalance.lt(requiredAmount)) {
    console.log('\nDepositing ETH to get WETH...');
    const depositTx = await weth.deposit({ value: requiredAmount });
    console.log(`Deposit tx: ${depositTx.hash}`);
    await depositTx.wait();
    console.log('✅ Deposited successfully');
  }

  // Check and set approval
  const inputSettler = new ethers.Contract(CHAINS.sepolia.inputSettler, INPUT_SETTLER_ABI, sepoliaSigner);
  const currentAllowance = await weth.allowance(userWallet.address, CHAINS.sepolia.inputSettler);
  
  if (currentAllowance.lt(requiredAmount)) {
    console.log('\nApproving WETH for InputSettler...');
    const approveTx = await weth.approve(CHAINS.sepolia.inputSettler, ethers.constants.MaxUint256);
    console.log(`Approval tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('✅ Approved successfully');
  }

  // Create intent parameters
  const outputToken = CHAINS.arbitrum.weth; // WETH on Arbitrum
  const outputAmount = ethers.utils.parseEther('0.0009'); // 0.0009 WETH (0.1% fee for solver)
  const outputChainId = CHAINS.arbitrum.chainId;
  const outputRecipient = ethers.utils.hexZeroPad(userWallet.address, 32); // User's address on destination
  const fillDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  console.log('\nIntent parameters:');
  console.log(`- Input: 0.001 WETH on Sepolia`);
  console.log(`- Output: 0.0009 WETH on Arbitrum (0.1% solver fee)`);
  console.log(`- Recipient: ${userWallet.address}`);
  console.log(`- Fill deadline: ${new Date(fillDeadline * 1000).toISOString()}`);

  // Submit intent on-chain
  console.log('\nSubmitting intent on-chain...');
  console.log('Parameters:');
  console.log(`  outputToken: ${outputToken}`);
  console.log(`  outputAmount: ${outputAmount.toString()}`);
  console.log(`  outputChainId: ${outputChainId}`);
  console.log(`  outputRecipient: ${outputRecipient}`);
  console.log(`  fillDeadline: ${fillDeadline}`);
  console.log(`  inputToken: ${CHAINS.sepolia.weth}`);
  console.log(`  inputAmount: ${requiredAmount.toString()}`);
  
  try {
    // Add gas limit to see actual revert reason
    const tx = await inputSettler.openIntent(
      outputToken,
      outputAmount,
      outputChainId,
      outputRecipient,
      fillDeadline,
      CHAINS.sepolia.weth, // Input token (WETH on Sepolia)
      requiredAmount, // Input amount (0.001 WETH)
      { gasLimit: 500000 }
    );

    console.log(`\n✅ Intent submitted!`);
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Find the IntentOpened event
    const intentOpenedEvent = receipt.logs.find(log => {
      try {
        const parsed = inputSettler.interface.parseLog(log);
        return parsed.name === 'IntentOpened';
      } catch {
        return false;
      }
    });

    if (intentOpenedEvent) {
      const parsed = inputSettler.interface.parseLog(intentOpenedEvent);
      console.log(`\nIntent ID: ${parsed.args.intentId}`);
      console.log('\n📊 Intent Details:');
      console.log(`- Intent ID: ${parsed.args.intentId}`);
      console.log(`- Input Token: ${parsed.args.inputToken}`);
      console.log(`- Input Amount: ${ethers.utils.formatEther(parsed.args.inputAmount)} WETH`);
      console.log(`- Output Token: ${parsed.args.outputToken}`);
      console.log(`- Output Amount: ${ethers.utils.formatEther(parsed.args.outputAmount)} WETH`);
      console.log(`- Output Chain: ${parsed.args.outputChainId}`);
      console.log(`- Sender: ${parsed.args.sender}`);
    }

    console.log('\n🔍 Now monitoring solver for execution...');
    console.log('The solver should pick up this intent and execute it cross-chain.');
    console.log('Check the solver logs to see the execution progress.');

  } catch (error) {
    console.error('❌ Failed to submit intent:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

main().catch(console.error);
