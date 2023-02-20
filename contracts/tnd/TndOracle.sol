// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import "../Compound/SafeMath.sol";
import "hardhat/console.sol";

interface SwapMockToken {
  function decimals() external view returns (uint256);
}
interface UniswapV3Pair {
  function slot0 () external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool);
  function token0() external view returns (address);
  function token1() external view returns (address);
}

contract TndOracle {
  using SafeMath for uint256;
  using SafeMath for uint160;
  UniswapV3Pair pair = UniswapV3Pair(0x88B553F99bf8Cc6c18435C0c19D4d9B433d83645);
  function pow(uint256 base, uint256 exponent) public pure returns (uint256) {
    return base ** exponent;
  }
  function getTndPrice () public view returns (uint256) {
    uint256 decimals0 = SwapMockToken(pair.token0()).decimals();
    uint256 decimals1 = SwapMockToken(pair.token1()).decimals();
    (uint160 sqrtPriceX96,,,,,,) = pair.slot0();
    uint256 numerator = pow(sqrtPriceX96, 2).mul(pow(10, 30));
    uint256 denominator = pow(2, 192);
    uint256 price = numerator.div(denominator);
    console.log('price: %d', price);
    return price;
  }
}
