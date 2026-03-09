"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-5.07l-1.41 1.41M8.34 15.66l-1.41 1.41m10.14 0l-1.41-1.41M8.34 8.34L6.93 6.93" />
                </svg>
            ) : (
                <svg className="w-5 h-5 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
            )}
        </button>
    );
}
