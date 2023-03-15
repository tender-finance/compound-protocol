import "@nomiclabs/hardhat-ethers";
import hre, {ethers} from "hardhat";
import { formatAmount, fundWithEth } from "./util";
import { readFileSync, writeFileSync } from "fs";
import { numToWei } from "./utils/ethUnitParser";
const token = {
  underlying: '0x1aDDD80E6039594eE970E5872D247bf0414C8903',
  symbol: 'vGLP',
  decimals: 8,
  isGLP: true,
  // vault: '0x236F233dBf78341d25fB0F1bD14cb2bA4b8a777c',
  vault: '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2',
  collateralFactor: formatAmount("90", 16),
  collateralVIP: formatAmount("90", 16),
  threshold: formatAmount("95", 16),
  thresholdVIP: formatAmount("95", 16),
}

const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e'
// placeholder with gmx IRModel
export async function deploy() {
  const signer = await ethers.getImpersonatedSigner('0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2')
  await fundWithEth(signer.address);

  const CErc20DelegateVault = await  hre.ethers.getContractFactory("CErc20DelegateVault", signer);
  const delegate = await CErc20DelegateVault.deploy()
  const CErc20DelegatorVault = await  hre.ethers.getContractFactory("CErc20DelegatorVault", signer);

  const totalDecimals = 18 + token.decimals;
  const initialExcRateMantissaStr = numToWei("2", totalDecimals);
  const irModel = { address: '0xc2933EfF32188e4655887cDC9c707A77E1229595' }

  const delegator = await CErc20DelegatorVault.deploy(
    token.underlying,
    unitrollerAddress,
    irModel.address,
    initialExcRateMantissaStr,
    token.symbol,
    token.decimals,
    token.isGLP,
    token.vault,
    signer.address,
    delegate.address,
    Buffer.from([0x0]),
  );

  const stakedGLPAddress = "0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE"
  const glpRewardRouterAddress = "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1"
  const glpManagerAddress = '0x3963FfC9dff443c2A94f21b129D429891E32ec18'
  const gmxToken = "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"
  const stakedGmxTracker = "0x908c4d94d34924765f1edc22a1dd098397c59dd4"
  const sbfGMX = "0xd2D1162512F927a7e282Ef43a362659E4F2a728F"

  await delegator._setGlpAddresses(
    stakedGLPAddress,
    glpRewardRouterAddress,
    glpManagerAddress,
    gmxToken,
    stakedGmxTracker,
    sbfGMX
  );

  const unitrollerProxy = await hre.ethers.getContractAt(
    "contracts/Compound/Comptroller.sol:Comptroller",
    unitrollerAddress,
    signer
  );
  const Oracle = await hre.ethers.getContractFactory("TenderPriceOracle", signer);
  const oracle = await Oracle.deploy([]);
  await oracle.addVaultToken(delegator.address);

  await unitrollerProxy._setPriceOracle(oracle.address);

  let isPrivate = false
  let isComped = true
  let onlyWhitelistedBorrow = true
  await unitrollerProxy._supportMarket(delegator.address, isComped, isPrivate, onlyWhitelistedBorrow);

  await unitrollerProxy._setFactorsAndThresholds(
    delegator.address,
    token.collateralFactor,
    token.collateralVIP,
    token.threshold,
    token.thresholdVIP
  );

  const vaultToken = await hre.ethers.getContractAt('CErc20DelegateVault', delegator.address, signer)
  const depositToken = token.underlying
  const targetMarket = '0xFF2073D3810754D6da4783235c8647e11e43C943';
  const Vault = await hre.ethers.getContractFactory("Vault", signer);
  const vault = await Vault.deploy(depositToken, targetMarket, vaultToken.address);
  await vaultToken._setVaultAddress(vault.address);

  return {
    vault: vault,
    vaultToken: vaultToken,
  }
}
