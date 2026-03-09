export async function register() {
    // Only run the tx worker on the server (not during build or on the client)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { startTxWorker } = await import("@/lib/tx-worker");
        startTxWorker();
    }
}
