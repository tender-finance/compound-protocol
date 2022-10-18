import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import * as ethers from 'ethers';
import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './util'
import { CTokenContract, TokenContract } from './Token'

export class ComptrollerContract {
  constructor(signer: JsonRpcSigner) {
    const comptrollerAbiPath = resolve(
      __dirname,
      `../../artifacts/contracts/Comptroller.sol/Comptroller.json`
    )
    let comptroller: Contract;
    comptroller = new Contract(
      getDeployments().Unitroller,
      parseAbiFromJson(comptrollerAbiPath),
      signer
    );
  }

  getCurrentlySupplying = async (cTokenContract: CTokenContract, wallet: JsonRpcSigner) => {
    let balance = await cTokenContract.getBalance(wallet)
    let exchangeRateCurrent: BigNumber = await cTokenContract.exchangeRateStored();
    let tokens = balance.mul(exchangeRateCurrent)
    // the exchange rate is scaled by 18 decimals
    const tokenDecimals = await cTokenContract.decimals() + 18;
    return formatBigNumber(tokens, tokenDecimals);
  };
}
