import { JsonRpcProvider, Contract } from "ethers";
import { ZivyCoinABI } from "./abis/ZivyCoin";

const provider = new JsonRpcProvider("https://sepolia.drpc.org");

/**
 * Check the on-chain balance of a user's wallet for a specific coin.
 * Returns the balance as a whole number (coins have 0 decimals in ZivyCoin).
 */
export async function getCoinBalance(
    coinAddress: string,
    walletAddress: string
): Promise<number> {
    try {
        const contract = new Contract(coinAddress, ZivyCoinABI, provider);
        const balance: bigint = await contract.balanceOf(walletAddress);
        // ZivyCoin uses 0 decimals
        return Number(balance);
    } catch (error) {
        console.error("Failed to check coin balance:", error);
        return 0;
    }
}
