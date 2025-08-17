#!/usr/bin/env node

const { ethers } = require('ethers');

// Config
const ORIGIN = {
  chainId: 11155111,
  rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563',
};
const DEST = {
  chainId: 421614,
  rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
  outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388',
};

const PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7'; // solver key

// TX hashes for the latest flow
const OPEN_TX = process.env.OPEN_TX || '0x66681222e44f1eb7961373a65739ebce3aec9bebc78af44c3a3bd0a563268486';
const FILL_TX = process.env.FILL_TX || '0xc512673b8e4fefc7f5170066491ccc6b283354dce5088b5117152e7990416e6e';

const INPUT_SETTLER_ABI = [
  'function finalise((address user,uint256 nonce,uint256 originChainId,uint32 expires,uint32 fillDeadline,address oracle,uint256[2][] inputs,(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes call,bytes context)[] outputs) order, uint32[] timestamps, bytes32[] solvers, bytes32 destination, bytes call) external',
  'function orderStatus(bytes32) view returns (uint8)'
];

const OUTPUT_SETTLER_ABI = [
  'event OutputFilled(bytes32 indexed orderId, bytes32 solver, uint32 timestamp, bytes output, uint256 finalAmount)'
];

const OPEN_EVENT_ABI = [
  'event Open(bytes32 indexed orderId, bytes order)'
];

function addressToBytes32(address) { return ethers.utils.hexZeroPad(address, 32); }

async function decodeOpenOrder(provider, inputSettlerAddr, openTxHash) {
  const iface = new ethers.utils.Interface(OPEN_EVENT_ABI);
  const receipt = await provider.getTransactionReceipt(openTxHash);
  const topic = iface.getEventTopic('Open');
  const log = receipt.logs.find(l => l.topics[0] === topic && l.address.toLowerCase() === inputSettlerAddr.toLowerCase());
  if (!log) throw new Error('Open event not found on origin');
  const parsed = iface.parseLog(log);
  const orderBytes = parsed.args.order;
  const decoded = ethers.utils.defaultAbiCoder.decode([
    'tuple(address user, uint256 nonce, uint256 originChainId, uint32 expires, uint32 fillDeadline, address inputOracle, uint256[2][] inputs, tuple(bytes32 oracle, bytes32 settler, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes call, bytes context)[] outputs)'
  ], orderBytes);
  const order = decoded[0];
  return { orderId: parsed.args.orderId, order };
}

async function parseFill(providerDest, fillTxHash) {
  const receipt = await providerDest.getTransactionReceipt(fillTxHash);
  const settler = new ethers.Contract(DEST.outputSettler, OUTPUT_SETTLER_ABI, providerDest);
  const topic = settler.interface.getEventTopic('OutputFilled');
  const log = receipt.logs.find(l => l.topics[0] === topic && l.address.toLowerCase() === DEST.outputSettler.toLowerCase());
  if (!log) throw new Error('OutputFilled not found on dest');
  const parsed = settler.interface.parseLog(log);
  return { orderId: parsed.args.orderId, solver: parsed.args.solver, timestamp: parsed.args.timestamp };
}

async function main() {
  console.log('🧾 Claiming order via finalise()');
  const originProvider = new ethers.providers.JsonRpcProvider(ORIGIN.rpc);
  const destProvider = new ethers.providers.JsonRpcProvider(DEST.rpc);
  const signer = new ethers.Wallet(PRIVATE_KEY, originProvider);
  const inputSettler = new ethers.Contract(ORIGIN.inputSettler, INPUT_SETTLER_ABI, signer);

  const { orderId, order } = await decodeOpenOrder(originProvider, ORIGIN.inputSettler, OPEN_TX);
  console.log('OrderId:', orderId);
  const { solver, timestamp } = await parseFill(destProvider, FILL_TX);
  console.log('Solver:', solver, 'Timestamp:', timestamp.toString());

  const timestamps = [timestamp];
  const solvers = [solver];
  const destination = solver; // solver to receive inputs
  const call = '0x';

  console.log('Submitting finalise...');
  const tx = await inputSettler.finalise(order, timestamps, solvers, destination, call, { gasLimit: 400000 });
  console.log('Claim tx:', tx.hash);
  const r = await tx.wait();
  console.log('✅ Claimed, gas used:', r.gasUsed.toString());

  const status = await inputSettler.orderStatus(orderId);
  console.log('Final order status:', status.toString());
}

main().catch(e => { console.error(e); process.exit(1); });
