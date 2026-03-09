"use client";

import { useState, useEffect, useCallback, type JSX } from "react";

interface Transaction {
    tx_hash: string;
    tx_type: string;
    status: string;
    payload: Record<string, unknown>;
    created_at: string;
    resolved_at: string | null;
    error: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: JSX.Element; color: string }> = {
    coin_launch: {
        label: "Coin Launch",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
        ),
        color: "text-violet-400",
    },
    coin_purchase: {
        label: "Coin Purchase",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
        ),
        color: "text-amber-400",
    },
    token_send: {
        label: "Token Transfer",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
        ),
        color: "text-cyan-400",
    },
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
    pending: {
        label: "Pending",
        classes: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    },
    confirmed: {
        label: "Confirmed",
        classes: "bg-green-500/10 border-green-500/20 text-green-400",
    },
    failed: {
        label: "Failed",
        classes: "bg-red-500/10 border-red-500/20 text-red-400",
    },
};

function getDescription(tx: Transaction): string {
    const p = tx.payload;
    switch (tx.tx_type) {
        case "coin_launch":
            return `${p.coinName} ($${p.coinSymbol})`;
        case "coin_purchase":
            return `${p.amount} $${p.coinSymbol}`;
        case "token_send":
            return `${p.amount} to ${(p.to as string)?.slice(0, 6)}…${(p.to as string)?.slice(-4)}`;
        default:
            return tx.tx_type;
    }
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function TransactionActivity() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTxs = useCallback(async () => {
        try {
            const res = await fetch("/api/tx/list");
            const data = await res.json();
            if (data.transactions) setTransactions(data.transactions);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchTxs();
        // Poll while there are pending txs
        const interval = setInterval(fetchTxs, 8000);
        return () => clearInterval(interval);
    }, [fetchTxs]);

    const hasPending = transactions.some((t) => t.status === "pending");

    // Stop polling once nothing is pending
    useEffect(() => {
        if (!hasPending) return;
        const interval = setInterval(fetchTxs, 5000);
        return () => clearInterval(interval);
    }, [hasPending, fetchTxs]);

    if (loading) {
        return (
            <div className="glass-card p-8">
                <div className="flex items-center justify-center gap-3 py-8">
                    <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted">Loading transactions…</span>
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                    <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                </div>
                <p className="text-sm text-secondary">No transactions yet</p>
                <p className="text-xs text-muted mt-1">Your blockchain activity will appear here.</p>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1.2fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Type</span>
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Details</span>
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Status</span>
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Tx Hash</span>
                <span className="text-xs text-muted uppercase tracking-wider font-medium text-right">Time</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[var(--border-color)]">
                {transactions.map((tx) => {
                    const config = TYPE_CONFIG[tx.tx_type] ?? {
                        label: tx.tx_type,
                        icon: <span className="w-4 h-4" />,
                        color: "text-muted",
                    };
                    const badge = STATUS_BADGE[tx.status] ?? STATUS_BADGE.pending;

                    return (
                        <div
                            key={tx.tx_hash}
                            className="grid grid-cols-[1fr_1.2fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-[var(--bg-secondary)]/30 transition-colors"
                        >
                            {/* Type */}
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center ${config.color}`}>
                                    {config.icon}
                                </div>
                                <span className="text-sm text-primary font-medium">{config.label}</span>
                            </div>

                            {/* Details */}
                            <div className="text-sm text-secondary truncate">
                                {getDescription(tx)}
                                {tx.error && (
                                    <p className="text-xs text-red-400 truncate mt-0.5">{tx.error}</p>
                                )}
                            </div>

                            {/* Status */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.classes}`}>
                                {tx.status === "pending" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                )}
                                {badge.label}
                            </span>

                            {/* Tx Hash */}
                            <a
                                href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-[#667eea] hover:text-[#8b9cf7] transition-colors"
                            >
                                {tx.tx_hash.slice(0, 6)}…{tx.tx_hash.slice(-4)}
                            </a>

                            {/* Time */}
                            <span className="text-xs text-muted text-right whitespace-nowrap">
                                {timeAgo(tx.created_at)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
