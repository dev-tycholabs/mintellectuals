"use client";

import { useState, useCallback } from "react";
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    ControlBar,
    GridLayout,
    ParticipantTile,
    useTracks,
    LayoutContextProvider,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent, ConnectionState } from "livekit-client";
import { useRouter } from "next/navigation";

interface VideoCallProps {
    appointmentId: string;
}

export default function VideoCall({ appointmentId }: VideoCallProps) {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [wsUrl, setWsUrl] = useState("");
    const [callType, setCallType] = useState<"video" | "audio">("video");
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const joinCall = useCallback(async () => {
        setJoining(true);
        setError(null);
        try {
            const res = await fetch("/api/livekit/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointmentId }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.error === 'TOKEN_GATE') {
                    throw new Error(data.message);
                }
                throw new Error(data.error || "Failed to join call");
            }
            setToken(data.token);
            setWsUrl(data.wsUrl);
            setCallType(data.callType || "video");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to join call");
        } finally {
            setJoining(false);
        }
    }, [appointmentId]);

    const handleDisconnect = useCallback(() => {
        setToken(null);
        router.push("/dashboard/appointments");
    }, [router]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-8 text-center max-w-md">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-violet-500/10 border border-violet-500/20 text-[#667eea] hover:bg-violet-500/20 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-8 text-center max-w-md">
                    <h2 className="text-xl font-bold text-primary mb-2">Ready to join?</h2>
                    <p className="text-secondary text-sm mb-6">
                        Your microphone{callType === "video" ? " and camera" : ""} will be requested when you join.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => router.push("/dashboard/appointments")}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:text-primary border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={joinCall}
                            disabled={joining}
                            className="px-6 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {joining ? "Connecting..." : "Join Call"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-73px)]" data-lk-theme="default">
            <LiveKitRoom
                token={token}
                serverUrl={wsUrl}
                connect={true}
                video={callType === "video"}
                audio={true}
                onDisconnected={handleDisconnect}
                onError={(err) => {
                    console.error("LiveKit room error:", err);
                    setError(err.message || "Connection error occurred");
                    setToken(null);
                }}
                style={{ height: "100%" }}
            >
                {callType === "video" ? (
                    <VideoConference />
                ) : (
                    <AudioOnlyLayout />
                )}
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}

function AudioOnlyLayout() {
    const tracks = useTracks([Track.Source.Microphone]);

    return (
        <LayoutContextProvider>
            <div className="flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
                        {tracks.map((track) => (
                            <div key={track.participant.sid} className="glass-card p-6 text-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-[#667eea]">
                                        {(track.participant.name || "U").charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-primary">
                                    {track.participant.name || "Participant"}
                                </p>
                                <p className="text-xs text-muted mt-1">
                                    {track.participant.isSpeaking ? "🎙️ Speaking" : "🔇 Silent"}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                <ControlBar
                    controls={{
                        microphone: true,
                        camera: false,
                        screenShare: false,
                        leave: true,
                        chat: true,
                    }}
                />
            </div>
        </LayoutContextProvider>
    );
}
