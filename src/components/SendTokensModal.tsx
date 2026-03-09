"use client";

import { useState, useEffect, useCallback } from "react";

interface Token {
    address: string;
    symbol: string;
    name: string;
    balance: string;
    formatted: string;
    decimals: number;
}

interface SendTokensModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SendTokensModal({
    isOpen,
    onClose,
    onSuccess,
}: SendTokensModalProps) {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingTokens, setLoadingTokens] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<"form" | "confirming" | "success">("form");
    const [txHash, setTxHash] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoadingTokens(true);
        fetch("/api/wallet/tokens")
            .then((res) => res.json())
            .then((data) => {
                if (data.tokens) {
                    setTokens(data.tokens);
                    if (data.tokens.length > 0) setSelectedToken(data.tokens[0]);
                }
            })
            .catch(() => setError("Failed to load tokens"))
            .finally(() => setLoadingTokens(false));
    }, [isOpen]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setRecipient("");
            setAmount("");
            setError(null);
            setStep("form");
            setTxHash("");
            setDropdownOpen(false);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [loading, onClose]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = () => setDropdownOpen(false);
        window.addEventListener("click", handler);
        return () => window.removeEventListener("click", handler);
    }, [dropdownOpen]);

    const isValidAddress = useCallback((addr: string) => {
        return /^0x[a-fA-F0-9]{40}$/.test(addr);
    }, []);

    const handleSetMax = () => {
        if (selectedToken) setAmount(selectedToken.formatted);
    };

    const canSend =
        selectedToken &&
        recipient &&
        isValidAddress(recipient) &&
        amount &&
        Number(amount) > 0 &&
        Number(amount) <= Number(selectedToken.formatted);

    const handleSend = async () => {
        if (!canSend || !selectedToken) return;
        setLoading(true);
        setError(null);
        setStep("confirming");

        try {
            const res = await fetch("/api/wallet/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: recipient,
                    amount,
                    tokenAddress: selectedToken.address,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Transfer failed");

            setTxHash(data.hash);
            setStep("success");
            setTimeout(() => onSuccess(), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setStep("form");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={!loading ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl">
                {/* Gradient header */}
                <div className="relative h-28 bg-gradient-to-br from-cyan-400 via-blue-500 to-[#667eea] overflow-hidden">
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                    </div>
                    <div className="relative z-10 flex items-end h-full px-6 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-bold">Send Tokens</h3>
                                <p className="text-white/70 text-sm">Transfer to any address</p>
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
                    {loadingTokens ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted">Loading your tokens...</p>
                        </div>
                    ) : step === "success" ? (
                        <div className="py-10 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <p className="text-primary text-lg font-bold">Transfer sent</p>
                            <p className="text-muted text-sm mt-2">
                                {amount} {selectedToken?.symbol} sent successfully
                            </p>
                            {txHash && (
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-[#667eea] hover:text-[#764ba2] mt-3 transition-colors"
                                >
                                    View on Etherscan
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    ) : step === "confirming" ? (
                        <div className="py-10 text-center">
                            <div className="relative w-16 h-16 mx-auto mb-4">
                                <div className="absolute inset-0 rounded-full border-2 border-[#667eea]/20" />
                                <div className="absolute inset-0 rounded-full border-2 border-[#667eea] border-t-transparent animate-spin" />
                                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-primary font-bold">Sending tokens</p>
                            <p className="text-muted text-sm mt-2 max-w-xs mx-auto">
                                Transferring {amount} {selectedToken?.symbol}. This can take up to a minute.
                            </p>
                            <div className="flex justify-center gap-1.5 mt-5">
                                <div className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-[#667eea] animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Token selector */}
                            <div className="mb-5">
                                <label className="block text-xs text-muted uppercase tracking-wider mb-2 font-medium">
                                    Token
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDropdownOpen(!dropdownOpen);
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-colors text-left"
                                    >
                                        {selectedToken ? (
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${selectedToken.symbol === "USDT"
                                                        ? "bg-gradient-to-br from-green-400 to-emerald-600"
                                                        : "bg-gradient-to-br from-violet-500 to-purple-600"
                                                    }`}>
                                                    {selectedToken.symbol.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-primary">{selectedToken.symbol}</p>
                                                    <p className="text-xs text-muted">Balance: {selectedToken.formatted}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted text-sm">Select a token</span>
                                        )}
                                        <svg className={`w-4 h-4 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-xl overflow-hidden">
                                            {tokens.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-muted">No tokens found</p>
                                            ) : (
                                                tokens.map((token) => (
                                                    <button
                                                        key={token.address}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedToken(token);
                                                            setDropdownOpen(false);
                                                            setAmount("");
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors text-left ${selectedToken?.address === token.address ? "bg-[var(--bg-secondary)]" : ""
                                                            }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${token.symbol === "USDT"
                                                                ? "bg-gradient-to-br from-green-400 to-emerald-600"
                                                                : "bg-gradient-to-br from-violet-500 to-purple-600"
                                                            }`}>
                                                            {token.symbol.slice(0, 2)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-primary">{token.symbol}</p>
                                                            <p className="text-xs text-muted">{token.name}</p>
                                                        </div>
                                                        <span className="text-sm text-secondary font-mono">{token.formatted}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recipient address */}
                            <div className="mb-5">
                                <label className="block text-xs text-muted uppercase tracking-wider mb-2 font-medium">
                                    Recipient Address
                                </label>
                                <input
                                    type="text"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value.trim())}
                                    placeholder="0x..."
                                    className="w-full px-4 py-3 rounded-2xl input-field text-sm font-mono"
                                />
                                {recipient && !isValidAddress(recipient) && (
                                    <p className="text-xs text-red-400 mt-1.5">Invalid Ethereum address</p>
                                )}
                            </div>

                            {/* Amount */}
                            <div className="mb-5">
                                <label className="block text-xs text-muted uppercase tracking-wider mb-2 font-medium">
                                    Amount
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={0}
                                        step={selectedToken?.decimals === 0 ? "1" : "0.01"}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 pr-24 rounded-2xl input-field text-sm font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSetMax}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#667eea] bg-[#667eea]/10 hover:bg-[#667eea]/20 transition-colors"
                                    >
                                        MAX
                                    </button>
                                </div>
                                {selectedToken && Number(amount) > Number(selectedToken.formatted) && (
                                    <p className="text-xs text-red-400 mt-1.5">Insufficient balance</p>
                                )}
                            </div>

                            {/* Summary */}
                            {selectedToken && amount && Number(amount) > 0 && isValidAddress(recipient) && (
                                <div className="mb-5 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/10 p-4">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-muted">Sending</span>
                                        <span className="text-secondary font-mono">{amount} {selectedToken.symbol}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-muted">To</span>
                                        <span className="text-secondary font-mono text-xs">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
                                    </div>
                                    <div className="h-px bg-[var(--border-color)] my-2" />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted">Gas</span>
                                        <span className="text-green-400 font-medium">Sponsored</span>
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
                                onClick={handleSend}
                                disabled={!canSend || loading}
                                className="w-full btn-primary py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                                Send {amount && selectedToken ? `${amount} ${selectedToken.symbol}` : "Tokens"}
                            </button>

                            <p className="text-xs text-muted text-center mt-3">
                                Gas fees are sponsored. Transfers are on Sepolia Testnet.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
