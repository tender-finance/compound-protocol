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
} from './util';
import { expect } from 'chai';
const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN))

const hreProvider = hre.network.provider;
// eslint disable-next-line
const provider = new ethers.providers.Web3Provider(hreProvider as any);

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';

describe('tUSDC', () => {
  const tTokenName = 'tusdc'
  const tTokenInfo = getTokenInfo(tTokenName);
  const uTokenInfo = tTokenInfo.underlying;

  describe('Mint', () => {
    it('Should have more tTokens and fewer uTokens', async () => {
      // await resetNetwork();
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = getContractInstance('CErc20Delegate', tTokenInfo.address, wallet);
      const uTokenContract = getContractInstance('CErc20Delegate', uTokenInfo.address, wallet);

      const tBalance: BigNumber = await getErc20Balance(tTokenContract, wallet);
      const uBalance: BigNumber = await getErc20Balance(uTokenContract, wallet);

      await uTokenContract.approve(tTokenContract.address, 5);
      await tTokenContract.mint(5);

      const tBalanceNew = await getErc20Balance(tTokenContract, wallet);
      const uBalanceNew = await getErc20Balance(uTokenContract, wallet);

      const tBalanceTest = tBalanceNew.sub(tBalance).gt(0);
      const uBalanceTest = uBalanceNew.sub(uBalance).lt(0);

      expect(tBalanceTest).to.be.true;
      expect(uBalanceTest).to.be.true;
    })
  })
  describe('RedeemUnderlying', () => {
    it('Should have more uTokens and fewer tTokens', async () => {
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = getContractInstance('CErc20Delegate', tTokenInfo.address, wallet);
      const uTokenContract = getContractInstance('CErc20Delegate', uTokenInfo.address, wallet);

      const tBalance: BigNumber = await getErc20Balance(tTokenContract, wallet);
      const uBalance: BigNumber = await getErc20Balance(uTokenContract, wallet);

      await tTokenContract.approve(uTokenContract.address, 1);
      await tTokenContract.redeemUnderlying(1);

      const tBalanceNew = await getErc20Balance(tTokenContract, wallet);
      const uBalanceNew = await getErc20Balance(uTokenContract, wallet);

      const tBalanceTest = tBalanceNew.sub(tBalance).lt(0);
      const uBalanceTest = uBalanceNew.sub(uBalance).gt(0);

      expect(tBalanceTest).to.be.true;
      expect(uBalanceTest).to.be.true;
      // expect(uBalanceDiff).greaterThan(0);
    });
  });
  describe('Redeem', () => {
    it('Should have more uTokens and fewer tTokens', async () => {
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = getContractInstance('CErc20Delegate', tTokenInfo.address, wallet);
      const uTokenContract = getContractInstance('CErc20Delegate', uTokenInfo.address, wallet);

      const tBalance: BigNumber = await getErc20Balance(tTokenContract, wallet);
      const uBalance: BigNumber = await getErc20Balance(uTokenContract, wallet);

      await uTokenContract.approve(tTokenContract.address, tBalance);
      await tTokenContract.redeem(tBalance);

      const tBalanceNew = await getErc20Balance(tTokenContract, wallet);
      const uBalanceNew = await getErc20Balance(uTokenContract, wallet);

      const tBalanceTest = tBalanceNew.sub(tBalance).lt(0);
      const uBalanceTest = uBalanceNew.sub(uBalance).gt(0);

      expect(tBalanceTest).to.be.true;
      expect(uBalanceTest).to.be.true;
    })
  });
})
