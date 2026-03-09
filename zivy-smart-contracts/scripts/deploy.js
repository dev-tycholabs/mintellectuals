const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const network = hre.network.name;
  let usdtAddress;

  if (network === "sepolia") {
    // Custom USDT on Sepolia for Zivy smart wallet & coin pegging
    usdtAddress = "0xd077A400968890Eacc75cdc901F0356c943e4fDb";
    console.log("Using Sepolia testnet USDT:", usdtAddress);
  } else if (network === "avalanche") {
    // Real USDT on Avalanche C-Chain
    usdtAddress = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
    console.log("Using Avalanche USDT:", usdtAddress);
  } else {
    throw new Error(`No USDT address configured for network: ${network}`);
  }

  // Deploy ZivyCoinFactory
  console.log("\nDeploying ZivyCoinFactory...");
  const Factory = await hre.ethers.getContractFactory("ZivyCoinFactory");
  const factory = await Factory.deploy(usdtAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ZivyCoinFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n--- Deployment Summary ---");
  console.log("Network:          ", network);
  console.log("Deployer:         ", deployer.address);
  console.log("USDT:             ", usdtAddress);
  console.log("ZivyCoinFactory:  ", factoryAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
