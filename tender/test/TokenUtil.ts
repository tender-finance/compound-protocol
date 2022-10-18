import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import * as ethers from 'ethers';
import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './util'
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
