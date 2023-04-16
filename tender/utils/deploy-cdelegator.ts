import "@nomiclabs/hardhat-ethers";
import hre, {ethers} from "hardhat";
import { numToWei } from "../utils/ethUnitParser";
import { resolve } from "path";

import {token} from './deployToken';

const deployments = require(resolve(
  __dirname,
  `../../deployments/arbitrum.json`
));

const getSigner = async () => {
  const [signer] = await ethers.getSigners();
  return signer;
}

// placeholder with gmx IRModel
export async function deployToken () {
  const unitrollerAddress = deployments.Unitroller;
  const irModelAddress: string = deployments.IRModels.JumpRateModelV2;
  const signer = await getSigner();

  const CErc20Delegator = await  hre.ethers.getContractFactory("CErc20Delegator", signer);

  const erc20Underlying = await hre.ethers.getContractAt(
    "EIP20Interface",
    token.underlying
  );
  const underlyingDecimals = await erc20Underlying.decimals();
  const totalDecimals = underlyingDecimals + token.decimals;
  const initialExcRateMantissaStr = numToWei("2", totalDecimals);
  const deployArgs = [
    token.underlying,
    unitrollerAddress,
    irModelAddress,
    initialExcRateMantissaStr,
    token.name,
    token.symbol,
    token.decimals,
    token.isGLP === true,
    signer.address,
    deployments.delegate,
    Buffer.from([0x0])
  ];
  console.log(deployArgs);
  const delegator = await CErc20Delegator.deploy(...deployArgs);
  console.log(delegator.address);

  return {
    tMAGIC: await ethers.getContractAt('CErc20Delegate', delegator.address, signer),
    deployArgs: deployArgs
  }
}

async function verify () {
  await hre.run("verify:verify", {
    constructorArguments: [
      '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
      '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e',
      '0xc2933EfF32188e4655887cDC9c707A77E1229595',
      '200000000000000000000000000',
      'tMAGIC',
      'tMAGIC',
      8,
      false,
      '0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac',
      '0x4dA255e7f6498b75fd1F46bE8AbAB627Bf5f147C',
      Buffer.from([0x0])
    ],
    contract: 'contracts/Compound/CErc20Delegator.sol:CErc20Delegator',
    address: '0x4180f39294c94F046362c2DBC89f2DF7786842c3'
  })
}
verify();

