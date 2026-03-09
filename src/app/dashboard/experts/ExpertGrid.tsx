"use client";

import { useState } from "react";
import Link from "next/link";

interface Expert {
    id: string;
    full_name: string;
    headline?: string;
    bio?: string;
    expertise?: string[];
    hourly_rate?: number;
    location?: string;
    avatar_url?: string;
}

export default function ExpertGrid({ experts }: { experts: Expert[] }) {
    const [search, setSearch] = useState("");

    const filtered = experts.filter((e) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            e.full_name?.toLowerCase().includes(q) ||
            e.headline?.toLowerCase().includes(q) ||
            e.expertise?.some((t) => t.toLowerCase().includes(q)) ||
            e.location?.toLowerCase().includes(q)
        );
    });

    if (experts.length === 0) {
        return (
            <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#667eea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                </div>
                <p className="text-muted text-sm">No experts listed yet. Be the first — enable &quot;List as Expert&quot; on your profile.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, skill, or location..."
                    className="w-full px-5 py-3 rounded-2xl input-field transition-all text-sm"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="glass-card p-8 text-center">
                    <p className="text-muted text-sm">No experts match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((expert) => (
                        <ExpertCard key={expert.id} expert={expert} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ExpertCard({ expert }: { expert: Expert }) {
    const initials = (expert.full_name || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <Link href={`/dashboard/experts/${expert.id}`} className="glass-card glass-card-hover p-6 block">
            <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-violet-500/20">
                    {initials}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-primary truncate">{expert.full_name}</h3>
                    {expert.headline && (
                        <p className="text-sm text-secondary truncate">{expert.headline}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                        {expert.hourly_rate && (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                ${expert.hourly_rate}/hr
                            </span>
                        )}
                        {expert.location && (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                </svg>
                                {expert.location}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {expert.expertise && expert.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                    {expert.expertise.slice(0, 4).map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-[#667eea]">
                            {tag}
                        </span>
                    ))}
                    {expert.expertise.length > 4 && (
                        <span className="px-2.5 py-1 rounded-full text-xs text-muted">
                            +{expert.expertise.length - 4} more
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}
