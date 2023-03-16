// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;
import {ComptrollerInterface} from 'contracts/Compound/ComptrollerInterface.sol';
import {InterestRateModel} from 'contracts/Compound/InterestRateModel.sol';
import "./../../../lib/forge-std/src/console2.sol";
import {Vault} from 'contracts/Vault/Vault.sol';
import {CErc20DelegateVault} from 'contracts/Vault/CErc20Delegate.sol';
import {CErc20DelegatorVault} from 'contracts/Vault/CErc20Delegator.sol';
import {TenderPriceOracle} from 'contracts/Compound/TenderPriceOracle.sol';
import {Comptroller,CToken,IERC20} from 'contracts/lib/interface/Compound.sol';
import "contracts/lib/interface/IGmxRewardRouter.sol";
import "contracts/lib/interface/IStakedGlp.sol";
import "contracts/lib/interface/IRewardTracker.sol";
import "./../../../lib/forge-std/src/Test.sol";

contract VaultTest is Test {
  IERC20 sGlp = IERC20(0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE);
  IERC20 fsGlp = IERC20(0x1aDDD80E6039594eE970E5872D247bf0414C8903);

  CErc20DelegateVault public delegate;
  CErc20DelegatorVault public delegator;
  TenderPriceOracle public oracle;
  Vault public vault;
  CErc20DelegateVault public vaultToken;


  address payable public signer = payable(0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2);

  uint private immutable collateralFactor = 90e16;
  uint private immutable collateralVIP = 90e16;
  uint private immutable threshold = 95e16;
  uint private immutable thresholdVIP = 95e16;
  address private immutable irModel = 0xc2933EfF32188e4655887cDC9c707A77E1229595;
  uint totalDecimals = 18 + 8;
  uint private immutable initialExchRate = 2**totalDecimals;

  function deploy(address unitroller) public {
    vm.startPrank(signer);
    address[] memory vaultTokens = new address[](0);
    oracle = new TenderPriceOracle(vaultTokens);

    delegate = new CErc20DelegateVault();
    delegator = new CErc20DelegatorVault(
      0x1aDDD80E6039594eE970E5872D247bf0414C8903, //glp
      ComptrollerInterface(unitroller),
      InterestRateModel(irModel),
      initialExchRate,
      "vGLP",
      8,
      true,
      signer, //placeholder address for vault
      signer,
      address(delegate),
      ""
    );
    IStakedGlp stakedGLPAddress = IStakedGlp(0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE);
    IGmxRewardRouter glpRewardRouterAddress = IGmxRewardRouter(0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1);
    address glpManagerAddress = 0x3963FfC9dff443c2A94f21b129D429891E32ec18;
    address gmxToken = 0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a;
    IRewardTracker stakedGmxTracker = IRewardTracker(0x908C4D94D34924765f1eDc22A1DD098397c59dD4);
    address sbfGMX = 0xd2D1162512F927a7e282Ef43a362659E4F2a728F;

    CErc20DelegateVault proxy = CErc20DelegateVault(address(delegator));
    proxy._setGlpAddresses(
      stakedGLPAddress,
      glpRewardRouterAddress,
      glpManagerAddress,
      gmxToken,
      address(stakedGmxTracker),
      sbfGMX
    );

    vaultToken = CErc20DelegateVault(address(delegator));

    oracle.addVaultToken(address(vaultToken));

    bool isPrivate = false;
    bool isComped = true;
    bool onlyWhitelistedBorrow = true;
    Comptroller(unitroller)._supportMarket(address(delegator), isComped, isPrivate, onlyWhitelistedBorrow);

    Comptroller(unitroller)._setFactorsAndThresholds(
      address(delegator),
      collateralFactor,
      collateralVIP,
      threshold,
      thresholdVIP
    );
    Comptroller(unitroller)._setPriceOracle(address(oracle));
    vm.stopPrank();
  }

  // function setUp() public {
  // }

  function testDeposit() public {
    vm.deal(signer, 10 ether);
    deploy(0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e);
    vault = new Vault(
      IERC20(0x1aDDD80E6039594eE970E5872D247bf0414C8903),
      CToken(address(delegator)),
      CToken(0xFF2073D3810754D6da4783235c8647e11e43C943)
    );
    address glpSupplier = 0x236F233dBf78341d25fB0F1bD14cb2bA4b8a777c;
    vm.startPrank(glpSupplier);
    sGlp.approve(address(vault), 100e18);
    fsGlp.approve(address(vault), 100e18);
    vault.deposit(1e18);
  }
}
