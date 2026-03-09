# Zivy

**Network. Earn. Grow.**

Zivy is an expert-access platform where professionals monetize their knowledge through a personal token economy. Think [Intro.co](https://intro.co), [Superpeer](https://superpeer.com), or [Clarity.fm](https://clarity.fm) — but instead of flat per-minute or per-session fees, every professional on Zivy launches their own coin. Seekers purchase tokens to unlock interactions: direct messages, audio calls, and video calls, all gated by the expert's personal token.

This repo contains the Zivy marketing site and waitlist — the public-facing landing page for early signups.

---

## The Concept

Existing platforms like Intro.co and Clarity.fm connect people with experts through paid consultations at fixed rates. Superpeer extends this with subscriptions, livestreams, and digital products. Zivy takes a different approach:

- **Personal coins** — Every professional launches their own token with custom pricing
- **Token-gated access** — Seekers buy an expert's coin to unlock messaging, audio, and video calls
- **Dynamic pricing** — Experts adjust token costs per interaction type based on demand and availability
- **A personal economy** — Each professional effectively runs their own micro-economy around their expertise

This model creates scarcity, aligns incentives, and lets experts capture value proportional to their demand.

## Landing Page Sections

The marketing site is built as a single-page app with these sections:

| Section        | Component        | What it does                                                                 |
| -------------- | ---------------- | ---------------------------------------------------------------------------- |
| Navigation     | `Navbar`         | Fixed top bar — Zivy logo + dark/light theme toggle                          |
| Hero           | `Hero`           | Headline, tagline, value prop badges (monetize expertise, paid calls, gated chats), waitlist email form backed by Supabase |
| Features       | `Features`       | Three feature cards (Profile, Coin, Token Control) + deep-dive sections on instant messaging, audio/video calls, and personal coins |
| FAQ            | `FAQ`            | Accordion with common questions about launching coins, setting fees, and security |
| Call to Action | `CTA`            | Secondary signup prompt to capture remaining visitors                         |
| Footer         | `Footer`         | Copyright, Twitter/X link, Privacy & Terms                                   |

### Theme System

Dark and light modes powered by CSS custom properties on a `data-theme` attribute. `ThemeProvider` persists the choice to localStorage and respects `prefers-color-scheme` on first visit.

### Visual Style

Glassmorphism cards, gradient text (violet → purple → pink), floating background orbs with blur animations, and glow hover effects. The aesthetic is modern, clean, and crypto-adjacent without being heavy-handed.

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI        | [React 19](https://react.dev/)              |
| Styling   | [Tailwind CSS 4](https://tailwindcss.com/)  |
| Backend   | [Supabase](https://supabase.com/) — waitlist email storage (PostgreSQL) |
| Language  | TypeScript 5                                |
| Linting   | ESLint 9 + `eslint-config-next`             |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx        # Root layout, metadata, ThemeProvider
│   ├── page.tsx          # Home — assembles landing page sections
│   ├── globals.css       # CSS variables, glass/gradient utilities, animations
│   └── favicon.ico
├── components/
│   ├── Navbar.tsx         # Fixed nav with logo + theme toggle
│   ├── Hero.tsx           # Hero section with Supabase waitlist form
│   ├── Features.tsx       # Feature cards + detailed product sections
│   ├── FAQ.tsx            # Expandable FAQ accordion
│   ├── CTA.tsx            # Bottom call-to-action signup
│   ├── Footer.tsx         # Footer with social + legal links
│   ├── ThemeProvider.tsx  # Dark/light theme React context
│   └── ThemeToggle.tsx    # Sun/moon toggle button
└── lib/
    └── supabase.ts        # Supabase client initialization
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### Supabase Setup

Create a `waitlist` table:

```sql
CREATE TABLE waitlist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Install & Run

```bash
git clone <your-repo-url>
cd Zivy
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev        # → http://localhost:3000
```

### Production

```bash
npm run build
npm start
```

## Scripts

| Command         | Description                   |
| --------------- | ----------------------------- |
| `npm run dev`   | Start dev server (hot reload) |
| `npm run build` | Production build              |
| `npm start`     | Serve production build        |
| `npm run lint`  | Run ESLint                    |

## License

© 2026 Zivy. All rights reserved.
