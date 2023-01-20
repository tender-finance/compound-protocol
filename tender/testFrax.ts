import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import { formatAmount } from './test/utils/TokenUtil';
const walletAddress = '0x4cd977fdad7acc7b515dfd5637c28afddef8b072';
const tFraxAddress = '0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab';
const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e';
const fraxWallet = '0x07b23ec6aedf011114d3ab6027d69b561a2f635e'

const upgradeDelegate = async () => {
  const [signer] = await hre.ethers.getSigners()
  let delegator = await hre.ethers.getContractAt(
    'CErc20Delegator',
    tFraxAddress,
    signer
  );
  const admin = await hre.ethers.getImpersonatedSigner(await delegator.admin());
  await fundWithEth(admin.address);
  delegator = delegator.connect(admin)
  const Delegate = await hre.ethers.getContractFactory('CErc20Delegate', admin)
  const delegate = await Delegate.deploy()
  await delegator._setImplementation(delegate.address, true, Buffer.from([0x0]));
}

const mintNew = async (tokenContract: any) => {
  const uAddress = '0x17fc002b466eec40dae837fc4be5c67993ddbd6f';
  const signer = await hre.ethers.getImpersonatedSigner(fraxWallet);
  return await hre.ethers.getContractAt(
    'IERC721',
    uAddress,
    signer
  );
  // await tokenContract.mint(980000);
}
const main = async () => {
  await upgradeDelegate();
  const signer = await ethers.getImpersonatedSigner(walletAddress);
  // const fraxSigner = await ethers.getImpersonatedSigner(fraxWallet);
  await fundWithEth(signer.address);
  let tokenContract = await hre.ethers.getContractAt(
    'CErc20Delegate',
    tFraxAddress,
    signer
  );
  const tTokenBalance = await tokenContract.balanceOf(walletAddress);
  await tokenContract.redeem(tTokenBalance);
  // const borrows = await tokenContract.queryFilter('Mint')
  // const alex = borrows[0]
  // console.log(alex)
//
//   await fundWithEth(fraxWallet);
  // let uContract = await mintNew(tokenContract);
  // await uContract.connect(fraxSigner).approve(tFraxAddress, formatAmount('1', 22));
//   // await tokenContract.connect(fraxSigner).mint(formatAmount('980', 18));
//   // const unitroller = await hre.ethers.getContractAt(
//   //   'Comptroller',
//   //   unitrollerAddress,
//   //   signer
//   // )
  // let fraxBalanceAlex = await uContract.balanceOf(walletAddress);
  // console.log('fraxBalanceAlex', fraxBalanceAlex.div(formatAmount('1', 18)));
  // console.log('scaled: ', tTokenBalance.div(50))
  // const cash = await tokenContract.getCash();
  // console.log('UBALANCE', await tokenContract.balanceOfUnderlying(walletAddress))
  // console.log(cash.sub(tTokenBalance))
  // fraxBalanceAlex = await uContract.balanceOf(walletAddress);
  // console.log('fraxBalanceAlexAfter', fraxBalanceAlex.div(formatAmount('1', 18)));
//
}
main()

const fundWithEth = async (receiver: any) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};
