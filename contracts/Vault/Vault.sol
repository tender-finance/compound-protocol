// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SafeMath.sol";
import './VaultStorage.sol';
import "hardhat/console.sol";

contract Vault is ReentrancyGuard, Ownable, VaultHelper {
  using SafeMath for uint;
  mapping(address => uint256) public depositBalance;
  mapping(address => uint256) public glpBalance;
  mapping(address => uint256) public borrowableBalance;
  mapping(address => uint256) public vaultTokenBalances;

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
      // tETH,
      tUSDC,
      tWBTC,
      tDAI,
      tLINK,
      tUNI,
      tUSDT
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
    // console.log('approving');
    // mintApprovals(token, amount);
    // console.log('minting');
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
    address account = msg.sender;
    uint vaultTokenBalance = vaultToken.balanceOf(address(this));
    uint balance = fsGlp.balanceOf(address(this));
    mintVaultToken(amount);
    uint vaultTokensForAccount = vaultToken.balanceOf(address(this))-vaultTokenBalance;
    uint collateralBalance = amount-getFeeAmount(amount);
    vaultTokenBalances[account] += vaultTokensForAccount;
    uint borrowTotal = calculateBorrowUSDTotal(collateralBalance);
    borrowAndSwap(borrowTotal);
    console.log('borrowed USDC:', IERC20(USDC).balanceOf(address(this)));
    // depositBalance[account] += collateralBalance;
    // uint totalValueWithLeverage = calculateLeveragedTotal(amount);
    //
    // uint increase = fsGlp.balanceOf(address(this)).sub(balance);
    // uint256 borrowablePre = getTotalBorrowable(address(this));
    // borrowableBalance[account] += getTotalBorrowable(address(this)) - borrowablePre;
    // glpBalance[account] += increase;
  }

  function loop(uint256 leverage) public nonReentrant {
    loopLeverage(msg.sender, leverage);
  }

  function loopLeverage(address account, uint leverage) internal {
  }

  function getGlpBalance(address account) public view returns (uint256) {
    return glpBalance[account];
  }
}
