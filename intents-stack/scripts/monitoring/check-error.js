#!/usr/bin/env node

const { ethers } = require('ethers');

// Calculate error selectors for known errors
const errors = [
  'NotImplemented()',
  'ExclusiveTo(bytes32)',
  'ZeroValue()',
  'InvalidContextDataLength()',
  'FillDeadline()',
  'AlreadyFilled()',
  'InvalidAttestation(bytes32,bytes32)',
  'PayloadTooSmall()',
  'VerificationFailed()'
];

console.log('Error Selector Lookup:');
console.log('======================\n');

errors.forEach(error => {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(error));
  const selector = hash.slice(0, 10);
  console.log(`${error.padEnd(40)} => ${selector}`);
  
  if (selector === '0x9f3ddb90') {
    console.log(`\n✅ FOUND MATCH: ${error}\n`);
  }
});

// Also check if this is the IInputOracle.isProven failure
const oracleError = 'VerificationFailed()';
const oracleHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(oracleError));
const oracleSelector = oracleHash.slice(0, 10);
console.log(`\nChecking Oracle error:`);
console.log(`${oracleError.padEnd(40)} => ${oracleSelector}`);
