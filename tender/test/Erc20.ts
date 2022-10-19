import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { CTokenContract } from './Token'
import { getWallet, getAbiFromArbiscan, resetNetwork, preTest} from './TestUtil'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
import { BigNumber, Contract } from 'ethers';
import { expect } from 'chai';
import { formatAmount, getUnderlyingBalance } from './TokenUtil';
const hreProvider = hre.network.provider;

const provider = new ethers.providers.Web3Provider(hreProvider as any);


const tests = [
  {
    symbol: 'tUSDC',
    contractName: 'CErc20',
    walletAddress: '0x52134afB1A391fcEEE6682E51aedbCD47dC55336',
    mintAmount: '3',
    borrowAmount: '1',
    redeemAmount: '1',
    redeemUnderlyingAmount: '1',
  },
  {
    symbol: 'tEth',
    contractName: 'CEther',
    walletAddress: '0x52134afB1A391fcEEE6682E51aedbCD47dC55336',
    mintAmount: '0.001',
    borrowAmount: '0.0005',
    redeemAmount: '0.0001',
    redeemUnderlyingAmount: '0.0001',
  },
]

let erc20Contract: CTokenContract;
let uContract: Contract;
let wallet: JsonRpcSigner;

let tDecimals: number;
let uDecimals: number;

let uBalanceProvider: Contract | JsonRpcProvider;
// WHY DOES THE WALLET BREAK AFTER DOING A NETWORK RESET
// SO NOT COOL

for(let test of tests) {
  describe(test.symbol, () => {
    before(async () => {
      const {
        erc20Contract,
        uContract,
        wallet,
        tDecimals,
        uDecimals,
        uContractAddress,
        uBalanceProvider,
      } = await preTest(test, provider, test.walletAddress);
    })
    describe('Mint', () => {
      it('Should have more tTokens and fewer uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

        if (uContract) {
          await uContract.approve(erc20Contract.address, formatAmount(test.mintAmount, uDecimals));
        }

        await erc20Contract.mint(formatAmount(test.mintAmount, uDecimals));

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).gt(0);
        const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).lt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    });

    describe('redeem', () => {
      it('Should have less tTokens and more uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

        const redeemAmount = formatAmount(test.redeemAmount, await erc20Contract.decimals());
        await erc20Contract.approve(wallet._address, redeemAmount);
        await erc20Contract.redeem(redeemAmount);

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
        const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).gt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    })

    describe('redeemUnderlying', () => {
      it('Should have less tTokens and more uTokens', async () => {
        const tBalance = await erc20Contract.balanceOf(wallet._address);
        const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

        const redeemUnderlyingAmount = formatAmount(test.redeemUnderlyingAmount, uDecimals);

        await erc20Contract.approve(wallet._address, redeemUnderlyingAmount);
        await erc20Contract.redeem(redeemUnderlyingAmount);

        const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
        const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).gt(0);

        expect(tBalanceTest).to.be.true;
        expect(uBalanceTest).to.be.true;
      });
    })
    describe('Borrow', () => {
      // it('Should have more tTokens and fewer uTokens', async () => {
      //   let borrowBalance = await erc20Contract.borrowBalanceStored()
      //   console.log(borrowBalance.toString())
      //   await erc20Contract.borrow(formatAmount(.0005));
      //   borrowBalance = await erc20Contract.borrowBalanceStored()
      //   console.log(borrowBalance.toString())
      // });
    });
  })
}

