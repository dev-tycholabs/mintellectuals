"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import SkillsInput from "@/components/SkillsInput";

interface Profile {
    id: string;
    full_name: string;
    email: string;
    headline?: string;
    bio?: string;
    expertise?: string[];
    hourly_rate?: number;
    location?: string;
    twitter_url?: string;
    linkedin_url?: string;
    website_url?: string;
    avatar_url?: string;
    wallet_address?: string;
    is_expert?: boolean;
    twitter_verified?: string;
    linkedin_verified?: string;
}

interface ExpertCoin {
    coin_address: string | null;
    coin_name: string;
    coin_symbol: string;
    coin_launched_at: string;
    tx_hash?: string;
}

interface Props {
    profile: Profile | null;
    userEmail: string;
    expertCoin: ExpertCoin | null;
}

type FormState = {
    full_name: string;
    headline: string;
    bio: string;
    expertise: string[];
    hourly_rate: string;
    location: string;
    twitter_url: string;
    linkedin_url: string;
    website_url: string;
    is_expert: boolean;
};

export default function ProfileEditor({ profile, userEmail, expertCoin }: Props) {
    const router = useRouter();
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [error, setError] = useState("");
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [form, setForm] = useState<FormState>({
        full_name: profile?.full_name || "",
        headline: profile?.headline || "",
        bio: profile?.bio || "",
        expertise: profile?.expertise || [],
        hourly_rate: profile?.hourly_rate?.toString() || "",
        location: profile?.location || "",
        twitter_url: profile?.twitter_url || "",
        linkedin_url: profile?.linkedin_url || "",
        website_url: profile?.website_url || "",
        is_expert: profile?.is_expert || false,
    });

    // Keep a ref of the last saved state to avoid unnecessary saves
    const lastSavedRef = useRef<string>(JSON.stringify(form));

    const twitterVerified = profile?.twitter_verified || null;
    const linkedinVerified = profile?.linkedin_verified || null;

    const isTwitterMatch = twitterVerified && form.twitter_url
        ? form.twitter_url.toLowerCase().includes(twitterVerified.toLowerCase())
        : false;
    const isLinkedinMatch = !!linkedinVerified && !!form.linkedin_url;

    const displayName = form.full_name || "User";
    const initials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const saveProfile = useCallback(async (currentForm: FormState) => {
        const currentJson = JSON.stringify(currentForm);
        if (currentJson === lastSavedRef.current) return; // No changes

        setSaveStatus("saving");
        setError("");

        const expertiseArray = currentForm.expertise.filter(Boolean);
        const body = {
            full_name: currentForm.full_name,
            headline: currentForm.headline,
            bio: currentForm.bio,
            expertise: expertiseArray,
            hourly_rate: currentForm.hourly_rate ? parseInt(currentForm.hourly_rate) : null,
            location: currentForm.location,
            twitter_url: currentForm.twitter_url || null,
            linkedin_url: currentForm.linkedin_url || null,
            website_url: currentForm.website_url || null,
            is_expert: currentForm.is_expert,
        };

        try {
            if (expertiseArray.length > 0) {
                await fetch("/api/skills", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ skills: expertiseArray }),
                });
            }

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");

            lastSavedRef.current = currentJson;
            setSaveStatus("saved");
            router.refresh();

            // Clear "saved" indicator after 2s
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setSaveStatus("error");
        }
    }, [router]);

    const handleBlur = useCallback(() => {
        saveProfile(form);
    }, [form, saveProfile]);

    const handleToggleExpert = () => {
        const updated = { ...form, is_expert: !form.is_expert };
        setForm(updated);
        // Save immediately on toggle since there's no blur event
        saveProfile(updated);
    };

    const handleSkillsChange = (skills: string[]) => {
        const updated = { ...form, expertise: skills };
        setForm(updated);
        // Save immediately when skills change (add/remove is a discrete action)
        saveProfile(updated);
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 pb-8 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/30">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-primary">{displayName}</h2>
                            <p className="text-secondary">{userEmail}</p>
                            {form.headline && (
                                <p className="text-sm text-muted mt-1">{form.headline}</p>
                            )}
                        </div>
                    </div>
                    <SaveIndicator status={saveStatus} error={error} />
                </div>

                <div className="space-y-5">
                    <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} onBlur={handleBlur} />
                    <Field label="Headline" value={form.headline} onChange={(v) => setForm({ ...form, headline: v })} onBlur={handleBlur} placeholder="e.g. Senior Blockchain Developer" />
                    <div>
                        <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Bio</label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            onBlur={handleBlur}
                            placeholder="Tell people about your expertise and experience..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-2xl input-field transition-all text-sm resize-none"
                        />
                    </div>
                    <SkillsInput
                        skills={form.expertise}
                        onChange={handleSkillsChange}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Hourly Rate (USD)" value={form.hourly_rate} onChange={(v) => setForm({ ...form, hourly_rate: v })} onBlur={handleBlur} placeholder="e.g. 150" type="number" />
                        <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} onBlur={handleBlur} placeholder="e.g. San Francisco, CA" />
                    </div>

                    {/* Social Links with Verification */}
                    <div className="pt-2 border-t border-[var(--border-color)]">
                        <p className="text-xs text-muted uppercase tracking-wider mb-3">Social Links</p>
                        <div className="space-y-4">
                            <SocialField
                                label="Twitter / X"
                                value={form.twitter_url}
                                onChange={(v) => setForm({ ...form, twitter_url: v })}
                                onBlur={handleBlur}
                                placeholder="https://x.com/yourhandle"
                                verified={isTwitterMatch}
                                verifiedName={twitterVerified ? `@${twitterVerified}` : null}
                                verifyHref="/api/auth/social/twitter"
                            />
                            <SocialField
                                label="LinkedIn"
                                value={form.linkedin_url}
                                onChange={(v) => setForm({ ...form, linkedin_url: v })}
                                onBlur={handleBlur}
                                placeholder="https://linkedin.com/in/yourprofile"
                                verified={isLinkedinMatch}
                                verifiedName={linkedinVerified ? "Verified" : null}
                                verifyHref="/api/auth/social/linkedin"
                            />
                            <Field label="Website" value={form.website_url} onChange={(v) => setForm({ ...form, website_url: v })} onBlur={handleBlur} placeholder="https://yoursite.com" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleToggleExpert}
                            className={`w-11 h-6 rounded-full transition-colors relative ${form.is_expert ? "bg-[#667eea]" : "bg-[var(--border-color)]"}`}
                            role="switch"
                            aria-checked={form.is_expert}
                            aria-label="List as expert"
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_expert ? "translate-x-5" : ""}`} />
                        </button>
                        <span className="text-sm text-secondary">List me as an expert (visible in discovery)</span>
                    </div>
                </div>

                {/* Wallet & Coin section (read-only display) */}
                {profile?.wallet_address && (
                    <div className="mt-6 pt-5 border-t border-[var(--border-color)]">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">Wallet Address</p>
                        <p className="text-primary font-mono text-sm break-all">{profile.wallet_address}</p>
                    </div>
                )}

                {form.is_expert && <CoinLauncher expertCoin={expertCoin} hasWallet={!!profile?.wallet_address} />}
            </div>
        </div>
    );
}

function SaveIndicator({ status, error }: { status: "idle" | "saving" | "saved" | "error"; error: string }) {
    if (status === "idle") return null;
    return (
        <div className="flex items-center gap-2 text-sm">
            {status === "saving" && (
                <>
                    <svg className="w-4 h-4 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-muted">Saving...</span>
                </>
            )}
            {status === "saved" && (
                <>
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400">Saved</span>
                </>
            )}
            {status === "error" && (
                <span className="text-red-400">{error || "Save failed"}</span>
            )}
        </div>
    );
}

function VerifiedBadge() {
    return (
        <span className="inline-flex items-center gap-1 text-green-400" title="Verified">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
        </span>
    );
}

function SocialField({ label, value, onChange, onBlur, placeholder, verified, verifiedName, verifyHref }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    placeholder?: string;
    verified: boolean;
    verifiedName: string | null;
    verifyHref: string;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-xs text-muted uppercase tracking-wider">{label}</label>
                {verified && <VerifiedBadge />}
                {verified && verifiedName && (
                    <span className="text-xs text-green-400">{verifiedName}</span>
                )}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-3 rounded-2xl input-field transition-all text-sm"
                />
                {!verified ? (
                    <a
                        href={verifyHref}
                        className="shrink-0 px-4 py-3 rounded-2xl text-xs font-medium bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-[#667eea] hover:border-[#667eea] transition-all flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                        Verify
                    </a>
                ) : (
                    <span className="shrink-0 px-4 py-3 rounded-2xl text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                    </span>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, onBlur, placeholder, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void; onBlur: () => void; placeholder?: string; type?: string;
}) {
    return (
        <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-2xl input-field transition-all text-sm"
            />
        </div>
    );
}

function CoinLauncher({ expertCoin, hasWallet }: { expertCoin: ExpertCoin | null; hasWallet: boolean }) {
    const router = useRouter();
    const [launching, setLaunching] = useState(false);
    const [error, setError] = useState("");
    const [coinName, setCoinName] = useState("");
    const [coinSymbol, setCoinSymbol] = useState("");
    const [showForm, setShowForm] = useState(false);

    // Poll for confirmation when coin is pending (coin_address is null)
    const isPending = expertCoin && !expertCoin.coin_address;
    useEffect(() => {
        if (!isPending || !expertCoin?.tx_hash) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/tx/status?hash=${expertCoin.tx_hash}`);
                const data = await res.json();
                if (data.transaction?.status === "confirmed") {
                    clearInterval(interval);
                    router.refresh();
                }
            } catch { /* ignore */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [isPending, expertCoin?.tx_hash, router]);

    if (expertCoin) {
        const pending = !expertCoin.coin_address;
        return (
            <div className="pt-5 border-t border-[var(--border-color)]">
                <p className="text-xs text-muted uppercase tracking-wider mb-3">Your Coin</p>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-orange-500/30 ${pending ? "animate-pulse" : ""}`}>
                        {expertCoin.coin_symbol?.slice(0, 2) || "??"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-primary font-medium">{expertCoin.coin_name}</p>
                        {pending ? (
                            <a
                                href={`https://sepolia.etherscan.io/tx/${expertCoin.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-400 hover:text-amber-300 font-mono truncate block"
                            >
                                Deploying… {expertCoin.tx_hash?.slice(0, 10)}…{expertCoin.tx_hash?.slice(-6)}
                            </a>
                        ) : (
                            <p className="text-xs text-muted font-mono truncate">{expertCoin.coin_address}</p>
                        )}
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${pending ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>
                        {pending ? "Pending" : `$${expertCoin.coin_symbol}`}
                    </span>
                </div>
            </div>
        );
    }

    if (!hasWallet) {
        return (
            <div className="pt-5 border-t border-[var(--border-color)]">
                <p className="text-xs text-muted uppercase tracking-wider mb-3">Personal Coin</p>
                <p className="text-sm text-secondary">Create a wallet first to launch your personal coin.</p>
            </div>
        );
    }

    const handleLaunch = async () => {
        if (!coinName.trim() || !coinSymbol.trim()) {
            setError("Name and symbol are required");
            return;
        }
        setLaunching(true);
        setError("");

        try {
            const res = await fetch("/api/coin/launch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coinName: coinName.trim(), coinSymbol: coinSymbol.trim().toUpperCase() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Launch failed");
            setShowForm(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLaunching(false);
        }
    };

    return (
        <div className="pt-5 border-t border-[var(--border-color)]">
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Personal Coin</p>
            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 btn-primary text-sm py-2.5 px-5"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                    Launch My Coin
                </button>
            ) : (
                <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20">
                    <p className="text-sm text-secondary">
                        Launch your personal coin so seekers can purchase it to interact with you. Each coin costs $0.01 USDT.
                    </p>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Coin Name</label>
                            <input
                                type="text"
                                value={coinName}
                                onChange={(e) => setCoinName(e.target.value)}
                                placeholder="e.g. Alex Coin"
                                className="w-full px-4 py-3 rounded-2xl input-field transition-all text-sm"
                                disabled={launching}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Symbol</label>
                            <input
                                type="text"
                                value={coinSymbol}
                                onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
                                placeholder="e.g. ALEX"
                                maxLength={10}
                                className="w-full px-4 py-3 rounded-2xl input-field transition-all text-sm"
                                disabled={launching}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleLaunch}
                            disabled={launching}
                            className="btn-primary text-sm py-2.5 px-6 disabled:opacity-50"
                        >
                            {launching ? "Launching..." : "Launch Coin"}
                        </button>
                        <button
                            onClick={() => { setShowForm(false); setError(""); }}
                            disabled={launching}
                            className="btn-secondary text-sm py-2.5 px-6"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
