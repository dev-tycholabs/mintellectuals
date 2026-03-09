/**
 * Utility to encrypt a seed phrase for use as PLATFORM_WALLET_ENCRYPTED_SEED.
 *
 * Usage:
 *   npx tsx scripts/encrypt-seed.ts "your twelve word seed phrase goes here ..."
 *
 * Make sure WALLET_ENCRYPTION_KEY is set in your environment (or .env.local).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { encryptSeedPhrase } from "../src/lib/wallet";

const seed = process.argv[2];
if (!seed) {
    console.error("Usage: npx tsx scripts/encrypt-seed.ts \"your seed phrase here\"");
    process.exit(1);
}

console.log(encryptSeedPhrase(seed));
