"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    connected: boolean;
    calendarEmail?: string | null;
}

export default function GoogleCalendarConnect({ connected, calendarEmail }: Props) {
    const router = useRouter();
    const [disconnecting, setDisconnecting] = useState(false);

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await fetch("/api/auth/google-calendar/disconnect", { method: "POST" });
            router.refresh();
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.5 22.5H4.5C3.12 22.5 2 21.38 2 20V6c0-1.38 1.12-2.5 2.5-2.5h1V2h2v1.5h9V2h2v1.5h1c1.38 0 2.5 1.12 2.5 2.5v14c0 1.38-1.12 2.5-2.5 2.5zM4.5 5.5c-.55 0-1 .45-1 1V20c0 .55.45 1 1 1h15c.55 0 1-.45 1-1V6.5c0-.55-.45-1-1-1h-15zM20 9H4v-1h16v1z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-primary">Google Calendar</h3>
                    <p className="text-xs text-muted">
                        {connected
                            ? "Connected — visitors can see your real availability"
                            : "Connect to show live availability on your profile"}
                    </p>
                </div>
            </div>

            {connected ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-sm text-secondary">{calendarEmail}</span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                        {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                </div>
            ) : (
                <a
                    href="/api/auth/google-calendar"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 text-blue-400 hover:from-blue-500/20 hover:to-green-500/20 transition-all"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Connect Google Calendar
                </a>
            )}
        </div>
    );
}
