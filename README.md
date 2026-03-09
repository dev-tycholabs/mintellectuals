# Zivy

**Network. Earn. Grow.**

Zivy is a full-stack expert-access platform where professionals monetize their knowledge through a personal token economy. Every expert launches their own ERC-20 coin on Ethereum Sepolia — seekers purchase those coins to unlock interactions: direct messages, audio calls, and video calls, all gated by on-chain token balances.

Think [Intro.co](https://intro.co) meets [friend.tech](https://friend.tech) — paid expert consultations powered by personal tokens instead of flat fees.

---

## Table of Contents

- [The Concept](#the-concept)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Smart Contracts](#smart-contracts)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [License](#license)

---

## The Concept

Existing platforms like Intro.co and Clarity.fm connect people with experts through paid consultations at fixed rates. Superpeer extends this with subscriptions and digital products. Zivy takes a different approach:

- **Personal coins** — Every expert launches their own ERC-20 token with custom pricing
- **Token-gated access** — Seekers buy an expert's coin to unlock messaging, audio, and video calls
- **Dynamic pricing** — Experts set and adjust token costs per interaction type (DM, audio call, video call)
- **ERC-4337 smart wallets** — Gasless transactions via account abstraction; users never touch MetaMask or gas fees
- **A personal economy** — Each professional runs their own micro-economy around their expertise

This model creates scarcity, aligns incentives, and lets experts capture value proportional to their demand.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Database & Auth | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime) |
| Smart Wallets | [Tether WDK](https://www.npmjs.com/package/@tetherto/wdk-wallet-evm-erc-4337) (ERC-4337) |
| Blockchain | Ethereum Sepolia testnet via [ethers.js v6](https://docs.ethers.org/v6/) |
| Video/Audio Calls | [LiveKit](https://livekit.io/) (WebRTC) |
| Calendar | [Google Calendar API](https://developers.google.com/calendar) via `googleapis` |
| QR Codes | [qrcode.react](https://www.npmjs.com/package/qrcode.react) |
| Language | TypeScript 5 |
| Linting | ESLint 9 + `eslint-config-next` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Landing Page  │  │  Auth Pages  │  │   Dashboard (SSR)     │  │
│  │  (public)     │  │ login/signup │  │  experts, messages,   │  │
│  │              │  │  + OAuth     │  │  calls, coin, profile │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Routes (/api)                      │   │
│  │  auth · profile · wallet · coin · conversations ·        │   │
│  │  messages · appointments · calendar · livekit · tx       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Middleware       │  │ Instrumentation│  │  TX Worker     │  │
│  │  (session +      │  │ (registers     │  │  (background   │  │
│  │   route guard)   │  │  tx-worker)    │  │   polling)     │  │
│  └──────────────────┘  └────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│   Supabase   │   │  Ethereum Sepolia │   │     LiveKit Cloud    │
│  PostgreSQL  │   │  (Pimlico bundler │   │   (WebRTC rooms)     │
│  Auth        │   │   + paymaster)    │   │                      │
│  Realtime    │   │  Smart Contracts  │   │                      │
└──────────────┘   └──────────────────┘   └──────────────────────┘
```


---

## Features

### Landing Page

The public-facing marketing site at `/`:

| Section | Component | Description |
|---------|-----------|-------------|
| Navigation | `Navbar` | Fixed top bar with logo, sign-in/sign-up links, theme toggle |
| Hero | `Hero` | Headline, tagline, CTA buttons linking to signup |
| Features | `Features` | Three feature cards (Expert Profiles, Calendar Scheduling, Verified Identity) + "How It Works" 3-step flow |
| FAQ | `FAQ` | Accordion with 3 common questions |
| Call to Action | `CTA` | Email signup form backed by Supabase `waitlist` table |
| Footer | `Footer` | Copyright, Twitter/X link, Privacy & Terms |

### Theme System

Dark and light modes powered by CSS custom properties on a `data-theme` attribute.

- `ThemeProvider` wraps the app, persists choice to `localStorage` (`Zivy-theme` key)
- Respects `prefers-color-scheme` on first visit
- `ThemeToggle` renders a sun/moon icon button

### Authentication

| Feature | Implementation |
|---------|---------------|
| Email/password signup | `POST /api/auth/signup` → Supabase Auth + auto-profile via DB trigger |
| Email/password login | `POST /api/auth/login` → Supabase Auth |
| Google OAuth | Supabase OAuth → `/api/auth/callback` handles profile + wallet + welcome bonus |
| Session management | Middleware refreshes Supabase session on every request |
| Route protection | Middleware redirects: unauthenticated → `/login`, authenticated → `/dashboard` |
| Password visibility | Toggle eye icon on login/signup forms |

### ERC-4337 Smart Wallet System

Every user gets a gasless smart wallet on signup — no MetaMask, no seed phrases, no gas fees.

- **Wallet creation** (`src/lib/wallet.ts`): Creates ERC-4337 smart wallets using Tether WDK
- **Seed encryption**: AES-256-CBC with scrypt-derived key from `WALLET_ENCRYPTION_KEY`
- **Network**: Sepolia testnet with Pimlico bundler and paymaster (sponsored gas)
- **Auto-provisioned**: Created automatically on signup or OAuth callback
- **Welcome bonus**: New users receive 2 USDT from the platform wallet (`src/lib/welcome-bonus.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet/create` | POST | Creates wallet, stores encrypted seed, sends welcome bonus |
| `/api/wallet/balance` | GET | Fetches USDT balance via WDK |
| `/api/wallet/send` | POST | Sends any ERC-20 token to any address |
| `/api/wallet/tokens` | GET | Lists all tokens (USDT + expert coins) with balances |
| `/api/wallet/tokens/[coinAddress]` | GET | Single coin balance check |
| `/api/wallet/holdings` | GET | Expert coins held with expert profile info |

### Personal Coin System

Experts launch their own ERC-20 token via the `ZivyCoinFactory` smart contract.

- **Launch**: Expert deploys a coin with custom name/symbol via `/api/coin/launch`
- **Purchase**: Seekers buy coins via `/api/coin/buy` (approve USDT → purchase through factory)
- **Pricing**: On-chain `COIN_PRICE` per token, queried via `getUsdtCost()`
- **Gating settings**: Experts configure which interactions require coins and how many (`/api/coin/settings`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coin/launch` | POST | Deploy expert's coin via ZivyCoinFactory |
| `/api/coin/buy` | GET | Fetch coin price info for an expert |
| `/api/coin/buy` | POST | Purchase expert coins (approve USDT + buy) |
| `/api/coin/settings` | PUT | Update gating toggles and costs per interaction type |

### Token Gating

On-chain balance checks gate access to expert interactions:

| Interaction | Where Checked | Behavior |
|-------------|---------------|----------|
| Direct Messages | `POST /api/conversations`, `POST /api/messages` | Checks seeker's coin balance before creating conversation or sending message |
| Audio/Video Calls | `POST /api/appointments`, `POST /api/livekit/token` | Checks balance when booking and again when joining the call |
| Gating Info | `GET /api/conversations/gating` | Returns gated status, current balance, and required amount for a conversation |

Balance checks use `getCoinBalance()` which reads on-chain state via ethers.js.

### Transaction Worker

A background process that tracks on-chain transaction confirmations:

- Started via Next.js instrumentation hook (`src/instrumentation.ts`)
- Polls `pending_transactions` table every 30 seconds
- Checks Pimlico bundler for UserOperation receipts
- Resolves `coin_launch` transactions by reading the deployed coin address from the factory
- Marks transactions as `confirmed` or `failed`
- Auto-fails transactions older than 10 minutes

### Transaction Tracking

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tx/list` | GET | Lists user's transactions (up to 50) |
| `/api/tx/status` | GET | Single transaction status check by hash |

The `TransactionActivity` component renders a table with type icons, status badges, Etherscan links, relative timestamps, and auto-polling for pending transactions.

### Expert Profiles

- **Profile editing** (`/dashboard/profile`): Full name, headline, bio, expertise tags, hourly rate, location, social links, expert toggle
- **SkillsInput**: Typeahead component with debounced search against the `skills` table; supports adding custom skills
- **Auto-save**: Profile fields save on blur via `PUT /api/profile`
- **Coin launcher**: Inline coin launch form embedded in the profile editor (visible when `is_expert` is enabled)

### Social Verification

Verified badges for linked social accounts:

| Platform | OAuth Flow | Stored Field |
|----------|-----------|-------------|
| Twitter/X | OAuth 2.0 with PKCE → `/api/auth/social/twitter` + callback | `twitter_verified` (username) |
| LinkedIn | OAuth 2.0 → `/api/auth/social/linkedin` + callback | `linkedin_verified` (profile ID) |

Verified badges appear on expert profile cards and detail pages.

### Google Calendar Integration

Experts connect their Google Calendar for real-time availability:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google-calendar` | GET | Redirects to Google OAuth consent |
| `/api/auth/google-calendar/callback` | GET | Exchanges code, saves tokens + calendar email |
| `/api/auth/google-calendar/disconnect` | POST | Removes calendar tokens |
| `/api/calendar/freebusy` | GET | Queries Google Calendar free/busy for a date |

The `GoogleCalendarConnect` component provides connect/disconnect UI. Calendar helpers in `src/lib/google-calendar.ts` handle: `getFreeBusy`, `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`.

### Expert Discovery

`/dashboard/experts` — Searchable grid of expert profiles:

- **ExpertGrid**: Search by name, skill, or location; links to detail pages
- **ExpertProfile** (`/dashboard/experts/[id]`): Full bio, expertise tags, social links with verified badges, message button, buy coins section, booking calendar (if Google Calendar connected), buy coins modal

### Booking & Appointments

- **BookingCalendar**: 14-day date picker (weekdays only), 30-minute slots (9 AM–5 PM), real-time busy slot checking via Google Calendar, video/audio call type selector, token gating info display, optional note field
- **Appointment management**: Create (`POST`), list (`GET`), confirm/cancel (`PATCH`) — all synced with Google Calendar events
- **AppointmentsList** (`/dashboard/appointments`): Tabbed view (incoming/outgoing), status badges, "Join Call" buttons for confirmed appointments

### Video & Audio Calls (LiveKit)

- **Token generation**: `POST /api/livekit/token` — verifies appointment ownership, confirmed status, and re-checks token gating for the booker
- **VideoCall component**: Join screen → LiveKit room with `VideoConference` (video) or `AudioOnlyLayout` (audio-only)
- **AudioOnlyLayout**: Participant cards with speaking indicators and audio-only controls
- **Room naming**: `appointment-{appointmentId}`

### Messaging System

Real-time messaging with Supabase Realtime:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversations` | GET | Lists conversations with other user info |
| `/api/conversations` | POST | Create or get existing conversation (DM gating check) |
| `/api/messages` | GET | Paginated messages (50/page), auto-marks as read |
| `/api/messages` | POST | Send message (DM gating check per message) |
| `/api/messages/unread` | GET | Unread message count |

**MessagesView** (`/dashboard/messages`): Conversation list sidebar, chat panel with real-time updates via Supabase `postgres_changes`, auto-scroll, token gating banner, Enter to send / Shift+Enter for newline.

### Dashboard

The authenticated dashboard at `/dashboard`:

| Page | Route | Description |
|------|-------|-------------|
| Home | `/dashboard` | Welcome header, stats row (wallet status, USDT balance, tx count), smart wallet card with address/copy/Etherscan link, quick actions (Fund Wallet, Send Tokens) |
| Experts | `/dashboard/experts` | Searchable expert grid |
| Expert Detail | `/dashboard/experts/[id]` | Full expert profile with booking and coin purchase |
| Messages | `/dashboard/messages` | Real-time messaging interface |
| Appointments | `/dashboard/appointments` | Incoming/outgoing appointment management |
| Video Call | `/dashboard/call/[appointmentId]` | LiveKit video/audio call room |
| My Coin | `/dashboard/coin` | Coin gating settings manager (expert only) |
| My Holdings | `/dashboard/holdings` | Expert coins held with balances |
| My Profile | `/dashboard/profile` | Profile editor with coin launcher |
| Activity | `/dashboard/activity` | Transaction history with auto-polling |

### Dashboard Layout

- **DashboardNav**: Logo, theme toggle, user popover (initials avatar, email, user ID, wallet address, sign out)
- **DashboardSidebar**: 8 menu items with active state highlighting; "My Coin" visible only for experts

### Modals

| Modal | Trigger | Features |
|-------|---------|----------|
| `FundWalletModal` | "Fund Wallet" on dashboard home | QR code + copy wallet address |
| `SendTokensModal` | "Send Tokens" on dashboard home | Token selector dropdown, recipient address validation, amount with MAX button, transfer summary with sponsored gas, multi-step UI (form → confirming → success) |
| `BuyCoinsModal` | "Buy Coins" on expert profile | Quick amount pills, custom amount input, price breakdown, multi-step UI (form → confirming → success) |

### Visual Style

Glassmorphism cards, gradient text (violet → purple → pink), floating background orbs with blur animations, and glow hover effects. The aesthetic is modern, clean, and crypto-adjacent without being heavy-handed.


---

## Project Structure

```
Zivy/
├── .env.local                          # Environment variables (see below)
├── package.json                        # Dependencies and scripts
├── next.config.ts                      # Next.js configuration
├── eslint.config.mjs                   # ESLint 9 flat config
├── postcss.config.mjs                  # PostCSS + Tailwind
├── ROADMAP.md                          # Feature roadmap
│
├── scripts/
│   ├── create-platform-wallet.ts       # Generate new ERC-4337 platform wallet
│   └── encrypt-seed.ts                 # Encrypt a seed phrase for env var usage
│
├── public/                             # Static assets (SVGs)
│
└── src/
    ├── middleware.ts                    # Session refresh + route protection
    ├── instrumentation.ts              # Registers TX worker on server start
    │
    ├── app/
    │   ├── layout.tsx                  # Root layout, metadata, ThemeProvider
    │   ├── page.tsx                    # Landing page (assembles all sections)
    │   ├── globals.css                 # CSS variables, glass/gradient utilities, animations
    │   │
    │   ├── (auth)/
    │   │   ├── login/page.tsx          # Login page (email/password + Google OAuth)
    │   │   └── signup/page.tsx         # Signup page (email/password + Google OAuth)
    │   │
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── signup/route.ts     # POST — email/password signup
    │   │   │   ├── login/route.ts      # POST — email/password login
    │   │   │   ├── logout/route.ts     # POST — sign out
    │   │   │   ├── callback/route.ts   # GET  — OAuth callback (profile + wallet + bonus)
    │   │   │   ├── social/
    │   │   │   │   ├── twitter/        # Twitter/X OAuth 2.0 + PKCE
    │   │   │   │   └── linkedin/       # LinkedIn OAuth 2.0
    │   │   │   └── google-calendar/    # Google Calendar OAuth + disconnect
    │   │   │
    │   │   ├── profile/route.ts        # PUT  — update profile fields
    │   │   ├── skills/route.ts         # GET  — search skills, POST — upsert skill
    │   │   │
    │   │   ├── wallet/
    │   │   │   ├── create/route.ts     # POST — create smart wallet + welcome bonus
    │   │   │   ├── balance/route.ts    # GET  — USDT balance
    │   │   │   ├── send/route.ts       # POST — send ERC-20 tokens
    │   │   │   ├── tokens/route.ts     # GET  — all token balances
    │   │   │   ├── tokens/[coinAddress]/route.ts  # GET — single coin balance
    │   │   │   └── holdings/route.ts   # GET  — expert coins held
    │   │   │
    │   │   ├── coin/
    │   │   │   ├── launch/route.ts     # POST — deploy expert coin
    │   │   │   ├── buy/route.ts        # GET/POST — price info / purchase coins
    │   │   │   └── settings/route.ts   # PUT  — update gating settings
    │   │   │
    │   │   ├── conversations/
    │   │   │   ├── route.ts            # GET/POST — list / create conversation
    │   │   │   └── gating/route.ts     # GET  — token gating info
    │   │   │
    │   │   ├── messages/
    │   │   │   ├── route.ts            # GET/POST — list / send messages
    │   │   │   └── unread/route.ts     # GET  — unread count
    │   │   │
    │   │   ├── appointments/route.ts   # GET/POST/PATCH — manage appointments
    │   │   ├── calendar/freebusy/route.ts  # GET — Google Calendar free/busy
    │   │   │
    │   │   ├── livekit/token/route.ts  # POST — generate LiveKit access token
    │   │   │
    │   │   └── tx/
    │   │       ├── list/route.ts       # GET  — transaction history
    │   │       └── status/route.ts     # GET  — single tx status
    │   │
    │   └── dashboard/
    │       ├── layout.tsx              # Dashboard shell (nav + sidebar)
    │       ├── page.tsx                # Dashboard home
    │       ├── DashboardContent.tsx    # Stats, wallet card, quick actions
    │       ├── experts/
    │       │   ├── page.tsx            # Expert discovery grid
    │       │   ├── ExpertGrid.tsx      # Searchable expert cards
    │       │   └── [id]/
    │       │       ├── page.tsx        # Expert detail (SSR)
    │       │       └── ExpertProfile.tsx # Full profile + booking + coins
    │       ├── messages/
    │       │   ├── page.tsx
    │       │   └── MessagesView.tsx    # Real-time chat interface
    │       ├── appointments/
    │       │   ├── page.tsx
    │       │   └── AppointmentsList.tsx # Tabbed appointment manager
    │       ├── call/[appointmentId]/
    │       │   ├── page.tsx
    │       │   └── VideoCall.tsx       # LiveKit room + audio-only layout
    │       ├── coin/
    │       │   ├── page.tsx
    │       │   └── CoinManager.tsx     # Gating settings editor
    │       ├── holdings/
    │       │   ├── page.tsx
    │       │   └── HoldingsList.tsx    # Expert coins portfolio
    │       ├── profile/
    │       │   ├── page.tsx
    │       │   └── ProfileEditor.tsx   # Profile form + coin launcher
    │       └── activity/
    │           └── page.tsx            # Transaction history
    │
    ├── components/
    │   ├── Navbar.tsx                  # Landing page nav
    │   ├── Hero.tsx                    # Hero section
    │   ├── Features.tsx                # Feature cards + how it works
    │   ├── FAQ.tsx                     # Accordion FAQ
    │   ├── CTA.tsx                     # Email signup CTA
    │   ├── Footer.tsx                  # Footer with links
    │   ├── ThemeProvider.tsx           # Dark/light theme context
    │   ├── ThemeToggle.tsx             # Sun/moon toggle
    │   ├── DashboardNav.tsx            # Dashboard top nav + user popover
    │   ├── DashboardSidebar.tsx        # Dashboard sidebar menu
    │   ├── BookingCalendar.tsx         # 14-day slot picker
    │   ├── BuyCoinsModal.tsx           # Coin purchase modal
    │   ├── FundWalletModal.tsx         # QR code fund modal
    │   ├── SendTokensModal.tsx         # Token transfer modal
    │   ├── GoogleCalendarConnect.tsx   # Calendar connect/disconnect
    │   ├── SkillsInput.tsx             # Typeahead skill tags
    │   └── TransactionActivity.tsx     # Transaction history table
    │
    └── lib/
        ├── supabase.ts                # Supabase browser client
        ├── supabase-server.ts          # Supabase server client (cookies)
        ├── supabase-admin.ts           # Supabase service role client
        ├── auth.ts                     # Auth helper (getUser shorthand)
        ├── wallet.ts                   # ERC-4337 wallet creation + encryption
        ├── welcome-bonus.ts            # 2 USDT welcome transfer
        ├── google-calendar.ts          # Google Calendar OAuth + CRUD helpers
        ├── tx-worker.ts                # Background transaction poller
        └── contracts/
            ├── addresses.ts            # Contract addresses + chain config
            ├── index.ts                # Re-exports
            ├── interact.ts             # launchCoin, purchaseCoins, getUsdtCost
            ├── check-balance.ts        # getCoinBalance (on-chain read)
            └── abis/                   # Contract ABIs (MockUSDT, ZivyCoin, ZivyCoinFactory)
```


---

## Database Schema

Zivy uses Supabase PostgreSQL. The following tables are inferred from the codebase:

### `profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Matches Supabase Auth user ID |
| `full_name` | text | Display name |
| `email` | text | Email address |
| `headline` | text | Short professional tagline |
| `bio` | text | Full bio |
| `expertise` | text[] | Array of skill tags |
| `hourly_rate` | numeric | Hourly rate (display only) |
| `location` | text | City/region |
| `twitter_url` | text | Twitter/X profile URL |
| `linkedin_url` | text | LinkedIn profile URL |
| `website_url` | text | Personal website URL |
| `avatar_url` | text | Profile picture URL |
| `wallet_address` | text | ERC-4337 smart wallet address |
| `encrypted_seed_phrase` | text | AES-256-CBC encrypted wallet seed |
| `is_expert` | boolean | Whether user is listed as an expert |
| `twitter_verified` | text | Verified Twitter username (via OAuth) |
| `linkedin_verified` | text | Verified LinkedIn profile ID (via OAuth) |
| `google_calendar_token` | jsonb | Google Calendar OAuth tokens |
| `google_calendar_email` | text | Connected Google Calendar email |
| `timezone` | text | User timezone |
| `updated_at` | timestamptz | Last profile update |

### `expert_coins`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `expert_id` | uuid (FK → profiles) | Coin owner |
| `coin_address` | text | Deployed ERC-20 contract address |
| `coin_name` | text | Token name |
| `coin_symbol` | text | Token symbol |
| `tx_hash` | text | Deployment transaction hash |
| `coin_launched_at` | timestamptz | Launch timestamp |
| `gate_dm` | boolean | Whether DMs require coins |
| `cost_dm` | numeric | Coins required per DM |
| `gate_audio` | boolean | Whether audio calls require coins |
| `cost_audio` | numeric | Coins required per audio call |
| `gate_video` | boolean | Whether video calls require coins |
| `cost_video` | numeric | Coins required per video call |

### `conversations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `participant_1` | uuid (FK → profiles) | First participant |
| `participant_2` | uuid (FK → profiles) | Second participant |
| `last_message_at` | timestamptz | Last message timestamp |

### `messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `conversation_id` | uuid (FK → conversations) | Parent conversation |
| `sender_id` | uuid (FK → profiles) | Message author |
| `content` | text | Message body |
| `created_at` | timestamptz | Sent timestamp |
| `read_at` | timestamptz | Read timestamp (null = unread) |

### `appointments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `expert_id` | uuid (FK → profiles) | Expert being booked |
| `booker_id` | uuid (FK → profiles) | Person booking |
| `date` | date | Appointment date |
| `start_time` | time | Start time |
| `end_time` | time | End time |
| `status` | text | `pending` / `confirmed` / `cancelled` |
| `note` | text | Optional booking note |
| `call_type` | text | `video` or `audio` |
| `google_event_id` | text | Google Calendar event ID |

### `pending_transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → profiles) | Transaction owner |
| `tx_hash` | text | UserOperation hash |
| `tx_type` | text | `coin_launch` / `coin_purchase` / `token_transfer` |
| `status` | text | `pending` / `confirmed` / `failed` |
| `payload` | jsonb | Type-specific metadata |
| `created_at` | timestamptz | Submission time |
| `resolved_at` | timestamptz | Confirmation/failure time |
| `error` | text | Error message (if failed) |

### `skills`

| Column | Type | Description |
|--------|------|-------------|
| `name` | text (PK, unique) | Skill name |
| `usage_count` | integer | How many experts use this skill |

### `waitlist`

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint (PK) | Auto-increment |
| `email` | text (unique) | Signup email |
| `created_at` | timestamptz | Signup time |


---

## Smart Contracts

Deployed on Ethereum Sepolia testnet:

| Contract | Address | Description |
|----------|---------|-------------|
| MockUSDT | `0xd077A400968890Eacc75cdc901F0356c943e4fDb` | ERC-20 test USDT with mint function |
| ZivyCoinFactory | `0x326F056B2eDc56fbf0A2417d71DD21183EC0F4aB` | Factory that deploys expert coins, handles purchases, and collects platform fees |

### ZivyCoinFactory Functions

| Function | Description |
|----------|-------------|
| `launchCoin(name, symbol, expertAddress)` | Deploys a new ZivyCoin ERC-20 for an expert |
| `purchaseCoins(coinAddress, amount)` | Buys expert coins (caller must approve USDT first) |
| `spendCoins(coinAddress, amount)` | Burns coins for interaction access |
| `getUsdtCost(coinAddress, amount)` | View function — returns USDT cost for N coins |

### ZivyCoin (per-expert token)

Each deployed coin is a standard ERC-20 with:
- `COIN_PRICE` — fixed price in USDT per token
- `expert` — the expert's wallet address
- `platform` — the platform fee recipient
- `burn(amount)` — burn tokens (used for spending)

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account (email + password) |
| POST | `/api/auth/login` | Sign in (email + password) |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/callback` | OAuth callback (Google) — creates profile, wallet, welcome bonus |
| GET | `/api/auth/social/twitter` | Start Twitter/X OAuth flow |
| GET | `/api/auth/social/twitter/callback` | Twitter/X OAuth callback |
| GET | `/api/auth/social/linkedin` | Start LinkedIn OAuth flow |
| GET | `/api/auth/social/linkedin/callback` | LinkedIn OAuth callback |
| GET | `/api/auth/google-calendar` | Start Google Calendar OAuth flow |
| GET | `/api/auth/google-calendar/callback` | Google Calendar OAuth callback |
| POST | `/api/auth/google-calendar/disconnect` | Disconnect Google Calendar |

### Profile & Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/profile` | Update profile fields (whitelisted) |
| GET | `/api/skills?q=` | Search skills by query |
| POST | `/api/skills` | Upsert a skill |

### Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallet/create` | Create ERC-4337 smart wallet |
| GET | `/api/wallet/balance` | Get USDT balance |
| POST | `/api/wallet/send` | Send ERC-20 tokens |
| GET | `/api/wallet/tokens` | List all token balances |
| GET | `/api/wallet/tokens/[coinAddress]` | Get single coin balance |
| GET | `/api/wallet/holdings` | Get expert coins held |

### Coin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coin/launch` | Deploy expert's personal coin |
| GET | `/api/coin/buy?expertId=` | Get coin price info |
| POST | `/api/coin/buy` | Purchase expert coins |
| PUT | `/api/coin/settings` | Update gating settings |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create/get conversation (DM gating) |
| GET | `/api/conversations/gating?conversation_id=` | Token gating info |
| GET | `/api/messages?conversation_id=` | List messages (paginated) |
| POST | `/api/messages` | Send message (DM gating) |
| GET | `/api/messages/unread` | Unread message count |

### Appointments & Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | List appointments (incoming + outgoing) |
| POST | `/api/appointments` | Book appointment (token gating) |
| PATCH | `/api/appointments` | Confirm or cancel appointment |
| GET | `/api/calendar/freebusy?expertId=&date=` | Google Calendar free/busy slots |

### Calls

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/livekit/token` | Generate LiveKit access token |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tx/list` | Transaction history (up to 50) |
| GET | `/api/tx/status?hash=` | Single transaction status |


---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# ── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key (server-side only)

# ── Wallet Encryption ────────────────────────────────────────
WALLET_ENCRYPTION_KEY=              # Secret key for AES-256-CBC seed phrase encryption
                                    # ⚠️  Use a strong random string in production

# ── Platform Wallet ──────────────────────────────────────────
PLATFORM_WALLET_ENCRYPTED_SEED=     # Encrypted seed phrase of the platform wallet
PLATFORM_WALLET_ADDRESS=            # Platform wallet address (for welcome bonus transfers)
PLATFORM_WALLET_SEED_PHRASE=        # Raw seed phrase (used by scripts only)

# ── MoonPay (Tether WDK) ────────────────────────────────────
MOONPAY_API_KEY=                    # MoonPay publishable key
MOONPAY_SECRET_KEY=                 # MoonPay secret key

# ── App URL ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=                # Public app URL (used for OAuth redirects)
                                    # e.g. http://localhost:3000 or https://yourdomain.com

# ── Smart Contracts ──────────────────────────────────────────
NEXT_PUBLIC_USDT_ADDRESS=           # USDT contract address on Sepolia

# ── Twitter/X OAuth 2.0 ─────────────────────────────────────
TWITTER_CLIENT_ID=                  # Twitter OAuth client ID
TWITTER_CLIENT_SECRET=              # Twitter OAuth client secret

# ── LinkedIn OAuth 2.0 ──────────────────────────────────────
LINKEDIN_CLIENT_ID=                 # LinkedIn OAuth client ID
LINKEDIN_CLIENT_SECRET=             # LinkedIn OAuth client secret

# ── Google Calendar OAuth 2.0 ───────────────────────────────
GOOGLE_CALENDAR_CLIENT_ID=          # Google OAuth client ID
GOOGLE_CALENDAR_CLIENT_SECRET=      # Google OAuth client secret
                                    # Redirect URI: {APP_URL}/api/auth/google-calendar/callback

# ── LiveKit ──────────────────────────────────────────────────
LIVEKIT_API_KEY=                    # LiveKit API key
LIVEKIT_API_SECRET=                 # LiveKit API secret
NEXT_PUBLIC_LIVEKIT_URL=            # LiveKit WebSocket URL (wss://...)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project with Auth enabled
- A [Pimlico](https://pimlico.io/) account (for ERC-4337 bundler/paymaster — used internally by Tether WDK)
- A [LiveKit Cloud](https://cloud.livekit.io/) project (for video/audio calls)
- A [Google Cloud](https://console.cloud.google.com/) project with Calendar API enabled
- Twitter and LinkedIn developer apps (for social verification)

### 1. Install Dependencies

```bash
git clone <your-repo-url>
cd Zivy
npm install
```

### 2. Configure Environment

Copy the environment variables template above into `.env.local` and fill in your credentials.

### 3. Supabase Setup

Create the required tables in your Supabase project (see [Database Schema](#database-schema) above). A profile is auto-created via a database trigger when a new user signs up through Supabase Auth.

### 4. Create Platform Wallet

The platform wallet sends welcome bonuses to new users. Generate one:

```bash
npx tsx scripts/create-platform-wallet.ts
```

This outputs the wallet address, seed phrase, and encrypted seed. Add them to your `.env.local`.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Production Build

```bash
npm run build
npm start
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npx tsx scripts/create-platform-wallet.ts` | Generate a new ERC-4337 platform wallet |
| `npx tsx scripts/encrypt-seed.ts` | Encrypt a seed phrase for env var storage |

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| ERC-4337 smart wallets | Users never need MetaMask or ETH for gas — Pimlico paymaster sponsors all transactions |
| Tether WDK | Provides a high-level SDK for ERC-4337 wallet creation, signing, and UserOperation submission |
| Server-side seed encryption | Wallet seeds are AES-256-CBC encrypted and stored in Supabase — the app is custodial by design for UX simplicity |
| Next.js instrumentation | The TX worker starts as a background process via `register()` — no separate worker service needed |
| Supabase Realtime | Messages update in real-time via `postgres_changes` subscriptions — no WebSocket server to manage |
| LiveKit over raw WebRTC | Production-grade SFU with built-in React components, handling all the complex WebRTC negotiation |
| On-chain gating checks | Token balances are read directly from the blockchain (not cached) to ensure accuracy |
| Factory pattern for coins | `ZivyCoinFactory` deploys standardized ERC-20s — consistent behavior, single deployment tx per expert |

---

## License

© 2026 Zivy. All rights reserved.
