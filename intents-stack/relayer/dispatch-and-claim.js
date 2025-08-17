#!/usr/bin/env node

const { ethers } = require('ethers');

// Config: adjust if needed
const ORIGIN = {
  chainId: 11155111,
  rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  inputSettler: '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563',
  oracle: '0xa39434521088d9a50325BC50eC2f50660e06Df34',
};
const DEST = {
  chainId: 421614,
  rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
  outputSettler: '0x92DAe04879b394104491d5153C36d814bEbcB388',
  oracle: '0x7711d06A5F6Fc7772aa109D2231635CEC3850dBa',
};

// Use same private key as solver
const PRIVATE_KEY = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';

// Last fill tx hash to relay
const FILL_TX_HASH = process.env.FILL_TX || '0xc512673b8e4fefc7f5170066491ccc6b283354dce5088b5117152e7990416e6e';

// ABIs
const OUTPUT_SETTLER_ABI = [
  'event OutputFilled(bytes32 indexed orderId, bytes32 solver, uint32 timestamp, bytes output, uint256 finalAmount)'
];

const HYPERLANE_ORACLE_ABI = [
  'function submit(uint32 destinationDomain, address recipientOracle, uint256 gasLimit, bytes customMetadata, address source, bytes[] payloads) external payable',
  'function quoteGasPayment(uint32 destinationDomain, address recipientOracle, uint256 gasLimit, bytes customMetadata, address source, bytes[] payloads) external view returns (uint256)'
];

const INPUT_SETTLER_ABI = [
  'function finalise((address user,uint256 nonce,uint256 originChainId,uint32 expires,uint32 fillDeadline,address oracle,uint256[2][] inputs,(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes call,bytes context)[] outputs) order, uint32[] timestamps, bytes32[] solvers, bytes32 destination, bytes call) external'
];

function toBytes32(addr) {
  return ethers.utils.hexZeroPad(addr, 32);
}

function parseMandateOutputFromBytes(outputBytes) {
  const hex = ethers.utils.hexlify(outputBytes);
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const get = (offset, length) => '0x' + h.slice(offset*2, (offset+length)*2);
  let off = 0; // skip 6-byte fillDeadline in originData
  off += 6;
  const oracle = get(off,32); off+=32;
  const settler = get(off,32); off+=32;
  const chainId = ethers.BigNumber.from(get(off,32)); off+=32;
  const token = get(off,32); off+=32;
  const amount = ethers.BigNumber.from(get(off,32)); off+=32;
  const recipient = get(off,32); off+=32;
  const callLen = parseInt(get(off,2)); off+=2;
  const call = get(off, callLen); off+=callLen;
  const ctxLen = parseInt(get(off,2)); off+=2;
  const context = get(off, ctxLen);
  return { oracle, settler, chainId, token, amount, recipient, call, context };
}

function encodeFillDescription(solverBytes32, orderId, timestamp, m) {
  const callLen = ethers.utils.hexDataLength(m.call);
  const ctxLen = ethers.utils.hexDataLength(m.context);
  return ethers.utils.solidityPack(
    ['bytes32','bytes32','uint32','bytes32','uint256','bytes32','uint16','bytes','uint16','bytes'],
    [solverBytes32, orderId, timestamp, m.token, m.amount, m.recipient, callLen, m.call, ctxLen, m.context]
  );
}

async function main() {
  console.log('🔁 Relaying Hyperlane proof and claiming...');
  const destProvider = new ethers.providers.JsonRpcProvider(DEST.rpc);
  const originProvider = new ethers.providers.JsonRpcProvider(ORIGIN.rpc);
  const destWallet = new ethers.Wallet(PRIVATE_KEY, destProvider);
  const originWallet = new ethers.Wallet(PRIVATE_KEY, originProvider);

  const receipt = await destProvider.getTransactionReceipt(FILL_TX_HASH);
  if (!receipt || receipt.status !== 1) throw new Error('Fill tx not successful');

  const outputSettler = new ethers.Contract(DEST.outputSettler, OUTPUT_SETTLER_ABI, destProvider);
  const outputFilledTopic = outputSettler.interface.getEventTopic('OutputFilled');
  const log = receipt.logs.find(l => l.topics[0] === outputFilledTopic);
  if (!log) throw new Error('OutputFilled event not found');
  const parsed = outputSettler.interface.parseLog(log);
  const orderId = parsed.args.orderId;
  const solver = parsed.args.solver; // bytes32
  const timestamp = parsed.args.timestamp;
  const outputBytes = parsed.args.output; // bytes

  const m = parseMandateOutputFromBytes(outputBytes);
  console.log('Parsed MandateOutput:', {oracle:m.oracle, settler:m.settler, chainId: m.chainId.toString(), token:m.token, amount:m.amount.toString(), recipient:m.recipient});
  console.log('DEST.oracle:', DEST.oracle, 'OUTPUT_SETTLER:', DEST.outputSettler);
  const payload = encodeFillDescription(solver, orderId, timestamp, m);

  const oracle = new ethers.Contract(DEST.oracle, HYPERLANE_ORACLE_ABI, destWallet);
  // Resolve correct Hyperlane domain from origin oracle's Mailbox
  const ORACLE_MAILBOX_ABI = ['function MAILBOX() view returns (address)'];
  const MAILBOX_ABI = ['function localDomain() view returns (uint32)'];
  const originOracleReader = new ethers.Contract(ORIGIN.oracle, ORACLE_MAILBOX_ABI, originProvider);
  const originMailboxAddr = await originOracleReader.MAILBOX();
  const originMailbox = new ethers.Contract(originMailboxAddr, MAILBOX_ABI, originProvider);
  const destinationDomain = await originMailbox.localDomain();
  const recipientOracle = ORIGIN.oracle;
  const gasLimit = 500000;
  const source = DEST.outputSettler;
  const payloads = [payload];
  const customMetadata = '0x';

  let fee;
  try {
    fee = await oracle.quoteGasPayment(destinationDomain, recipientOracle, gasLimit, customMetadata, source, payloads);
  } catch {}
  if (!fee) { fee = ethers.utils.parseEther('0.0002'); }

  console.log('Submitting Hyperlane message with fee', ethers.utils.formatEther(fee));
  const tx = await oracle.submit(destinationDomain, recipientOracle, gasLimit, customMetadata, source, payloads, { value: fee });
  console.log('Hyperlane submit tx:', tx.hash);
  await tx.wait(1);

  const ORACLE_READ_ABI = ['function isProven(uint256,bytes32,bytes32,bytes32) view returns (bool)'];
  const originOracle = new ethers.Contract(ORIGIN.oracle, ORACLE_READ_ABI, originProvider);
  const application = m.settler;
  const dataHash = ethers.utils.keccak256(payload);
  const remoteOracle = toBytes32(DEST.oracle);

  for (let i=0;i<24;i++) {
    const proven = await originOracle.isProven(DEST.chainId, remoteOracle, application, dataHash);
    console.log(`isProven: ${proven}`);
    if (proven) {
      console.log('✅ Oracle attested');
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  throw new Error('Oracle not proven after waiting');
}

main().catch(err => { console.error(err); process.exit(1); });
