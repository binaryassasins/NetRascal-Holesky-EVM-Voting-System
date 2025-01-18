import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.ADMIN_PRIVATE_KEY_LOCAL || !process.env.ADMIN_PRIVATE_KEY_METAMASK) {
  throw new Error("ADMIN_PRIVATE_KEY environment variable is not set");
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ]
  },
  networks: {
    localganache: {
      url: process.env.PROVIDER_URL_LOCAL,
      accounts: [process.env.ADMIN_PRIVATE_KEY_LOCAL],
    },
    holesky: {
      url: process.env.PROVIDER_URL_HOLESKY,
      accounts: [process.env.ADMIN_PRIVATE_KEY_METAMASK]
    },
  },
};  

export default config;
