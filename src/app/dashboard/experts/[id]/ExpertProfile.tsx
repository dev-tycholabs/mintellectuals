"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import BookingCalendar from "@/components/BookingCalendar";
import BuyCoinsModal from "@/components/BuyCoinsModal";

interface Expert {
    id: string;
    full_name: string;
    headline?: string;
    bio?: string;
    expertise?: string[];
    hourly_rate?: number;
    location?: string;
    avatar_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
    website_url?: string;
    twitter_verified?: string;
    linkedin_verified?: string;
    google_calendar_email?: string | null;
}

interface GatingInfo {
    coin_address: string;
    coin_symbol: string;
    coin_name: string;
    gate_dm: boolean;
    cost_dm: number;
    gate_audio: boolean;
    cost_audio: number;
    gate_video: boolean;
    cost_video: number;
}

export default function ExpertProfile({ expert, gating }: { expert: Expert; gating: GatingInfo | null }) {
    const router = useRouter();
    const [startingChat, setStartingChat] = useState(false);
    const [gateError, setGateError] = useState<string | null>(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [myBalance, setMyBalance] = useState<string | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);

    const fetchBalance = useCallback(() => {
        if (!gating?.coin_address) return;
        setBalanceLoading(true);
        fetch(`/api/wallet/tokens/${gating.coin_address}`)
            .then((res) => res.json())
            .then((data) => setMyBalance(data.formatted ?? "0"))
            .catch(() => setMyBalance(null))
            .finally(() => setBalanceLoading(false));
    }, [gating?.coin_address]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    const initials = (expert.full_name || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleMessage = async () => {
        setStartingChat(true);
        setGateError(null);

        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ participant_id: expert.id }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (data.error === "TOKEN_GATE") {
                    setGateError(data.message);
                    setStartingChat(false);
                    return;
                }
                throw new Error(data.error || "Failed to start conversation");
            }

            router.push(`/dashboard/messages?with=${expert.id}`);
        } catch {
            setGateError("Something went wrong. Please try again.");
            setStartingChat(false);
        }
    };

    return (
        <div>
            {/* Back link */}
            <Link
                href="/dashboard/experts"
                className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-6"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back to Experts
            </Link>

            {/* Main card */}
            <div className="glass-card p-8">
                {/* Header */}
                <div className="flex items-start gap-5 mb-8 pb-8 border-b border-[var(--border-color)]">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/30 shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-primary">{expert.full_name}</h1>
                        {expert.headline && (
                            <p className="text-secondary mt-1">{expert.headline}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted">
                            {expert.hourly_rate && (
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    ${expert.hourly_rate}/hr
                                </span>
                            )}
                            {expert.location && (
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                    </svg>
                                    {expert.location}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleMessage}
                            disabled={startingChat}
                            className="mt-4 inline-flex items-center gap-2 btn-primary text-sm py-2.5 px-5 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                            {startingChat ? "Opening chat..." : "Message"}
                        </button>
                        {gating?.gate_dm && gating.cost_dm > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                    Requires {gating.cost_dm} ${gating.coin_symbol} to DM
                                </div>
                                <button
                                    onClick={() => setShowBuyModal(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-violet-500/10 border border-violet-500/20 text-[#667eea] hover:bg-violet-500/20 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                    </svg>
                                    Buy ${gating.coin_symbol}
                                </button>
                            </div>
                        )}
                        {gateError && (
                            <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between gap-3">
                                <span>{gateError}</span>
                                {gating?.coin_symbol && (
                                    <button
                                        onClick={() => {
                                            setGateError(null);
                                            setShowBuyModal(true);
                                        }}
                                        className="shrink-0 px-3 py-1 rounded-lg text-xs font-medium bg-violet-500/20 text-[#667eea] hover:bg-violet-500/30 transition-colors"
                                    >
                                        Buy ${gating.coin_symbol}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bio */}
                {expert.bio && (
                    <div className="mb-8">
                        <h2 className="text-xs text-muted uppercase tracking-wider mb-2">About</h2>
                        <p className="text-primary leading-relaxed whitespace-pre-line">{expert.bio}</p>
                    </div>
                )}

                {/* Expertise */}
                {expert.expertise && expert.expertise.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Expertise</h2>
                        <div className="flex flex-wrap gap-2">
                            {expert.expertise.map((tag) => (
                                <span key={tag} className="px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-[#667eea]">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Social links */}
                {(expert.twitter_url || expert.linkedin_url || expert.website_url) && (
                    <div>
                        <h2 className="text-xs text-muted uppercase tracking-wider mb-3">Links</h2>
                        <div className="flex flex-wrap gap-3">
                            {expert.twitter_url && (
                                <a href={expert.twitter_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm text-secondary hover:text-primary hover:border-[var(--border-hover)] transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                                    </svg>
                                    Twitter / X
                                    {expert.twitter_verified && expert.twitter_url?.toLowerCase().includes(expert.twitter_verified.toLowerCase()) && (
                                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </a>
                            )}
                            {expert.linkedin_url && (
                                <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm text-secondary hover:text-primary hover:border-[var(--border-hover)] transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    LinkedIn
                                    {expert.linkedin_verified && (
                                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </a>
                            )}
                            {expert.website_url && (
                                <a href={expert.website_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm text-secondary hover:text-primary hover:border-[var(--border-hover)] transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                    Website
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Buy Coins section - shown when expert has a coin */}
            {gating?.coin_symbol && (
                <div className="glass-card p-6 mt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xs text-muted uppercase tracking-wider mb-1">Expert Coin</h2>
                            <p className="text-primary font-semibold">${gating.coin_symbol}</p>
                            {gating.coin_name && (
                                <p className="text-sm text-muted">{gating.coin_name}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* User's balance of this expert coin */}
                            <div className="text-right">
                                <p className="text-xs text-muted uppercase tracking-wider">Your Balance</p>
                                <p className="text-lg font-semibold text-primary">
                                    {balanceLoading ? (
                                        <span className="inline-block w-4 h-4 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>{myBalance ?? "0"} <span className="text-sm text-muted">${gating.coin_symbol}</span></>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowBuyModal(true)}
                                className="inline-flex items-center gap-2 btn-primary text-sm py-2.5 px-5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                </svg>
                                Buy ${gating.coin_symbol}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Calendar - only shown if expert connected Google Calendar */}
            {expert.google_calendar_email && (
                <BookingCalendar
                    expertId={expert.id}
                    expertName={expert.full_name}
                    hourlyRate={expert.hourly_rate}
                    gating={gating}
                />
            )}

            {/* Buy Coins Modal */}
            {showBuyModal && gating && (
                <BuyCoinsModal
                    expertId={expert.id}
                    coinSymbol={gating.coin_symbol}
                    onClose={() => setShowBuyModal(false)}
                    onSuccess={() => {
                        setShowBuyModal(false);
                        setGateError(null);
                        fetchBalance();
                    }}
                />
            )}
        </div>
    );
}
