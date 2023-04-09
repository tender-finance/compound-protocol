import "@nomiclabs/hardhat-ethers";
import hre, { artifacts, ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getDeployments } from "./utils/TestUtil";
import { formatAmount } from "./utils/TokenUtil";
import { CTOKENS, IERC20, CERC20 } from "./utils/constants";
import { expect } from "./utils/chai";
import BN = require("bn.js");
import {
  tfsGLP as tfsGLPAddress,
  tUSDC,
  tUNI
} from '../../deployments/arbitrum.json'

const network = hre.network
const provider = network.provider;
const cTokenGlpHolderAddress = '0xF6bFEc3BdF5098DfAC0E671EBCe06cBeAd7A958E';

const glpFixture = async () => {
  const setOtherDelegators = async () => {
    const walletAddress = '0x5314f6BDa6a1FD38D3cf779E445b52327e7c0C4a'
    const testDelegators = [tUSDC, tUNI]
    for (const delegator of testDelegators) {
      const cTokenContract = await upgradeDelegator(delegator, '0x4dA255e7f6498b75fd1F46bE8AbAB627Bf5f147C')
      const wallet = await ethers.getImpersonatedSigner(walletAddress)
      const uAddress = await cTokenContract.underlying()
      const uContract = await ethers.getContractAt('contracts/EIP20Interface.sol:EIP20Interface', uAddress, wallet)
      const uBalance = await uContract.balanceOf(wallet.address);
      await uContract.approve(cTokenContract.address, formatAmount('1000', 18))
      await cTokenContract.connect(wallet).mint(uBalance);
      console.log(await cTokenContract.balanceOf(wallet.address))
    }
  }
  await setOtherDelegators();
  // await deploy('arbitrum');

  // console.log('deploying delegate')
  console.log('setting implementation')
  const cTokenGlpContract = await upgradeDelegator(tfsGLPAddress, '0x4dA255e7f6498b75fd1F46bE8AbAB627Bf5f147C')
  const cTokenGlpAdmin = await getCTokenGlpAdmin(cTokenGlpContract)
  const cTokenGlpHolder = await getCTokenGlpHolder();
  await fundWithEth(cTokenGlpHolder.address);
  await fundWithEth(cTokenGlpAdmin.address);

  const stakedGlpContract = await getStakedGlpContract(cTokenGlpContract);
  // 100 = 1% fee
  const glpContract = await getUnderlyingContract(cTokenGlpContract);
  const wEthContract = await getWEthContract(cTokenGlpContract);
  await cTokenGlpContract.connect(cTokenGlpAdmin)._setAutocompoundRewards(false);
  await cTokenGlpContract.connect(cTokenGlpAdmin)._setAutoCompoundBlockThreshold(1);
  await cTokenGlpContract.connect(cTokenGlpAdmin)._setVaultFees(formatAmount('3', 2), formatAmount('15', 2));
  await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
  await stakedGlpContract.connect(cTokenGlpAdmin).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
  return {
    glpContract,
    stakedGlpContract,
    cTokenGlpContract,
    wEthContract,
    cTokenGlpAdmin,
    cTokenGlpHolder,
  };
}
describe("GLP", () => {
  describe("Set Vault Fees", () => {
    it("Should set performance and withdraw fees", async () => {
      const { cTokenGlpContract, cTokenGlpAdmin } = await loadFixture(glpFixture);
      await cTokenGlpContract.connect(cTokenGlpAdmin)._setVaultFees(formatAmount('2', 2), formatAmount('10', 2));
      const withdrawFee = await cTokenGlpContract.connect(cTokenGlpAdmin).withdrawFee()
      expect(formatAmount('2', 2).eq(withdrawFee)).true
      const performanceFee = await cTokenGlpContract.connect(cTokenGlpAdmin).performanceFee()
      expect(formatAmount('10', 2).eq(performanceFee)).true
    });
    it("Should respect maximum fees", async () => {
      const { cTokenGlpContract, cTokenGlpAdmin } = await loadFixture(glpFixture);
      await expect(
        cTokenGlpContract.connect(cTokenGlpAdmin)
        ._setVaultFees(
          formatAmount('3', 3),
          formatAmount('10', 3)
        )
      ).revertedWith('withdraw fee too high');
    });
  })
  describe("Performance Fee", () => {
    it("Should take Performace Fee out of compounded amount", async () => {
      const {
        glpContract,
        cTokenGlpContract,
        wEthContract,
        cTokenGlpHolder,
      } = await loadFixture(glpFixture);
      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('1', 18));
      // await cTokenGlpContract.connect(cTokenGlpAdmin).mint(formatAmount('1', 18));

      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'before compound')
      const adminWEth = await wEthContract.balanceOf(await cTokenGlpContract.admin());
      await network.provider.send("hardhat_mine", ["0x4e8", "0x4c"]);
      await cTokenGlpContract.connect(cTokenGlpHolder).compound();
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'after compound')

      expect(
        (await wEthContract.balanceOf(await cTokenGlpContract.admin()))
        .gt(adminWEth)
      ).true;
    });
  });
  describe("Withdrawal Fee", () => {
    it("Should take Withdrawal Fee out of withdrawn amount", async () => {
      const {
        glpContract,
        cTokenGlpContract,
        wEthContract,
        cTokenGlpHolder,
      } = await loadFixture(glpFixture);

      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('1', 18));
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'before redeem')
      const adminGlp = await glpContract.balanceOf(await cTokenGlpContract.admin());
      await cTokenGlpContract.connect(cTokenGlpHolder).redeemUnderlying(formatAmount('1', 18));
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'after redeem')
      console.log(adminGlp)
      expect(
        (await glpContract.balanceOf(await cTokenGlpContract.admin()))
        .gt(adminGlp)
      ).true;
    });
  });
  //check that errors when called from non admin
  describe("redeemUnderlyingForUser", () => {
    it("Should error when called by Non-Admin", async () => {
      const {
        stakedGlpContract,
        cTokenGlpContract,
        cTokenGlpAdmin,
        cTokenGlpHolder,
      } = await loadFixture(glpFixture);
      await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
      // await cTokenGlpContract.connect(cTokenGlpAdmin).mint(formatAmount('1', 18));
      await expect(
        cTokenGlpContract.connect(cTokenGlpHolder)
        .redeemUnderlyingForUser(
          formatAmount('1', 18),
          cTokenGlpAdmin.address
        )
      ).revertedWith('Only admin');
    });
    it("Admin should be able to redeem on user behalf", async () => {
      const {
        stakedGlpContract,
        cTokenGlpContract,
        cTokenGlpAdmin,
        cTokenGlpHolder,
      } = await loadFixture(glpFixture);
      await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('1', 18));
      const preRedeem = await cTokenGlpContract.balanceOf(cTokenGlpHolder.address);
      await cTokenGlpContract.connect(cTokenGlpAdmin).redeemUnderlyingForUser(formatAmount('1', 18), cTokenGlpHolder.address);
      const postRedeem = await cTokenGlpContract.balanceOf(cTokenGlpHolder.address);
      expect(postRedeem).bignumber.lt(preRedeem);
    })
  });
})

const logBalances = async (glpContract, cTokenGlpContract, wEthContract, time) => {
  console.log(`Glp Contract Underlying Balance ${time}`, await glpContract.balanceOf(cTokenGlpContract.address));
  console.log(`Glp Admin wEth ${time}`, await wEthContract.balanceOf(await cTokenGlpContract.admin()));
  console.log(`Glp Admin GLP ${time}`, await glpContract.balanceOf(await cTokenGlpContract.admin()));
}

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};

const getCTokenGlpHolder = async () => { return await ethers.getImpersonatedSigner(cTokenGlpHolderAddress) }
const getContractAdmin = async (contract: any) => {
  const adminAddress = await contract.admin()
  await fundWithEth(adminAddress);
  return await ethers.getImpersonatedSigner(await contract.admin());
}

const deployDelegate = async() => {
  const [defaultSigner] = await ethers.getSigners();
  const CErc20Delegate = await hre.ethers.getContractFactory("CErc20Delegate", defaultSigner);
  return await CErc20Delegate.deploy();
}

const upgradeDelegator = async (delegatorAddress: string, implementation: string) => {
  const [defaultSigner] = await ethers.getSigners();
  const delegator = await ethers.getContractAt('CErc20Delegator', delegatorAddress, defaultSigner)
  const admin = await getContractAdmin(delegator);
  await delegator.connect(admin)._setImplementation(implementation, true, Buffer.from([0x0]));
  return await ethers.getContractAt('CErc20Delegate', delegatorAddress, admin)
}

const getCTokenGlpContract = async (cTokenGlpDelegatorAddress) => {
  return await ethers.getContractAt(CERC20, cTokenGlpDelegatorAddress);
}
const getCTokenGlpAdmin = async (glpContract) => {
  return await ethers.getImpersonatedSigner(await glpContract.admin());
}
const getUnderlyingContract = async (glpContract) => {
  return await ethers.getContractAt(IERC20, await glpContract.underlying());
}
const getStakedGlpContract = async (glpContract) => {
  return await ethers.getContractAt(IERC20, await glpContract.stakedGLP());
}
const getWEthContract = async (glpContract) => {
  return await ethers.getContractAt(IERC20, await glpContract.WETH());
}

