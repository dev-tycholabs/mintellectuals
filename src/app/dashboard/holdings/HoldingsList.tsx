"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Token {
    address: string;
    symbol: string;
    name: string;
    balance: string;
    formatted: string;
    decimals: number;
    expertId?: string;
    expertName?: string;
}

export default function HoldingsList() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHoldings() {
            try {
                const res = await fetch("/api/wallet/holdings");
                if (!res.ok) throw new Error("Failed to load holdings");
                const data = await res.json();
                setTokens(data.tokens ?? []);
            } catch {
                setError("Could not load your token holdings.");
            } finally {
                setLoading(false);
            }
        }
        fetchHoldings();
    }, []);

    if (loading) {
        return (
            <div className="glass-card p-12 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                    <span className="text-secondary">Loading your holdings...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-8">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    const expertTokens = tokens.filter((t) => t.expertId);

    if (expertTokens.length === 0) {
        return (
            <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">No expert tokens yet</h3>
                <p className="text-secondary text-sm mb-6">
                    When you buy expert coins, they&apos;ll show up here.
                </p>
                <Link
                    href="/dashboard/experts"
                    className="inline-flex items-center gap-2 btn-primary text-sm py-2.5 px-5"
                >
                    Browse Experts
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {expertTokens.map((token) => (
                <div key={token.address} className="glass-card glass-card-hover p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/20">
                                {token.symbol.replace("$", "").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-primary">${token.symbol}</p>
                                <p className="text-sm text-muted">{token.name}</p>
                                {token.expertName && (
                                    <p className="text-xs text-secondary">by {token.expertName}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-lg font-semibold text-primary">{token.formatted}</p>
                                <p className="text-xs text-muted">tokens</p>
                            </div>
                            {token.expertId && (
                                <Link
                                    href={`/dashboard/experts/${token.expertId}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-[#667eea] hover:bg-violet-500/20 transition-colors"
                                >
                                    View Expert
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
