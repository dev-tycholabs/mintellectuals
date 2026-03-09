import { JsonRpcProvider, Contract } from "ethers";
import { createAdminSupabaseClient } from "./supabase-admin";
import { CONTRACTS } from "./contracts/addresses";
import { ZivyCoinFactoryABI } from "./contracts/abis/ZivyCoinFactory";

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const BUNDLER_URL = "https://public.pimlico.io/v2/11155111/rpc";
const provider = new JsonRpcProvider("https://sepolia.drpc.org");

const factory = new Contract(
    CONTRACTS.ZIVY_COIN_FACTORY,
    ZivyCoinFactoryABI as readonly object[],
    provider
);

let running = false;

/**
 * Check if a UserOperation has been mined by querying the bundler.
 * Returns the receipt or null if still pending.
 */
async function getUserOpReceipt(hash: string): Promise<unknown | null> {
    try {
        const res = await fetch(BUNDLER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getUserOperationReceipt",
                params: [hash],
            }),
        });
        const json = await res.json();
        return json.result ?? null;
    } catch (err) {
        console.error(`[tx-worker] Failed to fetch receipt for ${hash}:`, err);
        return null;
    }
}

/**
 * Resolve a confirmed transaction based on its type.
 */
async function resolveTx(
    tx: { id: string; user_id: string; tx_type: string; tx_hash: string; payload: Record<string, unknown> }
) {
    const supabase = createAdminSupabaseClient();

    switch (tx.tx_type) {
        case "coin_launch": {
            // Read the deployed coin address from the factory
            const { walletAddress, coinName, coinSymbol } = tx.payload as {
                walletAddress: string;
                coinName: string;
                coinSymbol: string;
            };

            const coinAddress: string = await factory.getCoinByExpert(walletAddress);

            if (!coinAddress || coinAddress === "0x0000000000000000000000000000000000000000") {
                console.warn(`[tx-worker] coin_launch ${tx.tx_hash}: getCoinByExpert returned zero address, will retry`);
                return; // don't mark as confirmed yet
            }

            // Update expert_coins with the resolved address
            await supabase
                .from("expert_coins")
                .update({ coin_address: coinAddress })
                .eq("expert_id", tx.user_id)
                .eq("tx_hash", tx.tx_hash);

            break;
        }

        case "coin_purchase":
        case "token_send":
            // These don't need post-resolution DB writes beyond marking confirmed
            break;

        default:
            console.warn(`[tx-worker] Unknown tx_type: ${tx.tx_type}`);
    }

    // Mark transaction as confirmed
    await supabase
        .from("pending_transactions")
        .update({ status: "confirmed", resolved_at: new Date().toISOString() })
        .eq("id", tx.id);

    console.log(`[tx-worker] Confirmed: ${tx.tx_type} ${tx.tx_hash}`);
}

/**
 * Single poll cycle: fetch all pending txs, check receipts, resolve confirmed ones.
 */
async function pollPendingTransactions() {
    const supabase = createAdminSupabaseClient();

    const { data: pendingTxs, error } = await supabase
        .from("pending_transactions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50);

    if (error) {
        console.error("[tx-worker] Failed to fetch pending txs:", error);
        return;
    }

    if (!pendingTxs || pendingTxs.length === 0) return;

    console.log(`[tx-worker] Processing ${pendingTxs.length} pending transaction(s)`);

    for (const tx of pendingTxs) {
        try {
            const receipt = await getUserOpReceipt(tx.tx_hash);

            if (!receipt) continue; // still pending

            await resolveTx(tx);
        } catch (err) {
            console.error(`[tx-worker] Error processing tx ${tx.tx_hash}:`, err);

            // Mark as failed after too many attempts (created > 10 min ago)
            const age = Date.now() - new Date(tx.created_at).getTime();
            if (age > 10 * 60 * 1000) {
                await supabase
                    .from("pending_transactions")
                    .update({
                        status: "failed",
                        resolved_at: new Date().toISOString(),
                        error: err instanceof Error ? err.message : "Unknown error",
                    })
                    .eq("id", tx.id);
            }
        }
    }
}

/**
 * Start the background polling loop. Safe to call multiple times — only one loop runs.
 */
export function startTxWorker() {
    if (running) return;
    running = true;

    console.log("[tx-worker] Started — polling every 30s");

    const tick = async () => {
        try {
            await pollPendingTransactions();
        } catch (err) {
            console.error("[tx-worker] Unhandled error in poll cycle:", err);
        }
        if (running) setTimeout(tick, POLL_INTERVAL_MS);
    };

    // Start after a short delay to let the server finish booting
    setTimeout(tick, 5_000);
}

export function stopTxWorker() {
    running = false;
    console.log("[tx-worker] Stopped");
}
