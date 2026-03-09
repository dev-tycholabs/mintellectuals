"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SkillsInputProps {
    skills: string[];
    onChange: (skills: string[]) => void;
}

export default function SkillsInput({ skills, onChange }: SkillsInputProps) {
    const [input, setInput] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 1) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/skills?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const filtered = (data.skills || []).filter(
                (s: string) => !skills.some(existing => existing.toLowerCase() === s.toLowerCase())
            );
            setSuggestions(filtered);
            setShowDropdown(filtered.length > 0 || query.trim().length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [skills]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(input), 200);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [input, fetchSuggestions]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const addSkill = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) return;
        onChange([...skills, trimmed]);
        setInput("");
        setSuggestions([]);
        setShowDropdown(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    };

    const removeSkill = (index: number) => {
        onChange(skills.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const maxIdx = suggestions.length + (inputIsNewSkill ? 0 : -1);
            setActiveIndex(prev => Math.min(prev + 1, maxIdx));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
                addSkill(suggestions[activeIndex]);
            } else if (input.trim()) {
                addSkill(input);
            }
        } else if (e.key === "Backspace" && !input && skills.length > 0) {
            removeSkill(skills.length - 1);
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    const inputTrimmed = input.trim().toLowerCase();
    const inputIsNewSkill = inputTrimmed.length > 0 &&
        !suggestions.some(s => s.toLowerCase() === inputTrimmed) &&
        !skills.some(s => s.toLowerCase() === inputTrimmed);

    return (
        <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
                Expertise
            </label>
            <div
                className="flex flex-wrap gap-2 px-4 py-3 rounded-2xl input-field transition-all text-sm min-h-[48px] cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {skills.map((skill, i) => (
                    <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-[#667eea]"
                    >
                        {skill}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeSkill(i); }}
                            className="ml-0.5 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${skill}`}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setActiveIndex(-1); }}
                    onFocus={() => { if (input.trim()) setShowDropdown(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder={skills.length === 0 ? "Type a skill, e.g. Solidity..." : "Add more..."}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-primary placeholder:text-muted"
                    aria-label="Add expertise skill"
                    aria-autocomplete="list"
                    role="combobox"
                    aria-expanded={showDropdown}
                />
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="relative z-50"
                >
                    <div className="absolute top-1 left-0 right-0 rounded-xl glass-card border border-[var(--border-color)] shadow-xl max-h-48 overflow-y-auto">
                        {loading && suggestions.length === 0 && (
                            <div className="px-4 py-3 text-xs text-muted">Searching...</div>
                        )}
                        {suggestions.map((s, i) => (
                            <button
                                key={s}
                                type="button"
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === activeIndex
                                    ? "bg-violet-500/10 text-[#667eea]"
                                    : "text-primary hover:bg-[var(--hover-bg)]"
                                    }`}
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => addSkill(s)}
                            >
                                {s}
                            </button>
                        ))}
                        {inputIsNewSkill && (
                            <button
                                type="button"
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t border-[var(--border-color)] ${activeIndex === suggestions.length
                                    ? "bg-violet-500/10 text-[#667eea]"
                                    : "text-secondary hover:bg-[var(--hover-bg)]"
                                    }`}
                                onMouseEnter={() => setActiveIndex(suggestions.length)}
                                onClick={() => addSkill(input)}
                            >
                                <span className="text-muted">Add &quot;</span>
                                <span className="font-medium text-primary">{input.trim()}</span>
                                <span className="text-muted">&quot;</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
