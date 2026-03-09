import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Interface, JsonRpcProvider, Contract, parseUnits, isAddress } from "ethers";
import WalletManagerEvmErc4337 from "@tetherto/wdk-wallet-evm-erc-4337";
import { decryptSeedPhrase } from "@/lib/wallet";
import { CONTRACTS } from "@/lib/contracts";
import { MockUSDTABI } from "@/lib/contracts/abis/MockUSDT";

const provider = new JsonRpcProvider("https://sepolia.drpc.org");

const ERC20_DECIMALS_ABI = [
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
        const contract = new Contract(tokenAddress, ERC20_DECIMALS_ABI, provider);
        const decimals: bigint = await contract.decimals();
        return Number(decimals);
    } catch {
        return 18;
    }
}

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

export async function POST(request: Request) {
    try {
        const { to, amount, tokenAddress } = await request.json();

        if (!to || !amount || !tokenAddress) {
            return NextResponse.json(
                { error: "to, amount, and tokenAddress are required" },
                { status: 400 }
            );
        }

        if (!isAddress(to)) {
            return NextResponse.json(
                { error: "Invalid recipient address" },
                { status: 400 }
            );
        }

        if (Number(amount) <= 0) {
            return NextResponse.json(
                { error: "Amount must be greater than 0" },
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

        const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_address, encrypted_seed_phrase")
            .eq("id", user.id)
            .single();

        if (!profile?.wallet_address || !profile?.encrypted_seed_phrase) {
            return NextResponse.json(
                { error: "Wallet not found. Please create a wallet first." },
                { status: 400 }
            );
        }

        if (to.toLowerCase() === profile.wallet_address.toLowerCase()) {
            return NextResponse.json(
                { error: "Cannot send tokens to yourself" },
                { status: 400 }
            );
        }

        const seedPhrase = decryptSeedPhrase(profile.encrypted_seed_phrase);
        const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

        try {
            const account = await wallet.getAccount(0);

            // Encode the ERC-20 transfer call
            const decimals = await getTokenDecimals(tokenAddress);
            const rawAmount = parseUnits(amount.toString(), decimals);
            const data = usdtInterface.encodeFunctionData("transfer", [to, rawAmount]);

            const result = await account.sendTransaction({
                to: tokenAddress,
                value: BigInt(0),
                data,
            });

            // Track in pending_transactions for background confirmation
            await supabase.from("pending_transactions").insert({
                user_id: user.id,
                tx_hash: result.hash,
                tx_type: "token_send",
                payload: { to, amount, tokenAddress },
            });

            return NextResponse.json({ success: true, hash: result.hash });
        } finally {
            wallet.dispose();
        }
    } catch (error) {
        console.error("Send token error:", error);
        return NextResponse.json(
            { error: "Failed to send tokens. Please try again." },
            { status: 500 }
        );
    }
}
