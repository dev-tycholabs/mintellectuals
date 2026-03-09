/**
 * Creates a new ERC-4337 platform wallet and outputs:
 *   - Seed phrase (back this up securely)
 *   - Wallet address (fund this with USDT + ETH)
 *   - Encrypted seed phrase (paste into .env.local as PLATFORM_WALLET_ENCRYPTED_SEED)
 *
 * Usage:
 *   npx tsx scripts/create-platform-wallet.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import WalletManagerEvmErc4337 from "@tetherto/wdk-wallet-evm-erc-4337";
import { encryptSeedPhrase } from "../src/lib/wallet";

const walletConfig = {
    chainId: 11155111,
    provider: "https://sepolia.drpc.org",
    bundlerUrl: "https://public.pimlico.io/v2/11155111/rpc",
    paymasterUrl: "https://public.pimlico.io/v2/11155111/rpc",
    paymasterAddress: "0x777777777777AeC03fd955926DbF81597e66834C",
    entryPointAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    safeModulesVersion: "0.3.0" as const,
    paymasterToken: {
        address: process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
    },
    transferMaxFee: 100000,
};

async function main() {
    const seedPhrase = WalletManagerEvmErc4337.getRandomSeedPhrase();
    const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

    try {
        const account = await wallet.getAccount(0);
        const address = await account.getAddress();
        const encrypted = encryptSeedPhrase(seedPhrase);

        console.log("\n=== Platform Wallet Created ===\n");
        console.log("Seed phrase (BACK THIS UP SECURELY):");
        console.log(seedPhrase);
        console.log("\nWallet address (fund this with USDT + ETH on Sepolia):");
        console.log(address);
        console.log("\nEncrypted seed (paste into .env.local as PLATFORM_WALLET_ENCRYPTED_SEED):");
        console.log(encrypted);
        console.log();
    } finally {
        wallet.dispose();
    }
}

main().catch(console.error);
