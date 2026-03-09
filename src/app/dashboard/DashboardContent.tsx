"use client";

import { useState, useEffect } from "react";
import { createWallet } from "@/lib/auth";
import FundWalletModal from "@/components/FundWalletModal";
import SendTokensModal from "@/components/SendTokensModal";
import type { User } from "@supabase/supabase-js";

interface Profile {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    wallet_address?: string;
}

interface Props {
    user: User;
    profile: Profile | null;
}

export default function DashboardContent({ user, profile }: Props) {
    const [walletAddress, setWalletAddress] = useState(profile?.wallet_address || "");
    const [walletLoading, setWalletLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [usdtBalance, setUsdtBalance] = useState<string>("0.00");
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [fundModalOpen, setFundModalOpen] = useState(false);
    const [sendModalOpen, setSendModalOpen] = useState(false);

    useEffect(() => {
        if (!walletAddress) {
            setWalletLoading(true);
            createWallet()
                .then((address) => {
                    if (address) setWalletAddress(address);
                })
                .finally(() => setWalletLoading(false));
        }
    }, [walletAddress]);

    useEffect(() => {
        if (walletAddress) {
            setBalanceLoading(true);
            fetch("/api/wallet/balance")
                .then((res) => res.json())
                .then((data) => {
                    if (data.formatted) setUsdtBalance(data.formatted);
                })
                .catch(console.error)
                .finally(() => setBalanceLoading(false));
        }
    }, [walletAddress]);

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayName = profile?.full_name || user.user_metadata?.full_name || "there";
    const initials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "";

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Background orbs */}
            <div className="floating-orb w-96 h-96 bg-violet-600 -top-20 -right-48" />
            <div className="floating-orb w-80 h-80 bg-cyan-500 bottom-40 -left-40" style={{ animationDelay: "2s" }} />
            <div className="floating-orb w-64 h-64 bg-pink-500 top-1/2 right-1/4" style={{ animationDelay: "4s" }} />

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                {/* Welcome header */}
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/30 shrink-0">
                        {initials}
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-primary">
                            Welcome back, <span className="gradient-text">{displayName}</span>
                        </h1>
                        <p className="text-secondary mt-1">{user.email}</p>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="glass-card glass-card-hover p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                                </svg>
                            </div>
                            <span className="text-sm text-muted">Wallet</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {walletLoading ? "..." : walletAddress ? "Active" : "—"}
                        </p>
                    </div>

                    <div className="glass-card glass-card-hover p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <span className="text-sm text-muted">Balance</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {balanceLoading ? "..." : `${usdtBalance} USDT`}
                        </p>
                    </div>

                    <div className="glass-card glass-card-hover p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                            </div>
                            <span className="text-sm text-muted">Transactions</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">0</p>
                    </div>
                </div>

                {/* Wallet card */}
                <div className="glass-card p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-600/10 to-transparent rounded-bl-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-primary">Smart Wallet</h2>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-[#667eea]">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                Sepolia Testnet
                            </span>
                        </div>

                        {walletLoading ? (
                            <div className="flex items-center gap-3 py-4">
                                <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                                <p className="text-secondary text-sm">Creating your ERC-4337 smart wallet...</p>
                            </div>
                        ) : walletAddress ? (
                            <div>
                                <p className="text-xs text-muted mb-2 uppercase tracking-wider">ERC-4337 Wallet Address</p>
                                <div className="flex items-center gap-3">
                                    <code className="text-primary font-mono text-sm md:text-base break-all flex-1">
                                        {walletAddress}
                                    </code>
                                    <button
                                        onClick={handleCopy}
                                        className="shrink-0 p-2 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] transition-all"
                                        aria-label="Copy address"
                                    >
                                        {copied ? (
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <a
                                        href={`https://sepolia.etherscan.io/address/${walletAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#667eea] hover:text-[#764ba2] transition-colors flex items-center gap-1"
                                    >
                                        View on Etherscan
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 py-4">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                                <p className="text-red-400 text-sm">Wallet creation failed. Refresh to retry.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                        className="glass-card glass-card-hover p-6 cursor-pointer group"
                        onClick={() => setFundModalOpen(true)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-primary">Fund Wallet</p>
                                <p className="text-sm text-muted">Add USDT to your wallet</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className="glass-card glass-card-hover p-6 cursor-pointer group"
                        onClick={() => setSendModalOpen(true)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-primary">Send Tokens</p>
                                <p className="text-sm text-muted">Transfer to any address</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fund Wallet Modal */}
            <FundWalletModal
                isOpen={fundModalOpen}
                onClose={() => setFundModalOpen(false)}
                walletAddress={walletAddress}
            />

            {/* Send Tokens Modal */}
            <SendTokensModal
                isOpen={sendModalOpen}
                onClose={() => setSendModalOpen(false)}
                onSuccess={() => {
                    setSendModalOpen(false);
                    // Refresh balance
                    setBalanceLoading(true);
                    fetch("/api/wallet/balance")
                        .then((res) => res.json())
                        .then((data) => {
                            if (data.formatted) setUsdtBalance(data.formatted);
                        })
                        .catch(console.error)
                        .finally(() => setBalanceLoading(false));
                }}
            />
        </div>
    );
}
