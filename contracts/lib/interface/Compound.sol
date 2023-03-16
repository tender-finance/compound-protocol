// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface Comptroller{
  function oracle() external view returns (address);
  function markets(address) external view returns (
    bool isListed,
    uint collateralFactorMantissa,
    uint liquidationThresholdMantissa,
    uint collateralFactorMantissaVip,
    uint liquidationThresholdMantissaVip,
    bool isComped,
    bool isPrivate,
    bool onlyWhitelistedBorrow
  );
  function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
  function exitMarket(address cToken) external returns (uint);
  function addToMarketExternal(address cToken, address borrower) external;
  function mintAllowed(address cToken, address minter, uint mintAmount) external returns (uint);
  function mintVerify(address cToken, address minter, uint mintAmount, uint mintTokens) external;
  function redeemAllowed(address cToken, address redeemer, uint redeemTokens) external returns (uint);
  function redeemVerify(address cToken, address redeemer, uint redeemAmount, uint redeemTokens) external;
  function borrowAllowed(address cToken, address borrower, uint borrowAmount) external returns (uint);
  function borrowVerify(address cToken, address borrower, uint borrowAmount) external;
  function getIsAccountVip(address account) external view returns (bool);
  function getAllMarkets() external view returns (address[] memory);
  function getAccountLiquidity(address account) external view returns (uint, uint, uint);
  function getHypotheticalAccountLiquidity(address account, address cTokenModify, uint redeemTokens, uint borrowAmount) external view returns (uint, uint, uint);
  function _setPriceOracle(address oracle_) external;
  function _supportMarket(address delegator, bool isComped, bool isPrivate, bool onlyWhitelistedBorrow) external;
  function _setFactorsAndThresholds(address delegator, uint collateralFactor, uint collateralVIP, uint threshold, uint thresholdVIP) external;
}

interface IERC20 {
  /** @dev Returns the amount of tokens in existence. */
  function totalSupply() external view returns (uint);
  function decimals() external view returns (uint8);
  function approve(address spender, uint amount) external;
  function transfer(address recipient, uint amount) external;
  function transferFrom(address sender, address recipient, uint amount) external;
  function balanceOf(address account) external view returns (uint);
  function allowance(address owner, address spender) external view returns (uint);
  function symbol() external view returns (string memory);
}

interface CERC20 is IERC20 {
  function underlying() external view returns (address);
  function mint(uint mintAmount) external returns (uint);
  function redeem(uint redeemTokens) external returns (uint);
  function redeemUnderlying(uint redeemAmount) external returns (uint); 
  function redeemUnderlyingForUser(uint redeemAmount, address user) external returns (uint); 
  function borrow(uint borrowAmount) external returns (uint);
  function repayBorrow(uint repayAmount) external returns (uint);
  function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
  function liquidateBorrow(address borrower, uint repayAmount, address cTokenCollateral) external returns (uint);
  function depositNFT(address _NFTAddress, uint _TokenID) external;
  function withdrawNFT(address _NFTAddress, uint _TokenID) external;
  function compound() external returns (uint);
}

interface CToken is CERC20 {
  function isGLP() external view returns (bool);
  function allowance(address owner, address spender) external view returns (uint);
  function balanceOf(address owner) external view returns (uint);
  function balanceOfUnderlying(address owner) external returns (uint);
  function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint);
  function borrowRatePerBlock() external view returns (uint);
  function supplyRatePerBlock() external view returns (uint);
  function totalBorrowsCurrent() external returns (uint);
  function borrowBalanceCurrent(address account) external returns (uint);
  function borrowBalanceStored(address account) external view returns (uint);
  function exchangeRateCurrent() external returns (uint);
  function exchangeRateStored() external view returns (uint);
  function getCash() external view returns (uint);
  function accrueInterest() external returns (uint);
  function seize(address liquidator, address borrower, uint seizeTokens) external returns (uint);
}
