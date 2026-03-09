import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { JsonRpcProvider, Contract } from "ethers";

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

        // Fetch all expert coins with their expert profile info
        const { data: expertCoins } = await supabase
            .from("expert_coins")
            .select("coin_address, coin_symbol, coin_name, expert_id, profiles!expert_coins_expert_id_fkey(full_name)");

        if (!expertCoins?.length) {
            return NextResponse.json({ tokens: [] });
        }

        const tokens: {
            address: string;
            symbol: string;
            name: string;
            balance: string;
            formatted: string;
            decimals: number;
            expertId: string;
            expertName: string;
        }[] = [];

        const balanceChecks = expertCoins.map(async (ec) => {
            try {
                const coin = new Contract(ec.coin_address, ERC20_ABI, provider);
                const bal: bigint = await coin.balanceOf(walletAddress);
                if (bal > BigInt(0)) {
                    let decimals = 18;
                    try {
                        decimals = Number(await coin.decimals());
                    } catch { /* default 18 */ }

                    const expertProfile = ec.profiles as unknown as { full_name: string } | null;

                    tokens.push({
                        address: ec.coin_address,
                        symbol: ec.coin_symbol,
                        name: ec.coin_name,
                        balance: bal.toString(),
                        formatted: formatBalance(bal, decimals),
                        decimals,
                        expertId: ec.expert_id,
                        expertName: expertProfile?.full_name ?? "Unknown Expert",
                    });
                }
            } catch {
                // skip coins we can't read
            }
        });

        await Promise.all(balanceChecks);

        return NextResponse.json({ tokens });
    } catch (error) {
        console.error("Error fetching holdings:", error);
        return NextResponse.json(
            { error: "Failed to fetch holdings" },
            { status: 500 }
        );
    }
}
