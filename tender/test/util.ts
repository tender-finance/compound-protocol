import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as hre from 'hardhat';
import * as fs from 'fs'
import * as dotenv from 'dotenv';
dotenv.config();
import * as ethers from 'ethers'
import axios from 'axios';

const hreProvider = hre.network.provider;
const accounts = {};
// eslint disable-next-line

const arbiscanKey = process.env.ARBISCAN_KEY;
const arbiscanUrl = 'https://api.arbiscan.io/api?module=contract&action=getabi&apikey=' + arbiscanKey + '&address=';

export const getAbiFromArbiscan = async function (address) {
  const url = arbiscanUrl + address;
  return axios.get(url)
    .then((resp) => {
      return resp.data;
    })
    .then(async (json) => {
      try { return JSON.parse(json.result); }
      catch (e) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return await getAbiFromArbiscan(address);
      }
    });
}

export const getWallet = async (walletAddress, provider) => {
  if (!accounts[walletAddress]) {
    await impersonateAccount(walletAddress, provider);
    accounts[walletAddress] = provider.getSigner(walletAddress);
  }
  return accounts[walletAddress];
}

export const getDeployments = () => {
  const deploymentsPath = resolve(
    __dirname,
    `../../deployments/arbitrum.json`
  )
  try {
    const file = fs.readFileSync(deploymentsPath, "utf8")
    const json = JSON.parse(file)
    return json
  } catch (e) {
    console.log(`e`, e)
  }
}

export const parseAbiFromJson = (fpath: string) => {
  try {
    const file = fs.readFileSync(fpath, "utf8")
    const json = JSON.parse(file)
    const abi = json.abi
    return abi
  } catch (e) {
    console.log(`e`, e)
  }
}

export const initContractInstance = (contractName: string, address: string, signer: JsonRpcSigner) => {
  const abiPath = resolve(
    __dirname,
    `../../artifacts/contracts/${contractName}.sol/${contractName}.json`
  )
  const abi = parseAbiFromJson(abiPath);
  return new ethers.Contract(address, abi, signer);
}

const impersonateAccount = async (address: string, provider: JsonRpcProvider) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [ address ]
  });
  return await provider.getSigner(address);
}

const getCollateralFactor = async (comptrollerContract: Contract, tTokenAddress: string) => {
  await comptrollerContract.enterMarkets([tTokenAddress]);
  const { 1: rawCollateralFactor } = await comptrollerContract.markets(tTokenAddress);
  let collateralFactor: number = parseFloat(formatUnits(rawCollateralFactor, 18));
  return collateralFactor;
}

function formatBigNumber(value: BigNumber, decimals: number): number {
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

export const resetNetwork = async () => {
  await hre.network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        allowUnlimitedContractSize: true,
        forking: {
          jsonRpcUrl: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
          enabled: true,
          ignoreUnknownTxType: true,
        },
      },
    ],
  })
};

// export class TestHelper {
//   private accounts: any;
//   private contractInstances: any = {};
//   public provider: JsonRpcProvider;
//
//   constructor (provider: JsonRpcProvider) {
//     this.accounts = {};
//     this.contractInstances = {};
//     this.provider = provider;
//   }
//
//   getWallet = async (walletAddress) => {
//     if (!this.accounts[walletAddress]) {
//       await impersonateAccount(walletAddress, this.provider);
//       this.accounts[walletAddress] = this.provider.getSigner(walletAddress);
//     }
//     return this.accounts[walletAddress];
//   }
//
//   getContract = (contractName: string, contractAddress: string, wallet: JsonRpcSigner) => {
//     if (!this.contractInstances[contractName]) {
//       this.contractInstances[contractName] = {
//         address: contractAddress,
//         contract: initContractInstance(contractName, contractAddress, wallet)
//       }
//     }
//     return this.contractInstances[contractName];
//   }
// }
//
//
