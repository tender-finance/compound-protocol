import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { CTokenContract, GmxTokenContract } from './Token'
import { getWallet, getAbiFromArbiscan, resetNetwork } from './TestUtil'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
import { Contract, BigNumber } from 'ethers';
import { expect } from 'chai';
import { formatAmount, getUnderlyingBalance } from './TokenUtil';
import * as tokenClasses from './Token';
const hreProvider = hre.network.provider;

const provider = new ethers.providers.Web3Provider(hreProvider as any);
// USE THE DELEGATOR FILE INSTEAD OF THE CETHER AND CERC20!!!!

const tests = [
  {
    symbol: 'tUSDC',
    contractName: 'CErc20',
    mintAmount: '4',
    borrowAmount: '1',
    redeemAmount: '1',
    redeemUnderlyingAmount: '1',
    contractClass: CTokenContract,
  },
  // {
  //   symbol: 'tEth',
  //   contractName: 'CEther',
  //   mintAmount: '0.001',
  //   redeemAmount: 'all',
  //   borrowAmount: '0.0005',
  //   contractClass: CTokenContract,
  // },
  // {
  //   symbol: 'tGMX',
  //   contractName: 'CErc20DelegatorGmx',
  //   mintAmount: '0.01',
  //   borrowAmount: '1',
  //   redeemAmount: '1',
  //   redeemUnderlyingAmount: '1',
  //   contractClass: GmxTokenContract,
  //   deploymentFilePath: '../../deployments/gmx.json',
  //   walletAddress: '0x5B33EC561Cb20EaF7d5b41A9B68A690E2EBBc893',
  // }
]

const testOptionalDefaults = {
  contractClass: CTokenContract,
  deploymentFilePath: '../../deployments/arbitrum.json',
  walletAddress: '0x52134afB1A391fcEEE6682E51aedbCD47dC55336',
}

const verifyTestParameters = (test) => {
  for (let [key, val] of Object.entries(testOptionalDefaults)) {
    test[key] = test[key] ? test[key] : val;
  }
  return test;
}

let erc20Contract: CTokenContract;
let uContractAddress: string;
let uContract: Contract;
let wallet: JsonRpcSigner;

let tDecimals: number;
let uDecimals: number;

let uBalanceProvider: Contract | JsonRpcProvider;

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';

describe('Erc20', () => {
  before(async () => {
    resetNetwork();
    wallet = await getWallet(walletAddress, provider)
  })

  for(let test of tests) {
    describe(test.symbol, () => {
      before(async () => {
        test = verifyTestParameters(test);
        // if(wallet._address != test.walletAddress) {
        //   console.log('impersonating: ', test.walletAddress);
        //   wallet = await getWallet(test.walletAddress, provider);
        // }
        erc20Contract = new test['contractClass'](test.symbol, test.contractName, wallet, test.deploymentFilePath);
        console.log(await erc20Contract.balanceOf(wallet._address))
        tDecimals = await erc20Contract.decimals();

        if (erc20Contract['underlying']) {
          // tEth has no underlying method
          uContractAddress = await erc20Contract.underlying();
          uContract = new Contract(uContractAddress, erc20Contract.abi, wallet);
          uBalanceProvider = uContract;
          uDecimals = await uContract.decimals();
        } else {
          uContract = null;
          uDecimals = 18; // Ether decimals
          uBalanceProvider = provider;
        }
      })
      if(test['mintAmount']) {
        describe('Mint', () => {
          it('Should have more tTokens and fewer uTokens', async () => {
            const tBalance = await erc20Contract.balanceOf(wallet._address);
            const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

            if (uContract) {
              await uContract.approve(erc20Contract.address, formatAmount(test.mintAmount, uDecimals));
            }

            await erc20Contract.mint(formatAmount(test['mintAmount'], uDecimals));

            const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).gt(0);
            const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).lt(0);

            expect(tBalanceTest).to.be.true;
            expect(uBalanceTest).to.be.true;
          });
        });
      }
      if(test['redeemAmount']) {
        describe('redeem', () => {
          it('Should have less tTokens and more uTokens', async () => {
            let redeemAmount;

            const tBalance = await erc20Contract.balanceOf(wallet._address);
            const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

            if (test['redeemAmount'] == 'all') {
              redeemAmount = tBalance;
            } else {
              redeemAmount = formatAmount(test['redeemAmount'], await erc20Contract.decimals());
            }

            await erc20Contract.approve(wallet._address, redeemAmount);
            await erc20Contract.redeem(redeemAmount);

            const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
            const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).gt(0);

            expect(tBalanceTest).to.be.true;
            expect(uBalanceTest).to.be.true;
          });
        })
      }
      if(test['redeemUnderlyingAmount']) {
        describe('redeemUnderlying', () => {
          it('Should have less tTokens and more uTokens', async () => {
            const tBalance = await erc20Contract.balanceOf(wallet._address);
            const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

            const redeemUnderlyingAmount = formatAmount(test['redeemUnderlyingAmount'], uDecimals);

            await erc20Contract.approve(wallet._address, redeemUnderlyingAmount);
            await erc20Contract.redeem(redeemUnderlyingAmount);

            const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
            const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).gt(0);

            expect(tBalanceTest).to.be.true;
            expect(uBalanceTest).to.be.true;
          });
        })
      }
      if(test['borrowAmount']) {
        describe('Borrow', () => {
            // it('Should have more tTokens and fewer uTokens', async () => {
            //   let borrowBalance = await erc20Contract.borrowBalanceStored()
            //   console.log(borrowBalance.toString())
            //   await erc20Contract.borrow(formatAmount(.0005));
            //   borrowBalance = await erc20Contract.borrowBalanceStored()
            //   console.log(borrowBalance.toString())
            // });
        })
      }
    })
  }
})

