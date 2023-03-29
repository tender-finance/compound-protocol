// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Addresses } from './../helpers/Addresses.sol';
import { ICToken } from './../interfaces/CToken.sol';
import { IERC20 } from './../interfaces/Tokens.sol';
import {IV3SwapRouter} from "./../interfaces/IV3SwapRouter.sol";
import {console2} from "./../../../lib/forge-std/src/console2.sol";
import "../../../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
// import { IWETH } from './../helpers/'

contract TokenSwap {
  IV3SwapRouter public immutable swapRouter = IV3SwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

  function swap(address tokenIn, address tokenOut, uint256 amount) internal returns (uint256 amountOut) {
    IERC20(tokenIn).approve(address(swapRouter), amount);
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

contract Handler is Addresses, TokenSwap, ReentrancyGuard {
  using SafeMath for uint;
  bool public isCToken = true;
  ICToken public destination = tfsGLP;

  function getUnderlying(ICToken ctoken) public view returns (IERC20) {
    return (ctoken == tETH) ? wETH : ICToken(ctoken).underlying();
  }

  function mintGlpApprovals(address token, uint amount) internal {
  }

  function mintGlp(IERC20 token, uint256 amount) internal returns (uint) {
    token.approve(address(glpRouter), amount);
    token.approve(address(glpManager), amount);
    token.approve(address(fsGLP), amount);
    token.approve(address(glpToken), amount);
    token.approve(address(stakedGlp), amount);
    uint currentBalance = fsGLP.balanceOf(address(this));
    glpRouter.mintAndStakeGlp(address(token), amount, 0, 0);
    uint mintedBalance = fsGLP.balanceOf(address(this)).sub(currentBalance);
    return mintedBalance;
  }
  // function deposit(uint amount, uint leverage) public nonReentrant {
  //   require(msg.sender == tx.origin, 'Error: msg.sender != tx.origin');
  //   IERC20 underlying = getUnderlying(destination);
  //   underlying.transferFrom(msg.sender, address(this), amount);
  //   destination.mint(amount);
  // }

  function borrowAndMintForUser (ICToken cToken, uint amount, uint leverage) public nonReentrant {
    console2.log('handler tfsGLP: %d', tfsGLP.balanceOf(address(this)));
    console2.log('wallet tfsGLP: %d', tfsGLP.balanceOf(address(msg.sender)));
    console2.log('msg.sender: %s', msg.sender);
    console2.log('tx.origin: %s', tx.origin);
    require(msg.sender == tx.origin, 'Error: msg.sender != tx.origin');
    IERC20 underlying = cToken.underlying();
    // underlying.transferFrom(msg.sender, address(this), amount);
    amount = amount.mul(leverage-1);
    cToken.borrow(amount);
    // THIS IS PROBLEM, ACCOUNT LIQUIDITY NOT UPDATING BUT BORROW BALANCE IS
    console2.log('tusdc borrow %d', tUSDC.borrowBalanceStored(address(this)));
    console2.log('tusdc borrow wallet %d', tUSDC.borrowBalanceStored(msg.sender));
    (uint liq, uint short,) = unitroller.getAccountLiquidity(msg.sender);
    console2.log("liq wallet: %s", liq);
    console2.log("short wallet: %s", short);

    console2.log('usdc %d', underlying.balanceOf(address(this)));

    swap(address(underlying), address(wETH), amount);
    console2.log('handler wETH: %d', wETH.balanceOf(address(this)));
    uint mintAmount = mintGlp(wETH, wETH.balanceOf(address(this)));
    console2.log('handler Glp: %d', fsGLP.balanceOf(address(this)));
    stakedGlp.approve(address(tfsGLP), mintAmount);
    fsGLP.approve(address(tfsGLP), mintAmount);
    tfsGLP.mint(amount);
    console2.log('handler tfsGLP: %d', tfsGLP.balanceOf(address(this)));
    console2.log('wallet tfsGLP: %d', tfsGLP.balanceOf(address(msg.sender)));

    // underlying.approve();
    // address tokenIn, address tokenOut, uint256 amount
    // cToken.mint(amount);
  }
  receive() external payable {}
}
