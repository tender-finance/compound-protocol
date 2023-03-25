// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface CDelegateInterface {
  function implementation () external view returns (address);
  function _becomeImplementation(bytes memory data) external;
  function _resignImplementation() external;
}

interface CDelegatorInterface {
  function implementation () external view returns (address);
  event NewImplementation(address oldImplementation, address newImplementation);
  function _setImplementation(address implementation_, bool allowResign, bytes memory becomeImplementationData) external;
}
