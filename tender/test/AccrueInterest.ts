import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { CTokenContract, GmxTokenContract } from "./contract_helpers/Token";
import { ComptrollerContract } from "./contract_helpers/Comptroller";
import { OracleContract } from "./contract_helpers/PriceOracle";
import {
  getWallet,
  getAbiFromArbiscan,
  resetNetwork,
  getDeployments,
} from "./utils/TestUtil";
import * as hre from "hardhat";
//import * as ethers from "ethers";
import { Contract, BigNumber } from "ethers";
import { expect } from "chai";
import { formatAmount, getUnderlyingBalance } from "./utils/TokenUtil";
import * as tokenClasses from "./contract_helpers/Token";
const hreProvider = hre.network.provider;
import { COMPTROLLER_ADMIN, CERC20 } from "./utils/constants";
import { deploy } from "./deploy/cdelegators";
import { deployComptroller } from "./deploy/comptroller";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const provider = new ethers.providers.Web3Provider(hreProvider as any);

const tests = [
  // wallets with positions
  {
    address: "0x52134afB1A391fcEEE6682E51aedbCD47dC55336",
  },
];

for (let test of tests) {
  describe("accrue interest", () => {
    const interestFixture = async () => {
      await deploy("arbitrum");
      await deployComptroller("arbitrum");
      const deployments = getDeployments("hardhat");

      const comptrollerAddress = deployments["Unitroller"];
      const comptroller = await (
        await ethers.getContractFactory("Comptroller")
      ).attach(comptrollerAddress);

      const admin = await getWallet(await comptroller.admin(), provider);

      const comptroller = comptroller.connect(admin);
      return { comptroller };
    };

    it("Should accrue interest overtime", async () => {
      const { comptroller } = await loadFixture(interestFixture);

      let assets = await comptroller.getAssetsIn(test.address);

      for (let asset of assets) {
        const token = await hre.ethers.getContractAt(CERC20, asset);
        await token.accrueInterest();
      }

      await hre.network.provider.send("hardhat_mine", ["0x3e8", "0x3c"]);
      let before = await comptroller.getAccountLiquidity(test.address);

      let assets = await comptroller.getAssetsIn(test.address);

      for (let asset of assets) {
        const token = await hre.ethers.getContractAt(CERC20, asset);
        await token.accrueInterest();
      }

      let after = await comptroller.getAccountLiquidity(test.address);
      expect(before).not.eq(after);
    });
  });
}
