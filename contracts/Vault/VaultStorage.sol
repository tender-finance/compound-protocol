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
import 'hardhat/console.sol';
// import '../../lib/forge-std/src/console2.sol';

contract VaultStorage is Addresses {
  IERC20 public depositToken;
  CToken public targetMarket;
  CToken public vaultToken;
  TenderPriceOracle oracle;

  uint public collateralFactor;

  uint256 public fee = 1e16; // 1% fee to cover glp minting

  address[] public markets;

  // IWETH9 public constant WETH = IWETH9(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);

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
    IERC20(tokenIn).approve(address(swapRouter), amount);
    console.log('swapping %d', amount);
    IV3SwapRouter.ExactInputSingleParams memory params =
      IV3SwapRouter.ExactInputSingleParams({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: 3000,
        recipient: address(this),
        amountIn: amount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      });
    amountOut = swapRouter.exactInputSingle(params);
  }
}

contract VaultHelper is VaultStorage, TokenSwap {
  using SafeMath for uint;

  function getUnderlying(address ctoken) public view returns (address) {
    return (ctoken == tETH) ? wETH : CToken(ctoken).underlying();
  }

  function usdgAmounts(address token) public view returns (uint256){
    return glpVault.usdgAmounts(token); // weth 127657111,442541096364249993
  }

  function getAumInUsdg() public view returns (uint256){
    return glpManager.getAumInUsdg(true); // 428851069,305319770736134981
  }

  function calculateVaultPercentageCurrent(address token) public view returns (uint256){
    return usdgAmounts(token).mul(1e18).div(getAumInUsdg());
  }

  function calculateVaultPercentageTarget(address token) public view returns (uint256){
    return usdgAmounts(token).mul(1e18).div(getAumInUsdg());
  }

  function getGlpPrice() public view returns (uint256){
    return oracle.getGlpAum().mul(1e18).div(glp.totalSupply());
  }

  function getUnderlyingPrice(address ctoken) public view returns (uint256) {
    return oracle.getUnderlyingPrice(CToken(ctoken));
  }

  function calculateLeverageMultiplier() public view returns (uint) {
    uint totalValueThreshold = 1e18;
    uint maxValue = 100;
    uint totalValueDividend = totalValueThreshold.sub(collateralFactor).div(1e16);
    return maxValue.div(totalValueDividend);
  }
  function calculateLeveragedTotal(uint amount) public view returns (uint) {
    return amount.mul(calculateLeverageMultiplier());
  }
  //get borrow usd total for a deposit amount
  function calculateBorrowUSDTotal(uint amount) public view returns (uint) {
    uint price = oracle.getUSDPrice(address(depositToken));
    uint total = amount.mul(calculateLeverageMultiplier()-1).mul(price).div(1e18);
    return total;
  }

  function borrowTokenUSD(address ctoken, uint256 amountUsd) internal {
    // this calculation is fucked, you need to review it carefully
    uint underlyingDecimals = oracle.getUnderlyingDecimals(CToken(ctoken));
    uint256 tokenBorrowAmount = amountUsd
      .mul(1e18)
      .div(oracle.getUSDPrice(getUnderlying(ctoken)))
      .mul(10**underlyingDecimals)
      .div(1e18);
    console.log('Borrow amount for %s: %d', IERC20(getUnderlying(ctoken)).symbol(), tokenBorrowAmount);
    CToken(ctoken).borrow(tokenBorrowAmount);
  }

  receive() external payable {}

  function wrapEth () internal returns (uint) {
    uint balancePrior = IERC20(wETH).balanceOf(address(this));
    IWETH9(wETH).deposit{value:address(this).balance}();
    return IERC20(wETH).balanceOf(address(this)).sub(balancePrior);
  }

  function borrowAndSwap(address ctoken, uint toBorrowUSD) internal returns (uint wEthIncrease) {
  }

  function approveVaultToken(uint amount) internal {
    IERC20 approver = (depositToken == fsGlp) ? stakedGlp : depositToken;
    return approver.approve(address(vaultToken), amount);
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
}

