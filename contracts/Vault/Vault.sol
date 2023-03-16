// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SafeMath.sol";
import './VaultStorage.sol';
import 'hardhat/console.sol';

contract Vault is ReentrancyGuard, Ownable, VaultHelper {
  using SafeMath for uint;
  mapping(address => uint) public depositBalance;
  mapping(address => uint) public glpBalance;
  mapping(address => uint) public accountLiquidity;
  mapping(address => uint) public vaultTokenBalances;

  /*
  * @param depositToken_ address of the token to be deposited
  * @param targetMarket_ address of the cToken market borrowed funds will be minted to
  * @param vaultToken_ address of special market used to increase borrow limits for only the vault
  * @param collateralFactor_ liquidation threshold for the vault (90% is 90e16)
  * @dev Deposited funds will be minted to vaultToken
  * @dev Borrowed funds will be minted to targetMarket
  * @dev Important: targetMarket and vaultToken underlying and *MUST* be depositToken
  */
  constructor (IERC20 depositToken_, CToken targetMarket_, CToken vaultToken_) {
    depositToken = depositToken_;
    targetMarket = targetMarket_;
    vaultToken = vaultToken_;
    (,collateralFactor,,,,,,) = comptroller.markets(address(vaultToken));
    oracle =  TenderPriceOracle(address(comptroller.oracle()));
    markets = [
      tUSDT,
      // tUSDC,
      tETH,
      tWBTC,
      tDAI,
      tLINK,
      tUNI
    ];
  }

  function setMarkets(address[] memory markets_) public onlyOwner {
    markets = markets_;
  }

  function setVaultToken(CToken vaultToken_) public onlyOwner {
    vaultToken = vaultToken_;
  }

  function setFee(uint256 _fee) public onlyOwner {
    fee = _fee;
  }

  function getFeeAmount(uint256 amount) public view returns (uint256) {
    return fee.mul(amount).div(1e18);
  }

  function mintApprovals(address token, uint amount) internal {
    IERC20(token).approve(address(glpRouter), amount);
    IERC20(token).approve(address(glpManager), amount);
    IERC20(token).approve(address(fsGlp), amount);
    IERC20(token).approve(address(glp), amount);
  }

  function mintForAccount(address account, address token, uint256 amount) internal {
    // mintApprovals(token, amount);
    // glpRouter.mintAndStakeGlp(token, amount, 0, 0);
  }

  function deposit(uint256 amount) public nonReentrant {
    require(
      IERC20(depositToken).balanceOf(msg.sender) >= amount,
      "Transfer amount exceeds balance"
    );
    if (depositToken == IERC20(fsGlp)) {
      require(
        IERC20(stakedGlp).allowance(msg.sender, address(this)) >= amount,
        "Transfer amount exceeds allowance"
      );
      IERC20(stakedGlp).transferFrom(msg.sender, address(this), amount);
    } else {
      require(
        IERC20(stakedGlp).allowance(msg.sender, address(this)) >= amount,
        "Transfer amount exceeds allowance"
      );
      IERC20(depositToken).transferFrom(msg.sender, address(this), amount);
    }
    (,uint currentLiquidity, uint currentShortfall) = Comptroller(unitroller).getAccountLiquidity(address(this));
    mintVaultToken(amount);
    depositBalance[msg.sender] += amount-getFeeAmount(amount);
    (,uint newLiquidity, uint newShortfall) = Comptroller(unitroller).getAccountLiquidity(address(this));

    /*
      Check if the increase in liquidity is greater than or equal to any existing shortfall
      Y: Add the old shortfall balance to any new (liquidity >= 0), as liquidity would be 0 if shortfall > 0;
      N: Add the decrease in shortfall after mint to the new (liquidity == 0)
    */
    uint shortfallReduction = (newShortfall ==  0 && currentShortfall > 0)
      ? currentShortfall
      : currentShortfall-newShortfall;

    uint liquidityIncrease = newLiquidity-currentLiquidity;

    accountLiquidity[msg.sender] += liquidityIncrease.add(shortfallReduction);
  }

  function borrowAndMint() public nonReentrant {
    /*
      TODO: Ensure that the vault will not be held accountable for losses after withdrawls
        1. ensure that 90%% of the of the underlying value of the vGLP tokens has been borrowed against
        2. send the depositer all vGLP tokens worth the value of the collateral they deposited
    */
    console.log('liquidity %s', accountLiquidity[msg.sender]);
    uint borrowTotal = calculateBorrowUSDTotal(accountLiquidity[msg.sender]);
    for (uint i = 0; i < markets.length; i++) {
      address ctoken = markets[i];

      address underlying = getUnderlying(address(ctoken));
      uint256 vaultPercent = calculateVaultPercentageCurrent(underlying);
      uint256 toBorrowUSD = borrowTotal.mul(vaultPercent).div(1e18);

      accountLiquidity[msg.sender] -= borrowAndSwap(address(ctoken), borrowTotal);
      borrowTokenUSD(address(ctoken), toBorrowUSD);
      uint wEthIncrease = (address(ctoken) == tETH)
        ? wrapEth()
        : swap(underlying, wETH, IERC20(underlying).balanceOf(address(this)));
      accountLiquidity[msg.sender] -= wEthIncrease.mul(oracle.getUSDPrice(wETH)).div(1e18);
      console.log('New Collateral Balance: %d', accountLiquidity[msg.sender]);
    }
    IERC20(wETH).approve(address(glpRouter), IERC20(wETH).balanceOf(address(this)));
    IERC20(wETH).approve(address(glpManager), IERC20(wETH).balanceOf(address(this)));
    glpRouter.mintAndStakeGlp(wETH, IERC20(wETH).balanceOf(address(this)), 0, 0);
    console.log(fsGlp.balanceOf(address(this)));
  }
}
