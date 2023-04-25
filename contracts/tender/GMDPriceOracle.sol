// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import {IComptroller} from './interfaces/Comptroller.sol';
import {ICToken} from './interfaces/CToken.sol';
import {IERC20} from './interfaces/Tokens.sol';
import {Addresses} from './helpers/Addresses.sol';
import {GlpHelper} from './helpers/GlpHelper.sol';
import {ChainlinkPriceOracle} from './TenderPriceOracle.sol';
import {console} from 'hardhat/console.sol';


// Saul, [4/17/23 4:15 AM]
// GDpricetoStakedToken in readContract
//
// Saul, [4/17/23 4:15 AM]
// Pid 0 for usdc , 1 eth,2 btc, 4 usdt
interface IGMDVault {
  function GDpriceToStakedtoken (uint id) external view returns (uint);
}

interface IGMDPriceFeed {
  function latestAnswer() external view returns (uint256);
  function decimals() external view returns (uint8);
}
contract GMDPriceFeedFactory {
  mapping(uint => address) public idAssets;
  mapping(address => uint) public assetIds;
  mapping(uint => ChainlinkPriceOracle) underlyingOracles;
  mapping(IERC20 => IERC20) underlyings;
  IGMDVault public gmdVault = IGMDVault(0x8080B5cE6dfb49a6B86370d6982B3e2A86FBBb08);

  GMDPriceFeed[] public gmdPriceFeeds;

  constructor() {
    idAssets[0] = 0x3DB4B7DA67dd5aF61Cb9b3C70501B1BdB24b2C22; // gmdUSDC
    idAssets[1] = 0x1E95A37Be8A17328fbf4b25b9ce3cE81e271BeB3; // gmdETH
    idAssets[2] = 0x147FF11D9B9Ae284c271B2fAaE7068f4CA9BB619; // gmdBTC
    idAssets[4] = 0x34101Fe647ba02238256b5C5A58AeAa2e532A049; // gmdUSDT

    assetIds[0x3DB4B7DA67dd5aF61Cb9b3C70501B1BdB24b2C22] = 0; // gmdUSDC
    assetIds[0x1E95A37Be8A17328fbf4b25b9ce3cE81e271BeB3] = 1; // gmdETH
    assetIds[0x147FF11D9B9Ae284c271B2fAaE7068f4CA9BB619] = 2; // gmdBTC
    assetIds[0x34101Fe647ba02238256b5C5A58AeAa2e532A049] = 4; // gmdUSDT

    underlyingOracles[0] = ChainlinkPriceOracle(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3); // gmdUSDC
    underlyingOracles[1] = ChainlinkPriceOracle(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612);
    underlyingOracles[2] = ChainlinkPriceOracle(0x6ce185860a4963106506C203335A2910413708e9);
    underlyingOracles[4] = ChainlinkPriceOracle(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7);
    for(uint i = 0; i < 5; i++) {
      if (idAssets[i] != address(0)) {
        GMDPriceFeed gmdPriceFeed = new GMDPriceFeed(gmdVault, i, IERC20(idAssets[i]), underlyingOracles[i]);
        gmdPriceFeeds.push(gmdPriceFeed);
        console.log(gmdPriceFeed.latestAnswer());
      }
    }
  }
  function getGMDPriceFeed(uint id) public view returns (GMDPriceFeed) {
    return gmdPriceFeeds[id];
  }
}

contract GMDPriceFeed is ChainlinkPriceOracle {
  using SafeMath for uint;
  IGMDVault public gmdVault;
  IERC20 public gmdTokenAddr;
  IERC20 public underlyingAddress;
  ChainlinkPriceOracle public underlyingOracle;
  uint public gmdTokenId;

  constructor(
    IGMDVault _gmdVault,
    uint _gmdTokenId,
    IERC20 _gmdTokenAddr,
    ChainlinkPriceOracle _underlyingOracle
  ) {
    gmdVault = _gmdVault;
    gmdTokenId = _gmdTokenId;
    gmdTokenAddr = _gmdTokenAddr;
    underlyingOracle = _underlyingOracle;
  }

  function latestAnswer() public view returns (uint) {
    uint priceInUnderlying = gmdVault.GDpriceToStakedtoken(gmdTokenId);
    uint priceOfUnderlying = underlyingOracle.latestAnswer();
    uint underlyingOracleDecimals = underlyingOracle.decimals();
    return priceInUnderlying.mul(priceOfUnderlying).div(10**underlyingOracleDecimals);
  }

  function decimals() public pure returns (uint8) {
    return 18;
  }

  function token() public view returns (IERC20) {
    return gmdTokenAddr;
  }
}
