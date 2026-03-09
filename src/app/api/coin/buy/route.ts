import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { purchaseCoins, getUsdtCost } from "@/lib/contracts/interact";
import { createSmartWallet } from "@/lib/wallet";

export async function POST(request: Request) {
    try {
        const { expertId, amount } = await request.json();

        if (!expertId || !amount || amount < 1) {
            return NextResponse.json(
                { error: "expertId and a positive amount are required" },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get expert's coin address
        const { data: expertCoin } = await supabase
            .from("expert_coins")
            .select("coin_address, coin_symbol")
            .eq("expert_id", expertId)
            .single();

        if (!expertCoin?.coin_address) {
            return NextResponse.json(
                { error: "This expert has not launched a coin yet" },
                { status: 404 }
            );
        }

        // Get buyer's wallet (create if needed)
        let { data: profile } = await supabase
            .from("profiles")
            .select("wallet_address, encrypted_seed_phrase")
            .eq("id", user.id)
            .single();

        if (!profile?.wallet_address || !profile?.encrypted_seed_phrase) {
            const { walletAddress, encryptedSeedPhrase } = await createSmartWallet();
            await supabase
                .from("profiles")
                .update({
                    wallet_address: walletAddress,
                    encrypted_seed_phrase: encryptedSeedPhrase,
                })
                .eq("id", user.id);

            profile = {
                wallet_address: walletAddress,
                encrypted_seed_phrase: encryptedSeedPhrase,
            };
        }

        // Execute purchase (approve USDT + buy coins) — returns immediately
        const { hash } = await purchaseCoins(
            profile.encrypted_seed_phrase,
            expertCoin.coin_address,
            amount
        );

        // Track in pending_transactions for background confirmation
        await supabase.from("pending_transactions").insert({
            user_id: user.id,
            tx_hash: hash,
            tx_type: "coin_purchase",
            payload: {
                expertId,
                coinAddress: expertCoin.coin_address,
                coinSymbol: expertCoin.coin_symbol,
                amount,
            },
        });

        return NextResponse.json({
            success: true,
            hash,
            coin_symbol: expertCoin.coin_symbol,
            amount,
        });
    } catch (error) {
        console.error("Coin purchase error:", error);
        return NextResponse.json(
            { error: "Failed to purchase coins. Please try again." },
            { status: 500 }
        );
    }
}


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const expertId = searchParams.get("expertId");

        if (!expertId) {
            return NextResponse.json(
                { error: "expertId is required" },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: expertCoin } = await supabase
            .from("expert_coins")
            .select("coin_address, coin_symbol, coin_name")
            .eq("expert_id", expertId)
            .single();

        if (!expertCoin?.coin_address) {
            return NextResponse.json(
                { error: "No coin found for this expert" },
                { status: 404 }
            );
        }

        // Get price for 1 coin
        const unitCost = await getUsdtCost(expertCoin.coin_address, 1);

        return NextResponse.json({
            coin_address: expertCoin.coin_address,
            coin_symbol: expertCoin.coin_symbol,
            coin_name: expertCoin.coin_name,
            unit_price_usdt: unitCost.toString(),
        });
    } catch (error) {
        console.error("Coin price fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch coin info" },
            { status: 500 }
        );
    }
}
