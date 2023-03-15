import '@nomiclabs/hardhat-ethers';
import hre, { ethers } from 'hardhat';
import { formatAmount, fundWithEth } from './util'
import { numToWei } from "./utils/ethUnitParser";
import { readFileSync, writeFileSync } from "fs";
import {CTOKENS} from "./hh/CTOKENS"
import {deploy} from './deployVGLP';

const unitrollerAddress = '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e'
const glpSupplier = '0x236F233dBf78341d25fB0F1bD14cb2bA4b8a777c'

const getUnitroller = async () => {
  return await hre.ethers.getContractAt(
    "contracts/Compound/Comptroller.sol:Comptroller",
    unitrollerAddress,
  );
}

const get_sGLP = async () => {
  return await hre.ethers.getContractAt(
    'CErc20',
    '0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE',
  );
}
const get_fsGLP = async () => {
  return await hre.ethers.getContractAt(
    'CErc20',
    '0x1aDDD80E6039594eE970E5872D247bf0414C8903',
  );
}
const get_tfsGLP = async () => {
  return await ethers.getContractAt(
    'CErc20Delegate',
    '0xFF2073D3810754D6da4783235c8647e11e43C943',
  );
}
const main = async () => {
  const wallet = await ethers.getImpersonatedSigner(glpSupplier);
  await fundWithEth(wallet.address);
  const fsGlp = await get_fsGLP();
  const sglp = await get_sGLP();
  const tfsGlp = await get_tfsGLP();
  const { vault: vault, vaultToken: vGlp } = await deploy();

  await sglp.connect(wallet).approve(tfsGlp.address, await fsGlp.balanceOf(wallet.address));
  await sglp.connect(wallet).approve(vGlp.address, await fsGlp.balanceOf(wallet.address));

  const mint_tfsGLP = async () => {
    const balance = await fsGlp.balanceOf(wallet.address);
    console.log('fsglp pre mint:', balance.toString());
    console.log('tfsglp pre mint:', await tfsGlp.balanceOf(wallet.address));
    await tfsGlp.connect(wallet).mint(balance);
    console.log('fsglp post mint:', await fsGlp.balanceOf(wallet.address));
    console.log('tfsglp post mint:', await tfsGlp.balanceOf(wallet.address));
  }

  const mint_vGLP = async () => {
    const balance = await fsGlp.balanceOf(wallet.address);
    console.log('fsglp pre mint:', balance.toString());
    console.log('vglp pre mint:', await vGlp.balanceOf(wallet.address));
    await vGlp.connect(wallet).mint(balance);
    console.log('fsglp post mint:', await fsGlp.balanceOf(wallet.address));
    console.log('vglp post mint:', await vGlp.balanceOf(wallet.address));
  }

  const balance = await fsGlp.balanceOf(wallet.address);
  await sglp.connect(wallet).approve(vault.address, await fsGlp.balanceOf(wallet.address));
  await fsGlp.connect(wallet).approve(vault.address, await fsGlp.balanceOf(wallet.address));
  await vault.connect(wallet).deposit(balance);
}

main()
