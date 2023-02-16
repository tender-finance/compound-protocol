import '@nomiclabs/hardhat-ethers';
import { readFileSync, writeFileSync } from 'fs';
import hre, { ethers } from "hardhat";

const contracts = {
  // "tfsGLP": "0xFF2073D3810754D6da4783235c8647e11e43C943",
  "tEth": "0x0706905b2b21574DEFcF00B5fc48068995FCdCdf",
  "tWBTC": "0x0A2f8B6223EB7DE26c810932CCA488A4936cF391",
  "tFRAX": "0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab",
  "tUSDT": "0x4A5806A3c4fBB32F027240F80B18b26E40BF7E31",
  "tUSDC": "0x068485a0f964B4c3D395059a19A05a8741c48B4E",
  "tDAI": "0xB287180147EF1A97cbfb07e2F1788B75df2f6299",
  "tLINK": "0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35",
  "tUNI": "0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71",
}

export async function deploy(contract_name: string) {
  const outputFilePath = `${__dirname}/../../deployments/${hre.network.name}.json`;
  console.log(outputFilePath)
  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);
  const CErc20Delegate = await  hre.ethers.getContractFactory("CErc20Delegate");
  const deployedCErc20Delegate = await CErc20Delegate.deploy()
  console.log("deployed CErc20Delegate", deployedCErc20Delegate.address)
  try {
    await hre.run("verify:verify", {
      contract: "contracts/CErc20Delegate.sol:CErc20Delegate",
      address: deployedCErc20Delegate.address,
    })
  } catch (e) {
    console.error("Could not verify delegate", deployedCErc20Delegate.address);
    console.error(e);
  }
  deployments[`${contract_name}_delegate`] = deployedCErc20Delegate.address
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
  return deployedCErc20Delegate.address
}

export async function main() {
  for (let key in contracts) {
    try {
      const implementation = await deploy(key);
      // await setAddress(key, contracts[key], implementation);
    } catch (e) {
      console.error("Could not upgrade", key, "with implementation", contracts[key]);
    }
  }
}

async function setAddress(symbol: string, address: string, implementation: string) {
  const allowResign = true
  const data = Buffer.from([0x0])
  const delegator = await hre.ethers.getContractAt("CErc20Delegator", address);
  console.log("setting implementation on", symbol, address, "to", implementation)
  await delegator._setImplementation(implementation, allowResign, data)
  console.log("Set implementation")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
