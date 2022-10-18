import * as hre from 'hardhat';
import * as ethers from 'ethers';

import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { Contract, BigNumber } from 'ethers';
import * as fs from 'fs';
import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';

const deployments = getDeployments();
const tokenAddress = deployments['tEth'];
const comptrollerAddress = deployments['Unitroller'];

describe('tETH', () => {
  describe('Mint', () => {
    it('Should have more tTokens and fewer uTokens', async () => {
      // await resetNetwork();
      const wallet = await getWallet()

      const tTokenContract = getContract('CEther', tokenAddress, wallet)

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
    it('Should have larger borrow Balance Stored', async () => {
      const wallet = await getWallet()
      const comptrollerContract = getContract('Comptroller', comptrollerAddress, wallet)
      const tTokenContract = getContract('CEther', tokenAddress, wallet)
      const currentBorrowAmount = await tTokenContract.borrowBalanceStored(wallet._address);

      const formattedValue = ethers.utils.parseEther('.0001');
      await tTokenContract.borrow(formattedValue);

      const newBorrowAmount = await tTokenContract.borrowBalanceStored(wallet._address);
      const borrowTest = newBorrowAmount.gt(currentBorrowAmount);
      expect(borrowTest).to.be.true;
    });

    it('Should respect borrow limits', async () => {
      // sum(Q_Token_deposited * Token_collateralFactor)
      const wallet = await getWallet()
      const comptrollerContract = getContract('Comptroller', comptrollerAddress, wallet);
      const tTokenContract = getContract('CEther', tokenAddress, wallet)
      const markets = await comptrollerContract.getAssetsIn(wallet._address);
      console.log('markets', markets)

      const tEthCollateralFactor = await getCollateralFactor(comptrollerContract, tokenAddress);
      // const accountLiquidity = await comptrollerContract.getAccountLiquidity(wallet._address);
      // const currentlySupplying = await getCurrentlySupplying(tTokenContract, wallet);
      // const ethSupplied = currentlySupplying;
      //
      // const ethPrice = await getAssetPriceInUsd();
      // console.log(currentlySupplying)
      // console.log(tEthCollateralFactor)
      //
      // // const borrowLimit = currentlySupplying *  * tEthCollateralFactor;
      //
      // console.log('ethSupplied', ethSupplied);
      // console.log('borrowLimit', borrowLimit);
      // expect(await tTokenContract.borrow(borrowLimit+1)).to.throw;
    });
  });
  // describe('redeem', () => {
  //   it('Should have less tTokens and more uTokens', async () => {
  //     const wallet = await getWallet()
  //     const tTokenContract = getContract('CEther', tokenAddress, wallet)
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


