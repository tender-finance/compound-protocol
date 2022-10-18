import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import * as ethers from 'ethers';
import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './TestUtil'
import axios from 'axios';

export const formatAmountEther = (amount: string, decimals: number) => {
  // CEther requires special formatting for inputs
  return ethers.utils.parseEther(amount);

}

export const formatAmountErc20 = (amount: string, decimals: number) => {
  const decimalFactor = BigNumber.from('10').pow(decimals)
  return BigNumber.from(amount).mul(decimalFactor);
}

export async function getEthBalance (provider: JsonRpcProvider, account: JsonRpcSigner) {
  return await provider.getBalance(account._address);
}

export const getCollateralFactor = async (comptrollerContract: Contract, tTokenAddress: string) => {
  await comptrollerContract.enterMarkets([tTokenAddress]);
  const { 1: rawCollateralFactor } = await comptrollerContract.markets(tTokenAddress);
  let collateralFactor: number = parseFloat(formatUnits(rawCollateralFactor, 18));
  return collateralFactor;
}

export function formatBigNumber(value: BigNumber, decimals: number): number {
  // formatUnits returns a string with the decimals in the appropriate place,
  // and it needs to be made a float.
  let formattedUnit = formatUnits(value, decimals);
  let val = parseFloat(formattedUnit);
  return val;
}

export const getComptrollerContract = (wallet: JsonRpcSigner) =>{
  const comptrollerAddress = getDeployments()['Unitroller'];
  const abiPath = resolve(__dirname, `../../artifacts/contracts/Comptroller.sol/Comptroller.json`);
  const comptrollerAbi = parseAbiFromJson(abiPath);
  return new Contract(comptrollerAddress, comptrollerAbi, wallet)
}

export const getCurrentlySupplying = async (tTokenContract: Contract, wallet: JsonRpcSigner) => {
  let balance = await tTokenContract.callStatic.balanceOf(wallet._address)
  let exchangeRateCurrent: BigNumber = await tTokenContract.exchangeRateStored();
  let tokens = balance.mul(exchangeRateCurrent)
  // the exchange rate is scaled by 18 decimals
  const tokenDecimals = await tTokenContract.decimals() + 18;
  return formatBigNumber(tokens, tokenDecimals);
};
