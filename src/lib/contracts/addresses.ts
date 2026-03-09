// Deployed contract addresses on Sepolia testnet
export const CONTRACTS = {
    USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
    ZIVY_COIN_FACTORY: "0x326F056B2eDc56fbf0A2417d71DD21183EC0F4aB",
} as const;

export const CHAIN_ID = 11155111; // Sepolia
export const CHAIN_NAME = "Sepolia";
