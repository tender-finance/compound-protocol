//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {CToken, IERC20} from "./../../lib/interface/Compound.sol";

interface IVaultPriceFeed {
  function getPrice(address _token, bool _maximise, bool _includeAmmPrice, bool _useSwapPricing) external view returns (uint256);
}

interface GlpRewardRouter {
  function mintAndStakeGlp(address token, uint256 amount, uint256 minUsdg, uint256 minGlp) external;
  function mintAndStakeGlpEth(uint256 payableAmount, uint256 minUsdg, uint256 minGlp) external;
}
interface GlpManager {
  function getAumInUsdg(bool maximise) external view returns (uint256);
}

interface GmxTokenPriceOracle {
  function latestAnswer() external view returns (uint256);
}

interface GMXPriceOracle {
  function getGlpSupply() external view returns (uint256);
  function getGlpAum() external view returns (uint256);
  function getAssetPrice(address asset) external view returns (uint256);
  function getGmxPrice() external view returns (uint256);
  function getUnderlyingPrice(CToken cToken) external view returns (uint);
}

interface IGmxRewardRouter {
  function stakedGmxTracker() external view returns (address);
  function bonusGmxTracker() external view returns (address);
  function feeGmxTracker() external view returns (address);
  function stakedGlpTracker() external view returns (address);
  function feeGlpTracker() external view returns (address);
  function glpManager() external view returns (address);
  function handleRewards(
    bool _shouldClaimGmx,
    bool _shouldStakeGmx,
    bool _shouldClaimEsGmx,
    bool _shouldStakeEsGmx,
    bool _shouldStakeMultiplierPoints,
    bool _shouldClaimWeth,
    bool _shouldConvertWethToEth
  ) external;
  function signalTransfer(address _receiver) external;
  function mintAndStakeGlp(address _token, uint256 _amount, uint256 _minUsdg, uint256 _minGlp) external returns (uint256);
  function mintAndStakeGlpETH(uint256 _minUsdg, uint256 _minGlp) external payable returns (uint256);
  function stakeGmx(uint256 amount) external;
  function unstakeGmx(uint256 amount) external;
}
