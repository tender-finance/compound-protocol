import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { CTokenContract } from './Token'
import { getWallet, getAbiFromArbiscan } from './util'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
import { BigNumber, Contract } from 'ethers';
import { expect } from 'chai';
const hreProvider = hre.network.provider;

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';
const provider = new ethers.providers.Web3Provider(hreProvider as any);

let erc20Contract: CTokenContract;
let uContract: Contract;
let wallet: JsonRpcSigner;
let decimals: number;

const tests = [
  {
    symbol: 'tUSDC',
    mintAmount: '3',
    borrowAmount: '1'
  }
]
for(let test of tests) {
  const { symbol, mintAmount, borrowAmount } = test;
  describe(symbol, () => {
    before(async () => {
      wallet = await getWallet(walletAddress, provider)
      erc20Contract = await erc20ContractInit(symbol, wallet);
      const uContractAddress = await erc20Contract.underlying();
      uContract = new Contract(uContractAddress, erc20Contract.abi, wallet);
      console.log(uContract.functions)
      // decimals = await erc20Contract.decimals();
    })
    describe('Mint', () => {
      it('Should have more tTokens and fewer uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const tDecimals = await erc20Contract.decimals();
        const uDecimals = await uContract.decimals();
        const uBalance = await uContract.balanceOf(wallet._address);

        await uContract.approve(erc20Contract.address, formatAmountErc20(mintAmount, uDecimals));
        await erc20Contract.mint(formatAmountErc20(mintAmount, uDecimals));

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).gt(0);
        const uBalanceTest = (await uContract.balanceOf(wallet._address)).sub(uBalance).lt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    });
    describe('Borrow', () => {
      // it('Should have more tTokens and fewer uTokens', async () => {
      //   let borrowBalance = await erc20Contract.borrowBalanceStored()
      //   console.log(borrowBalance.toString())
      //   await erc20Contract.borrow(formatAmountErc20(.0005));
      //   borrowBalance = await erc20Contract.borrowBalanceStored()
      //   console.log(borrowBalance.toString())
      // });
    });
  })
}

const getEthBalance = async (provider: JsonRpcProvider, account: JsonRpcSigner) => {
  return await provider.getBalance(account._address);
}

const erc20ContractInit = async (symbol: string, wallet: JsonRpcSigner) => {
  return new CTokenContract(symbol, 'CErc20', wallet);
}

const formatAmountErc20 = (amount: string, decimals: number) => {
  const decimalFactor = BigNumber.from('10').pow(decimals)
  return BigNumber.from(amount).mul(decimalFactor);
}
