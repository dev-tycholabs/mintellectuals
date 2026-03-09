"use client";

import { useState } from "react";

export default function CTA() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubmitted(true);
            setEmail("");
        }
    };

    return (
        <section className="py-32 px-6 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />

            <div className="max-w-4xl mx-auto text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
                    Ready to build your network?
                </h2>
                <p className="text-xl text-secondary mb-10 max-w-2xl mx-auto">
                    Join and redefine your professional connections today.
                    Be among the first to experience the future of networking.
                </p>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            className="flex-1 px-6 py-4 rounded-full input-field transition-all"
                        />
                        <button type="submit" className="btn-primary whitespace-nowrap">
                            Sign Up Free
                        </button>
                    </form>
                ) : (
                    <div className="glass-card px-8 py-6 max-w-md mx-auto animate-pulse-glow">
                        <div className="flex items-center justify-center gap-3">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-lg text-primary">Welcome aboard! Check your inbox soon.</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
