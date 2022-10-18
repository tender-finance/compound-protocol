import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { CTokenContract } from './Token'
import { getWallet, getAbiFromArbiscan, resetNetwork} from './util'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
import { BigNumber, Contract } from 'ethers';
import { expect } from 'chai';
import { formatAmountErc20, formatAmountEther } from './TokenUtil';
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
    contractName: 'CErc20',
    mintAmount: '3',
    borrowAmount: '1',
    redeemAmount: '1',
    redeemUnderlyingAmount: '1',
  }
]
for(let test of tests) {
  describe(test.symbol, () => {
    before(async () => {
      await resetNetwork();
      wallet = await getWallet(walletAddress, provider)
      erc20Contract = new CTokenContract(test.symbol, test.contractName, wallet);

      const uContractAddress = await erc20Contract.underlying();
      uContract = new Contract(uContractAddress, erc20Contract.abi, wallet);
      // decimals = await erc20Contract.decimals();
    })
    describe('Mint', () => {
      it('Should have more tTokens and fewer uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const tDecimals = await erc20Contract.decimals();
        const uDecimals = await uContract.decimals();
        const uBalance = await uContract.balanceOf(wallet._address);

        await uContract.approve(erc20Contract.address, formatAmountErc20(test.mintAmount, uDecimals));
        await erc20Contract.mint(formatAmountErc20(test.mintAmount, uDecimals));

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).gt(0);
        const uBalanceTest = (await uContract.balanceOf(wallet._address)).sub(uBalance).lt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    });

    describe('redeem', () => {
      it('Should have less tTokens and more uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const uBalance = await uContract.balanceOf(wallet._address);

        const redeemAmount = formatAmountErc20(test.redeemAmount, await erc20Contract.decimals());
        console.log('redeemAmount', redeemAmount.toString());
        await erc20Contract.approve(wallet._address, redeemAmount);
        await erc20Contract.redeem(redeemAmount);

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
        const uBalanceTest = (await uContract.balanceOf(wallet._address)).sub(uBalance).gt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    })

    describe('redeemUnderlying', () => {
      it('Should have less tTokens and more uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const uBalance = await uContract.balanceOf(wallet._address);

        const redeemUnderlyingAmount = formatAmountErc20(test.redeemUnderlyingAmount,  await uContract.decimals());

        await erc20Contract.approve(wallet._address, redeemUnderlyingAmount);
        await erc20Contract.redeem(redeemUnderlyingAmount);

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
        const uBalanceTest = (await uContract.balanceOf(wallet._address)).sub(uBalance).gt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    })
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

