// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/Pyth.sol";

contract PythOracle {

  Pyth pyth = Pyth(0xff1a0f4744e8582DF1aE09D5611b887B6a12925C);
  bytes32 public id;
  constructor (bytes32 _id) {
    id = _id;
  }

  function decimals() public view returns (uint) {
    PythStructs.Price memory priceStruct = pyth.queryPriceFeed(id).price;
    return (priceStruct.expo > 0)
      ? uint(uint32(priceStruct.expo))
      : uint(uint32(-priceStruct.expo));
  }

  function latestAnswer() public view returns (uint) {
    PythStructs.Price memory priceStruct = pyth.queryPriceFeed(id).price;
    return (priceStruct.price > 0)
      ? uint(uint64(priceStruct.price))
      : uint(uint64(-priceStruct.price));
  }

}
