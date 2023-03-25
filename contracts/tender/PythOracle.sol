// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PythOracle {

  IPyth pyth = IPyth(0xff1a0f4744e8582DF1aE09D5611b887B6a12925C);
  bytes32 public id;

  constructor (bytes32 _id) {
    id = _id;
  }

  // We use getPriceUnsafe because someone immediately updates once out of date
  // A couple blocks isn't worth the confusion of random reverts for users
  function decimals() public view returns (uint) {
    PythStructs.Price memory priceStruct = pyth.getPriceUnsafe(id);
    return (priceStruct.expo > 0)
      ? uint(uint32(priceStruct.expo))
      : uint(uint32(-priceStruct.expo));
  }

  function latestAnswer() public view returns (uint) {
    PythStructs.Price memory priceStruct = pyth.getPriceUnsafe(id);
    require(priceStruct.price > 0, 'PythOracle: Invalid Price');
    return uint(uint64(priceStruct.price));
  }

}
