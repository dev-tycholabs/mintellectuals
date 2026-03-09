import { Interface, JsonRpcProvider, Contract, parseUnits } from "ethers";
import WalletManagerEvmErc4337 from "@tetherto/wdk-wallet-evm-erc-4337";
import { decryptSeedPhrase } from "@/lib/wallet";
import { CONTRACTS } from "./addresses";
import { ZivyCoinFactoryABI } from "./abis/ZivyCoinFactory";
import { MockUSDTABI } from "./abis/MockUSDT";

const walletConfig = {
    chainId: 11155111,
    provider: "https://sepolia.drpc.org",
    bundlerUrl: "https://public.pimlico.io/v2/11155111/rpc",
    paymasterUrl: "https://public.pimlico.io/v2/11155111/rpc",
    paymasterAddress: "0x777777777777AeC03fd955926DbF81597e66834C",
    entryPointAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    safeModulesVersion: "0.3.0" as const,
    paymasterToken: {
        address: process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xd077a400968890eacc75cdc901f0356c943e4fdb",
    },
    transferMaxFee: 100000,
};

const factoryInterface = new Interface(ZivyCoinFactoryABI as readonly object[]);
const usdtInterface = new Interface(MockUSDTABI as readonly object[]);

/**
 * Launch a personal coin for an expert via the ZivyCoinFactory contract.
 * Returns the UserOperation hash immediately without waiting for confirmation.
 */
export async function launchCoin(
    encryptedSeedPhrase: string,
    coinName: string,
    coinSymbol: string
): Promise<{ hash: string }> {
    const seedPhrase = decryptSeedPhrase(encryptedSeedPhrase);
    const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

    try {
        const account = await wallet.getAccount(0);

        const data = factoryInterface.encodeFunctionData("launchCoin", [
            coinName,
            coinSymbol,
        ]);

        const result = await account.sendTransaction({
            to: CONTRACTS.ZIVY_COIN_FACTORY,
            value: BigInt(0),
            data,
        });

        return { hash: result.hash };
    } finally {
        wallet.dispose();
    }
}




const provider = new JsonRpcProvider("https://sepolia.drpc.org");

/**
 * Read the USDT cost for a given number of whole expert coins from the factory.
 * Coins have 18 decimals on-chain, so we convert the human-readable amount.
 */
export async function getUsdtCost(
    coinAddress: string,
    coinAmount: number
): Promise<bigint> {
    const factory = new Contract(
        CONTRACTS.ZIVY_COIN_FACTORY,
        ZivyCoinFactoryABI,
        provider
    );
    const rawAmount = parseUnits(coinAmount.toString(), 18);
    return factory.getUsdtCost(coinAddress, rawAmount);
}

/**
 * Purchase expert coins for a user.
 * 1. Approve the factory to spend the required USDT (must wait for this)
 * 2. Call purchaseCoins on the factory (returns hash immediately)
 */
export async function purchaseCoins(
    encryptedSeedPhrase: string,
    coinAddress: string,
    coinAmount: number
): Promise<{ hash: string }> {
    const seedPhrase = decryptSeedPhrase(encryptedSeedPhrase);
    const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

    try {
        const account = await wallet.getAccount(0);

        // Calculate USDT cost
        const usdtCost = await getUsdtCost(coinAddress, coinAmount);

        // Step 1: Approve factory to spend USDT (must confirm before purchase)
        const approveData = usdtInterface.encodeFunctionData("approve", [
            CONTRACTS.ZIVY_COIN_FACTORY,
            usdtCost,
        ]);

        const approveResult = await account.sendTransaction({
            to: CONTRACTS.USDT,
            value: BigInt(0),
            data: approveData,
        });

        // Wait for approval to be mined — purchase depends on it
        for (let i = 0; i < 30; i++) {
            const receipt = await account.getUserOperationReceipt(approveResult.hash);
            if (receipt) break;
            await new Promise((r) => setTimeout(r, 4000));
        }

        // Step 2: Purchase coins — return hash immediately
        const rawCoinAmount = parseUnits(coinAmount.toString(), 18);
        const purchaseData = factoryInterface.encodeFunctionData("purchaseCoins", [
            coinAddress,
            rawCoinAmount,
        ]);

        const purchaseResult = await account.sendTransaction({
            to: CONTRACTS.ZIVY_COIN_FACTORY,
            value: BigInt(0),
            data: purchaseData,
        });

        return { hash: purchaseResult.hash };
    } finally {
        wallet.dispose();
    }
}
