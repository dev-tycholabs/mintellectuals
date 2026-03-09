import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 overflow-hidden">
            {/* Background orbs */}
            <div className="floating-orb w-96 h-96 bg-violet-600 top-20 -left-48" />
            <div className="floating-orb w-80 h-80 bg-cyan-500 top-40 -right-40" style={{ animationDelay: "2s" }} />
            <div className="floating-orb w-64 h-64 bg-pink-500 bottom-20 left-1/4" style={{ animationDelay: "4s" }} />

            <div className="max-w-4xl mx-auto text-center relative z-10">
                {/* Main headline */}
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                    <span className="gradient-text">Zivy</span>
                </h1>

                {/* Tagline */}
                <p className="text-2xl md:text-3xl text-primary font-medium mb-4">
                    Network. Earn. Grow.
                </p>

                <p className="text-lg md:text-xl text-secondary mb-6 max-w-2xl mx-auto leading-relaxed">
                    Monetize your expertise and build meaningful professional connections.
                </p>

                {/* Value props */}
                <div className="flex flex-wrap justify-center gap-3 mb-12 text-sm">
                    <span className="px-4 py-2 rounded-full glass-card text-secondary">
                        💼 Monetize your expertise
                    </span>
                    <span className="px-4 py-2 rounded-full glass-card text-secondary">
                        🎥 Paid audio &amp; video calls
                    </span>
                    <span className="px-4 py-2 rounded-full glass-card text-secondary">
                        💬 Gated chats
                    </span>
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/signup" className="btn-primary text-center">
                        Get Started Free
                    </Link>
                    <Link href="#features" className="btn-secondary text-center">
                        See How It Works
                    </Link>
                </div>
            </div>
        </section>
    );
}
