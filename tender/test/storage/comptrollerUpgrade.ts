import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";
import {deployComptroller} from '../deploy/comptroller';

const main = async () => {
  const unitroller = await deployComptroller();
  const extAddress = '0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE';
  const admin = await ethers.getImpersonatedSigner(await unitroller.admin())
}
main()
