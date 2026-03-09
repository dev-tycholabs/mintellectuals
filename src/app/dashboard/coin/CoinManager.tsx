"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ExpertCoin {
    id: string;
    expert_id: string;
    coin_address: string | null;
    coin_name: string;
    coin_symbol: string;
    coin_launched_at: string;
    tx_hash?: string;
    gate_dm: boolean;
    gate_audio: boolean;
    gate_video: boolean;
    cost_dm: number;
    cost_audio: number;
    cost_video: number;
}

interface GateCardProps {
    label: string;
    description: string;
    icon: React.ReactNode;
    enabled: boolean;
    cost: number;
    onToggle: (v: boolean) => void;
    onCostChange: (v: number) => void;
    coinSymbol: string;
}

function GateCard({ label, description, icon, enabled, cost, onToggle, onCostChange, coinSymbol }: GateCardProps) {
    return (
        <div className={`p-5 rounded-2xl border transition-all ${enabled
            ? "bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-violet-500/20"
            : "bg-[var(--bg-card)] border-[var(--border-color)]"
            }`}>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled
                        ? "bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-[#667eea]"
                        : "bg-[var(--bg-secondary)] text-muted"
                        }`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-primary">{label}</p>
                        <p className="text-xs text-muted">{description}</p>
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Gate ${label} with coin`}
                    onClick={() => onToggle(!enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${enabled ? "bg-[#667eea]" : "bg-[var(--bg-secondary)]"
                        }`}
                >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform mt-0.5 ${enabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`} />
                </button>
            </div>

            {enabled && (
                <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-color)]">
                    <label htmlFor={`cost-${label}`} className="text-xs text-muted whitespace-nowrap">
                        Required coins:
                    </label>
                    <div className="relative flex-1 max-w-[200px]">
                        <input
                            id={`cost-${label}`}
                            type="number"
                            min={0}
                            value={cost}
                            onChange={(e) => onCostChange(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 pr-16 rounded-xl input-field text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">
                            ${coinSymbol}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CoinManager({ coin }: { coin: ExpertCoin | null }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const [gateDm, setGateDm] = useState(coin?.gate_dm ?? false);
    const [gateAudio, setGateAudio] = useState(coin?.gate_audio ?? false);
    const [gateVideo, setGateVideo] = useState(coin?.gate_video ?? false);
    const [costDm, setCostDm] = useState(coin?.cost_dm ?? 0);
    const [costAudio, setCostAudio] = useState(coin?.cost_audio ?? 0);
    const [costVideo, setCostVideo] = useState(coin?.cost_video ?? 0);

    const coinSymbol = coin?.coin_symbol || "COIN";
    const isPending = coin && !coin.coin_address;

    // Poll for confirmation when coin is pending
    useEffect(() => {
        if (!isPending || !coin?.tx_hash) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/tx/status?hash=${coin.tx_hash}`);
                const data = await res.json();
                if (data.transaction?.status === "confirmed") {
                    clearInterval(interval);
                    router.refresh();
                }
            } catch { /* ignore */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [isPending, coin?.tx_hash, router]);

    // No coin launched yet
    if (!coin) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-primary mb-2">No Coin Launched Yet</h2>
                <p className="text-sm text-secondary mb-6">
                    Launch your personal coin first to gate access to your services.
                </p>
                <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                    Go to Profile to Launch
                </Link>
            </div>
        );
    }

    // Coin is deploying — show pending state
    if (isPending) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-primary mb-2">
                    Deploying {coin.coin_name} (${coinSymbol})
                </h2>
                <p className="text-sm text-secondary mb-4">
                    Your coin is being deployed on-chain. This page will update automatically once confirmed.
                </p>
                {coin.tx_hash && (
                    <a
                        href={`https://sepolia.etherscan.io/tx/${coin.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        View on Etherscan
                    </a>
                )}
            </div>
        );
    }

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/coin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gate_dm: gateDm,
                    gate_audio: gateAudio,
                    gate_video: gateVideo,
                    cost_dm: gateDm ? costDm : 0,
                    cost_audio: gateAudio ? costAudio : 0,
                    cost_video: gateVideo ? costVideo : 0,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            setSuccess("Settings saved");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const hasChanges =
        gateDm !== (coin.gate_dm ?? false) ||
        gateAudio !== (coin.gate_audio ?? false) ||
        gateVideo !== (coin.gate_video ?? false) ||
        costDm !== (coin.cost_dm ?? 0) ||
        costAudio !== (coin.cost_audio ?? 0) ||
        costVideo !== (coin.cost_video ?? 0);

    return (
        <div className="space-y-6">
            {/* Coin info header */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-orange-500/30">
                        {coinSymbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold text-primary">{coin.coin_name}</p>
                        <p className="text-xs text-muted font-mono truncate">{coin.coin_address}</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400">
                        ${coinSymbol}
                    </span>
                </div>
            </div>

            {/* Gating controls */}
            <div className="glass-card p-6">
                <h2 className="text-sm font-medium text-primary mb-1">Access Gating</h2>
                <p className="text-xs text-muted mb-5">
                    Require users to hold your coin to interact with you. Set the minimum amount needed for each type.
                </p>

                <div className="space-y-4">
                    <GateCard
                        label="Direct Messages"
                        description="Gate who can send you DMs"
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                        }
                        enabled={gateDm}
                        cost={costDm}
                        onToggle={setGateDm}
                        onCostChange={setCostDm}
                        coinSymbol={coinSymbol}
                    />

                    <GateCard
                        label="Audio Calls"
                        description="Gate who can book audio calls"
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                            </svg>
                        }
                        enabled={gateAudio}
                        cost={costAudio}
                        onToggle={setGateAudio}
                        onCostChange={setCostAudio}
                        coinSymbol={coinSymbol}
                    />

                    <GateCard
                        label="Video Calls"
                        description="Gate who can book video calls"
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                        }
                        enabled={gateVideo}
                        cost={costVideo}
                        onToggle={setGateVideo}
                        onCostChange={setCostVideo}
                        coinSymbol={coinSymbol}
                    />
                </div>
            </div>

            {/* Save button + feedback */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>

                {success && (
                    <span className="text-sm text-green-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                        </svg>
                        {success}
                    </span>
                )}

                {error && (
                    <span className="text-sm text-red-400">{error}</span>
                )}
            </div>
        </div>
    );
}
