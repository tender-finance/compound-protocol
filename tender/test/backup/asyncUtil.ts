import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as hre from 'hardhat';
import * as fs from 'fs'
import * as dotenv from 'dotenv';
dotenv.config();
import * as ethers from 'ethers'

const arbiscanKey = process.env.ARBISCAN_KEY;
const arbiscanUrl = 'https://api.arbiscan.io/api?module=contract&action=getabi&apikey=' + arbiscanKey + '&address=';

let wallet: JsonRpcSigner;
let contractInstancesCache = {};

const hreProvider = hre.network.provider;
// eslint disable-next-line
const provider = new ethers.providers.Web3Provider(hreProvider as any);

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

export const initContractInstance = (contractName: string, tokenAddress: string, signer: JsonRpcSigner) => {
  const abiPath = resolve(
    __dirname,
    `../../artifacts/contracts/${contractName}.sol/${contractName}.json`
  )
  const abi = parseAbiFromJson(abiPath);
  return new ethers.Contract(tokenAddress, abi, signer);
}

export const impersonateAccount = async (address: string, provider: JsonRpcProvider) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [ address ]
  });
  return await provider.getSigner(address);
}
export const getWallet = async (walletAddress) => {
  if (!wallet) {
    await impersonateAccount(walletAddress, provider);
    wallet = provider.getSigner(walletAddress);
  }
  return wallet;
}

export const getContract = (contractName: string, contractAddress: string, wallet: JsonRpcSigner) => {
  if (!contractInstancesCache[contractName]) {
    contractInstancesCache[contractName] = initContractInstance(contractName, contractAddress, wallet)
  }
  return contractInstancesCache[contractName];
}

export const getCollateralFactor = async (comptrollerContract: Contract, tTokenAddress: string) => {
  await comptrollerContract.enterMarkets([tTokenAddress]);
  const { 1: rawCollateralFactor } = await comptrollerContract.markets(tTokenAddress);
  let collateralFactor: number = parseFloat(formatUnits(rawCollateralFactor, 18));
  return collateralFactor;
}


export const getCurrentlySupplying = async (tTokenContract: Contract, wallet: JsonRpcSigner) => {
  let balance = await tTokenContract.callStatic.balanceOf(wallet._address)
  let exchangeRateCurrent: BigNumber = await tTokenContract.exchangeRateStored();
  let tokens = balance.mul(exchangeRateCurrent)
  // the exchange rate is scaled by 18 decimals
  const tokenDecimals = await tTokenContract.decimals() + 18;
  return formatBigNumber(tokens, tokenDecimals);
};

export const getAssetPriceInUsd = async () => {
  const res = await axios.get("https://api.coinbase.com/v2/prices/ETH-USD/sell")
  const priceString = res.data.data.amount;
  const priceFloat = parseFloat(priceString);
  console.log('priceFloat', priceFloat);
  return priceFloat;
}

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
}
