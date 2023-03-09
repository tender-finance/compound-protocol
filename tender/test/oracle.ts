import "@nomiclabs/hardhat-ethers";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
import hre, { ethers } from "hardhat";
import { writeFileSync } from 'fs';
import { formatAmount, fundWithEth } from '../util';

const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e';
const ctokens = {
  "tETH": {
    address: "0x0706905b2b21574DEFcF00B5fc48068995FCdCdf",
    wallet: "0x253584543D8273444dE5A029B5a56D083958190A",
  },
  "tfsGLP": {
    address: "0xFF2073D3810754D6da4783235c8647e11e43C943",
    wallet: "0x07b23ec6aedf011114d3ab6027d69b561a2f635e",
  },
  "tWBTC": {
    address: "0x0A2f8B6223EB7DE26c810932CCA488A4936cF391",
    wallet: "0x171cda359aa49E46Dec45F375ad6c256fdFBD420",
  },
  "tFRAX": {
    address: "0x27846A0f11EDC3D59EA227bAeBdFa1330a69B9ab",
    wallet: "0x0cD16F3F840852b17dB7f47C270BBd1a9D082BF3",
  },
  "tUSDT": {
    address: "0x4A5806A3c4fBB32F027240F80B18b26E40BF7E31",
    wallet: "0x171cda359aa49E46Dec45F375ad6c256fdFBD420",
  },
  "tUSDC": {
    address: "0x068485a0f964B4c3D395059a19A05a8741c48B4E",
    wallet: "0x253584543D8273444dE5A029B5a56D083958190A",
  },
  "tDAI": {
    address: "0xB287180147EF1A97cbfb07e2F1788B75df2f6299",
    wallet: "0x86C149C60268d803bdaD0fFCd10056de915f2ed4",
  },
  "tLINK": {
    address: "0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35",
    wallet: "0x4f9dc145c00fa2a2036770e39a71566b1d3f6b97",
  },
  "tUNI": {
    address: "0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71",
    wallet: "0xE93a437c41ddEE88C5F80871071Fad42EA207120",
  },
  "tGMX": {
    address: "0x20a6768F6AABF66B787985EC6CE0EBEa6D7Ad497",
    wallet: "0xa3c0b931feb78da33c52fa4adb9dfd04f1cf8d37",
  },
}

const getSigner = async () => {
  if (hre.network.name == 'hardhat' || hre.network.name == 'localhost') {
    const multisig = '0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2'
    return [await hre.ethers.getImpersonatedSigner(multisig)];
  }
  return await hre.ethers.getSigners();
}

const test = async (oracle, ctoken) => {
  console.log(await oracle.getUnderlyingPrice(ctoken));
}

const getUnderlying = async (ctoken) => {
  const symbol = await ctoken.symbol()
  if (symbol == 'tfsGLP') {
    return '0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE';
  } else if (symbol == 'tETH') {
    return '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
  }
  else {
    return await ctoken.underlying();
  }
}
const mint = async (price, address, wallet) => {
  await fundWithEth(wallet);
  const signer = await ethers.getImpersonatedSigner(wallet);
  let ctoken = await ethers.getContractAt('CErc20', address, signer);
  if (await ctoken.symbol() == 'tETH') {
    ctoken = await ethers.getContractAt('CEther', address, signer);
    await fundWithEth(wallet);
    return await ctoken.functions['mint']({value: formatAmount(1, 18)});
  }
  const underlying = await ethers.getContractAt('contracts/token/IERC20.sol:IERC20', await getUnderlying(ctoken), signer);
  await underlying.approve(ctoken.address, formatAmount(1000000, 18));
  const decimals = await underlying.decimals();
  const base = formatAmount(1, decimals);
  console.log(base.toString());
  await ctoken.mint(base);
}

const priceOracleFixture = async () => {
  const [signer] = await getSigner();
  const PriceOracle = await hre.ethers.getContractFactory('TenderPriceOracle', signer);
  const priceOracle = await PriceOracle.deploy();
  console.log('tndOracle deployed to:', priceOracle.address)
  const unitroller = await hre.ethers.getContractAt('Comptroller', unitrollerAddress, signer);
  await unitroller._setPriceOracle(priceOracle.address);
  return { priceOracle, unitroller };
}

const formatPrice = (price) => {
  let st = price.toString();
  return st.substring(0, st.length - 18) + '.' + st.substring(st.length - 18, st.length);
}
const main = async () => {
  for(const [name, info] of Object.entries(ctokens)) {
    const { address, wallet } = info;
    const { priceOracle, unitroller } = await loadFixture(priceOracleFixture);
    const price = await priceOracle.getUnderlyingPrice(address);
    console.log(`${name} Price:`, formatPrice(price));
    console.log('Account Liquidity in cents Pre Mint 1 Token:', formatPrice((await unitroller.getAccountLiquidity(wallet))[1]));
    await mint(price, address, wallet);
    console.log('Account Liquidity in cents Post Mint 1 Token:', formatPrice((await unitroller.getAccountLiquidity(wallet))[1]));
  }
}

main()

