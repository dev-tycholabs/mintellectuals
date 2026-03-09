"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

interface OtherUser {
    id: string;
    full_name: string;
    headline?: string;
    avatar_url?: string;
}

interface Conversation {
    id: string;
    last_message_at: string;
    other_user: OtherUser;
    last_message_preview?: string;
    unread_count?: number;
}

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read_at: string | null;
}

export default function MessagesView({ currentUserId }: { currentUserId: string }) {
    const searchParams = useSearchParams();
    const openWith = searchParams.get("with");

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [gateError, setGateError] = useState<string | null>(null);
    const [gatingInfo, setGatingInfo] = useState<{ gated: boolean; hasAccess: boolean; message?: string } | null>(null);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const activeConvo = conversations.find((c) => c.id === activeConvoId);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (res.ok) setConversations(data.conversations || []);
        setLoading(false);
    }, []);

    // Open or create conversation with a specific user (from ?with= param)
    useEffect(() => {
        if (openWith && !loading) {
            (async () => {
                const res = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ participant_id: openWith }),
                });
                const data = await res.json();
                if (res.ok && data.conversation_id) {
                    await fetchConversations();
                    setActiveConvoId(data.conversation_id);
                } else if (data.error === "TOKEN_GATE") {
                    setGateError(data.message);
                }
            })();
        }
    }, [openWith, loading, fetchConversations]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Fetch messages when active conversation changes
    const fetchMessages = useCallback(async (convoId: string) => {
        setLoadingMessages(true);
        const res = await fetch(`/api/messages?conversation_id=${convoId}`);
        const data = await res.json();
        if (res.ok) setMessages(data.messages || []);
        setLoadingMessages(false);
    }, []);

    useEffect(() => {
        if (activeConvoId) fetchMessages(activeConvoId);
    }, [activeConvoId, fetchMessages]);

    // Fetch gating info when active conversation changes
    useEffect(() => {
        if (!activeConvoId) {
            setGatingInfo(null);
            return;
        }
        (async () => {
            try {
                const res = await fetch(`/api/conversations/gating?conversation_id=${activeConvoId}`);
                const data = await res.json();
                if (res.ok) setGatingInfo(data);
            } catch {
                setGatingInfo(null);
            }
        })();
    }, [activeConvoId]);

    // Realtime subscription for new messages
    useEffect(() => {
        if (!activeConvoId) return;

        const supabase = createClient();
        const channel = supabase
            .channel(`messages:${activeConvoId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${activeConvoId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    // Mark as read if from the other person
                    if (newMsg.sender_id !== currentUserId) {
                        fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _mark_read: true }),
                        }).catch(() => { });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeConvoId, currentUserId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !activeConvoId || sending) return;
        const content = newMessage.trim();
        setNewMessage("");
        setSending(true);
        setGateError(null);

        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversation_id: activeConvoId, content }),
            });
            if (!res.ok) {
                const data = await res.json();
                if (data.error === "TOKEN_GATE") {
                    setGateError(data.message);
                    setNewMessage(content);
                    return;
                }
                throw new Error();
            }
            // Realtime will handle adding the message, but add optimistically too
            const msg = await res.json();
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        } catch {
            setNewMessage(content); // restore on failure
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-full">
            {/* Conversation list */}
            <div className="w-80 shrink-0 border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-primary)]/50">
                <div className="p-4 border-b border-[var(--border-color)]">
                    <h2 className="text-lg font-semibold text-primary">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-muted text-sm">Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                                </svg>
                            </div>
                            <p className="text-sm text-muted">No conversations yet.</p>
                            <p className="text-xs text-muted mt-1">Visit an expert&apos;s profile to start a chat.</p>
                        </div>
                    ) : (
                        conversations.map((convo) => {
                            const isActive = convo.id === activeConvoId;
                            const other = convo.other_user;
                            const initials = (other.full_name || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2);

                            return (
                                <button
                                    key={convo.id}
                                    onClick={() => setActiveConvoId(convo.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isActive
                                        ? "bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-r-2 border-[#667eea]"
                                        : "hover:bg-[var(--bg-card)]"
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                        {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-primary truncate">{other.full_name}</p>
                                        {other.headline && (
                                            <p className="text-xs text-muted truncate">{other.headline}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted shrink-0">
                                        {formatTime(convo.last_message_at)}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat panel */}
            <div className="flex-1 flex flex-col">
                {!activeConvoId ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            {gateError ? (
                                <>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    </div>
                                    <p className="text-red-400 text-sm max-w-xs">{gateError}</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                                        </svg>
                                    </div>
                                    <p className="text-secondary text-sm">Select a conversation to start chatting</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {(activeConvo?.other_user.full_name || "?")
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-primary">{activeConvo?.other_user.full_name}</p>
                                    {gatingInfo?.gated && !gatingInfo.hasAccess && (
                                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    )}
                                </div>
                                {activeConvo?.other_user.headline && (
                                    <p className="text-xs text-muted">{activeConvo.other_user.headline}</p>
                                )}
                            </div>
                        </div>

                        {/* Token gating banner */}
                        {gatingInfo?.gated && !gatingInfo.hasAccess && (
                            <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-amber-400">{gatingInfo.message}</p>
                            </div>
                        )}

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {loadingMessages ? (
                                <div className="text-center text-muted text-sm py-8">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-muted text-sm py-8">
                                    No messages yet. Say hello!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMine = msg.sender_id === currentUserId;
                                    return (
                                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine
                                                    ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-br-md"
                                                    : "glass-card text-primary rounded-bl-md"
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                <p className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-muted"}`}>
                                                    {formatTime(msg.created_at)}
                                                    {isMine && msg.read_at && " · Read"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area */}
                        <div className="px-6 py-4 border-t border-[var(--border-color)]">
                            {gateError && (
                                <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                    {gateError}
                                </div>
                            )}
                            <div className="flex items-end gap-3">
                                <textarea
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={gatingInfo?.gated && !gatingInfo.hasAccess ? "You need the required coins to message" : "Type a message..."}
                                    rows={1}
                                    disabled={gatingInfo?.gated && !gatingInfo.hasAccess}
                                    className="flex-1 px-4 py-3 rounded-2xl input-field text-sm resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ minHeight: "44px" }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending || (gatingInfo?.gated && !gatingInfo.hasAccess)}
                                    className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:shadow-lg hover:shadow-violet-500/30"
                                    aria-label="Send message"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[10px] text-muted mt-1.5 ml-1">Press Enter to send, Shift+Enter for new line</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
    if (diffMins < 10080) return d.toLocaleDateString("en", { weekday: "short" });
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}
