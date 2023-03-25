import hre, {ethers} from "hardhat";
import { formatAmount } from "../../util";
import { numToWei } from "../../utils/ethUnitParser";
import { resolve } from "path";

const deployments = require(resolve(
  __dirname,
  `../../../deployments/arbitrum.json`
));

const arbFeedId = '0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5';

const token = {
  underlying: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  name: 'tARB',
  symbol: 'tARB',
  decimals: 8,
  isGLP: false,
  collateralFactor: formatAmount("30", 16),
  collateralVIP: formatAmount("35", 16),
  threshold: formatAmount("40", 16),
  thresholdVIP: formatAmount("45", 16),
}

const getSigner = async () => {
  const [signer] = await ethers.getSigners();
  return signer;
}

export const deployOracle = async () => {
  const [signer] = await ethers.getSigners();

  const deployPythOracle = async () => {
    const PythOracle = await ethers.getContractFactory('PythOracle', signer);
    return await PythOracle.deploy(arbFeedId);
  }

  const deployTenderOracle = async (pythOracle: any) => {
    const TenderOracle = await  hre.ethers.getContractFactory(
      "contracts/tender/TenderPriceOracle.sol:TenderPriceOracle",
      signer
    );
    const tenderOracle = await TenderOracle.deploy()
    await tenderOracle.setOracle(token.underlying, pythOracle.address);
    console.log('tenderOracle', tenderOracle.address);
    return tenderOracle;
  }
  const pythOracle = await deployPythOracle();
  console.log('pythOracle', pythOracle.address);
  return await deployTenderOracle(pythOracle);
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

  const delegator = await CErc20Delegator.deploy(
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
  );

  return {
    tArb: await ethers.getContractAt('CErc20Delegate', delegator.address, signer)
  }
}

export async function addToMarkets(oracle: any, delegator: any) {
  const unitrollerAddress = deployments.Unitroller;
  const unitrollerProxy = await ethers.getContractAt('Comptroller', unitrollerAddress);
  const adminAddress = await unitrollerProxy.admin()
  const admin = await ethers.getImpersonatedSigner(adminAddress);
  await unitrollerProxy.connect(admin)._setPriceOracle(oracle.address)
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
