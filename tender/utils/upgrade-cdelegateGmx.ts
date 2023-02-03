import hre from "hardhat";

const contracts = {
  "tGmx": "0x20a6768f6aabf66b787985ec6ce0ebea6d7ad497",
  // "tWBTC": "0xde131f422585927c5d19879ee22241678273b155",
  // "tUSDC": "0xB1087a450373BB26BCf1A18E788269bde9c8fc85",
  // "tUSDT": "0xAd2fB9A27Fd46865BBa1d2954BD0700e7428Dfb7",
  
}

const allowResign = true
const data = Buffer.from([0x0])
const implementation = "0x746641873664cD7BdC334eb608eBa3E56861417A"


export async function main() {

  for (let key in contracts) {
    await setAddress(key, contracts[key], implementation);
  }
}

async function setAddress(symbol: string, address: string, implementation: string) {
  const delegator = await hre.ethers.getContractAt("CErc20DelegatorGmx", address);

  console.log("setting implementation on", symbol, address, "to", implementation)
  
  await delegator._setImplementation(implementation, allowResign, data)

  console.log("Set implementation")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
