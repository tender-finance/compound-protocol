import hre, {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import { formatAmount } from "../util";
import { numToWei } from "../utils/ethUnitParser";
import { deployOracle, deployToken } from './utils/tarb';
import { resolve } from "path";
import { expect } from "./utils/chai";

const unitrollerAddress: string = "0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e";
;
const ctokens = {
  tEth: '0x0706905b2b21574DEFcF00B5fc48068995FCdCdf',
  tfsGLP: '0xFF2073D3810754D6da4783235c8647e11e43C943',
  tWBTC: '0x0A2f8B6223EB7DE26c810932CCA488A4936cF391',
  tFRAX: '0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab',
  tUSDT: '0x4A5806A3c4fBB32F027240F80B18b26E40BF7E31',
  tUSDC: '0x068485a0f964B4c3D395059a19A05a8741c48B4E',
  tDAI: '0xB287180147EF1A97cbfb07e2F1788B75df2f6299',
  tLINK: '0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35',
  tUNI: '0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71',
  tGMX: '0x20a6768F6AABF66B787985EC6CE0EBEa6D7Ad497',
}

const getPrices = async (oracle: any) => {
  const tokenAddresses = Object.values(ctokens);
  return await Promise.all(tokenAddresses.map(async (token) => {
    return oracle.getUnderlyingPrice(token);
  }));
}
const getCurrentPrices = async () => {
  const unitrollerProxy = await hre.ethers.getContractAt("Comptroller", unitrollerAddress);
  const adminAddress = await unitrollerProxy.admin();
  const signer = await ethers.getImpersonatedSigner(adminAddress);
  const oracle = await ethers.getContractAt(
    "contracts/tender/TenderPriceOracle.sol:TenderPriceOracle",
    await unitrollerProxy.oracle(),
    signer
  )
  return await getPrices(oracle);
}
describe("TenderOracle", () => {
  it('Should return same prices for every token', async () => {
    const currentPrices = await getCurrentPrices();
    const tenderOracle = await deployOracle()
    const newPrices = await getPrices(tenderOracle);
    for (let i = 0; i < currentPrices.length; i++) {
      const test = currentPrices[i].sub(newPrices[i]) == 0;
      expect(test).to.be.true;
    }
  })
})
