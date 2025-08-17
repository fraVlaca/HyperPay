const { Wallet } = require('ethers');

const privateKey = '0xd32b4f4ee569fefe3caa3bce14a7504de18b6153feecb4672734b818e79220d7';
const wallet = new Wallet(privateKey);

console.log('Private Key:', privateKey);
console.log('Address:', wallet.address);
