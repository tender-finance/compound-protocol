// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {CToken, Comptroller} from './../lib/interface/Compound.sol';
import "./../lib/interface/IERC20.sol";
import "./../lib/Addresses.sol";

interface GlpManager{
  function getAumInUsdg(bool maximise) external view returns (uint256);
}

interface ChainLinkPriceOracle {
  function latestAnswer() external view returns (uint256);
  function decimals() external view returns (uint8);
}

contract TenderPriceOracle is Addresses, Ownable {
  using SafeMath for uint256;
  mapping(address => address) public Oracles;
  mapping(address => uint) public vaultLeverages;
  mapping(address => bool) public vaultTokens;

  IERC20 public glpToken = IERC20(0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258);
  GlpManager public glpManager = GlpManager(0x321F653eED006AD1C29D174e17d96351BDe22649);
  address public fsGLP = 0x1aDDD80E6039594eE970E5872D247bf0414C8903;

  constructor(address[] memory _vaultTokens) {
    // assign the oracle for underlyingPrice to the symbol for each market
    Oracles[USDT]  = 0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7;
    Oracles[USDC]  = 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3;
    Oracles[LINK]  = 0x86E53CF1B870786351Da77A57575e79CB55812CB;
    Oracles[FRAX]  = 0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8;
    Oracles[WBTC]  = 0x6ce185860a4963106506C203335A2910413708e9;
    Oracles[wETH]  = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    Oracles[UNI]   = 0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720;
    Oracles[DAI]   = 0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB;
    Oracles[GMX]   = 0xDB98056FecFff59D032aB628337A4887110df3dB;

    Oracles[tUSDT] = Oracles[USDT];
    Oracles[tUSDC] = Oracles[USDC];
    Oracles[tLINK] = Oracles[LINK];
    Oracles[tFRAX] = Oracles[FRAX];
    Oracles[tWBTC] = Oracles[WBTC];
    Oracles[tETH]  = Oracles[wETH];
    Oracles[tUNI]  = Oracles[UNI];
    Oracles[tDAI]  = Oracles[DAI];
    Oracles[tGMX]  = Oracles[GMX];

    for(uint i = 0; i < _vaultTokens.length; i++){
      vaultTokens[_vaultTokens[i]] = true;
    }
  }

  function addVaultToken(address vaultToken_) public onlyOwner {
    vaultTokens[vaultToken_] = true;
  }

  function stringToBytes (string memory s) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(s));
  }

  function getGlpSupply() public view returns (uint256) {
    return glpToken.totalSupply();
  }

  function getGlpAum() public view returns (uint256) {
    return glpManager.getAumInUsdg(true);
  }

  function getGlpPrice() public view returns (uint256) {
    // Formula taken from GLP docs
    return getGlpAum().mul(1e18).div(getGlpSupply());
  }

  function isVaultToken(CToken ctoken) public view returns (bool) {
    return vaultTokens[address(ctoken)];
  }

  function getVaultLeverage(CToken ctoken) public view returns (uint) {
    (,uint256 collateralFactorCToken,,,,,,) = Comptroller(unitroller).markets(address(ctoken));
    return(100/(100-collateralFactorCToken.div(1e16)));
    // return ;
  }

  function getUnderlyingDecimals(CToken ctoken) public view returns (uint) {
    if(stringToBytes(ctoken.symbol()) == stringToBytes("tETH")) {
      return 18;
    }
    address underlying = CToken(address(ctoken)).underlying();
    return IERC20(underlying).decimals();
  }

  function _getUnderlyingPrice (CToken ctoken) internal view returns (uint) {
    if(ctoken.isGLP()) {
      return getGlpPrice();
    }
    ChainLinkPriceOracle oracle = ChainLinkPriceOracle(Oracles[address(ctoken)]);
    require(address(oracle) != address(0), 'Oracle not found for address');
    // scale to USD value with 18 decimals
    return oracle.latestAnswer().mul(10**(28-getUnderlyingDecimals(ctoken)));
  }

  function getUnderlyingPrice(CToken ctoken) public view returns (uint) {
    if(isVaultToken(ctoken)){
      return _getUnderlyingPrice(ctoken).mul(getVaultLeverage(ctoken));
    }
    return _getUnderlyingPrice(ctoken);
  }

  // this will not be correct for compound but is used by vault for borrow calculations
  function getUSDPrice(address token) public view returns (uint) {
    if (token == address(fsGLP)) {
      return getGlpPrice();
    }
    ChainLinkPriceOracle oracle = ChainLinkPriceOracle(Oracles[token]);
    require(address(oracle) != address(0), 'Oracle not found for address');
    return oracle.latestAnswer().mul(1e10);
  }
}
