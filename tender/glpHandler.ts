import '@nomiclabs/hardhat-ethers';
import hre, {ethers} from "hardhat";
import { formatAmount } from "./util";
import { readFileSync, writeFileSync } from "fs";
import { numToWei } from "./utils/ethUnitParser";
import deployments from '../deployments/arbitrum.json';

const multisig = '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2'

const contracts = {
  "tfsGLP": "0xFF2073D3810754D6da4783235c8647e11e43C943",
  // "tEth": "0x0706905b2b21574DEFcF00B5fc48068995FCdCdf",
  // "tWBTC": "0x0A2f8B6223EB7DE26c810932CCA488A4936cF391",
  // "tFRAX": "0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab",
  // "tUSDT": "0x4A5806A3c4fBB32F027240F80B18b26E40BF7E31",
  "tUSDC": "0x068485a0f964B4c3D395059a19A05a8741c48B4E",
  // "tDAI": "0xB287180147EF1A97cbfb07e2F1788B75df2f6299",
  // "tLINK": "0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35",
  // "tUNI": "0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71",
}
const stakedGlp = '0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE';
const fsGlp = '0x1aDDD80E6039594eE970E5872D247bf0414C8903'
const glpToken = '0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258'

const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e';
async function setAddress(symbol: string, address: string, implementation: string) {
  const allowResign = true
  const data = Buffer.from([0x0])
  const signer = await ethers.getImpersonatedSigner('0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2');
  const delegator = await hre.ethers.getContractAt("contracts/Compound/CErc20Delegator.sol:CErc20Delegator", address, signer);
  console.log("setting implementation on", symbol, address, "to", implementation)
  await delegator._setImplementation(implementation, allowResign, data)
  console.log("Set implementation")
}

export async function deploy() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);
  const CErc20Delegate = await hre.ethers.getContractFactory('contracts/tender/glp-vault/CErc20Delegate.sol:CErc20Delegate');
  const deployedCErc20Delegate = await CErc20Delegate.deploy()
  console.log("deployed CErc20Delegate", deployedCErc20Delegate.address)
  return deployedCErc20Delegate.address
}

const main = async () => {
  const signer = await ethers.getImpersonatedSigner('0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2')
  const Handler = await ethers.getContractFactory('contracts/tender/glp-vault/Handler.sol:Handler', signer);
  const handler = await Handler.deploy();

  const implementation = await deploy();
  console.log(handler.address);

  for (let key in contracts) {
    try {
      await setAddress(key, contracts[key], implementation);
    } catch (e) {
      console.error(e);
      console.error("Could not upgrade", key, "with implementation", contracts[key]);
    }
  }

  const wallet = await ethers.getImpersonatedSigner('0x97bb6679ae5a6c66fFb105bA427B07E2F7fB561e');
  const tfsGLP = await ethers.getContractAt('contracts/tender/interfaces/CToken.sol:ICToken', contracts['tfsGLP'])
  const fsGLP = await ethers.getContractAt('contracts/tender/interfaces/Tokens.sol:IERC20', fsGlp, wallet)
  const stakedGLP = await ethers.getContractAt('contracts/tender/interfaces/Tokens.sol:IERC20', stakedGlp, wallet)
  const supplyAmount = formatAmount(100, await fsGLP.decimals())


  await fsGLP.connect(wallet).approve(tfsGLP.address, supplyAmount);
  await stakedGLP.connect(wallet).approve(tfsGLP.address, supplyAmount);
  await fsGLP.connect(wallet).approve(handler.address, supplyAmount);
  await stakedGLP.connect(wallet).approve(handler.address, supplyAmount);

  await tfsGLP.connect(wallet).mint(supplyAmount);
  const amount = formatAmount(90, 6)


  await handler.connect(wallet).borrowAndMintForUser(deployments.tUSDC, amount, 5);
  const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddress, signer)

  console.log('handler liquidity')
  // console.log(await unitroller.getAccountLiquidity(handler.address))
  // console.log('wallet liquidity')
  // console.log(await unitroller.getAccountLiquidity(wallet.address))
  // const tUSDC = await ethers.getContractAt('contracts/tender/interfaces/CToken.sol:ICToken', contracts['tUSDC'])
  // console.log('handler borrow balance')
  // console.log(await tUSDC.borrowBalanceStored(handler.address))
  // console.log('wallet borrow balance')
  // console.log(await tUSDC.borrowBalanceStored(wallet.address))
}

main()
