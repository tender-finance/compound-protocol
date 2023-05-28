import '@nomiclabs/hardhat-ethers';
import hre, { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import * as deployments from '../../deployments/arbitrum.json';

const adminAddr = '0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac';
async function getSigner() {
  let signer: any;
  if (hre.network.name == 'hardhat' || hre.network.name == 'localhost'){
    signer = await ethers.getImpersonatedSigner(adminAddr)
  } else{
    [signer] = await ethers.getSigners();
  }
  return signer;
}

// const params = {
//   baseRatePerYear: "0",
//   multiplierPerYear: "0",
//   jumpMultiplierPerYear: "0",
//   kink_: "0",
//   // blocksPerYear: "2628000",
//   // baseRate: "9.57", // 6.77 = 7% APY
//   // kink: "90",
//   // multiplierPreKink: "0.1",
//   // multiplierPostKink: "0",
//   // admin: "0x51129c8332A220E0bF9546A6Fe07481c17D2B638",
// };

async function getCurrentParams (irModel: any) {
  const blocksPerYear = await irModel.blocksPerYear();
  const baseRatePerBlock = await irModel.baseRatePerBlock();
  const jumpMultiplierPerBlock = await irModel.jumpMultiplierPerBlock();
  const multiplierPerBlock = await irModel.multiplierPerBlock();
  const kink_ = await irModel.kink();
  const current = {
    baseRatePerYear: baseRatePerBlock.mul(blocksPerYear),
    multiplierPerYear: multiplierPerBlock.mul(blocksPerYear),
    jumpMultiplierPerYear: jumpMultiplierPerBlock.mul(blocksPerYear),
    kink_: kink_
  }
  return current
}
async function calcParams(irModel: any) {
  console.log(await getCurrentParams(irModel));
  // const baseRatePerYear = baseRatePerBlock.mul(blocksPerYear).mul(2);
  // const baseRatePerYear = baseRatePerBlock.mul(blocksPerYear).div(2);
  // const jumpMultiplierPerYear = jumpMultiplierPerBlock.mul(blocksPerYear);
  // const multiplierPerYear = jumpMultiplierPerYear.div(30);
  // return {
  //   baseRatePerYear: baseRatePerYear,
  //   multiplierPerYear: multiplierPerYear,
  //   jumpMultiplierPerYear: jumpMultiplierPerYear,
  //   kink_: kink_,
  // };
}

const updatedParams = {
  baseRatePerYear: "95322624760440000",
  multiplierPerYear: "26893070009816000",
  jumpMultiplierPerYear: "1906452495292896000",
  kink_: "950000000000000000"
}
const currentParams = {
  baseRatePerYear: "95322624760440000",
  multiplierPerYear: "28308494745396000",
  jumpMultiplierPerYear: "1906452495292896000",
  kink_: "950000000000000000"
}

async function main() {
  const signer = await getSigner();
  const irAddress = deployments.IRModels.JumpRateModelV2;
  const irModel = await ethers.getContractAt('JumpRateModelV2', irAddress, signer);
  // await irModel.updateJumpRateModel(...Object.values(updatedParams));
  // const supplyRatePrev = await irModel.getSupplyRate(100, 900, 0, 0);
  const params = await calcParams(irModel);
  console.log(params)
  // console.log(params);
  // console.log(await irModel.getBorrowRate(100, 900, 0));
  // console.log(await irModel.getSupplyRate(100, 900, 0, 0));
  // console.log('supplyratediff:', supplyRatePrev.sub(await irModel.getSupplyRate(100, 900, 0, 0)))
}

main()
