const { ethers } = require("hardhat");

/**
 * Query the expert (owner) and platform addresses of a deployed ZivyCoin on Sepolia.
 *
 * Usage:
 *   npx hardhat run test/query-owner-sepolia.js --network sepolia
 */
async function main() {
  const COIN_ADDRESS = "0x426eb84f88c5c3a333f3e90ccce999a1639be43a";

  const coin = await ethers.getContractAt("ZivyCoin", COIN_ADDRESS);

  const [expert, platform, name, symbol, totalSupply] = await Promise.all([
    coin.expert(),
    coin.platform(),
    coin.name(),
    coin.symbol(),
    coin.totalSupply(),
  ]);

  console.log("=== ZivyCoin Info ===");
  console.log("Address:      ", COIN_ADDRESS);
  console.log("Name:         ", name);
  console.log("Symbol:       ", symbol);
  console.log("Expert (owner):", expert);
  console.log("Platform:     ", platform);
  console.log("Total Supply: ", ethers.formatEther(totalSupply));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
