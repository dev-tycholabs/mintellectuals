"use client";

import { useState, useEffect, useCallback } from "react";

interface BusySlot {
    start: string;
    end: string;
}

interface Props {
    expertId: string;
    expertName: string;
    hourlyRate?: number;
    gating?: {
        coin_symbol: string;
        gate_audio: boolean;
        cost_audio: number;
        gate_video: boolean;
        cost_video: number;
    } | null;
}

const WORK_START = 9;
const WORK_END = 17;
const SLOT_MINUTES = 30;

function generateWorkSlots(): { start: string; end: string }[] {
    const slots: { start: string; end: string }[] = [];
    for (let h = WORK_START; h < WORK_END; h++) {
        for (let m = 0; m < 60; m += SLOT_MINUTES) {
            const sh = String(h).padStart(2, "0");
            const sm = String(m).padStart(2, "0");
            let eh = h, em = m + SLOT_MINUTES;
            if (em >= 60) { eh++; em -= 60; }
            if (eh > WORK_END || (eh === WORK_END && em > 0)) break;
            slots.push({
                start: `${sh}:${sm}`,
                end: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
            });
        }
    }
    return slots;
}

function isSlotBusy(slotStart: string, slotEnd: string, date: string, busySlots: BusySlot[], timezone: string): boolean {
    const [sh, sm] = slotStart.split(":").map(Number);
    const [eh, em] = slotEnd.split(":").map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = eh * 60 + em;

    return busySlots.some((b) => {
        // Convert busy slot UTC times to the expert's timezone for comparison
        const bStart = new Date(b.start);
        const bEnd = new Date(b.end);

        // Get date/time parts in the expert's timezone
        const startParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
        }).formatToParts(bStart);
        const endParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
        }).formatToParts(bEnd);

        const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
            parts.find((p) => p.type === type)?.value || "0";

        const bStartDate = `${getPart(startParts, "year")}-${getPart(startParts, "month")}-${getPart(startParts, "day")}`;
        const bEndDate = `${getPart(endParts, "year")}-${getPart(endParts, "month")}-${getPart(endParts, "day")}`;

        if (bStartDate !== date && bEndDate !== date) return false;

        const bStartHour = parseInt(getPart(startParts, "hour"));
        const bStartMinute = parseInt(getPart(startParts, "minute"));
        const bEndHour = parseInt(getPart(endParts, "hour"));
        const bEndMinute = parseInt(getPart(endParts, "minute"));

        const bStartMin = bStartHour * 60 + bStartMinute;
        const bEndMin = bEndHour * 60 + bEndMinute;

        return slotStartMin < bEndMin && slotEndMin > bStartMin;
    });
}

function getNext14Days(): Date[] {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        // Skip weekends
        if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
    }
    return days;
}

export default function BookingCalendar({ expertId, expertName, hourlyRate, gating }: Props) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
    const [note, setNote] = useState("");
    const [callType, setCallType] = useState<"video" | "audio">("video");
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [timezone, setTimezone] = useState("UTC");

    const days = getNext14Days();
    const workSlots = generateWorkSlots();

    const fetchBusy = useCallback(async (date: Date) => {
        setLoading(true);
        setBusySlots([]);
        // Use local date parts to avoid UTC date shift
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        try {
            const res = await fetch(`/api/calendar/freebusy?expert_id=${expertId}&date=${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                setBusySlots(data.busy || []);
                if (data.timezone) setTimezone(data.timezone);
            }
        } finally {
            setLoading(false);
        }
    }, [expertId]);

    useEffect(() => {
        if (selectedDate) fetchBusy(selectedDate);
    }, [selectedDate, fetchBusy]);

    const handleBook = async () => {
        if (!selectedDate || !selectedSlot) return;
        setBooking(true);
        setError("");
        setSuccess("");
        try {
            // Use local date parts to avoid UTC date shift
            const localDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    expert_id: expertId,
                    date: localDate,
                    start_time: selectedSlot.start,
                    end_time: selectedSlot.end,
                    note: note || null,
                    call_type: callType,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.error === 'TOKEN_GATE') {
                    throw new Error(data.message);
                }
                throw new Error(data.error || "Booking failed");
            }
            setSuccess("Booked! A calendar event has been created.");
            setSelectedSlot(null);
            setNote("");
            fetchBusy(selectedDate);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setBooking(false);
        }
    };

    const dateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
        : "";

    return (
        <div className="glass-card p-8 mt-8">
            <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <h2 className="text-lg font-semibold text-primary">Book a Session</h2>
            </div>
            <p className="text-sm text-muted mb-6">
                {hourlyRate ? `$${hourlyRate}/hr · ` : ""}{SLOT_MINUTES}-min slots · Powered by Google Calendar
                {timezone !== "UTC" && ` · ${timezone.replace(/_/g, " ")}`}
            </p>

            {/* Date picker */}
            <div className="mb-6">
                <p className="text-xs text-muted uppercase tracking-wider mb-3">Pick a date</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {days.map((d) => {
                        const isSelected = selectedDate?.toDateString() === d.toDateString();
                        return (
                            <button
                                key={d.toISOString()}
                                onClick={() => { setSelectedDate(d); setSelectedSlot(null); setSuccess(""); setError(""); }}
                                className={`flex flex-col items-center px-4 py-3 rounded-xl border text-sm transition-all shrink-0 ${isSelected
                                    ? "border-violet-500/50 bg-violet-500/10 text-[#667eea]"
                                    : "border-[var(--border-color)] text-secondary hover:border-[var(--border-hover)]"
                                    }`}
                            >
                                <span className="text-xs uppercase">{d.toLocaleDateString("en", { weekday: "short" })}</span>
                                <span className="text-lg font-semibold">{d.getDate()}</span>
                                <span className="text-xs">{d.toLocaleDateString("en", { month: "short" })}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
                <div className="mb-6">
                    <p className="text-xs text-muted uppercase tracking-wider mb-3">
                        {loading ? "Checking calendar..." : "Available times"}
                    </p>
                    {loading ? (
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-20 h-10 rounded-lg bg-[var(--bg-card)] animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {workSlots.map((slot) => {
                                const busy = isSlotBusy(slot.start, slot.end, dateStr, busySlots, timezone);
                                const isSelected = selectedSlot?.start === slot.start;
                                return (
                                    <button
                                        key={slot.start}
                                        disabled={busy}
                                        onClick={() => { setSelectedSlot(slot); setSuccess(""); setError(""); }}
                                        className={`px-3 py-2 rounded-lg text-sm transition-all ${busy
                                            ? "bg-red-500/10 text-red-400/60 line-through cursor-not-allowed border border-red-500/10"
                                            : isSelected
                                                ? "bg-[#667eea] text-white shadow-lg shadow-violet-500/30"
                                                : "border border-[var(--border-color)] text-secondary hover:border-violet-500/40 hover:text-primary"
                                            }`}
                                    >
                                        {slot.start}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Booking form */}
            {selectedSlot && (
                <div className="border-t border-[var(--border-color)] pt-6">
                    <p className="text-sm text-primary mb-3">
                        Booking <span className="font-semibold">{selectedSlot.start} – {selectedSlot.end}</span> on{" "}
                        <span className="font-semibold">{selectedDate?.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span>
                        {" "}with <span className="font-semibold">{expertName}</span>
                    </p>
                    <div className="flex gap-2 mb-4">
                        {(["video", "audio"] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setCallType(type)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${callType === type
                                    ? "bg-gradient-to-r from-violet-500/15 to-purple-500/10 text-[#667eea] border border-violet-500/20"
                                    : "text-secondary hover:text-primary border border-[var(--border-color)]"
                                    }`}
                            >
                                {type === "video" ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                    </svg>
                                )}
                                {type === "video" ? "Video Call" : "Audio Only"}
                            </button>
                        ))}
                    </div>
                    {/* Token gating info for selected call type */}
                    {gating && (
                        (callType === 'audio' && gating.gate_audio && gating.cost_audio > 0) ||
                        (callType === 'video' && gating.gate_video && gating.cost_video > 0)
                    ) && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                                Requires {callType === 'audio' ? gating.cost_audio : gating.cost_video} ${gating.coin_symbol} to book
                            </div>
                        )}
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note — what would you like to discuss?"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl input-field text-sm resize-none mb-4"
                    />
                    <button
                        onClick={handleBook}
                        disabled={booking}
                        className="btn-primary text-sm py-2.5 px-6 disabled:opacity-50"
                    >
                        {booking ? "Booking..." : "Confirm Booking"}
                    </button>
                </div>
            )
            }

            {success && <p className="text-sm text-green-400 mt-4">{success}</p>}
            {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
        </div >
    );
}
