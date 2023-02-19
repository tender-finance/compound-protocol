// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./PriceOracle.sol";
import "./CErc20.sol";
import "hardhat/console.sol";

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

interface IVaultPriceFeed {
    function getPrice(address _token, bool _maximise, bool _includeAmmPrice, bool _useSwapPricing) external view returns (uint256);
    
}

interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */

    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface GlpManager{
    function getAumInUsdg(bool maximise) external view returns (uint256);
}

interface GmxTokenPriceOracle{
    function latestAnswer() external view returns (uint256);
}
contract GMXPriceOracle is PriceOracle {
    using SafeMath for uint256;
    
    IERC20 public glpToken = IERC20(0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258);
    GlpManager public glpManager = GlpManager(0x321F653eED006AD1C29D174e17d96351BDe22649);
    IVaultPriceFeed public gmxPriceFeed = IVaultPriceFeed(0xa18BB1003686d0854EF989BB936211c59EB6e363);
    GmxTokenPriceOracle public gmxTokenPriceOracle = GmxTokenPriceOracle(0xDB98056FecFff59D032aB628337A4887110df3dB);
    IERC20 public weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
    IERC20 public tnd = IERC20(0xC47D9753F3b32aA9548a7C3F30b6aEc3B2d2798C);
    IERC20 public usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);
    address tndSwapEth = 0x552acE6BC7347A3D88BbbDEC4da831E621F66bd5;
    address tndSwapUsdc = 0x88B553F99bf8Cc6c18435C0c19D4d9B433d83645;

    function _getUnderlyingAddress(CToken cToken) private view returns (address) {
        address asset;
        if (compareStrings(cToken.symbol(), "tETH")) {
            asset = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        } else {
            asset = address(CErc20(address(cToken)).underlying());
        }
        return asset;
    }
    
    function getGlpSupply() public view returns (uint256) {
        return glpToken.totalSupply();
    }
    function getGlpAum() public view returns (uint256) {
        return glpManager.getAumInUsdg(true);
    }
    function getAssetPrice(address asset) public view returns (uint256) {
        return gmxPriceFeed.getPrice(asset, true, true, true).div(100);
    }
    function getGmxPrice() public view returns (uint256) {
        return gmxTokenPriceOracle.latestAnswer().mul(1e20);
    }
    function getTndPrice() public view returns (uint256) {
      // uint256 tndPerEth = tnd.balanceOf(tndSwap).mul(1e18).div(weth.balanceOf(tndSwap));
      uint256 price = usdc.balanceOf(tndSwapUsdc).mul(1e18).div(tnd.balanceOf(tndSwapUsdc));
      console.log('price: %d', price);
      return price;
    }
    
    function getUnderlyingPrice(CToken cToken) public override view returns (uint) {
        if(cToken.isGLP()){
            return getGlpAum().mul(1e18).div(glpToken.totalSupply());   
        } else if(compareStrings(cToken.symbol(), "tGMX")){
            return getGmxPrice().mul(1e10);
        } else if(compareStrings(cToken.symbol(), "tTND")){
            return getTndPrice().mul(1e20);
        } else {
            IERC20 underlying = IERC20(_getUnderlyingAddress(cToken));
            uint256 decimals = underlying.decimals();
            uint256 defaultDecimals = 18;
            return gmxPriceFeed.getPrice(_getUnderlyingAddress(cToken), true, true, false).div(1e30).mul(10**(defaultDecimals.sub(decimals).add(defaultDecimals)));
        }
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
