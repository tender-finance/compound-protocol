import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import {CTOKENS} from "./CTOKENS"

const outputFilePath = `./deployments/${hre.network.name}.json`;


const stakedGLPAddress = "0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE"
const glpRewardRouterAddress = "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1"
const glpManagerAddress = '0x3963FfC9dff443c2A94f21b129D429891E32ec18'
const gmxToken = "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"
const stakedGmxTracker = "0x908c4d94d34924765f1edc22a1dd098397c59dd4"
const sbfGMX = "0xd2D1162512F927a7e282Ef43a362659E4F2a728F"


export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddress: string = deployments.Unitroller;
  const irModelAddress: string = deployments.IRModels.JumpRateModelV2;

  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress
  );

  const adminAddress = await unitrollerProxy.admin()

  const delegatorFactory = await hre.ethers.getContractFactory(
    "CErc20Delegator"
  );
  const CErc20Delegate = await  hre.ethers.getContractFactory("CErc20Delegate");

for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    console.log("deploying delegate")
    const deployedCErc20Delegate = await CErc20Delegate.deploy()
    const delegateAddress = deployedCErc20Delegate.address

    console.log("deployed CErc20Delegate", delegateAddress)

    console.log(
        "Calling delegatorFactory.deploy() with",
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        adminAddress,
        delegateAddress,
        Buffer.from([0x0]),
    )

    const delegator = await delegatorFactory.deploy(
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        adminAddress,
        delegateAddress,
        Buffer.from([0x0]),
    );

    await delegator.deployed();
    console.log("delegator deployed to:", delegator.address);

    try {
      await verifyContract("contracts/CErc20Delegator.sol:CErc20Delegator", delegator.address, [
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        adminAddress,
        delegateAddress,
        Buffer.from([0x0]),
      ]);
    } catch (e) {
      console.error("Error verifying delegator");
      console.error(e);
    }

    if (token.isGLP) {
      console.log("calling ctoken._setGlpAddresses()");
      await delegator._setGlpAddresses(
        stakedGLPAddress,
        glpRewardRouterAddress,
        glpManagerAddress,
        gmxToken,
        stakedGmxTracker,
        sbfGMX
      );
    }

    //    function _setGlpAddresses(IGmxRewardRouter glpRewardRouter_, address glpManager_, address gmxToken_, address stakedGmxTracker_, address sbfGMX_) virtual public returns (uint);

    console.log("calling unitrollerProxy._supportMarket()");

    let isPrivate = false
    let isComped = true
    let onlyWhitelistedBorrow = false
    await unitrollerProxy._supportMarket(delegator.address, isComped, isPrivate, onlyWhitelistedBorrow);

    console.log("calling unitrollerProxy._setCollateralFactor()")

    await unitrollerProxy._setFactorsAndThresholds(
      delegator.address, token.collateralFactor, token.collateralVIP, token.threshold, token.thresholdVIP);

    // Save to output
    deployments[`${token.symbol}_delegate`] = delegateAddress;
    deployments[token.symbol] = delegator.address;
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

  }

}

const verifyContract = async (
  contract: string,
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract,
    address: contractAddress,
    constructorArguments: constructorArgs,
  });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
