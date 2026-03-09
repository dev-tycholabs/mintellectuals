"use client";

const features = [
    {
        label: "Expert Profiles",
        title: "Showcase your expertise",
        description:
            "Build a rich profile with your skills, experience, and social links. Get discovered by people who need your knowledge.",
        gradient: "from-violet-500 to-purple-600",
        icon: (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
        ),
    },
    {
        label: "Book Sessions",
        title: "Calendar-powered scheduling",
        description:
            "Experts connect Google Calendar for real-time availability. Seekers pick a slot and book instantly — no back-and-forth.",
        gradient: "from-cyan-400 to-blue-500",
        icon: (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
        ),
    },
    {
        label: "Verified Identity",
        title: "Trust through verification",
        description:
            "Link and verify your Twitter and LinkedIn accounts. Verified badges build credibility and attract more connections.",
        gradient: "from-pink-500 to-rose-500",
        icon: (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
        ),
    },
];

const howItWorks = [
    {
        step: "01",
        title: "Create your profile",
        description: "Sign up, fill in your expertise, set your hourly rate, and toggle yourself as an expert.",
    },
    {
        step: "02",
        title: "Connect your calendar",
        description: "Link Google Calendar so seekers can see your real-time availability and book slots directly.",
    },
    {
        step: "03",
        title: "Get booked",
        description: "Seekers discover you, pick a time, and book a session. You get a calendar invite automatically.",
    },
];

export default function Features() {
    return (
        <section id="features" className="py-32 px-6 relative">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        <span className="gradient-text">Built for Experts</span>
                    </h2>
                    <p className="text-xl text-secondary max-w-2xl mx-auto">
                        Everything you need to monetize your knowledge and grow your professional network
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-32">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="glass-card glass-card-hover p-8"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                                {feature.icon}
                            </div>
                            <span className="text-xs text-muted uppercase tracking-wider">{feature.label}</span>
                            <h3 className="text-lg font-semibold mt-1 mb-3 text-primary">{feature.title}</h3>
                            <p className="text-sm text-secondary leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* How It Works */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        <span className="gradient-text">How It Works</span>
                    </h2>
                    <p className="text-xl text-secondary max-w-2xl mx-auto">
                        Three steps to start earning from your expertise
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {howItWorks.map((item, index) => (
                        <div key={index} className="relative text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white text-xl font-bold mb-6 shadow-lg shadow-violet-500/30">
                                {item.step}
                            </div>
                            {index < howItWorks.length - 1 && (
                                <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-violet-500/30 to-transparent" />
                            )}
                            <h3 className="text-lg font-semibold text-primary mb-2">{item.title}</h3>
                            <p className="text-sm text-secondary leading-relaxed max-w-xs mx-auto">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
