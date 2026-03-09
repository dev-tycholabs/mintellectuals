import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { launchCoin } from "@/lib/contracts/interact";

export async function POST(request: Request) {
    try {
        const { coinName, coinSymbol } = await request.json();

        if (!coinName || !coinSymbol) {
            return NextResponse.json(
                { error: "coinName and coinSymbol are required" },
                { status: 400 }
            );
        }

        if (coinSymbol.length > 10) {
            return NextResponse.json(
                { error: "Symbol must be 10 characters or less" },
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

        // Get profile with wallet info
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_expert, wallet_address, encrypted_seed_phrase")
            .eq("id", user.id)
            .single();

        if (!profile?.is_expert) {
            return NextResponse.json(
                { error: "Only experts can launch coins" },
                { status: 403 }
            );
        }

        // Check if coin already exists in expert_coins table
        const { data: existingCoin } = await supabase
            .from("expert_coins")
            .select("id")
            .eq("expert_id", user.id)
            .single();

        if (existingCoin) {
            return NextResponse.json(
                { error: "You have already launched a coin" },
                { status: 409 }
            );
        }

        if (!profile.encrypted_seed_phrase || !profile.wallet_address) {
            return NextResponse.json(
                { error: "Wallet not set up. Please create a wallet first." },
                { status: 400 }
            );
        }

        // Send the launchCoin transaction via WDK — returns immediately
        const { hash } = await launchCoin(
            profile.encrypted_seed_phrase,
            coinName,
            coinSymbol
        );

        // Save to expert_coins with pending status (coin_address resolved by background worker)
        const { error: insertError } = await supabase
            .from("expert_coins")
            .insert({
                expert_id: user.id,
                coin_address: null,
                coin_name: coinName,
                coin_symbol: coinSymbol,
                tx_hash: hash,
                coin_launched_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error("Failed to save coin to expert_coins:", insertError);
        }

        // Track in pending_transactions for background resolution
        await supabase.from("pending_transactions").insert({
            user_id: user.id,
            tx_hash: hash,
            tx_type: "coin_launch",
            payload: {
                walletAddress: profile.wallet_address,
                coinName,
                coinSymbol,
            },
        });

        return NextResponse.json({
            hash,
            coinName,
            coinSymbol,
        });
    } catch (error) {
        console.error("Coin launch error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to launch coin";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
