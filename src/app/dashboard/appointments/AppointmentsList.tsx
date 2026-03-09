"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Appointment {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    note?: string;
    call_type?: "video" | "audio";
    google_event_id?: string;
    booker?: { full_name: string; email: string };
    expert?: { full_name: string; email: string };
}

export default function AppointmentsList() {
    const router = useRouter();
    const [asExpert, setAsExpert] = useState<Appointment[]>([]);
    const [asBooker, setAsBooker] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");

    useEffect(() => {
        fetch("/api/appointments")
            .then((r) => r.json())
            .then((data) => {
                setAsExpert(data.asExpert || []);
                setAsBooker(data.asBooker || []);
            })
            .finally(() => setLoading(false));
    }, []);

    const updateStatus = async (id: string, status: string) => {
        await fetch("/api/appointments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        setAsExpert((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        setAsBooker((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    };

    if (loading) {
        return <div className="glass-card p-12 text-center"><p className="text-muted text-sm">Loading...</p></div>;
    }

    const items = tab === "incoming" ? asExpert : asBooker;

    return (
        <div>
            <div className="flex gap-2 mb-6">
                {(["incoming", "outgoing"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t
                            ? "bg-gradient-to-r from-violet-500/15 to-purple-500/10 text-[#667eea] border border-violet-500/20"
                            : "text-secondary hover:text-primary border border-transparent"
                            }`}
                    >
                        {t === "incoming" ? `Incoming (${asExpert.length})` : `My Bookings (${asBooker.length})`}
                    </button>
                ))}
            </div>

            {items.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-muted text-sm">
                        {tab === "incoming" ? "No incoming requests." : "No bookings yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((apt) => {
                        const person = tab === "incoming" ? apt.booker : apt.expert;
                        const isPast = new Date(apt.date) < new Date(new Date().toDateString());
                        return (
                            <div key={apt.id} className={`glass-card p-5 ${isPast ? "opacity-60" : ""}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-primary">
                                                {person?.full_name || "Unknown"}
                                            </span>
                                            <StatusBadge status={apt.status} />
                                            {apt.google_event_id && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                                    📅 Synced
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-secondary">
                                            {new Date(apt.date + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                                            {" · "}{apt.start_time.slice(0, 5)} – {apt.end_time.slice(0, 5)}
                                        </p>
                                        {apt.note && <p className="text-xs text-muted mt-2 italic">&quot;{apt.note}&quot;</p>}
                                    </div>
                                    {!isPast && (
                                        <div className="flex gap-2 shrink-0">
                                            {apt.status === "confirmed" && (
                                                <button onClick={() => router.push(`/dashboard/call/${apt.id}`)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-[#667eea] hover:bg-violet-500/20 transition-colors flex items-center gap-1">
                                                    {apt.call_type === "audio" ? (
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                        </svg>
                                                    )}
                                                    {apt.call_type === "audio" ? "Join Audio" : "Join Call"}
                                                </button>
                                            )}
                                            {apt.status === "pending" && (
                                                <>
                                                    {tab === "incoming" && (
                                                        <button onClick={() => updateStatus(apt.id, "confirmed")}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">
                                                            Confirm
                                                        </button>
                                                    )}
                                                    <button onClick={() => updateStatus(apt.id, "cancelled")}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
        confirmed: "bg-green-500/10 border-green-500/20 text-green-400",
        cancelled: "bg-red-500/10 border-red-500/20 text-red-400",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
}
