import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import { writeFileSync } from 'fs';
const ctokens = {
  "tEth": "0x0706905b2b21574DEFcF00B5fc48068995FCdCdf",
  "tfsGLP": "0xFF2073D3810754D6da4783235c8647e11e43C943",
  "tWBTC": "0x0A2f8B6223EB7DE26c810932CCA488A4936cF391",
  "tFRAX": "0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab",
  "tUSDT": "0x4A5806A3c4fBB32F027240F80B18b26E40BF7E31",
  "tUSDC": "0x068485a0f964B4c3D395059a19A05a8741c48B4E",
  "tDAI": "0xB287180147EF1A97cbfb07e2F1788B75df2f6299",
  "tLINK": "0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35",
  "tUNI": "0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71",
  "tGMX": "0x20a6768F6AABF66B787985EC6CE0EBEa6D7Ad497",
}
const deployments = require('../../deployments/arbitrum.json')

const getSigner = async () => {
  if (hre.network.name == 'hardhat' || hre.network.name == 'localhost') {
    const multisig = '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2'
    return [await hre.ethers.getImpersonatedSigner(multisig)];
  }
  return await hre.ethers.getSigners();
}

const test = async (oracle, ctoken) => {
  return await oracle.getUnderlyingPrice(ctoken);
}
const main = async () => {
  const outputFilePath = `${__dirname}/../../deployments/${hre.network.name}.json`;
  const [signer] = await getSigner();
  const TndOracle = await hre.ethers.getContractFactory('contracts/tnd/TndOracle.sol:TndOracle', signer);
  const tndOracle = await TndOracle.deploy();
  console.log('tndOracle deployed to:', tndOracle.address)
  deployments['tndOracle'] = tndOracle.address;
  const PriceOracle = await hre.ethers.getContractFactory('contracts/Compound/GMXPriceOracle.sol:GMXPriceOracle', signer);
  const priceOracle = await PriceOracle.deploy(tndOracle.address);
  console.log('priceOracle deployed to:', priceOracle.address)
  deployments['PriceOracle'] = priceOracle.address;
  for (const [name, address] of Object.entries(ctokens)) {
    console.log(`${name}:`, await test(priceOracle, String(address)))
  }
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
}

main()

