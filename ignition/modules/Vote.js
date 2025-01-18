const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account (admin):", deployer.address);

  // Deploy the contract
  const Vote = await hre.ethers.getContractFactory("Voting");
  const vote = await Vote.deploy();  // Deploy the contract

  console.log("Contract deployed to:", vote.target);

  // Wait for the contract to be mined and deployed
  await vote.deploymentTransaction().wait(1);  // This ensures the deployment transaction is confirmed

  console.log("Contract fully deployed and confirmed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
