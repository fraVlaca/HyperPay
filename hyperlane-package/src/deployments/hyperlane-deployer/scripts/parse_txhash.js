#!/usr/bin/env node
const fs = require('fs');

if (process.argv.length < 3) {
  console.log('Usage: parse_txhash.js <file>');
  process.exit(1);
}

const s = fs.readFileSync(process.argv[2], 'utf8');
const m = s.match(/0x[a-fA-F0-9]{64}/g);
console.log(m ? m[0] : 'not-found');
