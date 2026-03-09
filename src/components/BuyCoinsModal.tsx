"use client";

import { useState, useEffect, useCallback } from "react";

interface BuyCoinsModalProps {
    expertId: string;
    coinSymbol: string;
    onClose: () => void;
    onSuccess: () => void;
}

const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100];

export default function BuyCoinsModal({
    expertId,
    coinSymbol,
    onClose,
    onSuccess,
}: BuyCoinsModalProps) {
    const [amount, setAmount] = useState(1);
    const [unitPrice, setUnitPrice] = useState<string | null>(null);
    const [coinName, setCoinName] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<"select" | "confirming" | "success">("select");

    useEffect(() => {
        async function fetchPrice() {
            try {
                const res = await fetch(`/api/coin/buy?expertId=${expertId}`);
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();
                setUnitPrice(data.unit_price_usdt);
                setCoinName(data.coin_name);
            } catch {
                setError("Could not load coin pricing.");
            } finally {
                setLoadingPrice(false);
            }
        }
        fetchPrice();
    }, [expertId]);

    const totalCost = unitPrice
        ? (BigInt(unitPrice) * BigInt(amount)).toString()
        : null;

    const formatUsdt = useCallback((raw: string) => {
        const num = Number(raw) / 1e6;
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }, []);

    const handleBuy = async () => {
        setLoading(true);
        setError(null);
        setStep("confirming");

        try {
            const res = await fetch("/api/coin/buy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expertId, amount }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Purchase failed");

            setStep("success");
            setTimeout(() => onSuccess(), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setStep("select");
        } finally {
            setLoading(false);
        }
    };

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [loading, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={!loading ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl">
                {/* Decorative gradient header */}
                <div className="relative h-28 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] overflow-hidden">
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                    </div>
                    <div className="relative z-10 flex items-end h-full px-6 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-bold">${coinSymbol}</h3>
                                {coinName && <p className="text-white/70 text-sm">{coinName}</p>}
                            </div>
                        </div>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all disabled:opacity-50"
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {loadingPrice ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted">Loading coin info...</p>
                        </div>
                    ) : step === "success" ? (
                        <div className="py-10 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <p className="text-primary text-lg font-bold">Purchase complete</p>
                            <p className="text-muted text-sm mt-2">
                                {amount} ${coinSymbol} has been added to your wallet
                            </p>
                        </div>
                    ) : step === "confirming" ? (
                        <div className="py-10 text-center">
                            <div className="relative w-16 h-16 mx-auto mb-4">
                                <div className="absolute inset-0 rounded-full border-2 border-[#667eea]/20" />
                                <div className="absolute inset-0 rounded-full border-2 border-[#667eea] border-t-transparent animate-spin" />
                                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-primary font-bold">Confirming on-chain</p>
                            <p className="text-muted text-sm mt-2 max-w-xs mx-auto">
                                Approving USDT and purchasing coins. This can take up to a minute.
                            </p>
                            <div className="flex justify-center gap-1.5 mt-5">
                                <div className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Quick amount pills */}
                            <div className="mb-5">
                                <label className="block text-xs text-muted uppercase tracking-wider mb-3 font-medium">
                                    Select amount
                                </label>
                                <div className="grid grid-cols-6 gap-2">
                                    {QUICK_AMOUNTS.map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => setAmount(q)}
                                            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${amount === q
                                                    ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-violet-500/25"
                                                    : "bg-[var(--bg-secondary)] text-secondary border border-[var(--border-color)] hover:border-[var(--border-hover)] hover:text-primary"
                                                }`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom amount input */}
                            <div className="mb-5">
                                <label className="block text-xs text-muted uppercase tracking-wider mb-2 font-medium">
                                    Or enter custom amount
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        value={amount}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value);
                                            if (v > 0) setAmount(v);
                                        }}
                                        className="w-full px-4 py-3 pr-20 rounded-2xl input-field text-base font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="Enter amount"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted font-mono">
                                        ${coinSymbol}
                                    </span>
                                </div>
                            </div>

                            {/* Price breakdown */}
                            {unitPrice && totalCost && (
                                <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/10 p-4">
                                    <div className="flex justify-between items-center text-sm mb-2.5">
                                        <span className="text-muted">Price per coin</span>
                                        <span className="text-secondary font-mono">{formatUsdt(unitPrice)} USDT</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mb-2.5">
                                        <span className="text-muted">Quantity</span>
                                        <span className="text-secondary font-mono">{amount}</span>
                                    </div>
                                    <div className="h-px bg-[var(--border-color)] my-2.5" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-primary font-semibold">Total</span>
                                        <span className="text-lg font-bold gradient-text font-mono">{formatUsdt(totalCost)} USDT</span>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2.5">
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleBuy}
                                disabled={loading || !unitPrice}
                                className="w-full btn-primary py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Buy {amount} ${coinSymbol}
                                {totalCost && (
                                    <span className="opacity-70">· {formatUsdt(totalCost)} USDT</span>
                                )}
                            </button>

                            <p className="text-xs text-muted text-center mt-3">
                                Paid with USDT from your Zivy wallet. Gas is covered.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
