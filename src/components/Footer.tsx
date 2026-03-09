import Link from "next/link";

export default function Footer() {
    return (
        <footer className="py-8 px-6 border-t border-[var(--border-color)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold gradient-text">Mintellectuals</span>
                    <span className="text-sm text-muted">© 2026 All rights reserved.</span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="w-9 h-9 rounded-full glass-card flex items-center justify-center hover:bg-[var(--bg-card)] transition-colors">
                        <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                        </svg>
                    </a>
                    <Link href="#" className="text-sm text-muted hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
                    <Link href="#" className="text-sm text-muted hover:text-[var(--text-primary)] transition-colors">Terms</Link>
                </div>
            </div>
        </footer>
    );
}
