import * as hre from 'hardhat';
import * as ethers from 'ethers';

import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { Contract, BigNumber } from 'ethers';
import * as fs from 'fs';
import {
  getTokenInfo,
  impersonateAccount,
  parseAbiFromJson,
  resetNetwork,
  getEthBalance,
  getContractInstance,
  getErc20Balance,
  getDeployments,
} from './util';
import { expect } from 'chai';

const hreProvider = hre.network.provider;
// eslint disable-next-line
const provider = new ethers.providers.Web3Provider(hreProvider as any);

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';

const deployments = getDeployments();
const tokenAddress = deployments['tEth'];
const comptrollerAddress = deployments['Comptroller'];

describe('tETH', () => {
  describe('Mint', () => {
    it('Should have more tTokens and fewer uTokens', async () => {
      // await resetNetwork();
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = getContractInstance('CEther', tokenAddress, wallet)

      const tBalance: BigNumber = await getErc20Balance(tTokenContract, wallet);
      const uBalance: BigNumber = await getEthBalance(provider, wallet)

      const formattedValue = ethers.utils.parseEther('.001');
      await tTokenContract.mint({value: formattedValue});

      const tBalanceNew: BigNumber = await getErc20Balance(tTokenContract, wallet);
      const uBalanceNew: BigNumber = await getEthBalance(provider, wallet);

      const tBalanceTest = tBalanceNew.sub(tBalance).gt(0);
      const uBalanceTest = uBalanceNew.sub(uBalance).lt(0);

      expect(tBalanceTest).to.be.true;
      expect(uBalanceTest).to.be.true;
    });
  });
  describe('borrow', () => {
    it('Should have more tTokens and respect Limits', async () => {
      const wallet = await impersonateAccount(walletAddress, provider);
      const comptrollerContract = getContractInstance('Comptroller', comptrollerAddress, wallet)
      const tTokenContract = getContractInstance('CEther', tokenAddress, wallet)
      const currentBorrowAmount = await tTokenContract.borrowBalanceStored(wallet._address);

      const formattedValue = ethers.utils.parseEther('.0001');
      await tTokenContract.borrow(formattedValue);

      const newBorrowAmount = await tTokenContract.borrowBalanceStored(wallet._address);
      console.log('currentBorrowAmount', currentBorrowAmount.toString());
      console.log('newBorrowAmount', newBorrowAmount.toString());
      // const uBalanceTest = uBalanceNew.sub(uBalance).gt(0);
      //
      // expect(uBalanceTest).to.be.true;
    });
  });
  // describe('redeem', () => {
  //   it('Should have less tTokens and more uTokens', async () => {
  //     const wallet = await impersonateAccount(walletAddress, provider);
  //     const tTokenContract = getContractInstance('CEther', tokenAddress, wallet)
  //
  //     let tBalance: BigNumber = await getErc20Balance(tTokenContract, wallet);
  //     let uBalance: BigNumber = await getEthBalance(provider, wallet)
  //
  //     await tTokenContract.redeem(tBalance);
  //
  //     const tBalanceNew: BigNumber = await getErc20Balance(tTokenContract, wallet);
  //     const uBalanceNew: BigNumber = await getEthBalance(provider, wallet);
  //
  //     const tBalanceTest = tBalanceNew.sub(tBalance).lt(0);
  //     // this might fail when gas is really really high
  //     const uBalanceTest = uBalanceNew.sub(uBalance).gt(0);
  //
  //     expect(tBalanceTest).to.be.true;
  //     expect(uBalanceTest).to.be.true;
  //   });
  // })
});
