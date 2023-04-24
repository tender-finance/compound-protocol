import "@nomiclabs/hardhat-ethers"
import hre from "hardhat";
import { readFileSync} from "fs";
import { resolve } from "path";


export async function deployComptroller() {
  const outputFilePath = resolve(__dirname, `../../../deployments/arbitrum.json`);
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddr = deployments["Unitroller"];
  const Comptroller = await hre.ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();
  await comptroller.deployed();

  console.log("Comptroller deployed to:", comptroller.address);
  console.log("calling unitroller._setPendingImplementation()");

  const unitroller = await hre.ethers.getContractAt("Unitroller", unitrollerAddr);
  const adminAddress = await unitroller.admin();
  await deployer.sendTransaction({ to: adminAddress, value: hre.ethers.utils.parseEther("0.5") });

  const admin = await hre.ethers.getImpersonatedSigner(adminAddress);
  await unitroller.connect(admin)._setPendingImplementation(comptroller.address);
  await comptroller.connect(admin)._become(unitrollerAddr);
  return unitroller;
}
