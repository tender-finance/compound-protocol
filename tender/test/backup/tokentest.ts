import { CTokenContract } from './Token'
import { getWallet } from './util'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
const hreProvider = hre.network.provider;

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';
const provider = new ethers.providers.Web3Provider(hreProvider as any);

const getTEth = async () => {
  const wallet = await getWallet(walletAddress, provider)
  const tEth = new CTokenContract("tEth", 'CEther', wallet);

  console.log(await tEth.getBalance());
  await tEth.mint(.001);
  console.log(await tEth.getBalance());
}

getTEth()
