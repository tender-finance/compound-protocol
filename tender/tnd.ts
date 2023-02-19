import '@nomiclabs/hardhat-ethers';
import hre, { ethers } from 'hardhat';
import { formatAmount, fundWithEth } from './util'
import { deploy } from './deploytTnd'

const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e'
const tusdcAddress = '0x068485a0f964B4c3D395059a19A05a8741c48B4E'
const usdcAddress = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
const main = async () => {
  const wallet = await ethers.getImpersonatedSigner('0x5314f6BDa6a1FD38D3cf779E445b52327e7c0C4a');
  const signer = await ethers.getImpersonatedSigner('0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2')
  const tnd = await hre.ethers.getContractAt('CErc20', '0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C', wallet);
  console.log(await tnd.balanceOf(wallet.address))
  await fundWithEth(signer.address);
  await fundWithEth(wallet.address);
  const ttnd = await deploy(signer);
  const unitroller = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress,
    signer
  );

  console.log(await unitroller.getAccountLiquidity(wallet.address))
  const balance = await tnd.balanceOf(wallet.address);
  await tnd.connect(wallet).approve(ttnd.address, balance);
  await ttnd.connect(wallet).mint(balance);
  const tusdc = await ethers.getContractAt('CErc20Delegate', tusdcAddress, wallet);
  const usdc = await ethers.getContractAt('CErc20Delegate', usdcAddress, wallet);
  await tusdc.connect(wallet).borrow(formatAmount(10000, 6));
  console.log(await ttnd.balanceOf(wallet.address))
  console.log(await usdc.balanceOf(wallet.address))
}

main()
