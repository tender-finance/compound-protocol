import "@nomiclabs/hardhat-ethers";
import hre, {ethers} from "hardhat";
import { formatAmount } from "../util";
import { numToWei } from "../utils/ethUnitParser";
import { resolve } from "path";

const deployments = require(resolve(
  __dirname,
  `../../deployments/arbitrum.json`
));

const token = {
  underlying: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  name: 'tWETH',
  symbol: 'tWETH',
  decimals: 8,
  isGLP: false,
  collateralFactor: formatAmount("80", 16),
  collateralVIP: formatAmount("85", 16),
  threshold: formatAmount("85", 16),
  thresholdVIP: formatAmount("90", 16),
}

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

  return {
    tWETH: await ethers.getContractAt('CErc20Delegate', delegator.address, signer),
    deployArgs: deployArgs
  }
}

export async function addToMarkets(delegator: any) {
  const unitrollerAddress = deployments.Unitroller;
  const unitrollerProxy = await ethers.getContractAt('Comptroller', unitrollerAddress);
  const adminAddress = await unitrollerProxy.admin()
  const admin = await ethers.getImpersonatedSigner(adminAddress);
  let isPrivate = false;
  let isComped = true;
  let onlyWhitelistedBorrow = false;
  await unitrollerProxy
  .connect(admin)
  ._supportMarket(
    delegator.address,
    isComped,
    isPrivate,
    onlyWhitelistedBorrow
  );

  await unitrollerProxy
  .connect(admin)
  ._setFactorsAndThresholds(
    delegator.address,
    token.collateralFactor,
    token.collateralVIP,
    token.threshold,
    token.thresholdVIP
  );
}
