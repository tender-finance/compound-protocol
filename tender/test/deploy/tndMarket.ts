import hre from "hardhat";
import { formatAmount } from "../util";
import { readFileSync, writeFileSync } from "fs";
import { numToWei } from "../../utils/ethUnitParser";

const token = {
  underlying: '0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C',
  name: 'tTND',
  symbol: 'tTND',
  decimals: 8,
  isGLP: false,
  collateralFactor: formatAmount("30", 16),
  collateralVIP: formatAmount("30", 16),
  threshold: formatAmount("90", 16),
  thresholdVIP: formatAmount("90", 16),
}

const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e'
// placeholder with gmx IRModel
export async function deploy(signer: any, logging=false) {
  const log = function () {
    var context = "My Descriptive Logger Prefix:";
    const ignore = (...args: any) => { return args};
    return logging
      ? Function.prototype.bind.call(console.log, console, context)
      : Function.prototype.bind.call(ignore, console, context);
  }();

  const CErc20Delegate = await  hre.ethers.getContractFactory("CErc20DelegateTnd", signer);
  const delegate = await CErc20Delegate.deploy()
  const CErc20Delegator = await  hre.ethers.getContractFactory("CErc20DelegatorTnd", signer);
  const totalDecimals = 18 + token.decimals;
  const initialExcRateMantissaStr = numToWei("2", totalDecimals);
  const IRModel = await hre.ethers.getContractFactory('JumpRateModelV2Tnd');
  const irModel = await IRModel.deploy(1, 1, 1, 1, signer.address);

  log(
    "Calling delegatorFactory.deploy() with",
    token.underlying,
    unitrollerAddress,
    irModel.address,
    initialExcRateMantissaStr,
    token.name,
    token.symbol,
    token.decimals,
    token.isGLP === true,
    signer.address,
    delegate.address,
    Buffer.from([0x0]),
  )

  const delegator = await CErc20Delegator.deploy(
    token.underlying,
    unitrollerAddress,
    irModel.address,
    initialExcRateMantissaStr,
    token.name,
    token.symbol,
    token.decimals,
    false,
    signer.address,
    delegate.address,
    Buffer.from([0x0]),
  );

  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress,
    signer
  );

  const TndOracle = await hre.ethers.getContractFactory('contracts/tnd/TndOracle.sol:TndOracle', signer);
  const tndOracle = await TndOracle.deploy();
  const PriceOracle = await hre.ethers.getContractFactory('contracts/Compound/GMXPriceOracle.sol:GMXPriceOracle', signer);
  const priceOracle = await PriceOracle.deploy(tndOracle.address);
  await unitrollerProxy._setPriceOracle(priceOracle.address);
  let isPrivate = true
  let isComped = true
  let onlyWhitelistedBorrow = true

  const logmsg = `Initializing market with: [\n isPrivate: ${isPrivate},\n isComped: ${isComped},\n onlyWhitelistedBorrow: ${onlyWhitelistedBorrow}\n]`
  console.log(logmsg)
  await unitrollerProxy._supportMarket(delegator.address, isComped, isPrivate, onlyWhitelistedBorrow);
  await unitrollerProxy._setFactorsAndThresholds(
    delegator.address,
    token.collateralFactor,
    token.collateralVIP,
    token.threshold,
    token.thresholdVIP
  );
  return await hre.ethers.getContractAt('CErc20DelegateTnd', delegator.address, signer)
}
