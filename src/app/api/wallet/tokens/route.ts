import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { JsonRpcProvider, Contract } from "ethers";
import { CONTRACTS } from "@/lib/contracts";

const provider = new JsonRpcProvider("https://sepolia.drpc.org");

const ERC20_ABI = [
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

async function getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
        const contract = new Contract(tokenAddress, ERC20_ABI, provider);
        const decimals: bigint = await contract.decimals();
        return Number(decimals);
    } catch {
        return 18;
    }
}

function formatBalance(raw: bigint, decimals: number): string {
    if (decimals === 0) return raw.toString();
    const divisor = 10 ** decimals;
    return (Number(raw) / divisor).toFixed(Math.min(decimals, 6));
}

export async function GET() {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_address")
            .eq("id", user.id)
            .single();

        if (!profile?.wallet_address) {
            return NextResponse.json({ tokens: [] });
        }

        const walletAddress = profile.wallet_address;
        const tokens: {
            address: string;
            symbol: string;
            name: string;
            balance: string;
            formatted: string;
            decimals: number;
        }[] = [];

        // 1. USDT balance
        try {
            const usdt = new Contract(CONTRACTS.USDT, ERC20_ABI, provider);
            const usdtBalance: bigint = await usdt.balanceOf(walletAddress);
            const usdtDecimals = await getTokenDecimals(CONTRACTS.USDT);
            tokens.push({
                address: CONTRACTS.USDT,
                symbol: "USDT",
                name: "USDT",
                balance: usdtBalance.toString(),
                formatted: formatBalance(usdtBalance, usdtDecimals),
                decimals: usdtDecimals,
            });
        } catch (e) {
            console.error("Failed to fetch USDT balance:", e);
            tokens.push({
                address: CONTRACTS.USDT,
                symbol: "USDT",
                name: "USDT",
                balance: "0",
                formatted: "0.00",
                decimals: 6,
            });
        }

        // 2. Expert coin balances the user may hold
        const { data: expertCoins } = await supabase
            .from("expert_coins")
            .select("coin_address, coin_symbol, coin_name");

        if (expertCoins?.length) {
            const balanceChecks = expertCoins.map(async (ec) => {
                try {
                    const coin = new Contract(ec.coin_address, ERC20_ABI, provider);
                    const bal: bigint = await coin.balanceOf(walletAddress);
                    if (bal > BigInt(0)) {
                        const decimals = await getTokenDecimals(ec.coin_address);
                        tokens.push({
                            address: ec.coin_address,
                            symbol: ec.coin_symbol,
                            name: ec.coin_name,
                            balance: bal.toString(),
                            formatted: formatBalance(bal, decimals),
                            decimals,
                        });
                    }
                } catch {
                    // skip coins we can't read
                }
            });
            await Promise.all(balanceChecks);
        }

        return NextResponse.json({ tokens });
    } catch (error) {
        console.error("Error fetching tokens:", error);
        return NextResponse.json(
            { error: "Failed to fetch tokens" },
            { status: 500 }
        );
    }
}
