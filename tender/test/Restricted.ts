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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { COMPTROLLER_ADMIN, IERC20, CERC20, CTOKENS } from "./utils/constants";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deploy } from "./deploy/cdelegators";
import { deployComptroller } from "./deploy/comptroller";

const provider = new ethers.providers.Web3Provider(hreProvider as any);
// USE THE DELEGATOR FILE INSTEAD OF THE CETHER AND CERC20!!!!

const tests = [
  {
    symbol: "tUSDC",
    contractName: "CErc20",
    mintAmount: "1",
    walletAddress: "0x52134afB1A391fcEEE6682E51aedbCD47dC55336",
  },
  {
    symbol: "tUSDC",
    contractName: "CErc20",
    mintAmount: "1",
    nftContract: "0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f",
    walletAddress: "0x5C5aBb7047b27c70ABec5a840f3D0C4c7759Ce8F",
  },
];

let tToken: Contract;
let uToken: Contract;
let comptroller: Contract;
let wallet: JsonRpcSigner;
let admin: JsonRpcSigner;
let uBalanceProvider: Contract | JsonRpcProvider;

describe("Erc20", () => {
  before(async () => {
    resetNetwork();
  });

  after(async () => {
    resetNetwork();
  });

  for (let test of tests) {
    describe(test.symbol, () => {
      const restrictedFixture = async () => {
        await deploy("arbitrum");
        await deployComptroller("arbitrum");
        wallet = await getWallet(test.walletAddress, provider);
        const deployments = getDeployments("hardhat");

        const tToken = await ethers.getContractAt(
          CERC20,
          deployments[test.symbol]
        );
        const uToken = await ethers.getContractAt(
          IERC20,
          await tToken.underlying()
        );

        const comptrollerAddress = deployments["Unitroller"];
        const comptroller = await (
          await ethers.getContractFactory("Comptroller")
        ).attach(comptrollerAddress);

        const admin = await getWallet(await comptroller.admin(), provider);

        comptroller = comptroller.connect(admin);

        return { tToken, uToken, comptroller, admin };
      };

      if (test["mintAmount"]) {
        describe("Mint", () => {
          it("Should be able to mint private market if vip", async () => {
            const { tToken, uToken, comptroller, admin } = await loadFixture(
              restrictedFixture
            );

            await comptroller.setMarketVariables(
              tToken.address,
              true,
              false,
              false
            );

            const tBalanceBefore = await tToken.balanceOf(wallet._address);
            const uBalanceBefore = await uToken.balanceOf(wallet._address);

            await comptroller
              .connect(admin)
              .setWhitelistedUser(test.walletAddress, true);

            await uToken
              .connect(wallet)
              .approve(tToken.address, test.mintAmount);

            await tToken.connect(wallet).mint(test.mintAmount);

            const tBalanceAfter = await tToken.balanceOf(wallet._address);
            const uBalanceAfter = await uToken.balanceOf(wallet._address);

            expect(tBalanceAfter).to.be.gt(tBalanceBefore);
            expect(uBalanceAfter).to.be.lt(uBalanceBefore);
          });

          it("Shouldn't be able to mint private market if not vip", async () => {
            const { tToken, uToken, comptroller, admin } = await loadFixture(
              restrictedFixture
            );

            await comptroller.setMarketVariables(
              tToken.address,
              true,
              false,
              false
            );

            await comptroller
              .connect(admin)
              .setWhitelistedUser(test.walletAddress, false);

            await uToken
              .connect(wallet)
              .approve(tToken.address, test.mintAmount);

            await expect(
              tToken.connect(wallet).mint(test.mintAmount)
            ).to.be.revertedWith("this market is currently private");
          });
        });
      }
      if (test["nftContract"]) {
        if (test["mintAmount"]) {
          describe("Mint", () => {
            it("Should be able to mint private market if own NFT", async () => {
              const { tToken, uToken, comptroller, admin } = await loadFixture(
                restrictedFixture
              );
              await comptroller.setVipNft(test.nftContract);

              expect(
                await comptroller.getIsAccountVip(test.walletAddress)
              ).to.eq(true);
            });
          });
        }
      }
    });
  }
});
