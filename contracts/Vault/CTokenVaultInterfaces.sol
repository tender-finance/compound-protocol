// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./../Compound/CTokenInterfaces.sol";
import "./../Compound/ComptrollerInterface.sol";
import "./../Compound/InterestRateModel.sol";
import "./../Compound/EIP20NonStandardInterface.sol";
import "./../Compound/ErrorReporter.sol";
import "./../lib/interface/IGmxRewardRouter.sol";
import "./../lib/interface/IStakedGlp.sol";
import "./../lib/interface/IRewardTracker.sol";

contract CErc20VaultStorage {
    /**
     * @notice Underlying asset for this CToken
     */
    address public underlying;

    address public vault;
}

abstract contract CErc20VaultInterface is CErc20VaultStorage {
    function mint(uint mintAmount) virtual external returns (uint);
    function redeem(uint redeemTokens) virtual external returns (uint);
    function redeemUnderlying(uint redeemAmount) virtual external returns (uint); 
    function borrow(uint borrowAmount) virtual external returns (uint);
    function repayBorrow(uint repayAmount) virtual external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) virtual external returns (uint);
    function liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) virtual external returns (uint);
    function sweepToken(EIP20NonStandardInterface token) virtual external;
    function _addReserves(uint addAmount) virtual external returns (uint);
}
