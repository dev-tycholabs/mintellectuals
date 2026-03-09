"use client";

import { useState } from "react";

const faqs = [
    {
        question: "How do I launch my coin?",
        answer: "Once you create your profile, you can launch your personal coin with just a few clicks. Set your token price, define interaction costs, and start monetizing your expertise immediately.",
    },
    {
        question: "Can I set individual token fees?",
        answer: "Absolutely! You have full control over your token economy. Set different fees for messages, calls, and other interactions. Adjust pricing based on demand and your availability.",
    },
    {
        question: "Is my data secure?",
        answer: "Security is our top priority. We use end-to-end encryption for all communications and follow industry-leading security practices to protect your data and transactions.",
    },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-32 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        <span className="gradient-text">Frequently Asked</span>
                    </h2>
                    <p className="text-xl text-secondary">Got questions? We&apos;ve got answers.</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="glass-card overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[var(--bg-card)] transition-colors"
                            >
                                <span className="text-lg font-medium text-primary">{faq.question}</span>
                                <svg
                                    className={`w-5 h-5 text-violet-500 transition-transform duration-300 ${openIndex === index ? "rotate-45" : ""
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <div
                                className={`px-6 overflow-hidden transition-all duration-300 ${openIndex === index ? "pb-5 max-h-40" : "max-h-0"
                                    }`}
                            >
                                <p className="text-secondary leading-relaxed">{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
