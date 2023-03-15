// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import {CToken, Comptroller} from "./../lib/interface/Compound.sol";
import {Addresses} from "./../lib/Addresses.sol";
import {TransferHelper} from "./../lib/TransferHelper.sol";
import {IVault} from "./interfaces/IVault.sol";
import {SafeMath} from "./SafeMath.sol";
import {IV3SwapRouter} from "./../lib/interface/IV3SwapRouter.sol";
import {GlpManager, GlpRewardRouter, IERC20} from "./interfaces/GMX.sol";
import {TenderPriceOracle} from "./../Compound/TenderPriceOracle.sol";
import {IWETH9} from "./../lib/IWETH9.sol";
import "hardhat/console.sol";

contract VaultStorage is Addresses {
  IERC20 public depositToken;
  CToken public targetMarket;
  CToken public vaultToken;
  TenderPriceOracle oracle;

  uint public collateralFactor;

  uint256 public fee = 1e16; // 1% fee to cover glp minting

  address[] public markets;

  IWETH9 public constant WETH = IWETH9(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);

  IERC20 public glp = IERC20(0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258);
  IERC20 public fsGlp = IERC20(0x1aDDD80E6039594eE970E5872D247bf0414C8903);
  IERC20 public stakedGlp = IERC20(0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE);
  CToken public ctokenGlp = CToken(0xFF2073D3810754D6da4783235c8647e11e43C943);

  Comptroller public comptroller = Comptroller(unitroller);

  IVault public glpVault = IVault(0x489ee077994B6658eAfA855C308275EAd8097C4A);
  GlpManager public glpManager = GlpManager(0x3963FfC9dff443c2A94f21b129D429891E32ec18);
  GlpRewardRouter public glpRouter = GlpRewardRouter(0xB95DB5B167D75e6d04227CfFFA61069348d271F5);
}

contract TokenSwap {
  IV3SwapRouter public immutable swapRouter = IV3SwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
  function swap(address tokenIn, address tokenOut, uint256 amount) internal returns (uint256 amountOut) {
    TransferHelper.safeApprove(tokenIn, address(swapRouter), amount);
    bytes memory path = abi.encodePacked(tokenIn, tokenOut);

    IV3SwapRouter.ExactInputParams memory
      params = IV3SwapRouter.ExactInputParams({
        path: path,
        recipient: address(this),
        amountIn: amount,
        amountOutMinimum: 0
      });
    // The call to `exactInput` executes the swap.
    amountOut = swapRouter.exactInput(params);
  }
}
contract VaultHelper is VaultStorage, TokenSwap {
  using SafeMath for uint;
  function getUnderlying(address ctoken) public view returns (address) {
    if(ctoken == tETH) {
      return wETH;
    }
    return CToken(ctoken).underlying();
  }
  function usdgAmounts(address token) public view returns (uint256){
    return glpVault.usdgAmounts(token); // weth 127657111,442541096364249993
  }

  function getAumInUsdg() public view returns (uint256){
    return glpManager.getAumInUsdg(true); // 428851069,305319770736134981
  }

  function calculateVaultPercentage(address token) public view returns (uint256){
    return usdgAmounts(token).mul(1e18).div(getAumInUsdg());
  }

  function getGlpPrice() public view returns (uint256){
    TenderPriceOracle oracle = TenderPriceOracle(comptroller.oracle());
    return oracle.getGlpAum().mul(1e18).div(glp.totalSupply());
  }

  function getUnderlyingPrice(address ctoken) public view returns (uint256) {
    TenderPriceOracle oracle = TenderPriceOracle(comptroller.oracle());
    return oracle.getUnderlyingPrice(CToken(ctoken));
  }

  function proportion(uint a, uint b) public pure returns (uint256) {
    return a.mul(1e18).div(b);
  }

  function calculateLeverageMultiplier() public view returns (uint) {
    uint totalValueThreshold = 1e18;
    return totalValueThreshold.sub(collateralFactor).div(1e17);
  }
  function calculateLeveragedTotal(uint amount) public view returns (uint) {
    return amount.mul(calculateLeverageMultiplier());
  }
  //get borrow usd total for a deposit amount
  function calculateBorrowUSDTotal(uint amount) public view returns (uint) {
    uint price = oracle.getUSDPrice(address(depositToken));
    return amount.mul(calculateLeverageMultiplier()-1).mul(price).div(1e18);
  }

  function borrowTokenUSD(address ctoken, uint256 amountUsd) internal {
    uint256 tokenBorrowAmount = amountUsd
      .mul(1e18)
      .div(oracle.getUSDPrice(getUnderlying(ctoken)));
    CToken(ctoken).borrow(tokenBorrowAmount);
  }

  receive() external payable {
    glpRouter.mintAndStakeGlpEth(msg.value, 0, 0);
  }

  function borrowAndSwap(uint borrowTotal) internal {
    // TenderPriceOracle oracle = TenderPriceOracle(comptroller.oracle());
    for (uint i = 0; i < markets.length; i++) {
      CToken ctoken = CToken(markets[i]);
      // uint underlyingDecimals = oracle.getUnderlyingDecimals(ctoken);
      address underlying = getUnderlying(address(ctoken));
      uint256 vaultPercent = calculateVaultPercentage(underlying);
      uint256 toBorrowInUSD = borrowTotal.mul(vaultPercent).div(1e18);
      borrowTokenUSD(address(ctoken), toBorrowInUSD);
      if (address(ctoken) != tETH) {
        swap(underlying, wETH, IERC20(underlying).balanceOf(address(this)));
      } else if (address(ctoken) == tETH){
        uint256 ethBalance = address(this).balance;
        WETH.deposit{value:ethBalance}();
      }

      // uint256 usdPerToken = oracle.getUSDPrice(underlying).mul(10**underlyingDecimals).div(1e18);
      // uint toBorrow = toBorrowInUSD.mul(10**underlyingDecimals).div(usdPerToken);
      // console.log("borrowing %s", toBorrow);
      // CERC20(address(ctoken)).borrow(toBorrow);
    }
  }

  function approveVaultToken(uint amount) internal {
    if (address(depositToken) == address(fsGlp)) {
      return stakedGlp.approve(address(vaultToken), amount);
    }
    return depositToken.approve(address(vaultToken), amount);
  }

  function mintVaultToken(uint amount) internal {
    approveVaultToken(amount);
    vaultToken.mint(amount);
  }

  function getTokenBorrowLimit (address account, address ctoken) public view returns (uint256) {
    (,uint256 collateralFactorCToken,,,,,,) = comptroller.markets(ctoken);
    uint256 ctokenBalance = CToken(ctoken).balanceOf(account);
    uint256 exchangeRate = CToken(ctoken).exchangeRateStored();
    uint256 underlyingDecimals = IERC20(getUnderlying(ctoken)).decimals();
    uint256 tokens = ctokenBalance.mul(exchangeRate).div(underlyingDecimals+18);
    return tokens.mul(collateralFactorCToken).div(1e18);
  }

  function getTokenBorrowLimitUsd (address account, address ctoken) public view returns (uint256) {
    uint underlyingPrice = getUnderlyingPrice(ctoken);
    return getTokenBorrowLimit(account, ctoken).mul(underlyingPrice).div(1e18);
  }

  // function getTotalBorrowable(address account) public view returns (uint256) {
  //   address[] memory markets = comptroller.getAllMarkets();
  //   uint256 borrowable = 0;
  //   for (uint i = 0; i < markets.length; i++) {
  //     address ctoken = markets[i];
  //     uint256 borrowLimitUsd = getTokenBorrowLimitUsd(account, ctoken);
  //     uint256 borrowBalanceStored = CToken(ctoken).borrowBalanceStored(account);
  //     uint256 underlyingPrice = getUnderlyingPrice(ctoken);
  //     uint256 currentBorrow = borrowBalanceStored.mul(underlyingPrice).div(1e18);
  //
  //     borrowable += borrowLimitUsd.sub(currentBorrow);
  //   }
  //   return borrowable;
  // }
}

