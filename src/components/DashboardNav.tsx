"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardNavProps {
    userEmail: string;
    displayName: string;
    userId: string;
    walletAddress?: string;
}

export default function DashboardNav({ userEmail, displayName, userId, walletAddress }: DashboardNavProps) {
    const router = useRouter();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const initials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPopoverOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-lg border-b border-[var(--border-color)]">
            <div className="flex items-center">
                <div className="w-64 shrink-0 px-6 py-4 border-r border-[var(--border-color)]">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-bold gradient-text">Zivy</span>
                    </Link>
                </div>
                <div className="flex-1 flex items-center justify-end px-6 py-4 gap-4">
                    <ThemeToggle />
                    <div className="relative" ref={popoverRef}>
                        <button
                            onClick={() => setPopoverOpen(!popoverOpen)}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-all hover:shadow-lg hover:shadow-violet-500/30"
                            aria-label="User menu"
                        >
                            {initials}
                        </button>

                        {popoverOpen && (
                            <div className="absolute right-0 mt-3 w-80 glass-card p-5 shadow-xl shadow-black/10 z-50">
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--border-color)]">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-primary truncate">{displayName}</p>
                                        <p className="text-xs text-muted truncate">{userEmail}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div>
                                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">User ID</p>
                                        <p className="text-xs text-secondary font-mono break-all">{userId}</p>
                                    </div>
                                    {walletAddress && (
                                        <div>
                                            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Wallet Address</p>
                                            <p className="text-xs text-secondary font-mono break-all">{walletAddress}</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                    </svg>
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
