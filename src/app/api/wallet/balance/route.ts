import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import WalletManagerEvmErc4337 from "@tetherto/wdk-wallet-evm-erc-4337";
import { decryptSeedPhrase } from "@/lib/wallet";
import { CONTRACTS } from "@/lib/contracts";

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

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_address, encrypted_seed_phrase")
            .eq("id", user.id)
            .single();

        if (!profile?.wallet_address || !profile?.encrypted_seed_phrase) {
            return NextResponse.json({ balance: "0", formatted: "0.00" });
        }

        // Decrypt seed phrase and create wallet instance
        const seedPhrase = decryptSeedPhrase(profile.encrypted_seed_phrase);
        const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

        try {
            const account = await wallet.getAccount(0);
            const tokenBalance = await account.getTokenBalance(CONTRACTS.USDT);

            // USDT has 6 decimals
            const formatted = (Number(tokenBalance) / 1_000_000).toFixed(2);

            return NextResponse.json({
                balance: tokenBalance.toString(),
                formatted,
            });
        } finally {
            wallet.dispose();
        }
    } catch (error) {
        console.error("Error fetching balance:", error);
        return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
    }
}
