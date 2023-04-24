import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';
import { tMAGIC, Unitroller } from '../../deployments/arbitrum.json';

const getCurrentCompSpeeds = async (marketAddress: string) => {
  const [signer] = await ethers.getSigners();
  const unitroller = await ethers.getContractAt('Comptroller', Unitroller);
  return {
    curSupplySpeed: await unitroller.compSupplySpeeds(marketAddress),
    curBorrowSpeed: await unitroller.compBorrowSpeeds(marketAddress),
  }
}
const updateCompSpeeds = async (markets, supplySpeeds, borrowSpeeds) => {
  const [signer] = await ethers.getSigners();
  const unitroller = await ethers.getContractAt('Comptroller', Unitroller, signer);
  await unitroller._setCompSpeeds(markets, supplySpeeds, borrowSpeeds);
}

const main = async (markets) => {
  const newSupplySpeeds: any = [];
  const newBorrowSpeeds: any = [];
  for(const market of markets) {
    const {curSupplySpeed, curBorrowSpeed} = await getCurrentCompSpeeds(market);
    console.log(curSupplySpeed, curBorrowSpeed)
    newSupplySpeeds.push(curSupplySpeed.div(6));
    newBorrowSpeeds.push(curBorrowSpeed);
  }
  console.log(newSupplySpeeds, newBorrowSpeeds);
  await updateCompSpeeds(markets, newSupplySpeeds, newBorrowSpeeds);

}
main([tMAGIC])
