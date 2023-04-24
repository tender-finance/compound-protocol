import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from 'hardhat';
import { formatAmount, fundWithEth } from '../utils'
import { deploy } from '../deploy/tndMarket'
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from '../utils/chai'


const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e'
const tusdcAddress = '0x068485a0f964B4c3D395059a19A05a8741c48B4E'
const usdcAddress = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
const tndAddress = '0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C'

const mint = async (ttnd: any, supplier='tndSupplier'): Promise<Boolean> => {
  const signers = await getSigners()
  const tnd = await ethers.getContractAt('CErc20', tndAddress)
  await tnd.connect(signers.admin).transfer(signers[supplier].address, formatAmount(100, 18))
  const balance = await tnd.balanceOf(signers[supplier].address);
  await tnd.connect(signers[supplier]).approve(ttnd.address, balance);
  try {
    await ttnd.connect(signers[supplier]).mint(balance);
  } catch (e) { throw e }
  return (await ttnd.connect(signers[supplier]).balanceOf(signers[supplier].address)).gt(0)
}

const permissionTest = () => {
  it('Should revert if not whitelisted', async () => {
    const ttnd = await loadFixture(initialStateFixture)
    return expect(Promise.resolve(mint(ttnd, 'usdcSupplier'))).rejectedWith('private')
  })
  it('Should not revert if whitelisted', async () => {
    const ttnd = await loadFixture(initialStateFixture)
    return expect(Promise.resolve(mint(ttnd))).not.rejected;
  })
}

const mintTest = () => {
  it('Should increase tToken balance', async () => {
    const ttnd = await loadFixture(initialStateFixture)
    return expect(await mint(ttnd)).true;
  })
  it('Mint should increase account liquidity', async ()=> {
    const ttnd = await loadFixture(initialStateFixture)
    const {tndSupplier}= await getSigners();
    const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddress, tndSupplier)
    await mint(ttnd)
    const {1: liquidity} = await unitroller.getAccountLiquidity(tndSupplier.address)
    return expect(liquidity).gt(0)
  })
}

const borrowTest = () => {
  it('Should allow minter to borrow some usdc', async () => {
    const {tndSupplier} = await getSigners();
    const ttnd = await loadFixture(initialStateFixture)
    await mint(ttnd)
    const tusdc = await ethers.getContractAt('CErc20', tusdcAddress)
    const usdc = await ethers.getContractAt('CErc20', usdcAddress)
    await tusdc.connect(tndSupplier).borrow(formatAmount(100, 6));
    return expect(await usdc.balanceOf(tndSupplier.address)).gt(0)
  })

  it('Should not allow minter to borrow more than 30% TND value', async () => {
    const {tndSupplier} = await getSigners();
    const ttnd = await loadFixture(initialStateFixture)
    const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddress, tndSupplier)
    await mint(ttnd)
    const {1: liquidityMint} = await unitroller.getAccountLiquidity(tndSupplier.address)
    const tusdc = await ethers.getContractAt('CErc20', tusdcAddress)
    const amount = liquidityMint.div(formatAmount(2, 18)).mul(formatAmount(1,6))
    return expect(Promise.resolve(
      tusdc.connect(tndSupplier).borrow(amount)
    )).rejected
  })

  it('Should not allow anyone to borrow TND', async () => {
    const {usdcSupplier} = await getSigners();
    const ttnd = await loadFixture(initialStateFixture)
    await mint(ttnd)
    return expect(Promise.resolve(
      ttnd.connect(usdcSupplier).borrow(formatAmount(1, 18))
    )).to.be.rejectedWith('private');
  })
}

const redeemTest = () => {
  it('Should allow all TND to be redeemed', async () => {
    const {tndSupplier} = await getSigners();
    const ttnd = await loadFixture(initialStateFixture)
    await mint(ttnd)
    const hex = (n: number) => { return [`0x${Math.floor(n).toString(16)}`] }
    const month = 2629743
    await hre.network.provider.send('hardhat_mine', hex(month*12));
    const balance = await ttnd.balanceOf(tndSupplier.address)

    return expect(Promise.resolve(
      await ttnd.connect(tndSupplier).redeem(balance)
    )).not.rejected
  })
}

const liquidityTest = () => {
  it('Unitroller', async () => {
    const {tndSupplier} = await getSigners();
    const ttnd = await loadFixture(initialStateFixture)
    const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddress, tndSupplier)
    const {1: liquidityMint} = await unitroller.getAccountLiquidity(tndSupplier.address)
    await mint(ttnd)
    console.log(liquidityMint.toString())
    const tusdc = await ethers.getContractAt('CErc20', tusdcAddress)
    await tusdc.connect(tndSupplier).borrow(formatAmount(100, 6));
    const {1: liquidityBorrow} = await unitroller.getAccountLiquidity(tndSupplier.address)
    console.log(liquidityBorrow.toString())
  })
}

describe("TND", () => {
  describe("Permissions", permissionTest)
  describe("Mint", mintTest)
  describe('Borrow', borrowTest)
  describe('Redeem', redeemTest)
  describe('Liquidity', liquidityTest)
})

const getSigners = async () => {
  const addresses = [
    '0x80b54e18e5bb556c6503e1c6f2655749c9e41da2',
    '0x80b54e18e5bb556c6503e1c6f2655749c9e41da2',
    '0x37b4e7864f8aeb5622133ff3ee131baa54693aca'
  ]
  for(const address of addresses) { await fundWithEth(address) }
  const signers = {
    admin: await ethers.getImpersonatedSigner(addresses[0]),
    tndSupplier: await ethers.getImpersonatedSigner(addresses[1]),
    usdcSupplier: await ethers.getImpersonatedSigner(addresses[2])
  };
  return signers
}

const initialStateFixture = async () => {
  const signers = await getSigners();
  const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddress, signers.admin)
  await unitroller.connect(signers.admin).setWhitelistedUser(signers.tndSupplier.address, true);
  return await deploy(signers.admin)
}

