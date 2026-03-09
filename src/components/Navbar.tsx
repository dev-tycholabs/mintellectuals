"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[var(--bg-primary)]/80 backdrop-blur-lg border-b border-[var(--border-color)]">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold gradient-text">Zivy</span>
                </Link>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm text-secondary hover:text-[var(--text-primary)] transition-colors">
                        Sign in
                    </Link>
                    <Link href="/signup" className="btn-primary text-sm py-2.5 px-5">
                        Get Started
                    </Link>
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}
