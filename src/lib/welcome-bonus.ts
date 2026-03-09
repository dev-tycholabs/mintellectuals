import { Interface, parseUnits } from "ethers";
import WalletManagerEvmErc4337 from "@tetherto/wdk-wallet-evm-erc-4337";
import { decryptSeedPhrase } from "@/lib/wallet";
import { CONTRACTS } from "@/lib/contracts";
import { MockUSDTABI } from "@/lib/contracts/abis/MockUSDT";

const WELCOME_BONUS_USDT = "2"; // 2 USDT for every new user

const walletConfig = {
    chainId: 11155111,
    provider: "https://sepolia.drpc.org",
    bundlerUrl: "https://public.pimlico.io/v2/11155111/rpc",
    paymasterUrl: "https://public.pimlico.io/v2/11155111/rpc",
    paymasterAddress: "0x777777777777AeC03fd955926DbF81597e66834C",
    entryPointAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    safeModulesVersion: "0.3.0" as const,
    paymasterToken: {
        address: CONTRACTS.USDT,
    },
    transferMaxFee: 100000,
};

const usdtInterface = new Interface(MockUSDTABI as readonly object[]);

/**
 * Transfer 2 USDT from the platform wallet to a newly registered user's wallet.
 * Runs fire-and-forget style — failures are logged but don't block signup.
 */
export async function transferWelcomeBonus(recipientAddress: string): Promise<{ success: boolean; hash?: string }> {
    const encryptedSeed = process.env.PLATFORM_WALLET_ENCRYPTED_SEED;
    if (!encryptedSeed || encryptedSeed === "your-encrypted-seed-phrase-here") {
        console.warn("Welcome bonus skipped: PLATFORM_WALLET_ENCRYPTED_SEED not configured");
        return { success: false };
    }

    const seedPhrase = decryptSeedPhrase(encryptedSeed);
    const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

    try {
        const account = await wallet.getAccount(0);

        // USDT has 6 decimals
        const rawAmount = parseUnits(WELCOME_BONUS_USDT, 6);
        const data = usdtInterface.encodeFunctionData("transfer", [recipientAddress, rawAmount]);

        const result = await account.sendTransaction({
            to: CONTRACTS.USDT,
            value: BigInt(0),
            data,
        });

        // Poll for confirmation (up to ~2 minutes)
        for (let i = 0; i < 30; i++) {
            const receipt = await account.getUserOperationReceipt(result.hash);
            if (receipt) {
                console.log(`Welcome bonus of ${WELCOME_BONUS_USDT} USDT sent to ${recipientAddress} — tx: ${result.hash}`);
                return { success: true, hash: result.hash };
            }
            await new Promise((r) => setTimeout(r, 4000));
        }

        // Timed out but tx may still land
        console.log(`Welcome bonus tx submitted (unconfirmed) for ${recipientAddress} — tx: ${result.hash}`);
        return { success: true, hash: result.hash };
    } catch (error) {
        console.error(`Welcome bonus transfer failed for ${recipientAddress}:`, error);
        return { success: false };
    } finally {
        wallet.dispose();
    }
}
