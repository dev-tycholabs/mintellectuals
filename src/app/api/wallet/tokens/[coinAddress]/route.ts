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

interface RouteContext {
    params: Promise<{ coinAddress: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { coinAddress } = await context.params;
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
            return NextResponse.json({ balance: "0", formatted: "0" });
        }

        const coin = new Contract(coinAddress, ERC20_ABI, provider);
        const [bal, decimals] = await Promise.all([
            coin.balanceOf(profile.wallet_address) as Promise<bigint>,
            coin.decimals().then((d: bigint) => Number(d)).catch(() => 18),
        ]);

        const divisor = 10 ** decimals;
        const formatted = (Number(bal) / divisor).toFixed(Math.min(decimals, 6));

        return NextResponse.json({
            balance: bal.toString(),
            formatted,
            decimals,
        });
    } catch (error) {
        console.error("Error fetching coin balance:", error);
        return NextResponse.json(
            { error: "Failed to fetch balance" },
            { status: 500 }
        );
    }
}
