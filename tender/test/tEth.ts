import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { CTokenContract } from './Token'
import { getWallet, getDeployments, getComptrollerContract, resetNetwork } from './util'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
import { BigNumber, Contract } from 'ethers';
import { expect } from 'chai';
const hreProvider = hre.network.provider;

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';
const provider = new ethers.providers.Web3Provider(hreProvider as any);

let tEthContract: CTokenContract;
let wallet: JsonRpcSigner;
let comptrollerContract: Contract;
let deployments = getDeployments();

describe('tEth', () => {
  before(async () => {
    await resetNetwork();
    wallet = await getWallet(walletAddress, provider)
    tEthContract = await tEthContractInit(wallet);
    const comptrollerAddress = await tEthContract.comptroller();
    comptrollerContract = getComptrollerContract(wallet)
  })

  describe('Mint', () => {
    it('Should have more tTokens and fewer uTokens', async () => {
      const tBalance = await tEthContract.balanceOf(wallet._address);
      const uBalance = await getEthBalance(provider, wallet);
      await tEthContract.mint(formatAmountEther(.001));
      const tBalanceTest = (await tEthContract.balanceOf(wallet._address)).sub(tBalance).gt(0);
      const uBalanceTest = (await getEthBalance(provider, wallet)).sub(uBalance).lt(0);
      expect(tBalanceTest).to.be.true;
      expect(uBalanceTest).to.be.true;
    });
  });

  describe('redeem', () => {
    it('Should have less tTokens and more uTokens', async () => {
      const tBalance = await tEthContract.balanceOf(wallet._address);
      const uBalance = await getEthBalance(provider, wallet);

      const redeemAmount = tBalance.div(2);

      await tEthContract.approve(wallet._address, redeemAmount);
      await tEthContract.redeem(redeemAmount);

      const tBalanceTest = (await tEthContract.balanceOf(wallet._address)).sub(tBalance).lt(0);
      const uBalanceTest = (await getEthBalance(provider, wallet)).sub(uBalance).gt(0);


      expect(tBalanceTest).to.be.true;
      expect(uBalanceTest).to.be.true;
    });
  })
  describe('Borrow', () => {
    it('Should have more tTokens and fewer uTokens', async () => {
      // let borrowBalance = await tEthContract.borrowBalanceStored()
      const marketAddresses = []
      const markets = await comptrollerContract.getAllMarkets();
      console.log(markets)
      console.log(comptrollerContract)
      const { 1: liquidity } = await comptrollerContract.getAccountLiquidity(wallet._address)
      console.log(liquidity)
      // let markets = await comptrollerContract.allMarkets();
      // console.log(markets);
      // let liquidity =  await comptrollerContract.getAccountLiquidity(wallet._address)
      // console.log(liquidity);
      // console.log(markets)
      // console.log(liquidity)
      // console.log(accountLiquidity.toString())
      // console.log(borrowBalance.toString())
      // await tEthContract.borrow(formatAmountEther(accountLiquidity));
      // borrowBalance = await tEthContract.borrowBalanceStored()
      // console.log(borrowBalance.toString())
    });
  });
})

const formatAmountEther = (amount: number) => {
  // CEther requires special formatting for inputs
  return ethers.utils.parseEther(amount.toString());

}

const getEthBalance = async (provider: JsonRpcProvider, account: JsonRpcSigner) => {
  return await provider.getBalance(account._address);
}

const tEthContractInit = (wallet) => {
  return new CTokenContract("tEth", 'CEther', wallet);
}
