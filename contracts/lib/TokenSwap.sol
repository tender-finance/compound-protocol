// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import {TransferHelper} from "./../lib/TransferHelper.sol";
import {IV3SwapRouter} from "./../lib/interface/IV3SwapRouter.sol";

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
