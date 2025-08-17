#!/usr/bin/env node
const { ethers } = require('ethers');
const ORDER_ID = process.env.ORDER_ID || '0x1556ec3a809789f8af78242f09d6b49f2c7f4e2408583aa76c0f03581ec3d11a';
const INPUT_SETTLER = '0xcA919F1EeAA377009E11a5C5c9FA5923fC3eD563';
const RPC = 'https://ethereum-sepolia-rpc.publicnode.com'\;
const ABI = ['function orderStatus(bytes32) view returns (uint8)'];
async function main(){
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const c = new ethers.Contract(INPUT_SETTLER, ABI, provider);
  const start = Date.now();
  const deadline = start + 12*60*1000; // 12 minutes
  for(;;){
    const s = await c.orderStatus(ORDER_ID);
    const v = Number(s);
    const now = new Date().toISOString();
    console.log(`${now} orderStatus=${v}`);
    if(v===2){
      console.log('✅ Claimed on origin chain');
      process.exit(0);
    }
    if(Date.now() > deadline){
      console.log('⏳ Timeout waiting for claim');
      process.exit(2);
    }
    await new Promise(r=>setTimeout(r, 10000));
  }
}
main().catch(e=>{ console.error(e); process.exit(1); });
