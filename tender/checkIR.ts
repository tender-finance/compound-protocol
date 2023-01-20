import "@nomiclabs/hardhat-ethers"
import hre, { ethers } from "hardhat"

// const irModels = [
//   '0xc2933EfF32188e4655887cDC9c707A77E1229595',
//   '0xA738B4910b0A93583A7E3E56d73467FE7c538158'
// ]
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

const multisig = '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2'
const main = async () => {
  const [signer] = await ethers.getSigners()
  // const signer = await ethers.getImpersonatedSigner('0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac');
  // await fundWithEth(signer.address);
  for(const [_, address] of Object.entries(markets)){
    const tokenContract = await hre.ethers.getContractAt('CErc20Delegator', address, signer)
    await tokenContract._setPendingAdmin(multisig)
  }
}
main()

const fundWithEth = async (receiver: any) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};
