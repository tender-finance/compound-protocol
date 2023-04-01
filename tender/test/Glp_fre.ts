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
import { IERC20, CERC20, CTOKENS, GMXREWARD } from "./utils/constants";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deploy } from "./deploy/cdelegators";
import { deployComptroller } from "./deploy/comptroller";

const provider = new ethers.providers.Web3Provider(hreProvider as any);
// USE THE DELEGATOR FILE INSTEAD OF THE CETHER AND CERC20!!!!

const tests = [
  {
    symbol: "tfsGLP",
    borrowAmount: 1,
    walletAddress: "0x52134afB1A391fcEEE6682E51aedbCD47dC55336",
  },
];

let tToken: Contract;
let uToken: Contract;
let comptroller: Contract;
let wallet: JsonRpcSigner;
let uBalanceProvider: Contract | JsonRpcProvider;

describe("Erc20", () => {
  for (let test of tests) {
    describe(test.symbol, () => {
      const glpFixture = async () => {
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

      describe("Borrow", () => {
        it("Shouldn't be allowed to borrow", async () => {
          const { tToken, uToken, comptroller, admin } = await loadFixture(
            glpFixture
          );
          expect(
            await comptroller.callStatic.borrowAllowed(
              tToken.address,
              test.walletAddress,
              0
            )
          ).to.eq(18);
        });

        it("Shouldn't be able to borrow", async () => {
          const { tToken, uToken, comptroller, admin } = await loadFixture(
            glpFixture
          );
          await expect(tToken.borrow(test.borrowAmount)).to.be.reverted;
        });
      });

      describe("signalTransfer", () => {
        it("Should signalTransfer if no funds being supplied", async () => {
          const { tToken, uToken, comptroller, admin } = await loadFixture(
            glpFixture
          );
          //expect(await tToken.totalSupply()).to.eq(0);
          //console.log(await tToken.compoundGlp());
          console.log(await tToken.totalSupply());
          console.log(await tToken.totalReserves());
          console.log(await uToken.balanceOf(tToken.address));
          //console.log(tToken.address);
          const emptyWallet = await getWallet(
            ethers.Wallet.createRandom().address,
            provider
          );
          const admin = await getWallet(await tToken.admin(), provider);
          //console.log(await tToken.balanceOf(emptyWallet._address));
          await tToken.connect(admin)._signalTransfer(emptyWallet._address);
          //console.log(await tToken.glpRewardRouter());
          //console.log(tToken.address);
          //console.log(uToken.address);
          const rewardRouterAdress = await tToken.glpRewardRouter();
          console.log(rewardRouterAdress);
          const rewardRouter = new ethers.Contract(
            rewardRouterAdress,
            await getAbiFromArbiscan(rewardRouterAdress),
            emptyWallet
          );
          //console.log(await uToken.balanceOf(tToken.address));
          //console.log(await rewardRouter.pendingReceivers(tToken.address));
          //console.log(await rewardRouter.pendingReceivers(admin._address));
          //console.log(
          await rewardRouter.pendingReceivers(emptyWallet._address);
          //);
          await rewardRouter
            .connect(emptyWallet)
            .acceptTransfer(tToken.address);
          //console.log(await tToken.balanceOf(emptyWallet.address));
        });

        it("Shouldn't signalTransfer if funds being supplied", async () => {
          const { tToken, uToken, comptroller, admin } = await loadFixture(
            glpFixture
          );
          expect(await uToken.balanceOf(tToken.address)).to.not.be.eq(0);

          const emptyWallet = await getWallet(
            ethers.Wallet.createRandom().address,
            provider
          );
          const admin = await getWallet(await tToken.admin(), provider);

          const rewardRouterAdress = await tToken.glpRewardRouter();
          const rewardRouter = new ethers.Contract(
            rewardRouterAdress,
            await getAbiFromArbiscan(rewardRouterAdress),
            emptyWallet
          );

          await rewardRouter
            .connect(admin)
            .signalTransfer(emptyWallet._address);

          await expect(
            rewardRouter.connect(emptyWallet).acceptTransfer(tToken.address)
          ).to.be.revertedWith("RewardRouter: transfer not signalled");
        });
      });
    });
  }
});

/*
  const fundWithEth = async (receiver) => {
    const [ethWallet] = await ethers.getSigners();
    await ethWallet.sendTransaction({
      to: receiver,
      value: ethers.utils.parseEther("1.0"),
    });
  };
  */
