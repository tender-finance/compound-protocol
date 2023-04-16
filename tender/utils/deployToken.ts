import { formatAmount } from "../test/utils";

export const token = {
  underlying: '0xF19547f9ED24aA66b03c3a552D181Ae334FBb8DB',
  name: 'tLODE',
  symbol: 'tLODE',
  decimals: 8,
  isGLP: false,
}


// collateralFactor: formatAmount("60", 16).toString(),
// collateralVIP: formatAmount("65", 16).toString(),
// threshold: formatAmount("85", 16).toString(),
// thresholdVIP: formatAmount("90", 16).toString(),
//
// function addToMarkets(delegator: any) {
//   let isPrivate = false;
//   let isComped = true;
//   let onlyWhitelistedBorrow = false;
//   console.log('_supportMarket');
//   console.log([
//     delegator.address,
//     isComped,
//     isPrivate,
//     onlyWhitelistedBorrow
//   ]);
//
//   console.log('_setFactorsAndThresholds');
//   console.log([
//     delegator.address,
//     token.collateralFactor,
//     token.collateralVIP,
//     token.threshold,
//     token.thresholdVIP
//   ]);
// }
// addToMarkets({
//   address: '0x4180f39294c94F046362c2DBC89f2DF7786842c3'
// });
