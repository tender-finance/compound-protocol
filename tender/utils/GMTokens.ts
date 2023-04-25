import '@nomiclabs/hardhat-ethers';
import hre, {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import * as deployments from '../../deployments/arbitrum.json';
import { numToWei } from './ethUnitParser';

const unitrollerAddr = deployments.Unitroller;
const adminAddr = '0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac';

const gmdAssets = {
  gmdETH:  '0x1E95A37Be8A17328fbf4b25b9ce3cE81e271BeB3',
  gmdBTC:  '0x147FF11D9B9Ae284c271B2fAaE7068f4CA9BB619',
  gmdUSDC: '0x3DB4B7DA67dd5aF61Cb9b3C70501B1BdB24b2C22',
  gmdUSDT: '0x34101Fe647ba02238256b5C5A58AeAa2e532A049',
}

async function getSigner() {
  let signer;
  if (hre.network.name == 'hardhat'){
    signer = await ethers.getImpersonatedSigner(adminAddr)
  } else{
    [signer] = await ethers.getSigners();
  }
  return signer;
}

async function deployOracles() {
  const signer = await getSigner();
  const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddr, signer);
  const oracleAddr = await unitroller.oracle();
  const oracle = await ethers.getContractAt('contracts/tender/TenderPriceOracle.sol:TenderPriceOracle', oracleAddr, signer);
  const GMDPriceFeedFactory = await ethers.getContractFactory('GMDPriceFeedFactory');
  const factory = await GMDPriceFeedFactory.deploy();
  for(let i = 0; i < 4; i++) {
    const priceFeedAddr = await factory.getGMDPriceFeed(i);
    const feed = await ethers.getContractAt('GMDPriceFeed', priceFeedAddr, signer);
    const asset = await feed.gmdTokenAddr();
    await oracle.setOracle(asset, feed.address);
  }

  for(let [name, address] of Object.entries(gmdAssets)) {
    const assetPrice = await oracle.getUSDPrice(address);
    console.log(`${name}: ${assetPrice}`);
  }
}

const addresses = [
  '0x1E95A37Be8A17328fbf4b25b9ce3cE81e271BeB3',
  '0x147FF11D9B9Ae284c271B2fAaE7068f4CA9BB619',
  '0x3DB4B7DA67dd5aF61Cb9b3C70501B1BdB24b2C22',
  '0x34101Fe647ba02238256b5C5A58AeAa2e532A049',
];
const unitrollerAddress = deployments.Unitroller;

const deployCTokens = async () => {
  // const CErc20Delegator = await ethers.getContractFactory('CErc20Delegator');
  const irModelAddress = '0xA738B4910b0A93583A7E3E56d73467FE7c538158';
  const signer = await getSigner();

  for(const address of addresses) {
    const uToken = await ethers.getContractAt('contracts/tender/interfaces/Tokens.sol:IERC20', address, signer);
    console.log(await uToken.symbol())
    const uSymbol = await uToken.symbol();
    const uName = await uToken.name();
    const uDecimals = await uToken.decimals();

    const cToken = {
      name: `t${uName}`,
      underlying: address,
      symbol: `t${uSymbol}`,
      decimals: 8,
      isGLP: false,
    }
    const totalDecimals = uDecimals + cToken.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const deployArgs = [
      cToken.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      cToken.name,
      cToken.symbol,
      cToken.decimals,
      cToken.isGLP === true,
      signer.address,
      deployments.delegate,
      Buffer.from([0x0])
    ];

    async function verify () {
      await hre.run("verify:verify", {
        constructorArguments: deployArgs,
        contract: 'contracts/Compound/CErc20Delegator.sol:CErc20Delegator',
        address: deployments[cToken.symbol]
      })
    }
    await verify();

    // const delegator = await CErc20Delegator.deploy(...deployArgs);
    // await delegator.deployed()
    // console.log(`${cToken.name}: ${delegator.address}`);
  }
}

async function getMarketInfo () {
  const unitroller = await ethers.getContractAt('Comptroller', unitrollerAddr);
  for (const [address, gmdAddress] of [
    [deployments.tWBTC, deployments.tgmdBTC],
    [deployments.tWETH, deployments.tgmdETH],
    [deployments.tUSDC, deployments.tgmdUSDC],
    [deployments.tUSDT, deployments.tgmdUSDT]
  ]) {
    const {
      collateralFactorMantissa,
      liquidationThresholdMantissa,
      collateralFactorMantissaVip,
      liquidationThresholdMantissaVip
    } = await unitroller.markets(address);
    console.log([
      gmdAddress,
      collateralFactorMantissa.toString(),
      liquidationThresholdMantissa.toString(),
      collateralFactorMantissaVip.toString(),
      liquidationThresholdMantissaVip.toString(),
    ])
  }
}
async function main() {
  // await deployOracles();
  await deployCTokens();
  // await getMarketInfo();
}

main()
