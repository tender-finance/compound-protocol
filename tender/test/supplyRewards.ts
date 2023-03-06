import "@nomiclabs/hardhat-ethers";
import * as ContractTypes from '../../typechain-types/index';
// import '@nomicfoundation/hardhat-network-helpers'
import hre, { ethers } from "hardhat";
import { formatAmount, fundWithEth } from '../test/util';
import { type Signer } from "ethers";
const hex = (n: number) => { return [`0x${Math.floor(n).toString(16)}`] }
const fa = formatAmount

const month = 2629743

const supplierAddress = '0x37b4e7864f8aeb5622133ff3ee131baa54693aca';
const secondSupplier = '0x8075df8a555048bff338b04e7af5de5ee9565f73';

const tUsdcAddress = '0x068485a0f964B4c3D395059a19A05a8741c48B4E';
const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e';
const esTndAddress= '0xff9bd42211f12e2de6599725895f37b4ce654ab2';
const multisig ='0x80b54e18e5bb556c6503e1c6f2655749c9e41da2'

const deployComptrollerImplementation = async (admin: any) => {
  const Comptroller = await ethers.getContractFactory('Comptroller', admin)
  const comptroller = await Comptroller.deploy()
  const unitroller = await ethers.getContractAt('Unitroller', unitrollerAddress, admin)
  await unitroller._setPendingImplementation(comptroller.address)
  await comptroller._become(unitroller.address);
}
const main = async () => {
  const admin = await ethers.getImpersonatedSigner(multisig);
  await deployComptrollerImplementation(admin)
  const supplier = await ethers.getImpersonatedSigner(supplierAddress);
  const supplierTwo = await ethers.getImpersonatedSigner(secondSupplier);

  await fundWithEth(multisig)
  await fundWithEth(supplierAddress)
  await fundWithEth(secondSupplier)

  const esTnd = await ethers.getContractAt('contracts/token/IERC20.sol:IERC20', esTndAddress, admin);
  const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddress, admin)

  console.log(await esTnd.balanceOf(supplierTwo.address))
  console.log(await esTnd.balanceOf(supplier.address))

  console.log(await esTnd.balanceOf(unitroller.address))
  await unitroller.setCompAddress(esTndAddress)

  console.log(await unitroller.functions['compAccrued(address)'](supplier.address))
  console.log(await unitroller.functions['compAccrued(address)'](supplierTwo.address))
  // await hre.network.provider.send('hardhat_mine', hex(month));

  const tusdc = await ethers.getContractAt('CErc20', tUsdcAddress, admin);
  await tusdc.connect(supplier).redeem(formatAmount(1, 1))
  // await unitroller._setCompSpeeds([tUsdcAddress], [fa(.000001, 18)], [0])

  console.log(await unitroller.functions['compAccrued(address)'](supplier.address))
  console.log(await unitroller.functions['compAccrued(address)'](supplierTwo.address))

  await unitroller.functions['claimComp(address)'](supplier.address)
  await unitroller.functions['claimComp(address)'](supplierTwo.address)

  // console.log(await unitroller.functions['compAccrued(address)'](supplier.address))
  // console.log(await unitroller.functions['compAccrued(address)'](supplierTwo.address))
  console.log(await esTnd.balanceOf(supplierTwo.address))
  console.log(await esTnd.balanceOf(supplier.address))
  console.log(await esTnd.balanceOf(unitroller.address))
}

main()
