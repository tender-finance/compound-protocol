import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { readFileSync } from 'fs';
import axios, { AxiosResponse } from 'axios';
import { join, resolve } from 'path';
import * as hre from 'hardhat';
import * as fs from 'fs'
import * as dotenv from 'dotenv';
dotenv.config();
import * as ethers from 'ethers'

export type BaseToken<Token> = {
  [Property in keyof Token as Exclude<Property, "underlying">]: Token[Property];
};

export type Token = {
  implementation: string,
  address: string,
  underlying: Token | BaseToken<Token>,
}

export type TokenInfo = {
  [index: string]: Token
}

const arbiscanKey = process.env.ARBISCAN_KEY;
const arbiscanUrl = 'https://api.arbiscan.io/api?module=contract&action=getabi&apikey=' + arbiscanKey + '&address=';

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

export const impersonateAccount = async (address: string, provider: JsonRpcProvider) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [ address ]
  });
  return await provider.getSigner(address);
}

const tokenInfoMap: TokenInfo = {
  tusdc: {
    address: '0xB1087a450373BB26BCf1A18E788269bde9c8fc85',
    implementation: '0x1CFa3F44DFCb38d2DA0f5d707ED3309D264168d2',
    underlying: {
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      implementation: '0x1eFB3f88Bc88f03FD1804A5C53b7141bbEf5dED8'
    },
  }
}

export const getDeployments = () => {
  const fpath = resolve(join(__dirname, '../../deployments/arbitrum.json'));
  try {
    const file = fs.readFileSync(fpath, "utf8")
    const json = JSON.parse(file)
    return json;
  } catch (e) {
    console.log(`e`, e)
    return {};
  }
}
export const getTokenInfo = (tokenName: string) => {
  return tokenInfoMap[tokenName];
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

export const getContractInstance = (contractName: string, tokenAddress: string, signer: JsonRpcSigner) => {
  const abiPath = resolve(
    __dirname,
    `../../artifacts/contracts/${contractName}.sol/${contractName}.json`
  )
  const abi = parseAbiFromJson(abiPath);
  return new ethers.Contract(tokenAddress, abi, signer);
}

export const getErc20Balance = async (tokenContract: Contract, wallet: JsonRpcSigner): Promise<BigNumber> => {
  return await tokenContract.balanceOf(wallet._address);
}

export const getEthBalance = async (provider: JsonRpcProvider, wallet: JsonRpcSigner): Promise<BigNumber> => {
  return await provider.getBalance(wallet._address)
}

