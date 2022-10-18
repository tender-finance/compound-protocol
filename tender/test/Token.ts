import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import * as ethers from 'ethers';
import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './util'
import axios from 'axios';

// do not allow numbers since they cause issues
type AmountArg = BigNumber | {
 value: ethers.ethers.BigNumber | BigNumber
}

export class CTokenContract {
  public abi: string;
  public signer: JsonRpcSigner;
  public symbol: string;
  public address: string;
  public contract: Contract;
  public contractName: string;

  constructor(symbol: string, contractName: string, signer: JsonRpcSigner) {
    const address = getDeployments()[symbol];
    const abiPath = resolve(__dirname, `../../artifacts/contracts/${contractName}.sol/${contractName}.json`)
    this.abi = parseAbiFromJson(abiPath);
    this.symbol = symbol;
    this.contractName = contractName;
    this.signer = signer;
    this.address = address;
    if(this.abi) {
      this.contract = new Contract(this.address, this.abi, this.signer);
    }
  }

  call = async (method: string, ...args: any[]) => {
    try {
      return await this.contract[method](...args);
    } catch (e) { throw e };
  }

  createContractInstance = () => {
    return new Contract(this.address, this.abi, this.signer);
  }

  balanceOf = async (address?: string) => {
    address = address ? address : this.signer._address;
    return this.call('balanceOf', address);
  }

  underlying = async () => {
    return await this.call('underlying');
    return this.underlying;
  }

  mint = async (amount: AmountArg) => {
    if(this.symbol == "tEth") {
      return await this.call('mint', {value: amount});
    }
    return await this.call('mint', amount);
  }

  approve = async (spender: string, amount: AmountArg) => {
    return await this.call('approve', spender, amount);
  }

  comptroller = async () => {
    return await this.call('comptroller');
  }

  redeem = async (amount: AmountArg) => {
    return await this.call('redeem', amount);
  }

  redeemUnderlying = async (amount: AmountArg) => {
    return await this.call('redeemUnderlying', amount);
  }

  borrow = async (amount: AmountArg) => {
    return await this.call('borrow', amount);
  }

  borrowBalanceStored = async (accountAddress?: string) => {
    accountAddress = accountAddress ? accountAddress : this.signer._address;
    return await this.call('borrowBalanceStored', accountAddress);
  }

  exchangeRateStored = async () => {
    return await this.call('exchangeRateStored');
  }

  decimals = async () => {
    return await this.call('decimals');
  }

  async getAssetPriceUsd () {
    if (this.symbol === "ETH") {
      let res = await axios.get("https://api.coinbase.com/v2/prices/ETH-USD/sell")
      return parseFloat(res.data.data.amount)
    }
    if (!this.decimals) {
      this.decimals = await this.call('decimals');
    }
    let answer: BigNumber = await this.call('getUnderlyingPrice', this.address);
    // based on calculation from compound subgraph
  }
}

