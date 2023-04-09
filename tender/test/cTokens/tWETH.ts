import "@nomiclabs/hardhat-ethers";
import hre, {ethers} from "hardhat";
import { formatAmount } from "../util";
import { numToWei } from "../utils/ethUnitParser";
import { resolve } from "path";
import {deployToken} from '../utils/deploy-cdelegator';

const verifyContract = async () => {
  await hre.run("verify:verify", {
    contract: "contracts/JumpRateModelV2Gmx.sol:JumpRateModelV2Gmx",
    address: "0x242f91207184FCc220beA3c9E5f22b6d80F3faC5",
    constructorArguments: [
      '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e',
      '0xc2933EfF32188e4655887cDC9c707A77E1229595',
      '200000000000000000000000000',
      'tWETH',
      'tWETH',
      8,
      false,
      '0x85aBbC0f8681c4fB33B6a3A601AD99E92A32D1ac',
      '0x4dA255e7f6498b75fd1F46bE8AbAB627Bf5f147C',
      Buffer.from([0x0])
    ]
  });
};

verifyContract()
