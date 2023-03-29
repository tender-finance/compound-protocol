// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {ComptrollerInterface} from 'contracts/Compound/ComptrollerInterface.sol';
import {InterestRateModel} from 'contracts/Compound/InterestRateModel.sol';
import {CErc20Delegator} from 'contracts/Compound/CErc20Delegator.sol';
import {CErc20Delegate} from 'contracts/tender/glp-vault/CErc20Delegate.sol';
import "contracts/lib/interface/IGmxRewardRouter.sol";
import "contracts/tender/interfaces/Tokens.sol";
import "contracts/tender/helpers/Addresses.sol";
import "contracts/tender/glp-vault/Handler.sol";
import "./../../../lib/forge-std/src/Test.sol";

contract VaultTest is Addresses, Test {
  CErc20Delegate public delegate;
  address payable admin;
  Handler handler;
  function setUp() public {
    vm.deal(0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2, 1e18);

    // admin = fsGlpDelegator.admin();

    // vm.startPrank(admin);

    // vm.stopPrank();
  }
  function printLiquidity() public view {
    (uint liq, uint short,) = unitroller.getAccountLiquidity(address(handler));
    console2.log("liq handler: %s", liq);
    console2.log("short handler: %s", short);
    (liq, short,) = unitroller.getAccountLiquidity(address(0x80b54e18e5Bb556C6503e1C6F655749c9e41Da));
    console2.log("liq wallet: %s", liq);
    console2.log("short wallet: %s", short);
  }
  function testHandler () public {
    CErc20Delegator fsGlpDelegator = CErc20Delegator(payable(address(tfsGLP)));
    CErc20Delegator tUSDCDelegator = CErc20Delegator(payable(address(tUSDC)));
    vm.startPrank(0x80b54e18e5Bb556C6503e1C6F2655749c9e41Da2);
    printLiquidity();

    delegate = new CErc20Delegate();
    console2.log("delegate %s", address(delegate));
    fsGlpDelegator._setImplementation(address(delegate), true, '');
    tUSDCDelegator._setImplementation(address(delegate), true, '');
    // vm.startPrank();
    Handler handler = new Handler();
    console2.log("handler %s", address(handler));

    uint amount = 1000e6;
    handler.borrowAndMintForUser(tUSDC, amount, 10);
    (uint liq, uint short,) = unitroller.getAccountLiquidity(address(0x80b54e18e5Bb556C6503e1C6F655749c9e41Da));
    console2.log("liq wallet: %s", liq);
    console2.log("short wallet: %s", short);
    printLiquidity();
    // vm.stopPrank();
  }
}
