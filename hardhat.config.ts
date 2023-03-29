import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import '@nomicfoundation/hardhat-foundry'
import { HardhatUserConfig } from "hardhat/config";

import {
  ARBITRUM_RPC,
  ETHERSCAN_API_KEY,
  PRIVATE_KEY,
} from './.env.json'

// import * as tdly from "@tenderly/hardhat-tenderly";
// import { existsSync } from "fs";
// function getHomeDir() { return process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"]; }
// if (existsSync(`${getHomeDir()}/.tenderly/config.yaml`)) {
//   tdly.setup({
//     automaticVerifications: true, // automatically verifies contracts !!
//   });
// }

const config: HardhatUserConfig = {
  networks: {
    arbitrum: {
      url: ARBITRUM_RPC,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: ARBITRUM_RPC,
      accounts: [PRIVATE_KEY],
    },
    ropsten: {
      url: process.env["ROPSTEN_RPC"] || "https://ropsten.infura.io/v3/",
      accounts: [PRIVATE_KEY],
    },
    metis: {
      url: process.env["METIS_RPC"] || "https://andromeda.metis.io/?owner=1088",
      accounts: [PRIVATE_KEY],
    },
    stardust: {
      url: "https://stardust.metis.io/?owner=588",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: ARBITRUM_RPC,
        enabled: true,
        blockNumber: 74402430,
      },
    },
  },

  etherscan: {
    apiKey: {
      arbitrumOne: ETHERSCAN_API_KEY,
    } 
  },
  
  solidity: {
    compilers: [
      {
        version: "0.8.10",
      },
      {
        version: "0.6.12",
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 20,
      },
    },
  },
  mocha: {
    timeout: 100000000,
  },
  paths: {
    tests: "tender/test",
  },
};

export default config;
