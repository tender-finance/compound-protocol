import "@nomiclabs/hardhat-ethers"
import hre, { ethers } from "hardhat"
import { formatAmount } from './utils/TokenUtil'

const markets = {
  tEth: "0x0706905b2b21574DEFcF00B5fc48068995FCdCdf",
  tfsGLP: "0xFF2073D3810754D6da4783235c8647e11e43C943",
  tWBTC: "0x0A2f8B6223EB7DE26c810932CCA488A4936cF391",
  tFRAX: "0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab",
  tUSDT: "0x4A5806A3c4fBB32F027240F80B18b26E40BF7E31",
  tUSDC: "0x068485a0f964B4c3D395059a19A05a8741c48B4E",
  tDAI: "0xB287180147EF1A97cbfb07e2F1788B75df2f6299",
  tLINK: "0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35",
  tUNI: "0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71",
  tGMX: "0x20a6768F6AABF66B787985EC6CE0EBEa6D7Ad497"
}

const wallet = '0xb16A50C92f9A6B4DbCCeBBEb165f1fC03f87A75C'

export async function upgradeGmx() {
  // const admin = '0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac';
  const admin = '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2'
  const deployer = await ethers.getImpersonatedSigner(admin);
  await fundWithEth(admin)
  console.log('setting implementation')
  const gmxDelegator = '0x20a6768F6AABF66B787985EC6CE0EBEa6D7Ad497'
  const CErc20DelegateGmx = await hre.ethers.getContractFactory(
    "CErc20DelegateGmx",
    deployer
  );
  const cErc20DelegateGmx = await CErc20DelegateGmx.deploy()
  const implementation = cErc20DelegateGmx.address

  const delegator = await hre.ethers.getContractAt("CErc20Delegator", gmxDelegator, deployer);
  await delegator._setImplementation(implementation, allowResign, data)
  console.log("Set implementation")
}

const main = async () => {
  await upgradeGmx()
  const signer = await ethers.getImpersonatedSigner(wallet);
  // await fundWithEth(signer.address);
  const collateralContract = await hre.ethers.getContractAt('CErc20Delegate', markets['tUSDC'], signer)
  const tGmxContract = await hre.ethers.getContractAt('CErc20Delegate', markets['tGMX'], signer)
  await collateralContract.mint(formatAmount('10', 6))
  await tGmxContract.borrow(238)
}
main()

const contracts = {
}

const allowResign = true
const data = Buffer.from([0x0])



async function setAddress(symbol: string, address: string, implementation: string) {

  console.log("setting implementation on", symbol, address, "to", implementation)
  

  console.log("Set implementation")

}
const fundWithEth = async (receiver: any) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};
