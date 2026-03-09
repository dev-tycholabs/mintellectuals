"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface FundWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
}

export default function FundWalletModal({ isOpen, onClose, walletAddress }: FundWalletModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-card p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] transition-all"
                    aria-label="Close modal"
                >
                    <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-primary">Fund Wallet</h2>
                </div>

                <p className="text-secondary text-sm mb-6">
                    Send USDT (Sepolia Testnet) to the address below to fund your wallet.
                </p>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white rounded-2xl">
                        <QRCodeSVG
                            value={walletAddress}
                            size={180}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                </div>

                {/* Wallet Address */}
                <div className="mb-4">
                    <p className="text-xs text-muted mb-2 uppercase tracking-wider">Wallet Address</p>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                        <code className="text-primary font-mono text-xs break-all flex-1">
                            {walletAddress}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="shrink-0 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all"
                            aria-label="Copy address"
                        >
                            {copied ? (
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    {copied ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                            </svg>
                            Copy Address
                        </>
                    )}
                </button>

                <p className="text-xs text-muted text-center mt-4">
                    Only send USDT on Sepolia Testnet to this address
                </p>
            </div>
        </div>
    );
}
