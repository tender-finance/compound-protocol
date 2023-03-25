// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import {IComptroller} from './interfaces/Comptroller.sol';
import {ICToken} from './interfaces/CToken.sol';
import {IERC20} from './interfaces/Tokens.sol';
import {Addresses} from './helpers/Addresses.sol';
import {GlpHelper} from './helpers/GlpHelper.sol';
// import './../../lib/forge-std/src/console2.sol';

interface ChainlinkPriceOracle {
  function latestAnswer() external view returns (uint256);
  function decimals() external view returns (uint8);
}

contract TenderPriceOracle is Addresses, GlpHelper, Ownable {
  using SafeMath for uint256;

  mapping(IERC20 => ChainlinkPriceOracle) public Oracles;

  constructor() {
    // assign the oracle for underlyingPrice to the symbol for each market
    Oracles[USDT]  = ChainlinkPriceOracle(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7);
    Oracles[USDC]  = ChainlinkPriceOracle(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3);
    Oracles[LINK]  = ChainlinkPriceOracle(0x86E53CF1B870786351Da77A57575e79CB55812CB);
    Oracles[FRAX]  = ChainlinkPriceOracle(0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8);
    Oracles[WBTC]  = ChainlinkPriceOracle(0x6ce185860a4963106506C203335A2910413708e9);
    Oracles[wETH]  = ChainlinkPriceOracle(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612);
    Oracles[UNI]   = ChainlinkPriceOracle(0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720);
    Oracles[DAI]   = ChainlinkPriceOracle(0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB);
    Oracles[GMX]   = ChainlinkPriceOracle(0xDB98056FecFff59D032aB628337A4887110df3dB);
  }

  function setOracle(IERC20 underlying, ChainlinkPriceOracle oracle) public onlyOwner {
    Oracles[underlying] = oracle;
  }

  function getUnderlying (ICToken ctoken) public view returns (IERC20) {
    return (ctoken != tETH) ? ctoken.underlying() : wETH;
  }

  function getUnderlyingDecimals(ICToken ctoken) public view returns (uint) {
    return IERC20(getUnderlying(ctoken)).decimals();
  }

  function _getUnderlyingPrice (ICToken ctoken) internal view returns (uint) {
    if(ctoken.isGLP()) {
      return getGlpPrice();
    }
    ChainlinkPriceOracle oracle = Oracles[getUnderlying(ctoken)];
    require(address(oracle) != address(0), 'Oracle not found for address');
    // scale to USD value with 18 decimals
    uint totalDecimals = 36-oracle.decimals();
    return oracle.latestAnswer().mul(10**(totalDecimals-getUnderlyingDecimals(ctoken)));
  }

  function getUnderlyingPrice(ICToken ctoken) public view returns (uint) {
    return _getUnderlyingPrice(ctoken);
  }

  function getOracleDecimals(IERC20 token) public view returns (uint) {
    ChainlinkPriceOracle oracle = Oracles[token];
    require(address(oracle) != address(0), 'Oracle not found for address');
    return oracle.decimals();
  }
  // this will not be correct for compound but is used by vault for borrow calculations
  function getUSDPrice(IERC20 token) public view returns (uint) {
    if (address(token) == address(fsGLP)) {
      return getGlpPrice();
    }
    ChainlinkPriceOracle oracle = ChainlinkPriceOracle(Oracles[token]);
    require(address(oracle) != address(0), 'Oracle not found for address');
    return oracle.latestAnswer();
  }
}
