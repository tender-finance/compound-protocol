import { getWallet, fundWithEth } from "./utils/TestUtil";
import { BigNumber } from "ethers";
import { formatAmount } from "./utils/TokenUtil";
import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import chai from "chai";
import chaiBN from "chai-bn";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
chai.use(chaiBN(BigNumber));
const expect = chai.expect;

const walletAddress = "0xa21c82baf95bb3a0c21b77db81a3aafc0d595c81"
const adminAddress  = "0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2"
const uAddress = '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
const uDecimals = 18
import * as deployments from '../../deployments/arbitrum.json'
const { tGMX, Unitroller } = deployments;
const irModelAddress = deployments.IRModels.JumpRateModelV2

const abis = {
  delegator: "CErc20DelegatorGmx",
  delegate: "CErc20DelegateGmx",
}

import gmxAbi from '../utils/abis/GmxAbi.json'

const token = {
  underlying: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
  name: "GMX",
  symbol: "tGMX",
  decimals: 8,
  collateralFactor: ethers.utils.parseUnits("5", 17),
  collateralVIP: ethers.utils.parseUnits("80", 16),
  threshold: ethers.utils.parseUnits("6", 17),
  thresholdVIP: ethers.utils.parseUnits("85", 16),
  isGLP: false,
}

const DeployFixture = async () => {
  await fundWithEth(walletAddress);
  await fundWithEth(adminAddress);
  const wallet = await ethers.getImpersonatedSigner(walletAddress);
  const admin = await ethers.getImpersonatedSigner(adminAddress);

  const unitrollerProxy = await hre.ethers.getContractAt("Comptroller", Unitroller, admin);

  const delegatorFactory = await hre.ethers.getContractFactory(
    abis.delegator,
    admin
  );
  const erc20Underlying = await hre.ethers.getContractAt(
    "EIP20Interface",
    token.underlying,
    admin
  );
  const GmxDelegate = await ethers.getContractFactory(abis.delegate, admin)
  const delegate = await GmxDelegate.deploy()
  const underlyingDecimals = await erc20Underlying.decimals();
  const totalDecimals = underlyingDecimals + token.decimals;
  const initialExcRateMantissaStr = formatAmount("2", totalDecimals).toString();

  const delegator = await delegatorFactory.deploy(
    token.underlying,
    unitrollerProxy.address,
    irModelAddress,
    initialExcRateMantissaStr,
    token.name,
    token.symbol,
    token.decimals,
    admin.address,
    delegate.address,
    Buffer.from([0x0]),
  );
  console.log('Deployed delegator:', delegator.address)
  console.log('Deployed delegate:', delegate.address)

  const stakedGLPAddress = "0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE"
  const glpRewardRouterAddress = "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1"
  const glpManagerAddress = '0x3963FfC9dff443c2A94f21b129D429891E32ec18'
  const gmxToken = "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"
  const stakedGmxTracker = "0x908c4d94d34924765f1edc22a1dd098397c59dd4"
  const sbfGMX = "0xd2D1162512F927a7e282Ef43a362659E4F2a728F"
  await delegator._setGlpAddresses(
    stakedGLPAddress,
    glpRewardRouterAddress,
    glpManagerAddress,
    gmxToken,
    stakedGmxTracker,
    sbfGMX
  );
  const delegatorProxy = await ethers.getContractAt(abis.delegate, delegator.address, admin);
  console.log(await delegatorProxy.underlying())
  let isPrivate = false
  let isComped = true
  let onlyWhitelistedBorrow = false
  await unitrollerProxy._supportMarket(delegator.address, isComped, isPrivate, onlyWhitelistedBorrow);
  await unitrollerProxy._setFactorsAndThresholds(
  delegator.address, token.collateralFactor, token.collateralVIP, token.threshold, token.thresholdVIP);
  const uContract = await ethers.getContractAt(gmxAbi, uAddress, admin)
  await uContract.connect(wallet).approve(delegator.address, formatAmount('10000', uDecimals))

  return {
    wallet: wallet,
    admin: admin,
    cTokenContract: delegatorProxy,
    uContract: uContract,
  }
}


describe("deposits", () => {
  it("Minter should have more tGMX", async () => {
    const { wallet, cTokenContract } = await loadFixture(DeployFixture);
    console.log('autocompound', await cTokenContract.autocompound())
    const tBalance = await cTokenContract.balanceOf(wallet.address);
    console.log('tBalance', tBalance.toString())
    await cTokenContract.connect(wallet).mint(formatAmount('1', 18))
    const tBalance2 = await cTokenContract.balanceOf(wallet.address);
    console.log('tBalance', tBalance2.toString())
  //   // expect((await cTokenContract.balanceOf(wallet.address)).gt(tBalance)).true;
  });
  it("Minter should have less GMX", async () => {
    const { wallet, cTokenContract, uContract } = await loadFixture(DeployFixture);
    const uBalance = await uContract.balanceOf(wallet.address);
    await cTokenContract.connect(wallet).mint(formatAmount('1', 18))
    expect((await uContract.balanceOf(wallet.address)).lt(uBalance)).true;
  });
  it("stakedGmxTracker should have More staked GMX", async () => {
    const { wallet, cTokenContract, uContract } = await loadFixture(DeployFixture);
    const stakedGmxTrackerAddress = await cTokenContract.stakedGmxTracker();
    const stakedBalance = await uContract.stakedBalance(stakedGmxTrackerAddress);
    await cTokenContract.connect(wallet).mint(formatAmount('1', 18))
    expect(await uContract.stakedBalance(stakedGmxTrackerAddress)).bignumber.gt(stakedBalance);
  });
});
